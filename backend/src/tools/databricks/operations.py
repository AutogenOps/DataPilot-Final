from __future__ import annotations

import smtplib
import time
import traceback
from collections.abc import Callable
from email.message import EmailMessage
from typing import TypeVar

from src.config.env import env
from src.server.logs import log_buffer

T = TypeVar("T")


def _attempt_count() -> int:
    return max(3, int(env.databricks_retry_attempts or 3))


def _delay_seconds() -> float:
    return max(0.0, float(env.databricks_retry_delay_seconds or 0.0))


def _format_failure_email(
    *,
    operation: str,
    attempts: int,
    error: BaseException,
    applied_solutions: list[str],
) -> EmailMessage:
    sender = env.alert_email_from or env.smtp_username or "datapilot@databricks.local"
    recipient = env.alert_email_to or "arushverma767@gmail.com"

    msg = EmailMessage()
    msg["Subject"] = f"DataPilot Databricks failure: {operation}"
    msg["From"] = sender
    msg["To"] = recipient
    msg.set_content(
        "\n".join(
            [
                f"Operation: {operation}",
                f"Attempts: {attempts}",
                f"Error type: {type(error).__name__}",
                f"Problem: {error}",
                "",
                "Solutions applied:",
                *[f"- {item}" for item in applied_solutions],
                "",
                "Traceback:",
                "".join(traceback.format_exception(type(error), error, error.__traceback__)),
            ]
        )
    )
    return msg


def send_failure_email(
    *,
    operation: str,
    attempts: int,
    error: BaseException,
    applied_solutions: list[str],
) -> dict:
    """Send a best-effort failure email after retry exhaustion."""

    if not env.smtp_host:
        message = (
            "SMTP_HOST is not configured; failure email was not sent. "
            f"Would have notified {env.alert_email_to}."
        )
        log_buffer.add("WARN", message)
        return {"ok": False, "message": message}

    msg = _format_failure_email(
        operation=operation,
        attempts=attempts,
        error=error,
        applied_solutions=applied_solutions,
    )

    try:
        with smtplib.SMTP(env.smtp_host, env.smtp_port, timeout=20) as smtp:
            if env.smtp_use_tls:
                smtp.starttls()
            if env.smtp_username and env.smtp_password:
                smtp.login(env.smtp_username, env.smtp_password)
            smtp.send_message(msg)

        message = f"Failure email sent to {msg['To']} for {operation}."
        log_buffer.add("INFO", message)
        return {"ok": True, "message": message}
    except Exception as exc:  # pragma: no cover - depends on SMTP service.
        message = f"Failed to send failure email for {operation}: {type(exc).__name__}: {exc}"
        log_buffer.add("ERROR", message)
        return {"ok": False, "message": message}


def run_with_retry(operation: str, func: Callable[[], T]) -> T:
    """Run a Databricks operation at least three times before surfacing failure."""

    attempts = _attempt_count()
    delay = _delay_seconds()
    applied_solutions: list[str] = []
    last_error: BaseException | None = None

    for attempt in range(1, attempts + 1):
        try:
            if attempt > 1:
                log_buffer.add("INFO", f"Retrying {operation}; attempt {attempt}/{attempts}")
            return func()
        except Exception as exc:
            last_error = exc
            applied_solutions.append(
                f"Attempt {attempt}/{attempts} failed with {type(exc).__name__}: {exc}"
            )
            log_buffer.add(
                "ERROR",
                f"{operation} attempt {attempt}/{attempts} failed: {type(exc).__name__}: {exc}",
            )
            if attempt < attempts and delay > 0:
                time.sleep(delay)

    assert last_error is not None
    send_failure_email(
        operation=operation,
        attempts=attempts,
        error=last_error,
        applied_solutions=applied_solutions,
    )
    raise last_error
