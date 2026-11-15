# Full-stack image: compile React once; serve frontend and API on one HTTPS origin.
FROM node:22-alpine AS frontend
WORKDIR /build
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.12-slim AS app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend /app/backend
COPY --from=frontend /build/dist /app/dist
# AppEEARS and MyMarketNews remain local-only: no personal tokens in a public service.
ENV FIELD_SHIFT_MARKET_LOCAL_MODE=0 FIELD_SHIFT_APPEEARS_LOCAL_MODE=0
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-10000}"]
