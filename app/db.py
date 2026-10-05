import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, DateTime, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Arquivo .env deve conter a variável DATABASE_URL com a URL de conexão ao banco de dados

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Configuração do SQLAlchemy
    
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelo da tabela de conexões

class Conexao(Base):
    __tablename__ = 'tb_conexao'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    host = Column(String(255), nullable=False)
    porta = Column(Integer, nullable=False, default=5432)
    database = Column(String(100), nullable=False)
    usuario = Column(String(100), nullable=False)
    senha_criptografada = Column(String(255), nullable=False)
    tipo_sgbd = Column(String(20), nullable=False, default='postgresql')
    data_cadastro = Column(DateTime, server_default=text('NOW()'))

# Cria a tabela no banco (se ela não existir)
Base.metadata.create_all(bind=engine)

# Função para usar no FastAPI para pegar a sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()