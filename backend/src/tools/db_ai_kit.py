from __future__ import annotations

import json
from pathlib import Path


_REPO_ROOT = Path(__file__).resolve().parents[3]
_KIT_ROOT = _REPO_ROOT / "db-ai-kit"
_SKILLS_ROOT = _KIT_ROOT / ".cursor" / "skills"
_MCP_CONFIG = _KIT_ROOT / ".cursor" / "mcp.json"
_INSTALLED_SKILLS = _KIT_ROOT / ".ai-dev-kit" / ".installed-skills"
_SKILLS_PROFILE = _KIT_ROOT / ".ai-dev-kit" / ".skills-profile"


def _safe_read_text(path: Path, max_chars: int | None = None) -> str:
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    if max_chars is not None and len(text) > max_chars:
        return text[:max_chars] + "\n\n[truncated]"
    return text


def _skill_summary(skill_dir: Path) -> dict:
    skill_file = skill_dir / "SKILL.md"
    title = skill_dir.name
    description = ""

    if skill_file.is_file():
        for line in _safe_read_text(skill_file, max_chars=2500).splitlines():
            stripped = line.strip()
            if stripped.startswith("#") and title == skill_dir.name:
                title = stripped.lstrip("#").strip() or title
            elif stripped and not stripped.startswith("#"):
                description = stripped[:300]
                break

    return {
        "name": skill_dir.name,
        "title": title,
        "description": description,
        "path": str(skill_dir.relative_to(_REPO_ROOT)),
        "hasSkillFile": skill_file.is_file(),
    }


def _read_skills_profile() -> str:
    if not _SKILLS_PROFILE.is_file():
        return "unknown"
    return _safe_read_text(_SKILLS_PROFILE, max_chars=200).strip() or "unknown"


def _installed_skill_entries() -> list[dict]:
    if not _INSTALLED_SKILLS.is_file():
        return []

    entries: list[dict] = []
    for raw_line in _safe_read_text(_INSTALLED_SKILLS).splitlines():
        line = raw_line.strip()
        if not line or "|" not in line:
            continue

        source_root, skill_name = line.rsplit("|", 1)
        skill_name = skill_name.strip()
        local_dir = _SKILLS_ROOT / skill_name
        entries.append(
            {
                "name": skill_name,
                "manifestPath": source_root.strip(),
                "localPath": str(local_dir.relative_to(_REPO_ROOT)) if local_dir.exists() else None,
                "available": local_dir.is_dir(),
            }
        )

    return entries


def list_db_ai_kit_skills() -> dict:
    """List installed skills shipped in the local db-ai-kit folder."""

    if not _SKILLS_ROOT.is_dir():
        return {
            "ok": False,
            "errorType": "FileNotFoundError",
            "error": f"db-ai-kit skills folder not found at {_SKILLS_ROOT}",
            "message": "db-ai-kit skills are not available in this checkout.",
        }

    installed_entries = _installed_skill_entries()
    installed_names = {entry["name"] for entry in installed_entries}
    all_skill_dirs = {
        path.name: path
        for path in sorted(_SKILLS_ROOT.iterdir(), key=lambda p: p.name.lower())
        if path.is_dir()
    }

    selected_names = installed_names or set(all_skill_dirs.keys())
    skills = []
    for name in sorted(selected_names, key=str.lower):
        skill_dir = all_skill_dirs.get(name)
        if skill_dir is None:
            skills.append(
                {
                    "name": name,
                    "title": name,
                    "description": "",
                    "path": None,
                    "hasSkillFile": False,
                    "installed": True,
                    "available": False,
                }
            )
            continue

        summary = _skill_summary(skill_dir)
        summary["installed"] = not installed_entries or name in installed_names
        summary["available"] = True
        skills.append(summary)

    return {
        "ok": True,
        "skills": skills,
        "count": len(skills),
        "installedCount": len(installed_entries),
        "profile": _read_skills_profile(),
        "manifest": str(_INSTALLED_SKILLS.relative_to(_REPO_ROOT)),
        "installedEntries": installed_entries,
    }


def read_db_ai_kit_skill(skill_name: str) -> dict:
    """Read a single db-ai-kit skill by folder name."""

    skill_name = (skill_name or "").strip()
    if not skill_name:
        return {
            "ok": False,
            "errorType": "ValueError",
            "error": "skillName is required.",
            "message": "skillName is required.",
        }

    skill_dir = (_SKILLS_ROOT / skill_name).resolve()
    if _SKILLS_ROOT.resolve() not in skill_dir.parents or not skill_dir.is_dir():
        return {
            "ok": False,
            "errorType": "FileNotFoundError",
            "error": f"Skill not found: {skill_name}",
            "message": f"db-ai-kit skill not found: {skill_name}",
        }

    skill_file = skill_dir / "SKILL.md"
    if not skill_file.is_file():
        return {
            "ok": False,
            "errorType": "FileNotFoundError",
            "error": f"SKILL.md not found for {skill_name}",
            "message": f"db-ai-kit skill {skill_name} does not include SKILL.md.",
        }

    return {
        "ok": True,
        "skill": _skill_summary(skill_dir),
        "content": _safe_read_text(skill_file, max_chars=60000),
    }


def list_db_ai_kit_assets() -> dict:
    """List db-ai-kit pipeline and notebook/script assets available to Databricks tasks."""

    if not _KIT_ROOT.is_dir():
        return {
            "ok": False,
            "errorType": "FileNotFoundError",
            "error": f"db-ai-kit not found at {_KIT_ROOT}",
            "message": "db-ai-kit is not available in this checkout.",
        }

    assets: list[dict] = []
    for root_name in ["scripts", "pipelines"]:
        root = _KIT_ROOT / root_name
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*"), key=lambda p: str(p).lower()):
            if path.is_file():
                assets.append(
                    {
                        "name": path.name,
                        "type": root_name.rstrip("s"),
                        "path": str(path.relative_to(_REPO_ROOT)),
                    }
                )

    return {"ok": True, "assets": assets, "count": len(assets)}


def get_db_ai_kit_mcp_config() -> dict:
    """Return db-ai-kit MCP server configuration metadata."""

    if not _MCP_CONFIG.is_file():
        return {
            "ok": False,
            "errorType": "FileNotFoundError",
            "error": f"mcp.json not found at {_MCP_CONFIG}",
            "message": "db-ai-kit MCP configuration is not available.",
        }

    try:
        config = json.loads(_safe_read_text(_MCP_CONFIG))
    except json.JSONDecodeError as exc:
        return {
            "ok": False,
            "errorType": type(exc).__name__,
            "error": str(exc),
            "message": "db-ai-kit MCP configuration is invalid JSON.",
        }

    servers = config.get("mcpServers", {}) if isinstance(config, dict) else {}
    return {
        "ok": True,
        "config": config,
        "servers": sorted(servers.keys()) if isinstance(servers, dict) else [],
    }
