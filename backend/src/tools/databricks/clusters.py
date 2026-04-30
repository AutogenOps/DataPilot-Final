from __future__ import annotations

import math
from datetime import datetime, timezone

from databricks.sdk import WorkspaceClient

from src.clients.databricks_client import get_databricks_config


def _format_total_memory_gb(total_gb: float) -> str:
    if not math.isfinite(total_gb) or total_gb <= 0:
        return "—"

    rounded = int(round(total_gb))
    # Prefer clean integers like "128 GB".
    if abs(total_gb - rounded) < 0.05:
        return f"{rounded} GB"

    return f"{total_gb:.1f} GB"


def _format_uptime(start_time_ms: int) -> str:
    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    delta_ms = max(0, now_ms - int(start_time_ms))

    seconds = delta_ms // 1000
    days = seconds // 86400
    hours = (seconds % 86400) // 3600

    if days > 0:
        return f"{days}d {hours}h"
    minutes = (seconds % 3600) // 60
    return f"{hours}h {minutes}m"


def _normalize_cluster_state(raw_state: object) -> str:
    if raw_state is None:
        return "UNKNOWN"

    # databricks-sdk may return an Enum for `state`.
    value = getattr(raw_state, "value", None)
    state = (value if isinstance(value, str) else str(raw_state)).upper()

    # Frontend's `ClusterState` union is intentionally narrow.
    if state == "RESIZING":
        return "PENDING"

    # Normalize common Enum string forms like "STATE.RUNNING".
    if "." in state:
        state = state.split(".")[-1]

    return state


def list_clusters() -> dict:
    """List Databricks compute clusters for the UI."""
    try:
        config = get_databricks_config()
        client = WorkspaceClient(host=config.host, token=config.token)

        # Enrich with node type specs so we can compute cores/memory.
        node_types_resp = client.clusters.list_node_types()
        node_type_by_id = {
            nt.node_type_id: nt for nt in (getattr(node_types_resp, "node_types", None) or [])
        }

        clusters_out: list[dict] = []

        for c in client.clusters.list():
            cluster_id = getattr(c, "cluster_id", None)
            cluster_name = getattr(c, "cluster_name", None)
            state = _normalize_cluster_state(getattr(c, "state", None))

            num_workers = getattr(c, "num_workers", None)
            autoscale = getattr(c, "autoscale", None)
            if num_workers is None and autoscale is not None:
                num_workers = getattr(autoscale, "max_workers", None)

            workers = int(num_workers or 0)

            worker_node_type_id = getattr(c, "node_type_id", None)
            driver_node_type_id = getattr(c, "driver_node_type_id", None) or worker_node_type_id

            worker_nt = node_type_by_id.get(worker_node_type_id)
            driver_nt = node_type_by_id.get(driver_node_type_id)

            worker_cores = int(getattr(worker_nt, "num_cores", 0) or 0)
            worker_mem_mb = float(getattr(worker_nt, "memory_mb", 0) or 0)

            driver_cores = int(getattr(driver_nt, "num_cores", 0) or 0)
            driver_mem_mb = float(getattr(driver_nt, "memory_mb", 0) or 0)

            total_cores = driver_cores + (worker_cores * workers if workers > 0 else 0)
            total_mem_gb = (driver_mem_mb + (worker_mem_mb * workers if workers > 0 else 0)) / 1024.0

            start_time_ms = getattr(c, "start_time", None)
            uptime = None
            if state == "RUNNING" and start_time_ms is not None:
                try:
                    uptime = _format_uptime(int(start_time_ms))
                except Exception:
                    uptime = None

            clusters_out.append(
                {
                    "id": cluster_id or "",
                    "name": cluster_name or "",
                    "state": state,
                    "cores": total_cores,
                    "memory": _format_total_memory_gb(total_mem_gb),
                    "workers": workers,
                    "uptime": uptime,
                }
            )

        # Keep a stable order.
        clusters_out.sort(key=lambda x: (x.get("name") or "").lower())

        return {"ok": True, "clusters": clusters_out}
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
            "message": "Failed to list clusters from Databricks. Check token permissions and network access.",
        }


def terminate_cluster(cluster_id: str) -> dict:
    """Terminate a Databricks cluster."""
    try:
        cluster_id = (cluster_id or "").strip()
        if not cluster_id:
            return {
                "ok": False,
                "errorType": "ValueError",
                "error": "clusterId is required.",
                "message": "clusterId is required.",
            }

        config = get_databricks_config()
        client = WorkspaceClient(host=config.host, token=config.token)

        # Databricks calls this "delete", but it terminates the running cluster.
        client.clusters.delete(cluster_id=cluster_id)

        return {
            "ok": True,
            "clusterId": cluster_id,
            "message": "Terminate requested.",
        }
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
            "message": "Failed to terminate cluster. Check token permissions.",
        }


def start_cluster(cluster_id: str) -> dict:
    """Start a Databricks cluster."""
    try:
        cluster_id = (cluster_id or "").strip()
        if not cluster_id:
            return {
                "ok": False,
                "errorType": "ValueError",
                "error": "clusterId is required.",
                "message": "clusterId is required.",
            }

        config = get_databricks_config()
        client = WorkspaceClient(host=config.host, token=config.token)

        # Starts a terminated cluster.
        client.clusters.start(cluster_id=cluster_id)

        return {
            "ok": True,
            "clusterId": cluster_id,
            "message": "Start requested.",
        }
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
            "message": "Failed to start cluster. Check token permissions.",
        }
