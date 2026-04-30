from __future__ import annotations

import re
from typing import Any

from src.tools.databricks.clusters import list_clusters
from src.tools.databricks.jobs import list_jobs, run_job, stop_job
from src.tools.databricks.pipelines import list_pipelines, start_pipeline, stop_pipeline
from src.tools.db_ai_kit import list_db_ai_kit_skills

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
    """Simple, non-LLM intent router.

    This makes chat useful immediately without needing Claude keys.
    Later you can replace this with an LLM-driven tool-calling agent.
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
