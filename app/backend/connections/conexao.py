from sqlalchemy.orm import Session
from sqlalchemy import create_engine
import bcrypt
from app.backend.db import Conexao

# Função para salvar a conexão no banco de dados
def salvar_conexao(
    nome: str,
    tipo_sgbd: str,
    host: str,
    porta: int,
    database: str,
    usuario: str,
    senha: str,
    db: Session
):
    # VERIFICAÇÃO DE DUPLICIDADE
    
    # VERIFICA SE O NOME JÁ EXISTE
    nome_existente = db.query(Conexao).filter(Conexao.nome == nome).first()
    if nome_existente:
        return {"status": "erro", "mensagem": f"Já existe uma conexão salva com o nome '{nome}'."}
        
    # VERIFICA SE A MESMA CONEXÃO JÁ EXISTE
    dados_existentes = db.query(Conexao).filter(
        Conexao.host == host,
        Conexao.porta == porta,
        Conexao.database == database,
        Conexao.usuario == usuario
    ).first()
    
    if dados_existentes:
        return {"status": "erro", "mensagem": f"Esta exata conexão já está cadastrada no sistema sob o nome '{dados_existentes.nome}'."}

    # SALVA A CONEXÃO NO BANCO DE DADOS
    senha_bytes = senha.encode('utf-8')
    salt = bcrypt.gensalt()
    senha_hash = bcrypt.hashpw(senha_bytes, salt).decode('utf-8')
    
    nova_conexao = Conexao(
        nome=nome,
        tipo_sgbd=tipo_sgbd,
        host=host,
        porta=porta,
        database=database,
        usuario=usuario,
        senha_criptografada=senha_hash
    )
    
    db.add(nova_conexao)
    db.commit()
    
    return {"status": "sucesso", "mensagem": f"Conexão '{nome}' salva com sucesso!"}

def testar_conexao_endpoint(
    tipo_sgbd: str,
    host: str,
    porta: int,
    database: str,
    usuario: str,
    senha: str
):
    try:
        if tipo_sgbd == "postgresql":
            url_teste = f"postgresql+psycopg2://{usuario}:{senha}@{host}:{porta}/{database}"
        else:
            return {"status": "erro", "mensagem": "SGBD não suportado para o teste."}
        
        engine_teste = create_engine(url_teste, echo=False)
        
        with engine_teste.connect() as conn:
            return {"status": "sucesso", "mensagem": "Conexão estabelecida com sucesso!"}
            
    except Exception as e:
        return {"status": "erro", "mensagem": str(e)}

# Função para listar todas as conexões salvas no banco de dados
def listar_conexoes(db: Session):
    """Retorna todas as conexões cadastradas no banco de dados."""
    return db.query(Conexao).all()

# Função para deletar uma conexão pelo ID
def deletar_conexao(id: int, db: Session):
    """Deleta uma conexão pelo ID."""
    conexao = db.query(Conexao).filter(Conexao.id == id).first()
    if conexao:
        db.delete(conexao)
        db.commit()
        return {"status": "sucesso", "mensagem": f"Conexão '{conexao.nome}' deletada com sucesso!"}
    else:
        return {"status": "erro", "mensagem": f"Conexão com ID '{id}' não encontrada."}

# Função para atualizar uma conexão pelo ID
def atualizar_conexoes(
    id: int,
    nome: str,
    tipo_sgbd: str,
    host: str,
    porta: int,
    database: str,
    usuario: str,
    senha: str,
    db: Session
):
    """Atualiza uma conexão pelo ID."""
    conexao = db.query(Conexao).filter(Conexao.id == id).first()
    
    if conexao:
        # Atualiza os campos da conexão
        conexao.nome = nome
        conexao.tipo_sgbd = tipo_sgbd
        conexao.host = host
        conexao.porta = porta
        conexao.database = database
        conexao.usuario = usuario
        
        # Atualiza a senha apenas se for fornecida uma nova senha
        if senha:
            senha_bytes = senha.encode('utf-8')
            salt = bcrypt.gensalt()
            senha_hash = bcrypt.hashpw(senha_bytes, salt).decode('utf-8')
            conexao.senha_criptografada = senha_hash
        
        db.commit()
        return {"status": "sucesso", "mensagem": f"Conexão '{conexao.nome}' atualizada com sucesso!"}
    else:
        return {"status": "erro", "mensagem": f"Conexão com ID '{id}' não encontrada."}

def buscar_conexao(id: int, db):
    return db.query(Conexao).filter(Conexao.id == id).first()