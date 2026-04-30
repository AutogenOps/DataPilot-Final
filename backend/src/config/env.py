import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_LOCAL = _BACKEND_ROOT / ".env.local"
_ENV_DEFAULT = _BACKEND_ROOT / ".env"
_ENV_FILE = _ENV_LOCAL if _ENV_LOCAL.is_file() else _ENV_DEFAULT


class Environment(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    backend_mode: str = Field(default="http", alias="BACKEND_MODE")

    node_env: str = Field(default="development", alias="NODE_ENV")
    port: int = Field(default=8080, alias="PORT")
    log_level: str = Field(default="info", alias="LOG_LEVEL")

    mcp_server_name: str = Field(default="databricks-mcp-server", alias="MCP_SERVER_NAME")
    mcp_server_version: str = Field(default="0.1.0", alias="MCP_SERVER_VERSION")
    mcp_transport: str = Field(default="stdio", alias="MCP_TRANSPORT")
    mcp_host: str = Field(default="127.0.0.1", alias="MCP_HOST")
    mcp_port: int = Field(default=3001, alias="MCP_PORT")

    databricks_host: str | None = Field(default=None, alias="DATABRICKS_HOST")
    databricks_token: str | None = Field(default=None, alias="DATABRICKS_TOKEN")
    databricks_warehouse_id: str | None = Field(default=None, alias="DATABRICKS_WAREHOUSE_ID")
    databricks_default_catalog: str | None = Field(default=None, alias="DATABRICKS_DEFAULT_CATALOG")
    databricks_default_schema: str | None = Field(default=None, alias="DATABRICKS_DEFAULT_SCHEMA")
    databricks_timeout_ms: int = Field(default=15000, alias="DATABRICKS_TIMEOUT_MS")
    databricks_retry_attempts: int = Field(default=3, alias="DATABRICKS_RETRY_ATTEMPTS")
    databricks_retry_delay_seconds: float = Field(default=1.0, alias="DATABRICKS_RETRY_DELAY_SECONDS")

    alert_email_to: str = Field(default="arushverma767@gmail.com", alias="ALERT_EMAIL_TO")
    alert_email_from: str | None = Field(default=None, alias="ALERT_EMAIL_FROM")
    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_username: str | None = Field(default=None, alias="SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")

    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-3-7-sonnet-latest", alias="ANTHROPIC_MODEL")
    anthropic_max_tokens: int = Field(default=1024, alias="ANTHROPIC_MAX_TOKENS")
    anthropic_temperature: float = Field(default=0.2, alias="ANTHROPIC_TEMPERATURE")
    ai_provider: str = Field(default="mock", alias="AI_PROVIDER")
    ai_mock_enabled: bool = Field(default=True, alias="AI_MOCK_ENABLED")

    cors_allowed_origin: str = Field(default="http://localhost:5173", alias="CORS_ALLOWED_ORIGIN")

    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")


def _validate_runtime() -> None:
    # Keep initialization side effects explicit in one place.
    os.environ.setdefault("PYTHONUNBUFFERED", "1")


env = Environment()
_validate_runtime()
