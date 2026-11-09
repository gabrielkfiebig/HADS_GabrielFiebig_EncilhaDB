from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.backend.settings import settings

engine = create_engine(settings.database_url, hide_parameters=True, pool_pre_ping=True,
                       connect_args={"connect_timeout": 5})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Conexao(Base):
    __tablename__ = "tb_conexao"
    __table_args__ = (
        UniqueConstraint("nome", name="uq_conexao_nome"),
        UniqueConstraint("tipo_sgbd", "host", "porta", "database", "usuario", name="uq_conexao_destino"),
        CheckConstraint("porta BETWEEN 1 AND 65535", name="ck_conexao_porta"),
        CheckConstraint("tipo_sgbd = 'postgresql'", name="ck_conexao_sgbd"),
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    host = Column(String(255), nullable=False)
    porta = Column(Integer, nullable=False, default=5432)
    database = Column(String(100), nullable=False)
    usuario = Column(String(100), nullable=False)
    tipo_sgbd = Column(String(20), nullable=False, default="postgresql")
    data_cadastro = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class ConexaoAtividade(Base):
    __tablename__ = "tb_conexao_atividade"
    conexao_id = Column(Integer, ForeignKey("tb_conexao.id", ondelete="CASCADE"), primary_key=True)
    ultimo_uso = Column(DateTime(timezone=True), nullable=False)


class Analise(Base):
    __tablename__ = "tb_analise"
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=False, default="")
    database = Column(String(100), nullable=False)
    # A snapshot remains available even if its source connection is deleted.
    conexao_id = Column(Integer, nullable=False)
    conteudo = Column(JSON, nullable=False)
    data_criacao = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


def initialize_database():
    """Creates missing tables; never alters existing tables automatically."""
    inspector = inspect(engine)
    if inspector.has_table("tb_conexao"):
        columns = {c["name"] for c in inspector.get_columns("tb_conexao")}
        unique = {c["name"] for c in inspector.get_unique_constraints("tb_conexao")}
        checks = {c["name"] for c in inspector.get_check_constraints("tb_conexao")}
        if ("senha_criptografada" in columns or
                not {"uq_conexao_nome", "uq_conexao_destino"} <= unique or
                not {"ck_conexao_porta", "ck_conexao_sgbd"} <= checks):
            raise RuntimeError("Banco legado: revise e execute manualmente app/backend/migrations/001_parametros_sem_senha.sql antes de iniciar.")
    else:
        Base.metadata.create_all(bind=engine)
    Analise.__table__.create(bind=engine, checkfirst=True)
    ConexaoAtividade.__table__.create(bind=engine, checkfirst=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
