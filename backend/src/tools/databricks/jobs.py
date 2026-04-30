from __future__ import annotations

from datetime import datetime, timezone

from databricks.sdk import WorkspaceClient

from src.clients.databricks_client import get_databricks_config
from src.tools.databricks.operations import run_with_retry


def _iso_from_ms(ts_ms: int | None) -> str | None:
    if ts_ms is None:
        return None
    try:
        return datetime.fromtimestamp(int(ts_ms) / 1000.0, tz=timezone.utc).isoformat()
    except Exception:
        return None


def _normalize_job_status(life_cycle_state: object | None, result_state: object | None) -> str:
    # Databricks SDK may return Enums; normalize to uppercase strings.
    lcs_value = getattr(life_cycle_state, "value", None)
    lcs = (lcs_value if isinstance(lcs_value, str) else str(life_cycle_state or "")).upper()
    if "." in lcs:
        lcs = lcs.split(".")[-1]

    rs_value = getattr(result_state, "value", None)
    rs = (rs_value if isinstance(rs_value, str) else str(result_state or "")).upper()
    if "." in rs:
        rs = rs.split(".")[-1]

    if lcs in {"RUNNING"}:
        return "RUNNING"

    if lcs in {"PENDING", "QUEUED"}:
        return "PENDING"

    if rs in {"SUCCESS"}:
        return "SUCCEEDED"

    if rs in {"FAILED", "TIMEDOUT", "CANCELED"}:
        return "FAILED"

    if lcs in {"TERMINATED", "SKIPPED"}:
        return "TERMINATED" if lcs == "TERMINATED" else "SKIPPED"

    # Fallback to a safe UI value.
    return "PENDING"


def list_jobs() -> dict:
    """List Databricks jobs with a lightweight last-run enrichment for the UI."""
    try:
        def _operation() -> dict:
            config = get_databricks_config()
            client = WorkspaceClient(host=config.host, token=config.token)

            jobs_out: list[dict] = []

            for j in client.jobs.list():
                job_id = getattr(j, "job_id", None)
                settings = getattr(j, "settings", None)
                name = getattr(settings, "name", None) if settings is not None else None

                schedule_expr: str | None = None
                next_run: str | None = None

                schedule = getattr(settings, "schedule", None) if settings is not None else None
                if schedule is not None:
                    schedule_expr = getattr(schedule, "quartz_cron_expression", None) or getattr(
                        schedule, "cron_expression", None
                    )
                    next_run = _iso_from_ms(getattr(schedule, "next_run_time", None))

                last_run: str | None = None
                duration_s: int | None = None
                status = "PENDING"

                if job_id is not None:
                    try:
                        runs = list(client.jobs.list_runs(job_id=int(job_id), limit=1))
                        run = runs[0] if runs else None
                        if run is not None:
                            state = getattr(run, "state", None)
                            status = _normalize_job_status(
                                getattr(state, "life_cycle_state", None),
                                getattr(state, "result_state", None),
                            )

                            start_time = getattr(run, "start_time", None)
                            end_time = getattr(run, "end_time", None)
                            last_run = _iso_from_ms(start_time)

                            if start_time is not None and end_time is not None:
                                duration_s = max(0, int((int(end_time) - int(start_time)) / 1000))
                            else:
                                # Some states (e.g., RUNNING) may not have end_time yet.
                                duration_s = None
                    except Exception:
                        # If run enrichment fails, still return the job.
                        pass

                jobs_out.append(
                    {
                        "id": str(job_id or ""),
                        "name": name or "",
                        "status": status,
                        "lastRun": last_run,
                        "duration": duration_s,
                        "schedule": schedule_expr,
                        "nextRun": next_run,
                    }
                )

            jobs_out.sort(key=lambda x: (x.get("name") or "").lower())
            return {"ok": True, "jobs": jobs_out}

        return run_with_retry("databricks.jobs.list", _operation)
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
            "message": "Failed to list jobs from Databricks. Check token permissions and network access.",
        }


def run_job(job_id: str) -> dict:
    """Trigger a Databricks job run (Run Now)."""
    try:
        job_id = (job_id or "").strip()
        if not job_id:
            return {
                "ok": False,
                "errorType": "ValueError",
                "error": "jobId is required.",
                "message": "jobId is required.",
            }

        def _operation() -> dict:
            config = get_databricks_config()
            client = WorkspaceClient(host=config.host, token=config.token)

            resp = client.jobs.run_now(job_id=int(job_id))
            run_id = getattr(resp, "run_id", None)

            return {
                "ok": True,
                "jobId": job_id,
                "runId": str(run_id) if run_id is not None else None,
                "message": "Run requested.",
            }

        return run_with_retry(f"databricks.jobs.run:{job_id}", _operation)
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
            "message": "Failed to run job. Check token permissions.",
        }


def get_job_url(job_id: str) -> dict:
    """Return a Databricks web URL for a given job id."""
    try:
        job_id = (job_id or "").strip()
        if not job_id:
            return {
                "ok": False,
                "errorType": "ValueError",
                "error": "jobId is required.",
                "message": "jobId is required.",
            }

        config = get_databricks_config()
        # Common Databricks job URL form.
        url = f"{config.host}/#job/{job_id}"

        return {"ok": True, "jobId": job_id, "url": url}
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
            "message": "Failed to build job URL.",
        }


def stop_job(job_id: str) -> dict:
    """Best-effort stop for a Databricks Job.

    Databricks stops *runs*, not jobs. For convenience, this cancels the most
    recent active run (if any) for the provided job id.
    """

    try:
        job_id = (job_id or "").strip()
        if not job_id:
            return {
                "ok": False,
                "errorType": "ValueError",
                "error": "jobId is required.",
                "message": "jobId is required.",
            }

        def _operation() -> dict:
            config = get_databricks_config()
            client = WorkspaceClient(host=config.host, token=config.token)

            # Look for an active run; cancel the newest one.
            runs = list(
                client.jobs.list_runs(job_id=int(job_id), active_only=True, limit=1)
            )
            run = runs[0] if runs else None
            run_id = getattr(run, "run_id", None) if run is not None else None

            if run_id is None:
                return {
                    "ok": True,
                    "jobId": job_id,
                    "runId": None,
                    "message": "No active runs found to stop.",
                }

            client.jobs.cancel_run(run_id=int(run_id))

            return {
                "ok": True,
                "jobId": job_id,
                "runId": str(run_id),
                "message": "Cancel requested.",
            }

        return run_with_retry(f"databricks.jobs.stop:{job_id}", _operation)
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
            "message": "Failed to stop job run. Check token permissions.",
        }
