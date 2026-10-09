from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

# Importações do seu projeto
from app.backend.db import get_db
from app.backend.connections import conexao

# Cria a aplicação FastAPI
app = FastAPI(title="API de Conexões de Banco de Dados")

# Configuração de CORS (Essencial para separar Front do Back)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas (Modelos Pydantic para receber JSON do Front-end)

class ConexaoCreateUpdate(BaseModel):
    nome: str
    tipo_sgbd: str
    host: str
    porta: int
    database: str
    usuario: str
    senha: str

class ConexaoTest(BaseModel):
    tipo_sgbd: str
    host: str
    porta: int
    database: str
    usuario: str
    senha: str

# Rotas da API Restful para gerenciar conexões de banco de dados

# 1. Listar todas as conexões (GET)
@app.get("/conexoes")
def listar_conexoes(db: Session = Depends(get_db)):
    lista_conexoes = conexao.listar_conexoes(db)
    return {"conexoes": lista_conexoes}

# 2. Buscar UMA conexão específica pelo ID (GET)
@app.get("/conexoes/{id}")
def buscar_conexao(id: int, db: Session = Depends(get_db)):
    conexao_atual = conexao.buscar_conexao(id, db)
    if conexao_atual is None:
        raise HTTPException(status_code=404, detail="Conexão não encontrada")
    return conexao_atual

# 3. Salvar nova conexão no banco (POST)
@app.post("/conexoes")
def salvar_conexao(dados: ConexaoCreateUpdate, db: Session = Depends(get_db)):
    # Os dados chegam como JSON e o Pydantic transforma no objeto 'dados'
    resultado = conexao.salvar_conexao(
        nome=dados.nome,
        tipo_sgbd=dados.tipo_sgbd,
        host=dados.host,
        porta=dados.porta,
        database=dados.database,
        usuario=dados.usuario,
        senha=dados.senha,
        db=db
    )
    return {"mensagem": "Conexão criada com sucesso!", "dados": resultado}

# 4. Atualizar uma conexão pelo ID (PUT)
@app.put("/conexoes/{id}")
def atualizar_conexao(id: int, dados: ConexaoCreateUpdate, db: Session = Depends(get_db)):
    resultado = conexao.atualizar_conexoes(
        id=id,
        nome=dados.nome,
        tipo_sgbd=dados.tipo_sgbd,
        host=dados.host,
        porta=dados.porta,
        database=dados.database,
        usuario=dados.usuario,
        senha=dados.senha,
        db=db
    )
    return {"mensagem": "Conexão atualizada com sucesso!", "dados": resultado}

# 5. Deletar uma conexão pelo ID (DELETE)
@app.delete("/conexoes/{id}")
def deletar_conexao(id: int, db: Session = Depends(get_db)):
    resultado = conexao.deletar_conexao(id, db)
    return {"mensagem": "Conexão deletada com sucesso", "resultado": resultado}

# 6. Testar a conexão em tempo de execução (POST)
@app.post("/conexoes/testar")
def testar_conexao(dados: ConexaoTest):
    resultado = conexao.testar_conexao_endpoint(
        tipo_sgbd=dados.tipo_sgbd,
        host=dados.host,
        porta=dados.porta,
        database=dados.database,
        usuario=dados.usuario,
        senha=dados.senha
    )
    return {"mensagem": "Teste de conexão concluído", "resultado": resultado}