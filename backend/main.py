import os
import pathlib
import json
import logging
import dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
import asyncpg

logger = logging.getLogger(__name__)
ROUTER_IMPORT_ERRORS: dict[str, str] = {}
CRITICAL_ROUTERS = {"subscriptions_core", "subscriptions_payments", "subscriptions_certificates", "shares_management", "portfolio", "admin_subscriptions"}

# Load environment files
# First load shared .env file
dotenv.load_dotenv(".env")

# Then load environment-specific file (defaults to dev)
# Environment-specific values will override shared values
environment = os.getenv("ENV", "dev")
env_file = f".env.{environment}"
dotenv.load_dotenv(env_file, override=True)

print(f"Loaded environment: {environment}")

from app.auth.middleware import AuthConfig, get_authorized_user


def get_router_config() -> dict:
    try:
        cfg = json.loads(open("routers.json").read())
    except:
        return False
    return cfg


def is_auth_disabled(router_config: dict, name: str) -> bool:
    if not isinstance(router_config, dict):
        return False
    return router_config.get("routers", {}).get(name, {}).get("disableAuth", False)


def import_api_routers() -> APIRouter:
    """Create top level router including all user defined endpoints."""
    routes = APIRouter(prefix="/api")

    router_config = get_router_config()

    src_path = pathlib.Path(__file__).parent

    # Import API routers from "src/app/apis/*/__init__.py"
    apis_path = src_path / "app" / "apis"

    api_names = [
        p.relative_to(apis_path).parent.as_posix()
        for p in apis_path.glob("*/__init__.py")
    ]

    api_module_prefix = "app.apis."

    for name in api_names:
        print(f"Importing API: {name}")
        try:
            api_module = __import__(api_module_prefix + name, fromlist=[name])
            api_router = getattr(api_module, "router", None)
            if isinstance(api_router, APIRouter):
                routes.include_router(
                    api_router,
                    dependencies=(
                        []
                        if is_auth_disabled(router_config, name)
                        else [Depends(get_authorized_user)]
                    ),
                )
        except Exception as e:
            ROUTER_IMPORT_ERRORS[name] = type(e).__name__
            logger.exception("Unable to load API router %s", name)
            continue

    print(routes.routes)

    return routes


def get_firebase_config() -> dict | None:
    extensions = os.environ.get("AUTH_PROVIDERS", "[]")
    extensions = json.loads(extensions)

    for ext in extensions:
        if ext["name"] == "firebase-auth":
            # The extension may be listed without a config; treat that as disabled
            return ext.get("config", {}).get("firebaseConfig")

    return None


def get_stack_auth_config() -> dict | None:
    extensions = os.environ.get("AUTH_PROVIDERS", "[]")
    extensions = json.loads(extensions)

    for ext in extensions:
        if ext["name"] == "stack-auth":
            return ext["config"]

    return None


def parse_auth_configs() -> list[AuthConfig]:
    """Parse auth configs from both firebase-auth and stack-auth extensions."""
    auth_configs: list[AuthConfig] = []

    # Add stack-auth config if extension is enabled
    stack_auth_cfg = get_stack_auth_config()
    if stack_auth_cfg:
        project_id = stack_auth_cfg["projectId"]
        auth_configs.append(
            AuthConfig(
                issuer=f"https://api.stack-auth.com/api/v1/projects/{project_id}",
                jwks_url=stack_auth_cfg["jwksUrl"],
                audience=project_id,
            )
        )

    # Add firebase auth config if extension is enabled
    firebase_cfg = get_firebase_config()
    if firebase_cfg:
        project_id = firebase_cfg["projectId"]
        auth_configs.append(
            AuthConfig(
                issuer=f"https://securetoken.google.com/{project_id}",
                jwks_url="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
                audience=project_id,
            )
        )

    return auth_configs


def create_app() -> FastAPI:
    """Create the app. This is called by uvicorn with the factory option to construct the app object."""
    from app.libs import scheduler

    app = FastAPI()
    app.include_router(import_api_routers())

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_request, exc):
        if exc.status_code >= 500:
            reason = str(exc.detail).lower()
            if "does not exist" in reason and ("relation" in reason or "column" in reason):
                code, message, recovery = "DATA_SCHEMA_INCOMPLETE", "This feature's data is being restored.", "retry_later"
            elif "connect" in reason or "timeout" in reason:
                code, message, recovery = "DATA_CONNECTION_UNAVAILABLE", "The data service is temporarily unavailable.", "retry"
            else:
                code, message, recovery = "ACTION_FAILED", "This action could not be completed. Check its status before retrying.", "check_status"
            logger.error("API HTTP %s: %s", exc.status_code, exc.detail)
            return JSONResponse(status_code=exc.status_code, content={"detail": message, "code": code, "recovery": recovery}, headers=getattr(exc, "headers", None))
        if exc.status_code in (401, 403):
            code = "SIGN_IN_REQUIRED" if exc.status_code == 401 else "ACCESS_DENIED"
            recovery = "sign_in" if exc.status_code == 401 else "go_back"
            return JSONResponse(status_code=exc.status_code, content={"detail": str(exc.detail), "code": code, "recovery": recovery}, headers=getattr(exc, "headers", None))
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=getattr(exc, "headers", None))

    @app.exception_handler(asyncpg.UndefinedTableError)
    async def schema_error(_request, exc):
        logger.error("API database schema is incomplete", exc_info=(type(exc), exc, exc.__traceback__))
        return JSONResponse(status_code=503, content={
            "detail": "This feature's data is being restored. Please retry later.",
            "code": "DATA_SCHEMA_INCOMPLETE",
            "recovery": "retry_later",
        })

    @app.exception_handler(asyncpg.PostgresConnectionError)
    async def database_error(_request, exc):
        logger.error("API database connection failed", exc_info=(type(exc), exc, exc.__traceback__))
        return JSONResponse(status_code=503, content={
            "detail": "The data service is temporarily unavailable. Please try again.",
            "code": "DATA_CONNECTION_UNAVAILABLE",
            "recovery": "retry",
        })

    @app.exception_handler(Exception)
    async def unexpected_error(_request, exc):
        logger.error("Unhandled API error", exc_info=(type(exc), exc, exc.__traceback__))
        return JSONResponse(status_code=500, content={
            "detail": "This action could not be completed. Check its status before retrying.",
            "code": "ACTION_FAILED",
            "recovery": "check_status",
        })

    @app.get("/api/health/ready", include_in_schema=False)
    async def readiness():
        """A bounded check for the original investor database before promotion."""
        import asyncpg

        missing_routers = sorted(CRITICAL_ROUTERS & ROUTER_IMPORT_ERRORS.keys())
        if missing_routers:
            return JSONResponse(status_code=503, content={"status": "unavailable", "issue": "API_ROUTERS_UNAVAILABLE", "routers": missing_routers})

        db_url = os.environ.get("DATABASE_URL_PROD") or os.environ.get("DATABASE_URL")
        if not db_url:
            return JSONResponse(status_code=503, content={"status": "unavailable", "issue": "DATABASE_NOT_CONFIGURED"})
        try:
            conn = await asyncpg.connect(db_url, timeout=4, statement_cache_size=0)
            try:
                rows = await conn.fetch("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = ANY($1::text[])
                """, ["user_profiles", "roles", "user_roles", "share_classes", "share_config",
                      "share_subscriptions", "subscription_payments", "share_certificates", "audit_logs"])
            finally:
                await conn.close()
        except Exception:
            return JSONResponse(status_code=503, content={"status": "unavailable", "issue": "DATABASE_CONNECTION_FAILED"})
        found = {row["table_name"] for row in rows}
        required = {"user_profiles", "roles", "user_roles", "share_classes", "share_config",
                    "share_subscriptions", "subscription_payments", "share_certificates", "audit_logs"}
        if missing := sorted(required - found):
            return JSONResponse(status_code=503, content={"status": "unavailable", "issue": "INVESTMENT_SCHEMA_INCOMPLETE", "missing_tables": missing})
        return {"status": "ready", "investment_tables": len(required)}

    @app.on_event("startup")
    async def start_scheduler():
        app.state.scheduler = scheduler.start()

    for route in app.routes:
        if hasattr(route, "methods"):
            for method in route.methods:
                print(f"{method} {route.path}")

    auth_configs = parse_auth_configs()

    if len(auth_configs) == 0:
        print("No auth extensions found")
        app.state.auth_configs = None
    else:
        print(f"Found {len(auth_configs)} auth config(s)")
        app.state.auth_configs = auth_configs

    mount_frontend(app)

    return app


def mount_frontend(app: FastAPI) -> None:
    """Serve the built frontend (vite build output) when FRONTEND_DIST points to it.

    Lets a single service host both the SPA and the /api routes on one origin,
    which is what the frontend expects (it calls `${window.location.origin}/api`).
    """
    dist = os.environ.get("FRONTEND_DIST")
    if not dist or not pathlib.Path(dist, "index.html").is_file():
        return

    dist_path = pathlib.Path(dist).resolve()
    index_html = dist_path / "index.html"

    if (dist_path / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (dist_path / full_path).resolve()
        if full_path and candidate.is_file() and dist_path in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(index_html)

    print(f"Serving frontend from {dist_path}")


app = create_app()
