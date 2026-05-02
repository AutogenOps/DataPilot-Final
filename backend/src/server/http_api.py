from __future__ import annotations

import time

from starlette.applications import Starlette
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from src.config.env import env
from src.server.logs import log_buffer
from src.server.chat_router import handle_chat_message
from src.server.mcp_integration import get_mcp_integration, initialize_mcp_for_production
from src.tools.databricks.clusters import list_clusters, start_cluster, terminate_cluster
from src.tools.databricks.connection import (
    ping_databricks_api,
    validate_databricks_connection_config,
)
from src.tools.databricks.dbt import list_dbt_models, run_dbt_model
from src.tools.databricks.jobs import get_job_url, list_jobs, run_job, stop_job
from src.tools.databricks.pipelines import list_pipelines, start_pipeline, stop_pipeline
from src.tools.db_ai_kit import (
    get_db_ai_kit_mcp_config,
    list_db_ai_kit_assets,
    list_db_ai_kit_skills,
    read_db_ai_kit_skill,
)
from src.tools.monitoring import build_monitoring_alerts


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log_buffer.add(
                "ERROR",
                f"{request.method} {request.url.path} -> 500 ({elapsed_ms}ms) {type(exc).__name__}: {exc}",
            )
            raise

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        log_buffer.add(
            "INFO",
            f"{request.method} {request.url.path} -> {response.status_code} ({elapsed_ms}ms)",
        )
        return response


def _health(_request: Request) -> JSONResponse:
    return JSONResponse({"ok": True, "service": "datapilot-backend"})


def _databricks_validate(_request: Request) -> JSONResponse:
    data = validate_databricks_connection_config()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _databricks_ping(_request: Request) -> JSONResponse:
    data = ping_databricks_api()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _clusters(_request: Request) -> JSONResponse:
    data = list_clusters()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _jobs(_request: Request) -> JSONResponse:
    data = list_jobs()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _pipelines(_request: Request) -> JSONResponse:
    data = list_pipelines()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


async def _chat(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    message = (body or {}).get("message")
    data = handle_chat_message(message if isinstance(message, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


async def _jobs_run(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    job_id = (body or {}).get("jobId")
    data = run_job(job_id if isinstance(job_id, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


async def _jobs_stop(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    job_id = (body or {}).get("jobId")
    data = stop_job(job_id if isinstance(job_id, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)



def _jobs_url(request: Request) -> JSONResponse:
    job_id = request.query_params.get("jobId", "")
    data = get_job_url(job_id)
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


async def _pipelines_start(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    pipeline_id = (body or {}).get("pipelineId")
    data = start_pipeline(pipeline_id if isinstance(pipeline_id, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


async def _pipelines_stop(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    pipeline_id = (body or {}).get("pipelineId")
    data = stop_pipeline(pipeline_id if isinstance(pipeline_id, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


async def _clusters_terminate(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    cluster_id = (body or {}).get("clusterId")
    data = terminate_cluster(cluster_id if isinstance(cluster_id, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


async def _clusters_start(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    cluster_id = (body or {}).get("clusterId")
    data = start_cluster(cluster_id if isinstance(cluster_id, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


def _logs(request: Request) -> JSONResponse:
    try:
        limit = int(request.query_params.get("limit", "200"))
    except ValueError:
        limit = 200

    limit = max(1, min(limit, 1000))
    return JSONResponse({"ok": True, "entries": log_buffer.tail(limit=limit)})


def _alerts(_request: Request) -> JSONResponse:
    data = build_monitoring_alerts()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _dbt_models(_request: Request) -> JSONResponse:
    data = list_dbt_models()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


async def _dbt_run(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {
                "ok": False,
                "errorType": "ValueError",
                "error": "Invalid JSON body.",
                "message": "Invalid JSON body.",
            },
            status_code=400,
        )

    job_id = (body or {}).get("jobId")
    data = run_dbt_model(job_id if isinstance(job_id, str) else "")
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 503)
    return JSONResponse(data, status_code=status)


def _db_ai_kit_skills(_request: Request) -> JSONResponse:
    data = list_db_ai_kit_skills()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _db_ai_kit_skill(request: Request) -> JSONResponse:
    skill_name = request.path_params.get("skill_name", "")
    data = read_db_ai_kit_skill(skill_name)
    status = 200 if data.get("ok") else (400 if data.get("errorType") == "ValueError" else 404)
    return JSONResponse(data, status_code=status)


def _db_ai_kit_assets(_request: Request) -> JSONResponse:
    data = list_db_ai_kit_assets()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _db_ai_kit_mcp(_request: Request) -> JSONResponse:
    data = get_db_ai_kit_mcp_config()
    status = 200 if data.get("ok") else 503
    return JSONResponse(data, status_code=status)


def _mcp_tools_list(_request: Request) -> JSONResponse:
    """List all available MCP tools (production-ready endpoint)."""
    mcp_integration = get_mcp_integration()
    data = mcp_integration.get_tools_list()
    return JSONResponse(data, status_code=200)


def _mcp_config(_request: Request) -> JSONResponse:
    """Return MCP server configuration metadata."""
    mcp_integration = get_mcp_integration()
    data = mcp_integration.get_mcp_config()
    return JSONResponse(data, status_code=200)


def create_app() -> Starlette:
    app = Starlette(
        debug=False,
        routes=[
            # Health
            Route("/health", _health, methods=["GET"]),
            Route("/api/health", _health, methods=["GET"]),

            # Databricks
            Route("/databricks/validate", _databricks_validate, methods=["GET"]),
            Route("/databricks/ping", _databricks_ping, methods=["GET"]),
            Route("/api/databricks/validate", _databricks_validate, methods=["GET"]),
            Route("/api/databricks/ping", _databricks_ping, methods=["GET"]),

            # Clusters
            Route("/clusters", _clusters, methods=["GET"]),
            Route("/clusters/start", _clusters_start, methods=["POST"]),
            Route("/clusters/terminate", _clusters_terminate, methods=["POST"]),
            Route("/api/clusters", _clusters, methods=["GET"]),
            Route("/api/clusters/start", _clusters_start, methods=["POST"]),
            Route("/api/clusters/terminate", _clusters_terminate, methods=["POST"]),

            # Jobs
            Route("/jobs", _jobs, methods=["GET"]),
            Route("/jobs/run", _jobs_run, methods=["POST"]),
            Route("/jobs/stop", _jobs_stop, methods=["POST"]),
            Route("/jobs/url", _jobs_url, methods=["GET"]),
            Route("/api/jobs", _jobs, methods=["GET"]),
            Route("/api/jobs/run", _jobs_run, methods=["POST"]),
            Route("/api/jobs/stop", _jobs_stop, methods=["POST"]),
            Route("/api/jobs/url", _jobs_url, methods=["GET"]),

            # Pipelines
            Route("/pipelines", _pipelines, methods=["GET"]),
            Route("/pipelines/start", _pipelines_start, methods=["POST"]),
            Route("/pipelines/stop", _pipelines_stop, methods=["POST"]),
            Route("/api/pipelines", _pipelines, methods=["GET"]),
            Route("/api/pipelines/start", _pipelines_start, methods=["POST"]),
            Route("/api/pipelines/stop", _pipelines_stop, methods=["POST"]),

            # Chat + logs
            Route("/chat", _chat, methods=["POST"]),
            Route("/logs", _logs, methods=["GET"]),
            Route("/alerts", _alerts, methods=["GET"]),
            Route("/api/chat", _chat, methods=["POST"]),
            Route("/api/logs", _logs, methods=["GET"]),
            Route("/api/alerts", _alerts, methods=["GET"]),

            # dbt on Databricks
            Route("/dbt/models", _dbt_models, methods=["GET"]),
            Route("/dbt/run", _dbt_run, methods=["POST"]),
            Route("/api/dbt/models", _dbt_models, methods=["GET"]),
            Route("/api/dbt/run", _dbt_run, methods=["POST"]),

            # db-ai-kit
            Route("/db-ai-kit/skills", _db_ai_kit_skills, methods=["GET"]),
            Route("/db-ai-kit/skills/{skill_name:str}", _db_ai_kit_skill, methods=["GET"]),
            Route("/db-ai-kit/assets", _db_ai_kit_assets, methods=["GET"]),
            Route("/db-ai-kit/mcp", _db_ai_kit_mcp, methods=["GET"]),
            Route("/api/db-ai-kit/skills", _db_ai_kit_skills, methods=["GET"]),
            Route("/api/db-ai-kit/skills/{skill_name:str}", _db_ai_kit_skill, methods=["GET"]),
            Route("/api/db-ai-kit/assets", _db_ai_kit_assets, methods=["GET"]),
            Route("/api/db-ai-kit/mcp", _db_ai_kit_mcp, methods=["GET"]),

            # MCP Tools (production-ready endpoints)
            Route("/mcp/tools", _mcp_tools_list, methods=["GET"]),
            Route("/mcp/config", _mcp_config, methods=["GET"]),
            Route("/api/mcp/tools", _mcp_tools_list, methods=["GET"]),
            Route("/api/mcp/config", _mcp_config, methods=["GET"]),
        ],
    )

    log_buffer.add("INFO", "HTTP API initialized")

    # Initialize MCP tools for production deployment
    initialize_mcp_for_production()

    app.add_middleware(RequestLoggingMiddleware)

    # Keep CORS narrow; allow one or many comma-separated origins.
    allowed_origins = [
        origin.strip()
        for origin in (env.cors_allowed_origin or "").split(",")
        if origin.strip()
    ]
    if "http://localhost:5173" in allowed_origins and "http://127.0.0.1:5173" not in allowed_origins:
        allowed_origins.append("http://127.0.0.1:5173")
    if "http://127.0.0.1:5173" in allowed_origins and "http://localhost:5173" not in allowed_origins:
        allowed_origins.append("http://localhost:5173")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    return app
