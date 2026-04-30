from __future__ import annotations

from datetime import datetime, timezone

from databricks.sdk import WorkspaceClient

from src.clients.databricks_client import get_databricks_config
from src.tools.databricks.operations import run_with_retry


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _normalize_pipeline_status(raw_state: object | None) -> str:
    if raw_state is None:
        return "IDLE"

    value = getattr(raw_state, "value", None)
    state = (value if isinstance(value, str) else str(raw_state)).upper()
    if "." in state:
        state = state.split(".")[-1]

    if "RUNNING" in state:
        return "RUNNING"
    if "FAILED" in state:
        return "FAILED"
    if "STOP" in state:
        return "STOPPED"

    return "IDLE"


def _safe_latest_update_status(client: WorkspaceClient, pipeline_id: str) -> tuple[str | None, str | None]:
    """Best-effort pipeline status from latest update.

    Returns (status, last_updated_iso). If no updates are found or an error occurs,
    returns (None, None) and callers should fall back to pipeline fields.
    """

    try:
        resp = client.pipelines.list_updates(pipeline_id=pipeline_id, max_results=1)
        updates = getattr(resp, "updates", None)
        if not updates:
            return None, None

        latest = updates[0]
        raw_state = getattr(latest, "state", None)

        # creation_time appears to be ms epoch.
        creation_time = getattr(latest, "creation_time", None)
        last_updated_iso = None
        if isinstance(creation_time, (int, float)):
            try:
                last_updated_iso = datetime.fromtimestamp(
                    float(creation_time) / 1000.0, tz=timezone.utc
                ).isoformat()
            except Exception:
                last_updated_iso = None

        status = _normalize_pipeline_status(raw_state)
        return status, last_updated_iso
    except Exception:
        return None, None


def list_pipelines() -> dict:
    """List DLT pipelines for the UI.

    Note: the current frontend renders a DAG view. Databricks doesn't expose a
    simple table-dependency graph from this endpoint, so we return an empty
    `tables` list for now.
    """

    try:
        def _operation() -> dict:
            config = get_databricks_config()
            client = WorkspaceClient(host=config.host, token=config.token)

            pipelines_out: list[dict] = []

            for p in client.pipelines.list_pipelines():
                pipeline_id = getattr(p, "pipeline_id", None)
                name = getattr(p, "name", None)

                # Different SDK versions use different field names.
                raw_state = (
                    getattr(p, "state", None)
                    or getattr(p, "pipeline_state", None)
                    or getattr(p, "health", None)
                )

                last_updated = (
                    getattr(p, "last_modified_time", None)
                    or getattr(p, "last_updated", None)
                    or getattr(p, "update_time", None)
                )

                # Convert ms timestamps when possible.
                last_updated_iso = None
                if isinstance(last_updated, (int, float)):
                    try:
                        last_updated_iso = datetime.fromtimestamp(
                            float(last_updated) / 1000.0, tz=timezone.utc
                        ).isoformat()
                    except Exception:
                        last_updated_iso = None

                pipeline_id_str = str(pipeline_id or "").strip()

                # Prefer latest update state when available (more accurate for RUNNING).
                latest_status, latest_updated_iso = (
                    _safe_latest_update_status(client, pipeline_id_str)
                    if pipeline_id_str
                    else (None, None)
                )

                status = latest_status or _normalize_pipeline_status(raw_state)
                updated_iso = latest_updated_iso or last_updated_iso or _now_iso()

                pipelines_out.append(
                    {
                        "id": pipeline_id_str,
                        "name": name or "",
                        "status": status,
                        "lastUpdated": updated_iso,
                        "tables": [],
                    }
                )

            pipelines_out.sort(key=lambda x: (x.get("name") or "").lower())
            return {"ok": True, "pipelines": pipelines_out}

        return run_with_retry("databricks.pipelines.list", _operation)
    except ValueError as exc:
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Databricks credentials are missing or invalid. Set DATABRICKS_HOST and DATABRICKS_TOKEN.",
        }
    except Exception as exc:  # pragma: no cover
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Failed to list pipelines from Databricks. Check token permissions and network access.",
        }


def start_pipeline(pipeline_id: str) -> dict:
    """Start a DLT pipeline update."""
    try:
        pipeline_id = (pipeline_id or "").strip()
        if not pipeline_id:
            return {
                "ok": False,
                "errorType": "ValueError",
                "error": "pipelineId is required.",
                "message": "pipelineId is required.",
            }

        def _operation() -> dict:
            config = get_databricks_config()
            client = WorkspaceClient(host=config.host, token=config.token)

            # Databricks calls pipeline execution an "update".
            resp = client.pipelines.start_update(pipeline_id=pipeline_id)
            update_id = getattr(resp, "update_id", None)

            return {
                "ok": True,
                "pipelineId": pipeline_id,
                "updateId": str(update_id) if update_id is not None else None,
                "message": "Start requested.",
            }

        return run_with_retry(f"databricks.pipelines.start:{pipeline_id}", _operation)
    except ValueError as exc:
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": str(exc),
        }
    except Exception as exc:  # pragma: no cover
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Failed to start pipeline. Check token permissions.",
        }


def stop_pipeline(pipeline_id: str) -> dict:
    """Stop a running DLT pipeline."""
    try:
        pipeline_id = (pipeline_id or "").strip()
        if not pipeline_id:
            return {
                "ok": False,
                "errorType": "ValueError",
                "error": "pipelineId is required.",
                "message": "pipelineId is required.",
            }

        def _operation() -> dict:
            config = get_databricks_config()
            client = WorkspaceClient(host=config.host, token=config.token)

            client.pipelines.stop(pipeline_id=pipeline_id)

            return {
                "ok": True,
                "pipelineId": pipeline_id,
                "message": "Stop requested.",
            }

        return run_with_retry(f"databricks.pipelines.stop:{pipeline_id}", _operation)
    except ValueError as exc:
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": str(exc),
        }
    except Exception as exc:  # pragma: no cover
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "Failed to stop pipeline. Check token permissions.",
        }
