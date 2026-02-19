import json
from typing import Any, Dict, Optional

from mcp.server.fastmcp import Context

from helpers.logging_config import get_logger
from helpers.utils.authentication import get_azure_credentials
from helpers.utils.context import mcp, __ctx_cache


logger = get_logger(__name__)


AUDIENCE_SCOPES = {
    "fabric": "https://api.fabric.microsoft.com/.default",
    "powerbi": "https://analysis.windows.net/powerbi/api/.default",
    "graph": "https://graph.microsoft.com/.default",
    "storage": "https://storage.azure.com/.default",
    "azure": "https://management.azure.com/.default",
}

AUDIENCE_BASE_URLS = {
    "fabric": "https://api.fabric.microsoft.com",
    "powerbi": "https://api.powerbi.com",
    "graph": "https://graph.microsoft.com",
    "storage": "https://onelake.dfs.fabric.microsoft.com",
    "azure": "https://management.azure.com",
}


@mcp.tool()
async def raw_api_call(
    endpoint: str,
    method: str = "GET",
    audience: str = "fabric",
    body: Optional[str] = None,
    ctx: Context = None,
) -> Dict[str, Any]:
    """Call any Microsoft API directly. Covers gaps where no dedicated tool exists.

    This is a universal escape hatch — use it when no specific MCP tool exists for what
    you need. Supports Fabric REST, Power BI, Microsoft Graph, OneLake, and Azure ARM APIs.

    Args:
        endpoint: API path (e.g. "/v1/workspaces" for Fabric, "/v1.0/me" for Graph).
                  Can be relative (prepends base URL) or absolute (https://...).
        method: HTTP method — GET, POST, PATCH, PUT, DELETE
        audience: Target API — "fabric", "powerbi", "graph", "storage", or "azure"
        body: JSON request body as a string (for POST/PATCH/PUT). Pass null for GET/DELETE.
        ctx: FastMCP context
    """
    import requests

    try:
        if ctx is None:
            raise ValueError("Context (ctx) must be provided.")

        audience_lower = audience.strip().lower()
        if audience_lower not in AUDIENCE_SCOPES:
            raise ValueError(
                f"Unknown audience '{audience}'. Must be one of: {', '.join(AUDIENCE_SCOPES.keys())}"
            )

        token_scope = AUDIENCE_SCOPES[audience_lower]
        base_url = AUDIENCE_BASE_URLS[audience_lower]

        credential = get_azure_credentials(ctx.client_id, __ctx_cache)
        token = credential.get_token(token_scope).token

        # Build URL
        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            url = endpoint
        else:
            url = f"{base_url}/{endpoint.lstrip('/')}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Parse body
        parsed_body = None
        if body:
            try:
                parsed_body = json.loads(body)
            except json.JSONDecodeError:
                raise ValueError(f"Invalid JSON in body: {body[:200]}")

        # Make request
        method_upper = method.strip().upper()
        response = requests.request(
            method=method_upper,
            url=url,
            headers=headers,
            json=parsed_body if method_upper in ("POST", "PATCH", "PUT") else None,
            params=parsed_body if method_upper == "GET" and parsed_body else None,
            timeout=120,
        )

        # Handle response
        result: Dict[str, Any] = {
            "status": response.status_code,
            "url": url,
            "method": method_upper,
        }

        if response.status_code == 204 or not response.text:
            result["body"] = None
            return result

        try:
            result["body"] = response.json()
        except json.JSONDecodeError:
            result["body"] = response.text[:5000]

        if response.status_code >= 400:
            result["error"] = True

        return result

    except requests.RequestException as req_err:
        logger.error("raw_api_call request failed: %s", req_err)
        return {"error": str(req_err)}
    except Exception as exc:
        logger.error("raw_api_call error: %s", exc)
        return {"error": str(exc)}
