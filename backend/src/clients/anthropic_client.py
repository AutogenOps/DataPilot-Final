from anthropic import Anthropic

from src.config.env import env


def create_anthropic_client() -> Anthropic:
    if not env.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY is missing in backend/.env.")

    return Anthropic(api_key=env.anthropic_api_key)
