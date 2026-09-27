# Single container that serves both the React frontend and the FastAPI backend.
# Works on Render, Railway, Fly.io, Google Cloud Run, or any Docker host.

# ---- Frontend build ----
FROM node:20-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx vite build

# ---- Backend runtime ----
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend_dist \
    ENV=prod \
    DATABUTTON_SERVICE_TYPE=prodx \
    PORT=8000
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /app/dist /app/frontend_dist
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
