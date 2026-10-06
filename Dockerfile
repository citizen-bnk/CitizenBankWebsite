# Single container that serves both the React frontend and the FastAPI backend.
# Works on Render, Railway, Fly.io, Google Cloud Run, or any Docker host.

# ---- Frontend build ----
FROM node:20-bookworm-slim AS frontend
WORKDIR /app
# The frontend bakes its Stack Auth project (id, public client key) in at build time from AUTH_PROVIDERS.
# Render passes a service's environment variables to the build as build arguments, but only those declared here.
# Without this the build silently falls back to a built-in default project, and a service configured with
# a different Stack Auth project (the demo) would sign people in against the wrong one.
ARG AUTH_PROVIDERS
ENV AUTH_PROVIDERS=${AUTH_PROVIDERS}
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN if [ -z "$AUTH_PROVIDERS" ]; then \
      echo "WARNING: AUTH_PROVIDERS is empty at build time; the frontend will use the built-in default Stack Auth project."; \
    else echo "Building the frontend with the Stack Auth project from AUTH_PROVIDERS."; fi
RUN npx vite build

# ---- Backend runtime ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend_dist \
    ENV=prod \
    APP_ENV=production \
    PORT=8000
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /app/dist /app/frontend_dist
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
