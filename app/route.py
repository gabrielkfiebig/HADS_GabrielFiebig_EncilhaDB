from fastapi import FastAPI, Depends, Form, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from db import get_db

# Importa as funções de connections/conexao.py
from connections import conexao

# Cria a aplicação FastAPI
app = FastAPI()

# Configura a pasta de templates (Pasta do front-end)
templates = Jinja2Templates(directory="templates")

# Rota 1: Tela para cadastrar conexões com o banco de dados
@app.get("/cadastrar_conexoes")
def exibir_tela(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="cadastrar_conexoes.html", 
        context={"request": request}
    )

# Rota 2: Receber o formulário e salvar no banco
@app.post("/salvar_conexao")
def rota_salvar_conexao(
    nome: str = Form(...),
    tipo_sgbd: str = Form(...),
    host: str = Form(...),
    porta: int = Form(...),
    database: str = Form(...),
    usuario: str = Form(...),
    senha: str = Form(...),
    db: Session = Depends(get_db)
):
    # Chama a função limpa lá do conexao.py
    return conexao.salvar_conexao(
        nome=nome,
        tipo_sgbd=tipo_sgbd,
        host=host,
        porta=porta,
        database=database,
        usuario=usuario,
        senha=senha,
        db=db
    )

# Rota 3: Testar a conexão em tempo de execução (sem salvar no banco)
@app.post("/testar_conexao")
def rota_testar_conexao(
    tipo_sgbd: str = Form(...),
    host: str = Form(...),
    porta: int = Form(...),
    database: str = Form(...),
    usuario: str = Form(...),
    senha: str = Form(...)
):
    # Chama a função limpa lá do conexao.py
    return conexao.testar_conexao_endpoint(
        tipo_sgbd=tipo_sgbd,
        host=host,
        porta=porta,
        database=database,
        usuario=usuario,
        senha=senha
    )

# Rota 4: Listar as conexões salvas no banco de dados
@app.get("/listar_conexoes")
def listar_conexoes(request: Request, db: Session = Depends(get_db)):

    lista_conexoes = conexao.listar_conexoes(db)
    
    return templates.TemplateResponse(
        request=request, 
        name="listar_conexoes.html", 
        context={"request": request, "conexoes": lista_conexoes}
    )