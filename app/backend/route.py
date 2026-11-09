from contextlib import asynccontextmanager
from ipaddress import ip_address
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.middleware.trustedhost import TrustedHostMiddleware
from app.backend.connections import conexao
from app.backend.connections import catalogo
from app.backend.connections import analise
from app.backend.schemas import PedidoAnalise
from app.backend.schemas import ConsultaTabelas, ListaSchemas, ListaTabelas
from app.backend.db import get_db, initialize_database
from app.backend.schemas import ConexaoCreateUpdate, ConexaoPublica, ConexaoSalva, ConexaoTest, ListaConexoes
from app.backend.settings import settings
from app.backend import analises
from app.backend.schemas import SalvarAnalise, AnaliseCompleta, ListaAnalises


@asynccontextmanager
async def lifespan(app):
    initialize_database()
    yield


app = FastAPI(title="EncilhaDB — PostgreSQL local", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=list(settings.origins),
                   allow_credentials=False, allow_methods=["GET", "POST", "PUT", "DELETE"],
                   allow_headers=["Content-Type"])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "[::1]"])


@app.middleware("http")
async def acesso_local(request: Request, call_next):
    try:
        local = request.client and ip_address(request.client.host).is_loopback
    except ValueError:
        local = False
    if not local:
        return JSONResponse(status_code=403, content={"detail": "Acesso permitido somente na própria máquina."})
    origin = request.headers.get("origin")
    if origin and origin not in settings.origins:
        return JSONResponse(status_code=403, content={"detail": "Origem não autorizada."})
    if request.headers.get("sec-fetch-site") == "cross-site" and origin not in settings.origins:
        return JSONResponse(status_code=403, content={"detail": "Origem não autorizada."})
    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def validacao_invalida(request, exc):
    # Never echo input: validation errors can contain credentials.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]})


@app.exception_handler(SQLAlchemyError)
async def banco_indisponivel(request, exc):
    return JSONResponse(status_code=503, content={"detail": "Banco da aplicação indisponível. Tente novamente."})


@app.get("/conexoes", response_model=ListaConexoes)
def listar_conexoes(db: Session = Depends(get_db)):
    return {"conexoes": conexao.listar_conexoes(db)}


@app.get("/conexoes/{id}", response_model=ConexaoPublica)
def buscar_conexao(id: int, db: Session = Depends(get_db)):
    return conexao.buscar_conexao(id, db)


@app.post("/conexoes", status_code=201, response_model=ConexaoSalva)
def salvar_conexao(dados: ConexaoCreateUpdate, db: Session = Depends(get_db)):
    return {"mensagem": "Conexão criada com sucesso!", "dados": conexao.salvar_conexao(dados, db)}


@app.put("/conexoes/{id}", response_model=ConexaoSalva)
def atualizar_conexao(id: int, dados: ConexaoCreateUpdate, db: Session = Depends(get_db)):
    return {"mensagem": "Conexão atualizada com sucesso!", "dados": conexao.salvar_conexao(dados, db, id)}


@app.delete("/conexoes/{id}")
def deletar_conexao(id: int, db: Session = Depends(get_db)):
    conexao.deletar_conexao(id, db)
    return {"mensagem": "Conexão excluída com sucesso!"}


@app.post("/conexoes/testar")
def testar_conexao(dados: ConexaoTest):
    return {"resultado": conexao.testar_conexao_endpoint(dados)}


@app.get("/conexoes/{id}/schemas", response_model=ListaSchemas)
def consultar_schemas(id: int, db: Session = Depends(get_db)):
    registro = conexao.buscar_conexao(id, db)
    with catalogo.abrir_catalogo(registro) as connection:
        schemas = catalogo.listar_schemas(connection)
    conexao.registrar_uso(registro, db)
    return {"schemas": schemas}


@app.post("/conexoes/{id}/tabelas", response_model=ListaTabelas)
def consultar_tabelas(id: int, dados: ConsultaTabelas, db: Session = Depends(get_db)):
    registro = conexao.buscar_conexao(id, db)
    with catalogo.abrir_catalogo(registro) as connection:
        tabelas = catalogo.listar_tabelas(connection, dados.schemas)
    conexao.registrar_uso(registro, db)
    return {"tabelas": tabelas}


@app.post("/conexoes/{id}/analises")
def analisar_metadados(id: int, dados: PedidoAnalise, db: Session = Depends(get_db)):
    registro = conexao.buscar_conexao(id, db)
    with catalogo.abrir_catalogo(registro) as connection:
        resultado = analise.analisar(connection, registro, dados)
    conexao.registrar_uso(registro, db)
    return resultado


@app.post("/conexoes/{id}/testar")
def testar_conexao_salva(id: int, db: Session = Depends(get_db)):
    return conexao.testar_conexao_salva(id, db)


@app.get("/analises", response_model=ListaAnalises)
def listar_analises(db: Session = Depends(get_db)):
    return {"analises": analises.listar(db)}


@app.post("/analises", response_model=AnaliseCompleta, status_code=201)
def salvar_analise(dados: SalvarAnalise, db: Session = Depends(get_db)):
    return analises.salvar(dados, db)


@app.get("/analises/{id}", response_model=AnaliseCompleta)
def buscar_analise(id: int, db: Session = Depends(get_db)):
    return analises.buscar(id, db)


@app.put("/analises/{id}", response_model=AnaliseCompleta)
def atualizar_analise(id: int, dados: SalvarAnalise, db: Session = Depends(get_db)):
    return analises.salvar(dados, db, id)


@app.delete("/analises/{id}")
def excluir_analise(id: int, db: Session = Depends(get_db)):
    return analises.excluir(id, db)
