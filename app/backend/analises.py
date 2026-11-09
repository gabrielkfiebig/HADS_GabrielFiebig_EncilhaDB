"""Save analysis snapshots in the EncilhaDB application database."""
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from app.backend.db import Analise
from app.backend.connections import conexao


def buscar(id, db):
    registro = db.get(Analise, id)
    if registro is None:
        raise HTTPException(404, "Análise não encontrada.")
    return registro


def listar(db):
    return db.query(Analise).order_by(Analise.data_criacao.desc(), Analise.id.desc()).all()


def excluir(id, db):
    registro = buscar(id, db)
    try:
        db.delete(registro)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(503, "Não foi possível remover a análise. Tente novamente.") from None
    return {"mensagem": "Análise removida com sucesso."}


def salvar(dados, db, id=None):
    if id is None:
        origem = conexao.buscar_conexao(dados.conexao_id, db)
        if dados.database_origem != origem.database:
            raise HTTPException(409, "O database da conexão mudou. Execute uma nova análise antes de salvar.")
        registro = Analise(database=origem.database, conexao_id=origem.id)
        fonte = {"id": origem.id, "nome": origem.nome, "database": origem.database}
    else:
        registro = buscar(id, db)
        if dados.nome != registro.nome:
            raise HTTPException(409, "O nome de uma análise salva não pode ser alterado. Edite apenas a descrição.")
        if dados.conexao_id != registro.conexao_id or dados.database_origem != registro.database:
            raise HTTPException(409, "A conexão e o database de uma análise salva não podem ser alterados.")
        fonte = registro.conteudo["conexao"]
    conteudo = dados.snapshot.model_dump(mode="json", by_alias=True)
    ligadas = {id for r in conteudo["relacoes"] for id in (r["origem"], r["destino"])}
    conteudo.update(conexao=fonte, sem_relacao=[t["id"] for t in conteudo["tabelas"] if t["id"] not in ligadas])
    registro.nome = dados.nome
    registro.descricao = dados.descricao
    registro.conteudo = conteudo
    db.add(registro)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(503, "Não foi possível salvar a análise no EncilhaDB. Tente novamente.") from None
    db.refresh(registro)
    return registro
