import os
import pathlib
import json
import dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Load environment files
# First load shared .env file
dotenv.load_dotenv(".env")

# Then load environment-specific file (defaults to dev)
# Environment-specific values will override shared values
environment = os.getenv("ENV", "dev")
env_file = f".env.{environment}"
dotenv.load_dotenv(env_file, override=True)

print(f"Loaded environment: {environment}")

from databutton_app.mw.auth_mw import AuthConfig, get_authorized_user


def get_router_config() -> dict:
    try:
        # Note: This file is not available to the agent
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
            print(e)
            continue

    print(routes.routes)

    return routes


def get_firebase_config() -> dict | None:
    extensions = os.environ.get("DATABUTTON_EXTENSIONS", "[]")
    extensions = json.loads(extensions)

    for ext in extensions:
        if ext["name"] == "firebase-auth":
            # The extension may be listed without a config; treat that as disabled
            return ext.get("config", {}).get("firebaseConfig")

    return None


def get_stack_auth_config() -> dict | None:
    extensions = os.environ.get("DATABUTTON_EXTENSIONS", "[]")
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
    app = FastAPI()
    app.include_router(import_api_routers())

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
