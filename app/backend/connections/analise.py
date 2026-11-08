"""Metadata only: no queries against user table records."""
from datetime import datetime, timezone
import json
from fastapi import HTTPException
from sqlalchemy import inspect

from app.backend.connections import catalogo


def identificar(schema, nome):
    # JSON arrays avoid collisions when identifiers contain dots.
    return json.dumps([schema, nome], ensure_ascii=False, separators=(",", ":"))


def sugerir_relacoes(tabelas, declaradas):
    sugestoes = []
    existentes = {(r["origem"], tuple(r["colunas_origem"]), r["destino"], tuple(r["colunas_destino"])) for r in declaradas}
    for destino in tabelas:
        colunas_destino = {c["nome"]: c for c in destino["colunas"]}
        for chave in destino["chaves_unicas"]:
            if not chave or any(c not in colunas_destino for c in chave):
                continue
            for origem in tabelas:
                if origem["id"] == destino["id"]:
                    continue
                colunas_origem = {c["nome"]: c for c in origem["colunas"]}
                nomes = []
                for coluna in chave:
                    candidatos = [coluna] if coluna.lower() not in {"id", "codigo", "code", "uuid"} else []
                    # Common conventions: clientes.id -> cliente_id or clientes_id.
                    bases = {destino["nome"], destino["nome"].removesuffix("s")}
                    candidatos += [f"{base}_{coluna}" for base in sorted(bases)]
                    candidato = next((nome for nome in candidatos if nome in colunas_origem and
                                      colunas_origem[nome]["tipo"] == colunas_destino[coluna]["tipo"]), None)
                    if candidato is None:
                        break
                    nomes.append(candidato)
                if len(nomes) != len(chave) or len(set(nomes)) != len(nomes):
                    continue
                assinatura = (origem["id"], tuple(nomes), destino["id"], tuple(chave))
                if assinatura in existentes:
                    continue
                existentes.add(assinatura)
                sugestoes.append({"origem": origem["id"], "destino": destino["id"],
                                  "colunas_origem": nomes, "colunas_destino": chave,
                                  "nome": "Possível relação por nome e tipo", "tipo": "sugerida"})
    return sugestoes


def analisar(connection, registro, pedido):
    schemas = list(dict.fromkeys(pedido.schemas))
    selecionadas = list(dict.fromkeys((t.schema_nome, t.nome) for t in pedido.tabelas))
    if any(schema not in schemas for schema, _ in selecionadas):
        raise HTTPException(422, "Todas as tabelas devem pertencer aos schemas selecionados.")
    disponiveis = {(t["schema"], t["nome"]) for t in catalogo.listar_tabelas(connection, schemas)}
    if not set(selecionadas).issubset(disponiveis):
        raise HTTPException(400, "Uma tabela selecionada não está mais disponível. Revise a seleção.")
    inspector = inspect(connection)
    tabelas, relacoes = [], []
    avisos = []
    for schema, nome in selecionadas:
        id = identificar(schema, nome)
        pk = inspector.get_pk_constraint(nome, schema=schema).get("constrained_columns") or []
        unicas = [pk] if pk else []
        unicas += [u["column_names"] for u in inspector.get_unique_constraints(nome, schema=schema) if u.get("column_names")]
        colunas = [{"nome": c["name"], "tipo": str(c["type"]), "aceita_nulo": bool(c.get("nullable", True)),
                    "chave_primaria": c["name"] in pk} for c in inspector.get_columns(nome, schema=schema)]
        tabelas.append({"id": id, "schema": schema, "nome": nome, "colunas": colunas, "chaves_unicas": unicas})
        for fk in inspector.get_foreign_keys(nome, schema=schema, postgresql_ignore_search_path=True):
            destino_schema = fk.get("referred_schema") or schema
            destino_nome = fk["referred_table"]
            if (destino_schema, destino_nome) not in selecionadas:
                avisos.append(f'{schema}.{nome}: a chave {fk.get("name") or "sem nome"} referencia {destino_schema}.{destino_nome}, fora da seleção.')
                continue
            relacoes.append({"origem": id, "destino": identificar(destino_schema, destino_nome),
                             "colunas_origem": fk["constrained_columns"], "colunas_destino": fk["referred_columns"],
                             "nome": fk.get("name") or "Chave estrangeira", "tipo": "declarada"})
    relacoes += sugerir_relacoes(tabelas, relacoes)
    for relacao in relacoes:
        relacao.update(confirmada=False, titulo="", descricao="")
    ligadas = {id for r in relacoes for id in (r["origem"], r["destino"])}
    return {"conexao": {"id": registro.id, "nome": registro.nome, "database": registro.database},
            "analisado_em": datetime.now(timezone.utc).isoformat(), "schemas": schemas,
            "tabelas": tabelas, "relacoes": relacoes,
            "sem_relacao": [t["id"] for t in tabelas if t["id"] not in ligadas], "avisos": avisos}
