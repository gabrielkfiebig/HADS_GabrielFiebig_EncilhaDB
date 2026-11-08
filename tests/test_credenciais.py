"""Use temporary storage and synthetic passwords, never the application's vault."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import SecretStr
from app.backend.connections import credenciais


class CredentialTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        patch.object(credenciais, "_directory", self.directory).start()
        # The default suite verifies storage without accessing the user's Windows profile.
        self.payloads = {}
        def protect(data, decrypt=False):
            if decrypt:
                if data not in self.payloads:
                    raise OSError("Credencial corrompida.")
                return self.payloads[data]
            token = f"encrypted-test-token-{len(self.payloads)}".encode()
            self.payloads[token] = data
            return token
        patch.object(credenciais, "_proteger", side_effect=protect).start()
        self.addCleanup(patch.stopall)
        self.registro = SimpleNamespace(id=1, tipo_sgbd="postgresql", host="localhost", porta=5432,
                                        database="db", usuario="user")

    def test_encrypted_persistence_replacement_and_removal(self):
        credenciais.salvar(self.registro, SecretStr("senha-teste-ç-@123"))
        encrypted = (self.directory / "1.bin").read_bytes()
        self.assertNotIn("senha-teste-ç-@123".encode(), encrypted)
        self.assertEqual(credenciais.buscar(self.registro).get_secret_value(), "senha-teste-ç-@123")
        credenciais.salvar(self.registro, SecretStr("nova-senha"))
        self.assertEqual(credenciais.buscar(self.registro).get_secret_value(), "nova-senha")
        credenciais.excluir(1)
        self.assertFalse((self.directory / "1.bin").exists())
        self.assertEqual(list(self.directory.iterdir()), [])

    def test_missing_corrupt_and_changed_destination_are_rejected(self):
        with self.assertRaises(HTTPException) as caught:
            credenciais.buscar(self.registro)
        self.assertEqual(caught.exception.status_code, 409)
        credenciais.salvar(self.registro, SecretStr("senha-teste"))
        self.registro.database = "outro"
        with self.assertRaises(HTTPException):
            credenciais.buscar(self.registro)
        (self.directory / "1.bin").write_bytes(b"corrompido")
        with self.assertRaises(HTTPException) as caught:
            credenciais.buscar(self.registro)
        self.assertNotIn("corrompido", caught.exception.detail)


class NativeDpapiTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "nt" and os.environ.get("ENCILHADB_TEST_DPAPI") == "1",
                         "DPAPI nativo é opcional e requer perfil do Windows fora do sandbox")
    def test_native_encryption_round_trip(self):
        payload = "credencial-fictícia-ç-123".encode()
        encrypted = credenciais._proteger(payload)
        self.assertNotIn(payload, encrypted)
        self.assertEqual(credenciais._proteger(encrypted, decrypt=True), payload)
