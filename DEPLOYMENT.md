# 🚀 Guía de Despliegue: Railway + Vercel

## Arquitectura de Despliegue

```
┌─────────────────┐         ┌─────────────────┐
│     Vercel      │   API   │    Railway      │
│    Frontend     │ ──────► │    Backend      │
│  (React/Vite)   │         │ (FastAPI+Docling)│
└─────────────────┘         └─────────────────┘
       ▲                           │
       │                           ▼
    Usuario              ┌─────────────────┐
                         │  Claude API     │
                         │  (Anthropic)    │
                         └─────────────────┘
```

---

## 📋 Paso 1: Preparar el Repositorio

### Reemplazar contenido existente en GitHub

```bash
# Clonar tu repo actual
git clone https://github.com/egtimer/-invoice-ai-processor.git
cd -invoice-ai-processor

# OPCIÓN A: Eliminar todo y copiar lo nuevo
rm -rf *
rm -rf .* 2>/dev/null

# Descomprimir el nuevo código (asumiendo que lo descargaste)
unzip invoice-ai-processor-v2.zip
mv invoice-ai-processor-v2/* .
mv invoice-ai-processor-v2/.* . 2>/dev/null
rmdir invoice-ai-processor-v2

# Commit y push
git add .
git commit -m "🚀 Upgrade to v2: Docling + Claude architecture"
git push origin main
```

### OPCIÓN B: Crear repo nuevo (recomendado)

```bash
# Crear nuevo repositorio en GitHub: invoice-ai-processor-v2
# Luego:
cd invoice-ai-processor-v2
git init
git add .
git commit -m "🎉 Initial commit: Invoice AI Processor v2"
git remote add origin https://github.com/egtimer/invoice-ai-processor-v2.git
git push -u origin main
```

---

## 📋 Paso 2: Deploy Backend en Railway

### 2.1. Conectar Railway con GitHub

1. Ir a [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Seleccionar tu repositorio
4. Railway detectará automáticamente el `nixpacks.toml`

### 2.2. Configurar Variables de Entorno

En Railway Dashboard → Variables, añadir:

```env
# REQUERIDO
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# OPCIONAL (Railway los configura automáticamente)
PORT=8000

# CONFIGURACIÓN
EXTRACTION_MODE=hybrid
LLM_ESCALATION_THRESHOLD=0.7
DOCLING_OCR_ENABLED=true
DOCLING_TABLE_MODE=accurate
LOG_LEVEL=INFO
DEBUG=false
```

### 2.3. Obtener URL del Backend

Una vez desplegado, Railway te dará una URL como:
```
https://invoice-ai-processor-production.up.railway.app
```

Guarda esta URL para el paso siguiente.

### 2.4. Verificar que funciona

```bash
curl https://TU-URL-RAILWAY.railway.app/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "extraction_mode": "hybrid",
  "claude_available": true,
  "docling_ready": true
}
```

---

## 📋 Paso 3: Deploy Frontend en Vercel

### 3.1. Conectar Vercel con GitHub

1. Ir a [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Importar tu repositorio de GitHub

### 3.2. Configurar el Build

En Vercel, configurar:

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.3. Configurar Variable de Entorno

En Vercel → Settings → Environment Variables:

```env
VITE_API_URL=https://TU-URL-RAILWAY.railway.app
```

### 3.4. Actualizar vercel.json

Antes de hacer deploy, actualiza `vercel.json` con tu URL real de Railway:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://TU-URL-RAILWAY.railway.app/api/:path*"
    }
  ]
}
```

### 3.5. Deploy

```bash
git add .
git commit -m "Configure Vercel with Railway URL"
git push
```

Vercel hará deploy automático.

---

## 📋 Paso 4: Verificar Todo

### Test completo

1. Ir a tu URL de Vercel: `https://tu-proyecto.vercel.app`
2. Subir una factura de prueba
3. Verificar que se procesa correctamente
4. Revisar los datos extraídos

### Endpoints de la API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v2/upload` | POST | Subir factura |
| `/api/v2/process/{id}` | POST | Procesar |
| `/api/v2/process/{id}` | GET | Estado |
| `/api/v2/results/{id}` | GET | Resultados |

---

## 💰 Costos Estimados

### Railway (Backend)

| Plan | Precio | Incluye |
|------|--------|---------|
| Hobby | $5/mes | 500 horas, $5 crédito |
| Pro | $20/mes | Sin límites |

Para este proyecto, el plan Hobby suele ser suficiente para desarrollo/MVP.

### Vercel (Frontend)

| Plan | Precio | Incluye |
|------|--------|---------|
| Hobby | Gratis | 100GB bandwidth |
| Pro | $20/mes | Sin límites |

El plan Hobby es suficiente para empezar.

### Claude API (Anthropic)

| Uso | Costo estimado |
|-----|----------------|
| 100 facturas/mes | ~$0.30-1.00 |
| 1000 facturas/mes | ~$3-10 |

Claude es muy económico para este tipo de uso.

---

## 🔧 Troubleshooting

### Error: "Module not found: docling"

Railway necesita tiempo para instalar Docling (~2-3 min).
Espera a que el deploy termine completamente.

### Error: "ANTHROPIC_API_KEY not set"

1. Verifica que la variable esté en Railway → Variables
2. Redeploy: Railway → Deployments → Redeploy

### Error: "CORS blocked"

Asegúrate de que tu dominio de Vercel esté en la lista de CORS.
En `backend/app/main.py`, añade tu dominio:

```python
origins = [
    "http://localhost:3000",
    "https://tu-proyecto.vercel.app",  # Añadir esta línea
]
```

### Frontend no conecta con backend

1. Verifica `VITE_API_URL` en Vercel
2. Verifica que los rewrites en `vercel.json` apunten al Railway correcto
3. Prueba directamente: `curl https://tu-railway-url/health`

---

## 📝 Checklist Final

- [ ] Código subido a GitHub
- [ ] Railway conectado y desplegado
- [ ] Variable `ANTHROPIC_API_KEY` configurada en Railway
- [ ] URL de Railway obtenida
- [ ] Vercel conectado y desplegado
- [ ] Variable `VITE_API_URL` configurada en Vercel
- [ ] `vercel.json` actualizado con URL de Railway
- [ ] Test de subida de factura funciona
- [ ] Dominio personalizado configurado (opcional)

---

## 🎉 ¡Listo!

Tu Invoice AI Processor v2 está desplegado con:
- ✅ Frontend en Vercel (gratis)
- ✅ Backend en Railway (~$5/mes)
- ✅ IA con Claude API (pago por uso)

Precisión esperada: **90-95%** vs 70-80% del sistema anterior.
