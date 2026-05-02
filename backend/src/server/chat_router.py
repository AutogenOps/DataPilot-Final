from __future__ import annotations

import json
import re
from typing import Any

from src.clients.anthropic_client import create_anthropic_client
from src.config.env import env
from src.tools.databricks.connection import ping_databricks_api, validate_databricks_connection_config
from src.tools.databricks.clusters import list_clusters
from src.tools.databricks.jobs import list_jobs, run_job, stop_job
from src.tools.databricks.pipelines import list_pipelines, start_pipeline, stop_pipeline
from src.tools.db_ai_kit import (
    get_db_ai_kit_mcp_config,
    list_db_ai_kit_assets,
    list_db_ai_kit_skills,
    read_db_ai_kit_skill,
)

_UUID_RE = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)


def _format_items(title: str, items: list[str]) -> str:
    if not items:
        return f"{title}: none found."
    lines = "\n".join(f"- {x}" for x in items)
    return f"{title}:\n{lines}"


def _clean_trailing_punct(text: str) -> str:
    return re.sub(r"[\s\t\r\n]+", " ", re.sub(r"[?.!,;:]+$", "", (text or "").strip())).strip()


_MCP_TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "databricks_validate_connection_config",
        "description": "Validate Databricks environment configuration only, without making an API call.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "databricks_ping",
        "description": "Ping the Databricks API using the configured host and token.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "databricks_jobs_status",
        "description": "List Databricks jobs with status and last run information.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "databricks_jobs_run",
        "description": "Trigger a Databricks job run now. Use only when the user clearly asks to run or trigger a job.",
        "input_schema": {
            "type": "object",
            "properties": {"jobId": {"type": "string", "description": "Databricks job id."}},
            "required": ["jobId"],
            "additionalProperties": False,
        },
    },
    {
        "name": "databricks_jobs_stop",
        "description": "Stop or cancel the most recent active run for a Databricks job. Use only when the user clearly asks to stop or cancel a job.",
        "input_schema": {
            "type": "object",
            "properties": {"jobId": {"type": "string", "description": "Databricks job id."}},
            "required": ["jobId"],
            "additionalProperties": False,
        },
    },
    {
        "name": "databricks_pipelines_status",
        "description": "List Databricks DLT pipelines with current status information.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "databricks_pipelines_start",
        "description": "Start a Databricks DLT pipeline update. Use only when the user clearly asks to start a pipeline.",
        "input_schema": {
            "type": "object",
            "properties": {"pipelineId": {"type": "string", "description": "Databricks pipeline id."}},
            "required": ["pipelineId"],
            "additionalProperties": False,
        },
    },
    {
        "name": "databricks_pipelines_stop",
        "description": "Stop a running Databricks DLT pipeline. Use only when the user clearly asks to stop a pipeline.",
        "input_schema": {
            "type": "object",
            "properties": {"pipelineId": {"type": "string", "description": "Databricks pipeline id."}},
            "required": ["pipelineId"],
            "additionalProperties": False,
        },
    },
    {
        "name": "db_ai_kit_skills_list",
        "description": "List all installed db-ai-kit skills bundled with this deployment.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "db_ai_kit_skill_read",
        "description": "Read one db-ai-kit skill's SKILL.md content.",
        "input_schema": {
            "type": "object",
            "properties": {"skillName": {"type": "string", "description": "Skill folder name."}},
            "required": ["skillName"],
            "additionalProperties": False,
        },
    },
    {
        "name": "db_ai_kit_assets_list",
        "description": "List db-ai-kit scripts and pipeline assets.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "db_ai_kit_mcp_config",
        "description": "Return db-ai-kit MCP server configuration metadata.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
]


def _call_mcp_tool(name: str, tool_input: dict[str, Any] | None) -> dict[str, Any]:
    args = tool_input or {}
    tool_map = {
        "databricks_validate_connection_config": lambda: validate_databricks_connection_config(),
        "databricks_ping": lambda: ping_databricks_api(),
        "databricks_jobs_status": lambda: list_jobs(),
        "databricks_jobs_run": lambda: run_job(str(args.get("jobId") or "")),
        "databricks_jobs_stop": lambda: stop_job(str(args.get("jobId") or "")),
        "databricks_pipelines_status": lambda: list_pipelines(),
        "databricks_pipelines_start": lambda: start_pipeline(str(args.get("pipelineId") or "")),
        "databricks_pipelines_stop": lambda: stop_pipeline(str(args.get("pipelineId") or "")),
        "db_ai_kit_skills_list": lambda: list_db_ai_kit_skills(),
        "db_ai_kit_skill_read": lambda: read_db_ai_kit_skill(str(args.get("skillName") or "")),
        "db_ai_kit_assets_list": lambda: list_db_ai_kit_assets(),
        "db_ai_kit_mcp_config": lambda: get_db_ai_kit_mcp_config(),
    }

    handler = tool_map.get(name)
    if handler is None:
        return {
            "ok": False,
            "errorType": "ValueError",
            "error": f"Unknown MCP tool: {name}",
            "message": f"Unknown MCP tool: {name}",
        }

    return handler()


def _block_to_dict(block: Any) -> dict[str, Any]:
    if hasattr(block, "model_dump"):
        return block.model_dump()
    if isinstance(block, dict):
        return block
    return {
        "type": getattr(block, "type", "text"),
        "text": getattr(block, "text", str(block)),
    }


def _message_text(content: list[Any]) -> str:
    parts = []
    for block in content:
        if getattr(block, "type", None) == "text":
            parts.append(getattr(block, "text", ""))
        elif isinstance(block, dict) and block.get("type") == "text":
            parts.append(str(block.get("text") or ""))
    return "\n".join(part for part in parts if part).strip()


def _run_mcp_tool_chat(text: str) -> dict[str, Any]:
    client = create_anthropic_client()
    messages: list[dict[str, Any]] = [{"role": "user", "content": text}]
    tools_used: list[str] = []

    system = (
        "You are DataPilot, a Databricks operations assistant. Use the provided MCP tools "
        "whenever they are needed to answer questions about Databricks jobs, DLT pipelines, "
        "db-ai-kit skills, or MCP configuration. For destructive actions like running, stopping, "
        "or cancelling resources, only call the tool when the user clearly requested that action. "
        "Keep responses concise and include relevant ids or names from tool results."
    )

    for _ in range(4):
        response = client.messages.create(
            model=env.anthropic_model,
            max_tokens=env.anthropic_max_tokens,
            temperature=env.anthropic_temperature,
            system=system,
            tools=_MCP_TOOL_DEFINITIONS,
            messages=messages,
        )

        content = list(response.content)
        tool_uses = [block for block in content if getattr(block, "type", None) == "tool_use"]
        if not tool_uses:
            return {
                "ok": True,
                "intent": "mcp_tools.chat",
                "reply": _message_text(content) or "Done.",
                "data": {"toolsUsed": tools_used},
            }

        messages.append(
            {
                "role": "assistant",
                "content": [_block_to_dict(block) for block in content],
            }
        )

        tool_results = []
        for tool_use in tool_uses:
            tool_name = str(getattr(tool_use, "name", ""))
            tool_input = getattr(tool_use, "input", {}) or {}
            tools_used.append(tool_name)
            result = _call_mcp_tool(tool_name, tool_input if isinstance(tool_input, dict) else {})
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": getattr(tool_use, "id", ""),
                    "content": json.dumps(result, default=str)[:20000],
                    "is_error": not bool(result.get("ok", True)),
                }
            )

        messages.append({"role": "user", "content": tool_results})

    return {
        "ok": True,
        "intent": "mcp_tools.chat",
        "reply": "I used the MCP tools, but the tool loop did not finish cleanly. Please try a narrower request.",
        "data": {"toolsUsed": tools_used},
    }


def _extract_job_name(text: str) -> str:
    """Best-effort extraction of a job name from a freeform user message."""

    raw = (text or "").strip()
    if not raw:
        return ""

    # Prefer explicit quotes if provided.
    m_quote = re.search(r"\"([^\"]+)\"|'([^']+)'", raw)
    if m_quote:
        return _clean_trailing_punct(m_quote.group(1) or m_quote.group(2) or "").strip("\"'")

    # Common phrasings.
    for pat in [
        r"\bjob\s+name\s+(.+)$",
        r"\bjob\s+named\s+(.+)$",
        r"\bjob\s+called\s+(.+)$",
        r"\b(run|trigger|invoke|start)\s+(?:the\s+)?job\s+(.+)$",
    ]:
        m = re.search(pat, raw, flags=re.IGNORECASE)
        if not m:
            continue
        candidate = m.group(1) if m.lastindex == 1 else (m.group(2) or "")
        candidate = _clean_trailing_punct(candidate)
        candidate = re.sub(r"^(named|name|called)\s+", "", candidate, flags=re.IGNORECASE).strip()
        return candidate.strip("\"'")

    return ""


def _resolve_job_id(job_id: str, job_name: str) -> dict[str, Any]:
    """Resolve a job id from either an explicit job id or a job name."""

    job_id = (job_id or "").strip()
    if job_id:
        return {"ok": True, "jobId": job_id, "jobName": None}

    job_name = (job_name or "").strip()
    if not job_name:
        return {
            "ok": False,
            "errorType": "ValueError",
            "error": "jobId or jobName is required.",
            "message": "Please include a job id (e.g. 'run job 12345') or a job name (e.g. 'run job name job_datapilot').",
        }

    data = list_jobs()
    if not data.get("ok"):
        return data

    jobs = data.get("jobs") or []
    name_l = job_name.lower()

    exact = [j for j in jobs if (j.get("name") or "").lower() == name_l]
    if len(exact) == 1:
        return {"ok": True, "jobId": str(exact[0].get("id") or ""), "jobName": exact[0].get("name")}

    contains = [j for j in jobs if name_l and name_l in (j.get("name") or "").lower()]
    if len(contains) == 1:
        return {"ok": True, "jobId": str(contains[0].get("id") or ""), "jobName": contains[0].get("name")}

    matches = exact or contains
    if matches:
        shown = [m.get("name") or "(unnamed)" for m in matches[:5]]
        return {
            "ok": False,
            "errorType": "ValueError",
            "error": "Ambiguous job name.",
            "message": "Multiple jobs matched that name. Please run by id (e.g. 'run job 12345') or be more specific. Matches: "
            + ", ".join(shown),
        }

    return {
        "ok": False,
        "errorType": "ValueError",
        "error": "Job not found.",
        "message": f"No job found with name '{job_name}'. Try 'show job status' to see available job names.",
    }


def handle_chat_message(message: str) -> dict[str, Any]:
    """Handle chat with Claude MCP tool use when configured.

    The deterministic router remains as a no-key fallback so development
    environments still have useful chat behavior.
    """

    text = (message or "").strip()
    if not text:
        return {
            "ok": False,
            "errorType": "ValueError",
            "error": "message is required.",
            "message": "message is required.",
        }

    lower = text.lower()

    if env.anthropic_api_key:
        try:
            return _run_mcp_tool_chat(text)
        except Exception as exc:
            fallback = _run_deterministic_chat(text, lower)
            fallback.setdefault("data", {})
            fallback["data"]["mcpToolChatError"] = f"{type(exc).__name__}: {exc}"
            fallback["data"]["mcpToolChatFallback"] = True
            return fallback

    return _run_deterministic_chat(text, lower)


def _run_deterministic_chat(text: str, lower: str) -> dict[str, Any]:
    if "skill" in lower or "db-ai-kit" in lower or "ai kit" in lower:
        data = list_db_ai_kit_skills()
        if not data.get("ok"):
            return data

        skills = data.get("skills") or []
        available = [s for s in skills if s.get("available")]
        shown = ", ".join(str(s.get("name")) for s in available[:12])
        suffix = f" First skills: {shown}." if shown else ""
        return {
            "ok": True,
            "intent": "db_ai_kit.skills",
            "reply": (
                f"db-ai-kit profile '{data.get('profile')}' is loaded with "
                f"{len(available)} available installed skills.{suffix}"
            ),
            "data": {
                "profile": data.get("profile"),
                "skills": skills,
                "count": len(available),
            },
        }

    # Jobs
    if "job" in lower or "jobs" in lower:
        if "running" in lower:
            data = list_jobs()
            if not data.get("ok"):
                return data
            jobs = data.get("jobs") or []
            running = [j for j in jobs if (j.get("status") or "").upper() == "RUNNING"]
            items = [f"{j.get('name') or '(unnamed)'} ({j.get('id')})" for j in running]
            return {
                "ok": True,
                "intent": "jobs.running",
                "reply": _format_items("Running jobs", items),
                "data": {"jobs": running},
            }

        if "status" in lower or "state" in lower:
            data = list_jobs()
            if not data.get("ok"):
                return data
            jobs = data.get("jobs") or []
            items = [
                f"{j.get('name') or '(unnamed)'} ({j.get('id')}): {j.get('status')}"
                for j in jobs
            ]
            return {
                "ok": True,
                "intent": "jobs.status",
                "reply": _format_items("Jobs", items),
                "data": {"jobs": jobs},
            }

        if "run" in lower or "trigger" in lower or "invoke" in lower:
            m = re.search(r"\bjob\s*(id)?\s*[:=]?\s*(\d+)\b", lower)
            job_id = m.group(2) if m else ""
            if not job_id:
                # fallback: any standalone number
                m2 = re.search(r"\b(\d{3,})\b", lower)
                job_id = m2.group(1) if m2 else ""

            resolved = _resolve_job_id(job_id=job_id, job_name=_extract_job_name(text))
            if not resolved.get("ok"):
                return resolved

            resolved_id = str(resolved.get("jobId") or "")
            resolved_name = resolved.get("jobName")

            data = run_job(resolved_id)
            if not data.get("ok"):
                return data
            return {
                "ok": True,
                "intent": "jobs.run",
                "reply": f"Run requested for job {resolved_name or resolved_id}.",
                "data": data,
            }

        if "stop" in lower or "cancel" in lower:
            m = re.search(r"\bjob\s*(id)?\s*[:=]?\s*(\d+)\b", lower)
            job_id = m.group(2) if m else ""
            if not job_id:
                m2 = re.search(r"\b(\d{3,})\b", lower)
                job_id = m2.group(1) if m2 else ""

            resolved = _resolve_job_id(job_id=job_id, job_name=_extract_job_name(text))
            if not resolved.get("ok"):
                return resolved

            resolved_id = str(resolved.get("jobId") or "")

            data = stop_job(resolved_id)
            if not data.get("ok"):
                return data
            return {
                "ok": True,
                "intent": "jobs.stop",
                "reply": data.get("message") or f"Stop requested for job {resolved_id}.",
                "data": data,
            }

    # Pipelines (DLT)
    if "pipeline" in lower or "pipelines" in lower or "dlt" in lower:
        if "status" in lower or "state" in lower or "show" in lower:
            data = list_pipelines()
            if not data.get("ok"):
                return data
            pipes = data.get("pipelines") or []
            items = [
                f"{p.get('name') or '(unnamed)'}: {p.get('status')}"
                for p in pipes
            ]
            return {
                "ok": True,
                "intent": "pipelines.status",
                "reply": _format_items("DLT pipelines", items),
                "data": {"pipelines": pipes},
            }

        if "start" in lower or "run" in lower or "trigger" in lower:
            m = _UUID_RE.search(lower)
            pipeline_id = m.group(0) if m else ""
            if not pipeline_id:
                return {
                    "ok": False,
                    "errorType": "ValueError",
                    "error": "pipelineId is required.",
                    "message": "Please include a pipeline id (UUID) to start.",
                }
            data = start_pipeline(pipeline_id)
            if not data.get("ok"):
                return data
            return {
                "ok": True,
                "intent": "pipelines.start",
                "reply": data.get("message") or "Start requested.",
                "data": data,
            }

        if "stop" in lower or "cancel" in lower:
            m = _UUID_RE.search(lower)
            pipeline_id = m.group(0) if m else ""
            if not pipeline_id:
                return {
                    "ok": False,
                    "errorType": "ValueError",
                    "error": "pipelineId is required.",
                    "message": "Please include a pipeline id (UUID) to stop.",
                }
            data = stop_pipeline(pipeline_id)
            if not data.get("ok"):
                return data
            return {
                "ok": True,
                "intent": "pipelines.stop",
                "reply": data.get("message") or "Stop requested.",
                "data": data,
            }

    # Clusters
    if "cluster" in lower or "clusters" in lower:
        if "running" in lower or "status" in lower or "state" in lower:
            data = list_clusters()
            if not data.get("ok"):
                return data
            clusters = data.get("clusters") or []
            if "running" in lower:
                clusters = [
                    c
                    for c in clusters
                    if (c.get("state") or "").upper() == "RUNNING"
                ]
                items = [f"{c.get('name') or '(unnamed)'} ({c.get('id')}): RUNNING" for c in clusters]
                return {
                    "ok": True,
                    "intent": "clusters.running",
                    "reply": _format_items("Running clusters", items),
                    "data": {"clusters": clusters},
                }

            items = [
                f"{c.get('name') or '(unnamed)'} ({c.get('id')}): {c.get('state')}"
                for c in clusters
            ]
            return {
                "ok": True,
                "intent": "clusters.status",
                "reply": _format_items("Clusters", items),
                "data": {"clusters": clusters},
            }

    return {
        "ok": True,
        "intent": "unknown",
        "reply": "I can help with Jobs, DLT Pipelines, and Clusters right now. Try: 'which jobs are running?' or 'show pipeline status'.",
    }
