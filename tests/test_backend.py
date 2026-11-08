"""Isolated tests: SQLite in memory, mocked destination connections; no local DB access."""
import asyncio
import json
import os
import unittest
from unittest.mock import MagicMock, patch

# Do not use the developer's database or access policy in the test process.
os.environ["DATABASE_URL"] = "postgresql+psycopg2://test:test@localhost/test"
os.environ["DB_ALLOWED_NETWORKS"] = "127.0.0.0/8,::1/128"
os.environ["DB_HOST_MAP"] = ""
os.environ["FRONTEND_ORIGINS"] = "http://localhost:5173,http://127.0.0.1:5173"

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.backend import db as database
from app.backend.connections import conexao
from app.backend.connections import catalogo, credenciais
from app.backend.db import Base, Conexao, get_db
from app.backend.route import app
from app.backend.schemas import ConexaoCreateUpdate
from app.backend.settings import load_settings


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        app.dependency_overrides[get_db] = lambda: self.session
        self.probe = patch.object(conexao, "testar_conexao_endpoint", return_value={"status": "sucesso"}).start()
        self.save_secret = patch.object(credenciais, "salvar").start()
        self.delete_secret = patch.object(credenciais, "excluir").start()
        self.addCleanup(patch.stopall)
        self.addCleanup(app.dependency_overrides.clear)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.session.close)
        self.data = dict(nome="principal", tipo_sgbd="postgresql", host="localhost", porta=5433,
                         database="banco", usuario="usuario", senha="s@nh:a/#? especial")

    def request(self, method, path, data=None, client="127.0.0.1", origin=None, host="localhost", headers=None):
        async def run():
            sent = False
            messages = []
            raw = json.dumps(data).encode() if data is not None else b""
            request_headers = [(b"host", host.encode()), (b"content-type", b"application/json")]
            if origin:
                request_headers.append((b"origin", origin.encode()))
            request_headers.extend(headers or [])
            scope = dict(type="http", asgi={"version": "3.0", "spec_version": "2.4"},
                         http_version="1.1", method=method, scheme="http", path=path,
                         raw_path=path.encode(), query_string=b"", headers=request_headers,
                         client=(client, 12345), server=("127.0.0.1", 8000), root_path="")

            async def receive():
                nonlocal sent
                if not sent:
                    sent = True
                    return {"type": "http.request", "body": raw, "more_body": False}
                await asyncio.Event().wait()

            async def send(message):
                messages.append(message)

            await app(scope, receive, send)
            status = next(m["status"] for m in messages if m["type"] == "http.response.start")
            body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
            try:
                result = json.loads(body) if body else None
            except json.JSONDecodeError:
                result = body.decode()
            return status, result
        return asyncio.run(run())

    def test_crud_and_no_credentials(self):
        status, result = self.request("POST", "/conexoes", self.data)
        self.assertEqual(status, 201)
        id = result["dados"]["id"]
        self.assertEqual(result["dados"]["porta"], 5433)
        self.probe.assert_called_once()
        self.assertEqual(self.save_secret.call_args.args[1].get_secret_value(), self.data["senha"])
        for path in ("/conexoes", f"/conexoes/{id}"):
            status, body = self.request("GET", path)
            self.assertEqual(status, 200)
            self.assertNotIn("senha", json.dumps(body))
            self.assertNotIn(self.data["senha"], json.dumps(body))
        self.assertNotIn("senha_criptografada", Conexao.__table__.columns)
        status, result = self.request("PUT", f"/conexoes/{id}", {**self.data, "porta": 5444})
        self.assertEqual(status, 200)
        self.assertEqual(result["dados"]["porta"], 5444)
        self.assertEqual(self.probe.call_count, 2)
        self.assertEqual(self.request("DELETE", f"/conexoes/{id}")[0], 200)
        self.delete_secret.assert_called_once_with(id)
        self.assertEqual(self.request("GET", "/conexoes")[1], {"conexoes": []})

    def test_missing_records(self):
        for method in ("GET", "PUT", "DELETE"):
            self.assertEqual(self.request(method, "/conexoes/999", self.data if method == "PUT" else None)[0], 404)
        self.probe.assert_not_called()

    def test_duplicates_on_create_and_update(self):
        self.request("POST", "/conexoes", self.data)
        for update in ({"porta": 5555}, {"nome": "outro"}):
            self.assertEqual(self.request("POST", "/conexoes", {**self.data, **update})[0], 409)
        _, second = self.request("POST", "/conexoes", {**self.data, "nome": "segundo", "porta": 5555})
        id = second["dados"]["id"]
        for update in ({"porta": 5555}, {"nome": "segundo"}):
            self.assertEqual(self.request("PUT", f"/conexoes/{id}", {**self.data, **update})[0], 409)

    def test_validation_and_secret_redaction(self):
        for field, value in (("nome", " "), ("host", " "), ("usuario", ""), ("database", "x" * 101),
                             ("porta", 0), ("porta", 65536), ("porta", "5432"),
                             ("tipo_sgbd", "mysql"), ("senha", " "), ("host", "."),
                             ("senha", "segredo\x00"), ("nome", "nome\x00")):
            status, body = self.request("POST", "/conexoes", {**self.data, field: value})
            self.assertEqual(status, 422, (field, body))
            self.assertNotIn("input", json.dumps(body))
            self.assertNotIn(self.data["senha"], json.dumps(body))
        self.probe.assert_not_called()

    def test_test_endpoint_success_and_failure(self):
        data = {key: value for key, value in self.data.items() if key != "nome"}
        status, body = self.request("POST", "/conexoes/testar", data)
        self.assertEqual(status, 200)
        self.assertEqual(body["resultado"]["status"], "sucesso")
        self.probe.side_effect = HTTPException(400, "Falha no teste.")
        self.assertEqual(self.request("POST", "/conexoes/testar", data)[0], 400)

    def test_failed_test_never_writes(self):
        self.probe.side_effect = HTTPException(400, "Falha no teste.")
        self.assertEqual(self.request("POST", "/conexoes", self.data)[0], 400)
        self.assertEqual(self.session.query(Conexao).count(), 0)
        self.probe.side_effect = None
        _, body = self.request("POST", "/conexoes", self.data)
        self.probe.side_effect = HTTPException(400, "Falha no teste.")
        id = body["dados"]["id"]
        self.assertEqual(self.request("PUT", f"/conexoes/{id}", {**self.data, "porta": 5444})[0], 400)
        self.assertEqual(self.session.get(Conexao, id).porta, 5433)

    def test_access_control(self):
        self.assertEqual(self.request("GET", "/conexoes", client="192.168.1.20")[0], 403)
        self.assertEqual(self.request("GET", "/conexoes", origin="https://example.com")[0], 403)
        self.assertEqual(self.request("GET", "/conexoes", host="evil.example")[0], 400)
        self.assertEqual(self.request("POST", "/conexoes", self.data,
            headers=[(b"sec-fetch-site", b"cross-site")])[0], 403)
        self.assertEqual(self.request("GET", "/conexoes", origin="http://localhost:5173")[0], 200)

    def test_catalog_routes_use_saved_connection_and_do_not_return_password(self):
        _, saved = self.request("POST", "/conexoes", self.data)
        id = saved["dados"]["id"]
        with patch.object(catalogo, "abrir_catalogo") as abrir, \
             patch.object(catalogo, "listar_schemas", return_value=["public", "vendas"]), \
             patch.object(catalogo, "listar_tabelas", return_value=[{"schema": "public", "nome": "clientes", "tipo": "tabela"}]) as tabelas:
            status, body = self.request("GET", f"/conexoes/{id}/schemas")
            self.assertEqual((status, body), (200, {"schemas": ["public", "vendas"]}))
            self.assertEqual(abrir.call_args.args[0].database, self.data["database"])
            self.assertEqual(len(abrir.call_args.args), 1)
            status, body = self.request("POST", f"/conexoes/{id}/tabelas", {"schemas": ["public"]})
            self.assertEqual(status, 200)
            self.assertEqual(body["tabelas"][0]["nome"], "clientes")
            self.assertNotIn("segredo", json.dumps(body))
            self.assertEqual(tabelas.call_args.args[1], ["public"])

    def test_catalog_validation_and_missing_connection(self):
        with patch.object(catalogo, "abrir_catalogo") as abrir:
            self.assertEqual(self.request("GET", "/conexoes/999/schemas")[0], 404)
            for body in ({"schemas": []}, {"schemas": ["public"], "senha": "segredo"}, {"schemas": ["public"], "host": "outro"}):
                self.assertEqual(self.request("POST", "/conexoes/1/tabelas", body)[0], 422)
            abrir.assert_not_called()

    def test_missing_saved_credential_has_actionable_error(self):
        _, saved = self.request("POST", "/conexoes", self.data)
        id = saved["dados"]["id"]
        with patch.object(credenciais, "buscar", side_effect=HTTPException(409, "Edite e salve a conexão uma vez.")):
            status, body = self.request("GET", f"/conexoes/{id}/schemas")
            self.assertEqual(status, 409)
            self.assertIn("Edite e salve", body["detail"])


class CatalogTests(unittest.TestCase):
    def setUp(self):
        from pydantic import SecretStr
        conexao._attempts.clear()
        patch.object(credenciais, "buscar", return_value=SecretStr("segredo")).start()
        self.addCleanup(patch.stopall)

    def test_read_only_connection_and_cleanup(self):
        from types import SimpleNamespace
        from pydantic import SecretStr
        registro = SimpleNamespace(host="localhost", usuario="user", porta=5433, database="db")
        with patch.object(catalogo, "create_engine") as create:
            with catalogo.abrir_catalogo(registro):
                pass
            self.assertIn("default_transaction_read_only=on", create.call_args.kwargs["connect_args"]["options"])
            self.assertEqual(create.call_args.args[0].password, "segredo")
            create.return_value.dispose.assert_called_once()
        with patch.object(catalogo, "create_engine") as create:
            create.return_value.connect.side_effect = OperationalError("secret", {}, Exception("segredo"))
            with self.assertRaises(HTTPException) as caught:
                with catalogo.abrir_catalogo(registro):
                    pass
            self.assertNotIn("segredo", caught.exception.detail)
            create.return_value.dispose.assert_called_once()

    def test_schema_validation_and_parameterized_table_query(self):
        connection = MagicMock()
        connection.execute.return_value.scalars.return_value = ["public", "vendas"]
        connection.execute.return_value.mappings.return_value = [
            {"table_schema": "public", "table_name": "clientes", "table_type": "BASE TABLE"},
            {"table_schema": "vendas", "table_name": "resumo", "table_type": "VIEW"}]
        result = catalogo.listar_tabelas(connection, ["public", "vendas"])
        self.assertEqual(result[1], {"schema": "vendas", "nome": "resumo", "tipo": "visao"})
        self.assertEqual(connection.execute.call_args.args[1], {"schemas": ["public", "vendas"]})
        with self.assertRaises(HTTPException):
            catalogo.listar_tabelas(connection, ["public'); DROP TABLE x; --"])


class ConnectionTests(unittest.TestCase):
    def setUp(self):
        self.data = ConexaoCreateUpdate(nome="Teste", host="localhost", porta=5433,
                                       database="banco", usuario="user@name", senha="s@nh:a/#?")
        conexao._attempts.clear()

    def test_special_characters_timeout_and_cleanup(self):
        with patch.object(conexao, "create_engine") as create:
            conexao.testar_conexao_endpoint(self.data)
            url = create.call_args.args[0]
            self.assertEqual(url.password, "s@nh:a/#?")
            self.assertEqual(url.username, "user@name")
            self.assertEqual(url.port, 5433)
            args = create.call_args.kwargs["connect_args"]
            self.assertEqual(args["hostaddr"], "127.0.0.1")
            self.assertEqual(args["connect_timeout"], 5)
            create.return_value.dispose.assert_called_once()

    def test_failed_connections_are_sanitized_and_disposed(self):
        for message in ("password s@nh:a/#? rejected", "timeout", "host unavailable"):
            with patch.object(conexao, "create_engine") as create:
                create.return_value.connect.side_effect = OperationalError("secret SQL", {}, Exception(message))
                with self.assertRaises(HTTPException) as caught:
                    conexao.testar_conexao_endpoint(self.data)
                self.assertEqual(caught.exception.status_code, 400)
                self.assertNotIn(message, caught.exception.detail)
                create.return_value.dispose.assert_called_once()

    def test_destination_policy(self):
        for host in ("169.254.169.254", "192.168.1.1", "example.com", "0.0.0.0", "::"):
            with self.assertRaises(HTTPException):
                conexao.destino_permitido(host)
        self.assertEqual(conexao.destino_permitido("::1"), "::1")

    def test_rate_and_concurrent_limits(self):
        with patch.object(conexao, "create_engine"):
            for _ in range(20):
                conexao.testar_conexao_endpoint(self.data)
            with self.assertRaises(HTTPException) as caught:
                conexao.testar_conexao_endpoint(self.data)
            self.assertEqual(caught.exception.status_code, 429)
        conexao._attempts.clear()
        conexao._slots.acquire()
        conexao._slots.acquire()
        try:
            with self.assertRaises(HTTPException) as caught:
                conexao.testar_conexao_endpoint(self.data)
            self.assertEqual(caught.exception.status_code, 429)
        finally:
            conexao._slots.release()
            conexao._slots.release()

    def test_transaction_rollback(self):
        db = MagicMock()
        db.commit.side_effect = IntegrityError("secret SQL", {}, Exception("secret"))
        with self.assertRaises(HTTPException) as caught:
            conexao.commit(db)
        self.assertEqual(caught.exception.status_code, 409)
        db.rollback.assert_called_once()

    def test_database_rejects_concurrent_duplicates(self):
        engine = create_engine("sqlite://")
        try:
            Base.metadata.create_all(engine)
            values = self.data.model_dump(exclude={"senha"})
            with engine.begin() as conn:
                conn.execute(Conexao.__table__.insert().values(**values))
            for other in ({**values, "porta": 5555}, {**values, "nome": "outro"}):
                with self.assertRaises(IntegrityError):
                    with engine.begin() as conn:
                        conn.execute(Conexao.__table__.insert().values(**other))
        finally:
            engine.dispose()

    def test_legacy_schema_requires_manual_migration(self):
        inspector = MagicMock()
        inspector.has_table.return_value = True
        inspector.get_columns.return_value = [{"name": "senha_criptografada"}]
        with patch.object(database, "inspect", return_value=inspector), patch.object(Base.metadata, "create_all") as create:
            with self.assertRaisesRegex(RuntimeError, "Banco legado"):
                database.initialize_database()
            create.assert_not_called()

    def test_invalid_settings_are_sanitized(self):
        with patch.dict(os.environ, {"DATABASE_URL": "secret-invalid"}):
            with self.assertRaises(RuntimeError) as caught:
                load_settings()
            self.assertNotIn("secret-invalid", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
