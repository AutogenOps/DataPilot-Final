from __future__ import annotations

import re
import threading
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class LogEntry:
    ts: str
    level: str
    message: str


_JWT_RE = re.compile(r"\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")
_DATABRICKS_PAT_RE = re.compile(r"\bdapi[0-9a-zA-Z]+\b")


def _redact(message: str) -> str:
    # Avoid accidental leakage of tokens/keys in a UI log viewer.
    message = _DATABRICKS_PAT_RE.sub("dapi***", message)
    message = _JWT_RE.sub("***", message)
    return message


class LogBuffer:
    def __init__(self, max_entries: int = 1000) -> None:
        self._lock = threading.Lock()
        self._entries: deque[LogEntry] = deque(maxlen=max_entries)

    def add(self, level: str, message: str) -> None:
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        entry = LogEntry(ts=now, level=level.upper(), message=_redact(message))
        with self._lock:
            self._entries.append(entry)

    def tail(self, limit: int = 200) -> list[dict]:
        with self._lock:
            items = list(self._entries)[-max(1, limit) :]

        return [{"ts": e.ts, "level": e.level, "message": e.message} for e in items]


log_buffer = LogBuffer()
