#!/bin/bash
# ==============================================================================
# ACHouse — Despliegue Automatizado a Google Cloud Run (Nivel Siempre Gratis $0)
# Ejecútalo en Google Cloud Shell (https://shell.cloud.google.com)
# ==============================================================================
set -e

echo "🚀 Iniciando despliegue de ACHouse en Google Cloud Run (Always Free Tier)..."

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "🔍 Buscando proyectos disponibles en tu cuenta de Google Cloud..."
  gcloud projects list || true
  echo ""
  read -p "👉 Copia y pega aquí el PROJECT_ID que deseas usar: " INPUT_ID
  if [ -z "$INPUT_ID" ]; then
    echo "❌ No se ingresó ningún proyecto. Por favor selecciona o crea un proyecto."
    exit 1
  fi
  gcloud config set project "$INPUT_ID"
  PROJECT_ID="$INPUT_ID"
fi

echo "📦 Proyecto seleccionado: $PROJECT_ID"

SERVICE_NAME="achouse"
REGION="us-east1" # Región con nivel Always Free Tier de Google Cloud

echo "⚙️ Habilitando APIs necesarias (Cloud Run y Cloud Build)..."
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
