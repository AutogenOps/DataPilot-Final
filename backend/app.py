from __future__ import annotations

from src.server.http_api import create_app

# Vercel Python runtime expects a top-level ASGI/WSGI callable named `app`.
app = create_app()
