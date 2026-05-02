from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from databricks.sdk import WorkspaceClient

from src.clients.databricks_client import get_databricks_config
from src.config.env import env
from src.tools.databricks.jobs import run_job
from src.tools.databricks.operations import run_with_retry


def _iso_from_ms(ts_ms: int | None) -> str | None:
    if ts_ms is None:
        return None
    try:
        return datetime.fromtimestamp(int(ts_ms) / 1000.0, tz=timezone.utc).isoformat()
    except Exception:
        return None


def _normalize_model_status(life_cycle_state: object | None, result_state: object | None) -> str:
    lcs_value = getattr(life_cycle_state, "value", None)
    lcs = (lcs_value if isinstance(lcs_value, str) else str(life_cycle_state or "")).upper()
    if "." in lcs:
        lcs = lcs.split(".")[-1]

    rs_value = getattr(result_state, "value", None)
    rs = (rs_value if isinstance(rs_value, str) else str(result_state or "")).upper()
    if "." in rs:
        rs = rs.split(".")[-1]

    if lcs in {"RUNNING", "PENDING", "QUEUED"}:
        return "not-run"
    if rs in {"SUCCESS"}:
        return "pass"
    if rs in {"FAILED", "TIMEDOUT", "CANCELED"}:
        return "fail"
    return "not-run"


def _safe_attr(obj: Any, name: str, default: Any = None) -> Any:
    return getattr(obj, name, default) if obj is not None else default


def _task_dependencies(task: Any) -> list[str]:
    deps = []
    for dep in _safe_attr(task, "depends_on", []) or []:
        task_key = _safe_attr(dep, "task_key")
        if task_key:
            deps.append(str(task_key))
    return deps


def _dbt_task_commands(task: Any) -> list[str]:
    dbt_task = _safe_attr(task, "dbt_task")
    commands = _safe_attr(dbt_task, "commands", []) or []
    return [str(command) for command in commands if command]


def _looks_like_dbt_job(job_name: str, tasks: list[Any]) -> bool:
    if "dbt" in (job_name or "").lower():
        return True
    return any(_safe_attr(task, "dbt_task") is not None for task in tasks)


def _model_name_from_task(job_name: str, task: Any | None) -> str:
    if task is None:
        return job_name or "dbt job"

    task_key = str(_safe_attr(task, "task_key", "") or "").strip()
    if task_key:
        return task_key

    commands = _dbt_task_commands(task)
    for command in commands:
        parts = command.split()
        if "--select" in parts:
            idx = parts.index("--select")
            if idx + 1 < len(parts):
                return parts[idx + 1]

    return job_name or "dbt task"


def _quote_ident(value: str) -> str:
    return "`" + value.replace("`", "``") + "`"


def _quote_sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _latest_run_for_job(client: WorkspaceClient, job_id: int | None) -> dict[str, Any]:
    if job_id is None:
        return {"status": "not-run", "lastRun": None, "duration": None, "runId": None}

    try:
        runs = list(client.jobs.list_runs(job_id=int(job_id), limit=1))
        run = runs[0] if runs else None
        if run is None:
            return {"status": "not-run", "lastRun": None, "duration": None, "runId": None}

        state = _safe_attr(run, "state")
        start_time = _safe_attr(run, "start_time")
        end_time = _safe_attr(run, "end_time")
        duration = None
        if start_time is not None and end_time is not None:
            duration = max(0, int((int(end_time) - int(start_time)) / 1000))

        return {
            "status": _normalize_model_status(
                _safe_attr(state, "life_cycle_state"),
                _safe_attr(state, "result_state"),
            ),
            "lastRun": _iso_from_ms(start_time),
            "duration": duration,
            "runId": str(_safe_attr(run, "run_id", "") or "") or None,
        }
    except Exception:
        return {"status": "not-run", "lastRun": None, "duration": None, "runId": None}


def list_dbt_models() -> dict:
    """List Databricks dbt jobs/tasks for the DBT page."""

    try:
        def _operation() -> dict:
            config = get_databricks_config()
            client = WorkspaceClient(host=config.host, token=config.token)

            models: list[dict] = []

            for job in client.jobs.list():
                job_id = _safe_attr(job, "job_id")
                settings = _safe_attr(job, "settings")
                job_name = str(_safe_attr(settings, "name", "") or "")
                tasks = list(_safe_attr(settings, "tasks", []) or [])

                if not _looks_like_dbt_job(job_name, tasks):
                    continue

                latest = _latest_run_for_job(client, int(job_id) if job_id is not None else None)
                dbt_tasks = [task for task in tasks if _safe_attr(task, "dbt_task") is not None]
                selected_tasks = dbt_tasks or [None]

                for task in selected_tasks:
                    commands = _dbt_task_commands(task) if task is not None else []
                    model_name = _model_name_from_task(job_name, task)
                    model_id = f"{job_id}:{_safe_attr(task, 'task_key', 'job') if task is not None else 'job'}"

                    tests = [
                        {
                            "id": f"{model_id}:latest-run",
                            "name": "latest_databricks_run",
                            "status": "fail" if latest["status"] == "fail" else "pass",
                            **(
                                {"error": "Latest Databricks dbt run failed."}
                                if latest["status"] == "fail"
                                else {}
                            ),
                        }
                    ]

                    models.append(
                        {
                            "id": model_id,
                            "name": model_name,
                            "schema": env.databricks_default_schema
                            or env.databricks_default_catalog
                            or "databricks",
                            "status": latest["status"],
                            "tests": tests if latest["status"] != "not-run" else [],
                            "dependencies": _task_dependencies(task) if task is not None else [],
                            "jobId": str(job_id or ""),
                            "jobName": job_name,
                            "taskKey": _safe_attr(task, "task_key") if task is not None else None,
                            "commands": commands,
                            "lastRun": latest["lastRun"],
                            "duration": latest["duration"],
                            "runId": latest["runId"],
                        }
                    )

            models.sort(key=lambda item: (item.get("jobName") or "", item.get("name") or ""))
            if models:
                return {"ok": True, "models": models, "count": len(models), "source": "jobs"}

            relation_models = _list_unity_catalog_relations(client) or _list_sql_catalog_relations(client)
            return {
                "ok": True,
                "models": relation_models,
                "count": len(relation_models),
                "source": "unity_catalog",
                "message": (
                    "No Databricks jobs with dbt tasks were found. Showing tables/views from "
                    "Databricks Unity Catalog instead."
                ),
            }

        return run_with_retry("databricks.dbt.models.list", _operation)
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
            "message": "Failed to list dbt jobs from Databricks. Check token permissions.",
        }


def run_dbt_model(job_id: str) -> dict:
    """Run the Databricks job that owns a dbt model/task."""

    return run_job(job_id)


def _relation_model(
    table_catalog: str,
    table_schema: str,
    table_name: str,
    table_type: str,
) -> dict:
    full_name = f"{table_catalog}.{table_schema}.{table_name}"
    return {
        "id": f"relation:{full_name}",
        "name": table_name,
        "schema": f"{table_catalog}.{table_schema}",
        "status": "not-run",
        "tests": [],
        "dependencies": [],
        "jobId": None,
        "jobName": table_type,
        "taskKey": None,
        "commands": [
            f"SELECT * FROM {_quote_ident(table_catalog)}.{_quote_ident(table_schema)}.{_quote_ident(table_name)} LIMIT 100"
        ],
        "lastRun": None,
        "duration": None,
        "runId": None,
    }


def _list_unity_catalog_relations(client: WorkspaceClient) -> list[dict]:
    """Fallback: list real Databricks tables/views through Unity Catalog APIs."""

    try:
        targets: list[tuple[str, str]] = []

        if env.databricks_default_catalog and env.databricks_default_schema:
            targets.append((env.databricks_default_catalog, env.databricks_default_schema))
        else:
            catalogs = list(client.catalogs.list(max_results=10))
            for catalog in catalogs:
                catalog_name = str(_safe_attr(catalog, "name", "") or "")
                if not catalog_name or catalog_name.lower() in {"system"}:
                    continue

                try:
                    schemas = list(client.schemas.list(catalog_name=catalog_name, max_results=10))
                except Exception:
                    continue

                for schema_info in schemas:
                    schema_name = str(_safe_attr(schema_info, "name", "") or "")
                    if not schema_name or schema_name.lower() in {"information_schema"}:
                        continue
                    targets.append((catalog_name, schema_name))
                    if len(targets) >= 10:
                        break
                if len(targets) >= 10:
                    break

        models: list[dict] = []
        for catalog_name, schema_name in targets:
            try:
                tables = client.tables.list(
                    catalog_name=catalog_name,
                    schema_name=schema_name,
                    max_results=25,
                    omit_columns=True,
                    omit_properties=True,
                    omit_username=True,
                )
            except Exception:
                continue

            for table in tables:
                table_name = str(_safe_attr(table, "name", "") or "")
                if not table_name:
                    continue
                table_type = str(_safe_attr(table, "table_type", "") or "TABLE")
                models.append(_relation_model(catalog_name, schema_name, table_name, table_type))
                if len(models) >= 100:
                    return models

        return models
    except Exception:
        return []


def _list_sql_catalog_relations(client: WorkspaceClient) -> list[dict]:
    """Fallback: list real Databricks tables/views as model-like entries using SQL."""

    if not env.databricks_warehouse_id or not env.databricks_default_catalog or not env.databricks_default_schema:
        return []

    catalog = env.databricks_default_catalog
    schema = env.databricks_default_schema
    statement = (
        "SELECT table_catalog, table_schema, table_name, table_type "
        f"FROM {_quote_ident(catalog)}.information_schema.tables "
        f"WHERE table_schema = {_quote_sql_string(schema)} "
        "ORDER BY table_name "
        "LIMIT 100"
    )

    response = client.statement_execution.execute_statement(
        statement=statement,
        warehouse_id=env.databricks_warehouse_id,
        catalog=catalog,
        schema=schema,
        wait_timeout="20s",
        row_limit=100,
    )

    rows = getattr(getattr(response, "result", None), "data_array", None) or []
    models: list[dict] = []
    for idx, row in enumerate(rows):
        table_catalog = row[0] if len(row) > 0 else catalog
        table_schema = row[1] if len(row) > 1 else schema
        table_name = row[2] if len(row) > 2 else f"relation_{idx + 1}"
        table_type = row[3] if len(row) > 3 else "TABLE"
        models.append(_relation_model(table_catalog, table_schema, table_name, table_type))

    return models
