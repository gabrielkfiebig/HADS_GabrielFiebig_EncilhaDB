from datetime import datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, SecretStr, StringConstraints, field_validator

Text100 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Host = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class ConexaoTest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tipo_sgbd: Literal["postgresql"] = "postgresql"
    host: Host
    porta: int = Field(ge=1, le=65535, strict=True)
    database: Text100
    usuario: Text100
    senha: SecretStr = Field(min_length=1, max_length=1024)

    @field_validator("senha")
    @classmethod
    def senha_nao_vazia(cls, value):
        if not value.get_secret_value().strip():
            raise ValueError("Informe uma senha não vazia.")
        return value

    @field_validator("host")
    @classmethod
    def normalizar_host(cls, value):
        value = value.lower().rstrip(".")
        if not value:
            raise ValueError("Informe um host não vazio.")
        return value

    @field_validator("*", check_fields=False)
    @classmethod
    def rejeitar_nulo(cls, value):
        text = value.get_secret_value() if isinstance(value, SecretStr) else value
        if isinstance(text, str) and "\x00" in text:
            raise ValueError("O campo contém um caractere inválido.")
        return value


class ConexaoCreateUpdate(ConexaoTest):
    nome: Text100


class ConexaoPublica(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    tipo_sgbd: str
    host: str
    porta: int
    database: str
    usuario: str
    data_cadastro: datetime


class ListaConexoes(BaseModel):
    conexoes: list[ConexaoPublica]


class ConexaoSalva(BaseModel):
    mensagem: str
    dados: ConexaoPublica


class ConsultaTabelas(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schemas: list[Annotated[str, StringConstraints(min_length=1, max_length=63)]] = Field(min_length=1, max_length=1000)


class ListaSchemas(BaseModel):
    schemas: list[str]


class TabelaDisponivel(BaseModel):
    schema_nome: str = Field(alias="schema")
    nome: str
    tipo: Literal["tabela", "visao"]


class ListaTabelas(BaseModel):
    tabelas: list[TabelaDisponivel]
