from collections import deque
from datetime import datetime, timezone
from ipaddress import ip_address
from threading import BoundedSemaphore, Lock
from time import monotonic
from fastapi import HTTPException
from sqlalchemy import create_engine, or_
from sqlalchemy.engine import URL
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.pool import NullPool
from app.backend.db import Conexao, ConexaoAtividade
from app.backend.schemas import ConexaoTest
from app.backend.settings import settings
from app.backend.connections import credenciais

_slots = BoundedSemaphore(2)
_rate_lock = Lock()
_attempts = deque()


def destino_permitido(host):
    # Explicit mappings avoid DNS rebinding and unbounded DNS lookups.
    try:
        address = ip_address(settings.host_map.get(host, host))
    except ValueError:
        raise HTTPException(403, "Host não autorizado. Configure um IP ou DB_HOST_MAP no servidor.") from None
    if address.is_unspecified or address.is_multicast or not any(address in net for net in settings.networks):
        raise HTTPException(403, "Destino fora das redes autorizadas para teste.")
    return str(address)


def testar_conexao_endpoint(dados):
    address = destino_permitido(dados.host)
    with _rate_lock:
        now = monotonic()
        while _attempts and now - _attempts[0] >= 60:
            _attempts.popleft()
        if len(_attempts) >= 20:
            raise HTTPException(429, "Limite de 20 testes por minuto atingido. Aguarde.")
        _attempts.append(now)
    if not _slots.acquire(blocking=False):
        raise HTTPException(429, "Há testes em andamento. Aguarde e tente novamente.")
    engine = None
    try:
        url = URL.create("postgresql+psycopg2", username=dados.usuario,
                         password=dados.senha.get_secret_value(), host=dados.host,
                         port=dados.porta, database=dados.database)
        engine = create_engine(url, echo=False, hide_parameters=True, poolclass=NullPool,
                               connect_args={"hostaddr": address, "connect_timeout": 5,
                                             "options": "-c statement_timeout=5000"})
        with engine.connect():
            pass
    except (SQLAlchemyError, ValueError):
        raise HTTPException(400, "Não foi possível conectar. Confira os dados, a senha e a disponibilidade do PostgreSQL.") from None
    finally:
        try:
            if engine is not None:
                engine.dispose()
        finally:
            _slots.release()
    return {"status": "sucesso", "mensagem": "Conexão estabelecida com sucesso!"}


def buscar_conexao(id, db):
    registro = db.get(Conexao, id)
    if registro is None:
        raise HTTPException(404, "Conexão não encontrada.")
    return registro


def verificar_duplicidade(db, dados, id=None):
    query = db.query(Conexao).filter(or_(Conexao.nome == dados.nome,
        (Conexao.tipo_sgbd == dados.tipo_sgbd) & (Conexao.host == dados.host) &
        (Conexao.porta == dados.porta) & (Conexao.database == dados.database) &
        (Conexao.usuario == dados.usuario)))
    if id is not None:
        query = query.filter(Conexao.id != id)
    if query.first():
        raise HTTPException(409, "Já existe uma conexão com esse nome ou com o mesmo destino e usuário.")


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Os dados conflitam com uma conexão existente.") from None
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(503, "Não foi possível concluir a operação no banco da aplicação.") from None


def salvar_conexao(dados, db, id=None):
    registro = buscar_conexao(id, db) if id is not None else Conexao()
    verificar_duplicidade(db, dados, id)
    # Every write is re-tested, even if the browser bypasses the test button.
    testar_conexao_endpoint(dados)
    for campo, valor in dados.model_dump(exclude={"senha"}).items():
        setattr(registro, campo, valor)
    db.add(registro)
    commit(db)
    db.refresh(registro)
    credenciais.salvar(registro, dados.senha)
    return registro


def listar_conexoes(db):
    registros = db.query(Conexao).order_by(Conexao.id).all()
    atividades = {a.conexao_id: a.ultimo_uso for a in db.query(ConexaoAtividade).all()}
    for registro in registros:
        registro.ultimo_uso = atividades.get(registro.id)
    return registros


def registrar_uso(registro, db):
    atividade = db.get(ConexaoAtividade, registro.id)
    if atividade is None:
        atividade = ConexaoAtividade(conexao_id=registro.id)
    atividade.ultimo_uso = datetime.now(timezone.utc)
    db.add(atividade)
    commit(db)
    return atividade.ultimo_uso


def testar_conexao_salva(id, db):
    registro = buscar_conexao(id, db)
    dados = ConexaoTest(**{campo: getattr(registro, campo) for campo in
                          ("tipo_sgbd", "host", "porta", "database", "usuario")},
                        senha=credenciais.buscar(registro))
    resultado = testar_conexao_endpoint(dados)
    return {"resultado": resultado, "ultimo_uso": registrar_uso(registro, db)}


def deletar_conexao(id, db):
    registro = buscar_conexao(id, db)
    credenciais.excluir(id)
    atividade = db.get(ConexaoAtividade, id)
    if atividade is not None:
        db.delete(atividade)
    db.delete(registro)
    commit(db)
