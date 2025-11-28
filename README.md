# Invoice AI Processor v2 🧾🤖

Sistema avanzado de extracción de datos de facturas usando **Docling** (IBM) y **Claude API** (Anthropic).

## ✨ Características

| Feature | v1 (Tesseract) | v2 (Docling + Claude) |
|---------|---------------|----------------------|
| Precisión OCR | 70-85% | 90-98% |
| Tablas complejas | ❌ Limitado | ✅ Excelente |
| Layouts variados | ❌ Frágil | ✅ Robusto |
| Facturas escaneadas | ⚠️ Regular | ✅ Muy bueno |
| Costo | Gratis | Gratis/Pago (híbrido) |

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA v2                          │
├─────────────────────────────────────────────────────────────┤
│  PDF/Imagen Input                                           │
│      ▼                                                      │
│  ┌─────────────┐                                           │
│  │   Docling   │  ← IBM Research - OCR + Layout AI         │
│  │  (parsing)  │    - Entiende estructura de documentos    │
│  └──────┬──────┘    - Extrae tablas con estructura         │
│         ▼                                                   │
│  ┌─────────────┐                                           │
│  │  Markdown/  │  ← Salida estructurada                    │
│  │   Tables    │                                           │
│  └──────┬──────┘                                           │
│         ▼                                                   │
│  ┌─────────────────────────────────────┐                   │
│  │         Extractor Engine            │                   │
│  │  ┌─────────┐    ┌─────────────────┐ │                   │
│  │  │ Local   │ OR │  Claude API     │ │                   │
│  │  │ Patterns│    │  (si necesario) │ │                   │
│  │  └─────────┘    └─────────────────┘ │                   │
│  └──────────────────┬──────────────────┘                   │
│                     ▼                                       │
│              InvoiceData (JSON)                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Opción 1: Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/egtimer/invoice-ai-processor.git
cd invoice-ai-processor

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar .env y añadir ANTHROPIC_API_KEY (opcional pero recomendado)

# Levantar servicios
docker-compose up -d

# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### Opción 2: Desarrollo local

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download es_core_news_sm

# Configurar
cp .env.example .env
# Editar .env

# Ejecutar
uvicorn app.main:app --reload

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## ⚙️ Modos de Extracción

| Modo | Precisión | Costo | Uso |
|------|-----------|-------|-----|
| `local_only` | ~80% | Gratis | Facturas simples, alto volumen |
| `hybrid` | ~90% | Bajo | **Recomendado** - Balance ideal |
| `llm_only` | ~95% | Medio | Máxima precisión, bajo volumen |

Configurar en `.env`:
```env
EXTRACTION_MODE=hybrid
LLM_ESCALATION_THRESHOLD=0.7
```

## 📡 API Endpoints

### Subir factura
```bash
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@factura.pdf"
```

### Procesar
```bash
curl -X POST http://localhost:8000/api/v2/process/{invoice_id}
```

### Procesar con LLM forzado
```bash
curl -X POST http://localhost:8000/api/v2/process/{invoice_id} \
  -H "Content-Type: application/json" \
  -d '{"force_llm": true}'
```

### Ver estado
```bash
curl http://localhost:8000/api/v2/process/{invoice_id}
```

### Obtener resultados
```bash
curl http://localhost:8000/api/v2/results/{invoice_id}
```

## 📊 Respuesta de ejemplo

```json
{
  "invoice_number": "F2024-001234",
  "invoice_date": "2024-01-15",
  "supplier": {
    "name": "Empresa Ejemplo S.L.",
    "tax_id": "B12345678",
    "address": "Calle Principal 123",
    "city": "Madrid"
  },
  "client": {
    "name": "Cliente Final S.A.",
    "tax_id": "A87654321"
  },
  "lines": [
    {
      "description": "Servicio de consultoría",
      "quantity": 10,
      "unit_price": 100.00,
      "line_total": 1000.00,
      "tax_rate": 21
    }
  ],
  "subtotal": 1000.00,
  "tax_amount": 210.00,
  "total": 1210.00,
  "currency": "EUR",
  "confidence_score": 0.94,
  "extraction_method": "claude",
  "requires_review": false
}
```

## 🔧 Configuración Avanzada

### Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API key de Claude | - |
| `EXTRACTION_MODE` | local_only, hybrid, llm_only | hybrid |
| `LLM_ESCALATION_THRESHOLD` | Umbral para escalar a LLM | 0.7 |
| `DOCLING_OCR_ENABLED` | Activar OCR para escaneados | true |
| `DOCLING_TABLE_MODE` | fast o accurate | accurate |
| `MAX_FILE_SIZE` | Tamaño máximo en bytes | 20971520 |

### Obtener API Key de Claude

1. Ir a [console.anthropic.com](https://console.anthropic.com/)
2. Crear cuenta o iniciar sesión
3. Generar API key en Settings > API Keys
4. Añadir a `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

## 📁 Estructura del proyecto

```
invoice-ai-processor-v2/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/     # Endpoints FastAPI
│   │   ├── core/              # Configuración
│   │   ├── models/            # Modelos Pydantic
│   │   ├── services/          # Lógica de negocio
│   │   │   ├── docling_service.py      # Parsing con Docling
│   │   │   ├── claude_service.py       # Extracción con Claude
│   │   │   ├── local_extraction_service.py  # Patrones locales
│   │   │   └── invoice_processor.py    # Orquestador
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                  # React + TypeScript
├── docker-compose.yml
└── README.md
```

## 🧪 Testing

```bash
cd backend
pytest -v --cov=app tests/
```

## 📈 Roadmap

- [ ] Fine-tuning para facturas españolas
- [ ] Aprendizaje de correcciones del usuario
- [ ] Integraciones ERP (SAP, Odoo, Holded)
- [ ] Procesamiento batch masivo
- [ ] Dashboard de analytics

## 💰 Monetización

Este proyecto está preparado para monetización:

| Tier | Precio sugerido | Características |
|------|-----------------|-----------------|
| Free | 0€ | 50 facturas/mes, local_only |
| Pro | 29€/mes | 500 facturas/mes, hybrid |
| Enterprise | 99€/mes | Ilimitado, llm_only, soporte |

## 👤 Autor

**Eduardo García Tímermans**
- LinkedIn: [linkedin.com/in/egtimer](https://linkedin.com/in/egtimer)
- GitHub: [github.com/egtimer](https://github.com/egtimer)

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

⭐ Si este proyecto te resulta útil, ¡dale una estrella en GitHub!
