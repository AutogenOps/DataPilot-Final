from dataclasses import dataclass
from urllib.parse import urlparse

from src.config.env import env


@dataclass(frozen=True)
class DatabricksConfig:
    host: str
    token: str
    timeout_ms: int


def _normalize_databricks_host(raw_host: str) -> str:
    raw_host = raw_host.strip()
    if not raw_host:
        raise ValueError("DATABRICKS_HOST is empty.")

    # Users often paste a full workspace URL with path/query (e.g. /?o=...).
    # The SDK expects the base origin only.
    candidate = raw_host if "://" in raw_host else f"https://{raw_host}"
    parsed = urlparse(candidate)

    if not parsed.scheme or not parsed.netloc:
        raise ValueError(
            "Invalid DATABRICKS_HOST. Use the workspace base URL like https://adb-xxxx.azuredatabricks.net"
        )

    return f"{parsed.scheme}://{parsed.netloc}"


def get_databricks_config() -> DatabricksConfig:
    if not env.databricks_host or not env.databricks_token:
        raise ValueError(
            "Databricks credentials are missing. Set DATABRICKS_HOST and DATABRICKS_TOKEN in backend/.env.local (preferred) or backend/.env."
        )

    return DatabricksConfig(
        host=_normalize_databricks_host(env.databricks_host),
        token=env.databricks_token,
        timeout_ms=env.databricks_timeout_ms,
    )
