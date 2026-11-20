#!/bin/bash
# ==============================================================================
# ACHouse — Despliegue Automatizado a Google Cloud Run (Nivel Siempre Gratis $0)
# Ejecútalo en Google Cloud Shell (https://shell.cloud.google.com)
# ==============================================================================
set -e

echo "🚀 Iniciando despliegue de ACHouse en Google Cloud Run (Always Free Tier)..."

SERVICE_NAME="achouse"
REGION="us-east1" # Región con nivel Always Free Tier de Google Cloud

PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: No hay ningún proyecto seleccionado en gcloud."
  echo "Ejecuta: gcloud config set project TU_PROJECT_ID"
  exit 1
fi
echo "📦 Proyecto de Google Cloud: $PROJECT_ID"

echo "⚙️ Habilitando APIs necesarias..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

echo "🏗️ Compilando contenedor y desplegando en Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --port 8080 \
  --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1

echo "✅ ¡Despliegue completado con éxito a costo $0.00!"
echo "🔗 Tu URL pública en Cloud Run es:"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)'
