from datetime import datetime, timezone
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, SecretStr, StringConstraints, field_validator, model_validator

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


Identificador = Annotated[str, StringConstraints(min_length=1, max_length=63)]


class TabelaSelecionada(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_nome: Identificador = Field(alias="schema")
    nome: Identificador


class PedidoAnalise(ConsultaTabelas):
    tabelas: list[TabelaSelecionada] = Field(min_length=1, max_length=500)


class ColunaSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nome: Identificador
    tipo: str = Field(min_length=1, max_length=1000)
    aceita_nulo: bool
    chave_primaria: bool


class TabelaSnapshot(TabelaSelecionada):
    id: str = Field(min_length=1, max_length=1000)
    colunas: list[ColunaSnapshot] = Field(max_length=2000)
    chaves_unicas: list[list[Identificador]] = Field(default_factory=list, max_length=2000)
    descricao: str = Field(default="", max_length=2000)
    regras: str = Field(default="", max_length=2000)
    tipo_principal: Literal["", "Cadastro", "Transações/eventos", "Histórico", "Complemento de outra tabela", "Outro / Não sei"] = ""
    tipo_descricao: str = Field(default="", max_length=1000)
    descricao_aprovada: bool = False

    @model_validator(mode="after")
    def validar_descricao_aprovada(self):
        if self.descricao_aprovada and (not self.descricao.strip() or not self.tipo_principal or
                (self.tipo_principal == "Outro / Não sei" and not self.tipo_descricao.strip())):
            raise ValueError("Preencha a finalidade e o tipo da tabela antes de aprovar a descrição.")
        return self


class RelacaoSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    origem: str = Field(min_length=1, max_length=1000)
    destino: str = Field(min_length=1, max_length=1000)
    colunas_origem: list[Identificador] = Field(min_length=1, max_length=1000)
    colunas_destino: list[Identificador] = Field(min_length=1, max_length=1000)
    nome: str = Field(max_length=255)
    tipo: Literal["declarada", "sugerida", "manual"]
    confirmada: bool = False
    titulo: str = Field(default="", max_length=150)
    descricao: str = Field(default="", max_length=2000)


class SnapshotAnalise(ConsultaTabelas):
    analisado_em: datetime
    tabelas: list[TabelaSnapshot] = Field(min_length=1, max_length=500)
    relacoes: list[RelacaoSnapshot] = Field(max_length=100000)
    avisos: list[Annotated[str, StringConstraints(max_length=2000)]] = Field(default_factory=list, max_length=100000)

    @model_validator(mode="after")
    def validar_grafo(self):
        tabelas = {t.id: t for t in self.tabelas}
        if len(tabelas) != len(self.tabelas) or any(t.schema_nome not in self.schemas for t in self.tabelas):
            raise ValueError("Tabelas duplicadas ou fora dos schemas da análise.")
        colunas = {t.id: {c.nome for c in t.colunas} for t in self.tabelas}
        for r in self.relacoes:
            if (r.origem not in tabelas or r.destino not in tabelas or
                    len(r.colunas_origem) != len(r.colunas_destino) or
                    len(set(r.colunas_origem)) != len(r.colunas_origem) or
                    len(set(r.colunas_destino)) != len(r.colunas_destino) or
                    not set(r.colunas_origem) <= colunas.get(r.origem, set()) or
                    not set(r.colunas_destino) <= colunas.get(r.destino, set())):
                raise ValueError("Uma relação possui tabelas ou colunas inválidas.")
        return self


class SalvarAnalise(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nome: Text100
    descricao: Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)] = ""
    conexao_id: int = Field(gt=0, strict=True)
    database_origem: Text100
    snapshot: SnapshotAnalise


class AnaliseResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    descricao: str
    database: str
    conexao_id: int
    data_criacao: datetime

    @field_validator("data_criacao")
    @classmethod
    def data_utc(cls, value):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class AnaliseCompleta(AnaliseResumo):
    conteudo: dict


class ListaAnalises(BaseModel):
    analises: list[AnaliseResumo]
