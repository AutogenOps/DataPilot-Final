from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceHealth:
    service: str
    status: str
    details: str | None = None
