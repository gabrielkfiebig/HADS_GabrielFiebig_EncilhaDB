import os
from dataclasses import dataclass
from ipaddress import ip_address, ip_network
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str
    origins: tuple[str, ...]
    networks: tuple
    host_map: dict


def load_settings():
    database_url = os.getenv("DATABASE_URL", "")
    try:
        url = make_url(database_url)
        if url.drivername != "postgresql+psycopg2" or not url.host or not url.database:
            raise ValueError()
        networks = tuple(ip_network(v.strip()) for v in
                         os.getenv("DB_ALLOWED_NETWORKS", "127.0.0.0/8,::1/128").split(","))
        host_map = {"localhost": "127.0.0.1"}
        for item in filter(None, os.getenv("DB_HOST_MAP", "").split(",")):
            name, address = item.strip().split("=", 1)
            host_map[name.lower().rstrip(".")] = str(ip_address(address))
        origins = tuple(v.strip() for v in os.getenv(
            "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","))
        allowed = {"http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:4173", "http://127.0.0.1:4173"}
        if not origins or any(v not in allowed for v in origins):
            raise ValueError()
    except (ValueError, TypeError, ArgumentError):
        raise RuntimeError("Configuração inválida. Confira DATABASE_URL, DB_ALLOWED_NETWORKS, DB_HOST_MAP e FRONTEND_ORIGINS no .env.") from None
    return Settings(database_url, origins, networks, host_map)


settings = load_settings()
