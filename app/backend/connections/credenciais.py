"""Credentials encrypted with Windows DPAPI for the current Windows user."""
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
from threading import Lock

from fastapi import HTTPException
from pydantic import SecretStr

_directory = Path(__file__).resolve().parents[3] / ".credentials"
_lock = Lock()


class _Blob(ctypes.Structure):
    _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_ubyte))]


def _proteger(data, decrypt=False):
    if os.name != "nt":
        raise OSError("O armazenamento de credenciais requer Windows.")
    crypt = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    buffer = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    source = _Blob(len(data), buffer)
    target = _Blob()
    function = crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    function.argtypes = [ctypes.POINTER(_Blob), ctypes.c_void_p, ctypes.c_void_p,
                         ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(_Blob)]
    function.restype = wintypes.BOOL
    try:
        # UI_FORBIDDEN: never prompt from the server process.
        if not function(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(target)):
            raise ctypes.WinError(ctypes.get_last_error())
        return ctypes.string_at(target.data, target.size)
    finally:
        if target.data:
            kernel.LocalFree(ctypes.cast(target.data, ctypes.c_void_p))


def _destino(registro):
    return [registro.tipo_sgbd, registro.host, registro.porta, registro.database, registro.usuario]


def salvar(registro, senha):
    try:
        payload = json.dumps({"destino": _destino(registro), "senha": senha.get_secret_value()}).encode("utf-8")
        encrypted = _proteger(payload)
        with _lock:
            _directory.mkdir(parents=True, exist_ok=True)
            path = _directory / f"{registro.id}.bin"
            temporary = path.with_suffix(".tmp")
            try:
                temporary.write_bytes(encrypted)
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)
    except OSError:
        raise HTTPException(503, "Os parâmetros foram salvos, mas não foi possível proteger a credencial no Windows. Edite e salve a conexão novamente.") from None


def buscar(registro):
    try:
        with _lock:
            encrypted = (_directory / f"{registro.id}.bin").read_bytes()
        payload = json.loads(_proteger(encrypted, decrypt=True).decode("utf-8"))
        if payload["destino"] != _destino(registro) or not isinstance(payload["senha"], str) or not payload["senha"]:
            raise ValueError("Credencial desatualizada.")
        return SecretStr(payload["senha"])
    except (OSError, ValueError, KeyError, TypeError):
        raise HTTPException(409, "A credencial desta conexão não está disponível. Edite e salve a conexão uma vez para habilitar a consulta de schemas e tabelas.") from None


def excluir(id):
    try:
        with _lock:
            (_directory / f"{id}.bin").unlink(missing_ok=True)
    except OSError:
        raise HTTPException(503, "Não foi possível remover a credencial protegida. Tente excluir novamente.") from None
