import requests

from src.clients.databricks_client import get_databricks_config


def _timeout_seconds(timeout_ms: int) -> float:
    return max(1.0, timeout_ms / 1000.0)


def validate_databricks_connection_config() -> dict:
    try:
        config = get_databricks_config()
        return {
            "ok": True,
            "host": config.host,
            "timeoutMs": config.timeout_ms,
            "message": "Databricks config is present.",
        }
    except Exception as exc:
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Databricks credentials are missing or invalid. Set DATABRICKS_HOST and DATABRICKS_TOKEN.",
        }


def ping_databricks_api() -> dict:
    """Validate Databricks token/host by performing a lightweight API call."""
    try:
        config = get_databricks_config()

        response = requests.get(
            f"{config.host}/api/2.0/preview/scim/v2/Me",
            headers={"Authorization": f"Bearer {config.token}"},
            timeout=_timeout_seconds(config.timeout_ms),
        )
        response.raise_for_status()
        me = response.json()

        return {
            "ok": True,
            "workspaceConfigured": True,
            "userName": me.get("userName"),
            "displayName": me.get("displayName"),
            "message": "Databricks API reachable.",
        }
    except ValueError as exc:
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Databricks credentials are missing or invalid. Set DATABRICKS_HOST and DATABRICKS_TOKEN.",
        }
    except requests.Timeout as exc:
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Timed out reaching Databricks. Check network access and workspace host.",
        }
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "statusCode": status_code,
            "message": "Databricks rejected the request. Check token validity and workspace permissions.",
        }
    except Exception as exc:  # pragma: no cover
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Failed to reach Databricks API. Check host/token permissions and network access.",
        }
