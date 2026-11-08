"""Read-only discovery of the selected PostgreSQL connection."""
from contextlib import contextmanager
from time import monotonic

from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import NullPool

from app.backend.connections import conexao, credenciais


@contextmanager
def abrir_catalogo(registro):
    senha = credenciais.buscar(registro)
    address = conexao.destino_permitido(registro.host)
    with conexao._rate_lock:
        now = monotonic()
        while conexao._attempts and now - conexao._attempts[0] >= 60:
            conexao._attempts.popleft()
        if len(conexao._attempts) >= 20:
            raise HTTPException(429, "Limite de consultas por minuto atingido. Aguarde.")
        conexao._attempts.append(now)
    if not conexao._slots.acquire(blocking=False):
        raise HTTPException(429, "Há consultas em andamento. Aguarde e tente novamente.")
    engine = None
    try:
        url = URL.create("postgresql+psycopg2", username=registro.usuario,
                         password=senha.get_secret_value(), host=registro.host,
                         port=registro.porta, database=registro.database)
        engine = create_engine(url, echo=False, hide_parameters=True, poolclass=NullPool,
                               connect_args={"hostaddr": address, "connect_timeout": 5,
                                             "options": "-c statement_timeout=5000 -c default_transaction_read_only=on"})
        with engine.connect() as connection:
            yield connection
    except (SQLAlchemyError, ValueError):
        raise HTTPException(400, "Não foi possível consultar o banco. Confira a senha, as permissões e a disponibilidade do PostgreSQL.") from None
    finally:
        try:
            if engine is not None:
                engine.dispose()
        finally:
            conexao._slots.release()


def listar_schemas(connection):
    return list(connection.execute(text("""
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name <> 'information_schema'
          AND schema_name NOT LIKE 'pg\\_%' ESCAPE '\\'
        ORDER BY schema_name
    """)).scalars())


def listar_tabelas(connection, schemas):
    disponiveis = set(listar_schemas(connection))
    if not set(schemas).issubset(disponiveis):
        raise HTTPException(400, "Um dos schemas não está mais disponível. Consulte os schemas novamente.")
    rows = connection.execute(text("""
        SELECT table_schema, table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = ANY(:schemas)
          AND table_type IN ('BASE TABLE', 'VIEW', 'FOREIGN')
        ORDER BY table_schema, table_name
    """), {"schemas": schemas}).mappings()
    return [{"schema": row["table_schema"], "nome": row["table_name"],
             "tipo": "visao" if row["table_type"] == "VIEW" else "tabela"} for row in rows]
