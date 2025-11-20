# Sistema Inteligente de Procesamiento de Facturas con IA

## Descripción del Proyecto

Sistema profesional de extracción automática de datos de facturas usando OCR y NLP. Procesa facturas en formato PDF, extrae información clave como números de factura, fechas, importes y líneas de detalle, y exporta los resultados en formatos estructurados (JSON, Excel).

**Valor de Negocio:** Reduce el tiempo de procesamiento manual de facturas de 5-10 minutos por documento a menos de 30 segundos, eliminando errores humanos y liberando recursos para tareas de mayor valor.

## Características Principales

- **Procesamiento Inteligente:** Extrae automáticamente datos estructurados de facturas en PDF
- **Validación Automática:** Verifica la coherencia de los datos extraídos (totales, subtotales, IVA)
- **Interfaz Intuitiva:** Drag & drop para subir múltiples facturas simultáneamente
- **Exportación Flexible:** Descarga resultados en JSON o Excel
- **API RESTful:** Documentación automática con Swagger/OpenAPI
- **Procesamiento por Lotes:** Maneja múltiples facturas en paralelo
- **Confianza en Predicciones:** Muestra nivel de certeza para cada dato extraído

## Stack Tecnológico

### Backend
- **FastAPI:** Framework moderno para crear APIs RESTful
- **Python 3.11+:** Lenguaje principal
- **PyPDF2 / pdfplumber:** Extracción de texto de PDFs
- **Tesseract OCR:** Reconocimiento óptico de caracteres para PDFs escaneados
- **Transformers (Hugging Face):** Modelos pre-entrenados para NER (Named Entity Recognition)
- **spaCy:** Procesamiento de lenguaje natural
- **Pydantic:** Validación de datos y schemas
- **Redis:** Cache para optimización de rendimiento (opcional)

### Frontend
- **React 18:** Librería UI
- **TypeScript:** Tipado estático
- **Tailwind CSS:** Estilos modernos y responsivos
- **Axios:** Cliente HTTP
- **React Query:** Gestión de estado y cache
- **React Dropzone:** Interfaz drag & drop
- **XLSX:** Generación de archivos Excel

### DevOps
- **Docker & Docker Compose:** Containerización
- **Pytest:** Testing del backend
- **Jest + React Testing Library:** Testing del frontend
- **GitHub Actions:** CI/CD (opcional)

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  (React + TypeScript + Tailwind)                            │
│  - Upload Interface                                          │
│  - Results Visualization                                     │
│  - Export Controls                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Upload     │  │  Processing  │  │   Results    │     │
│  │  Endpoint    │─▶│   Service    │─▶│  Endpoint    │     │
│  └──────────────┘  └──────┬───────┘  └──────────────┘     │
│                            │                                 │
│                            ▼                                 │
│                   ┌─────────────────┐                       │
│                   │  AI Engine      │                       │
│                   │  - OCR          │                       │
│                   │  - NLP/NER      │                       │
│                   │  - Validation   │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Estructura del Proyecto

```
invoice-ai-processor/
├── backend/
│   ├── app/
│   │   ├── main.py                 # Entry point FastAPI
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── upload.py       # Endpoint para subir facturas
│   │   │   │   ├── process.py      # Endpoint para procesar
│   │   │   │   └── export.py       # Endpoint para exportar
│   │   │   └── deps.py             # Dependencias compartidas
│   │   ├── core/
│   │   │   ├── config.py           # Configuración de la app
│   │   │   └── logging.py          # Setup de logging
│   │   ├── models/
│   │   │   ├── invoice.py          # Modelos Pydantic
│   │   │   └── schemas.py          # Schemas de request/response
│   │   ├── services/
│   │   │   ├── ocr_service.py      # Servicio de OCR
│   │   │   ├── nlp_service.py      # Servicio de NLP/NER
│   │   │   ├── validator.py        # Validación de datos
│   │   │   └── exporter.py         # Exportación a Excel/JSON
│   │   └── utils/
│   │       ├── pdf_handler.py      # Utilidades para PDFs
│   │       └── text_cleaner.py     # Limpieza de texto
│   ├── tests/
│   │   ├── test_api.py
│   │   ├── test_services.py
│   │   └── fixtures/                # PDFs de prueba
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx      # Componente drag & drop
│   │   │   ├── ProcessingStatus.tsx # Estado del procesamiento
│   │   │   ├── ResultsTable.tsx    # Tabla de resultados
│   │   │   └── ExportButtons.tsx   # Botones de exportación
│   │   ├── hooks/
│   │   │   └── useInvoiceProcessor.ts # Hook personalizado
│   │   ├── services/
│   │   │   └── api.ts              # Cliente API
│   │   ├── types/
│   │   │   └── invoice.ts          # Tipos TypeScript
│   │   ├── utils/
│   │   │   └── formatters.ts       # Formateo de datos
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Instalación y Setup

### Prerequisitos
- Python 3.11+
- Node.js 18+
- Docker (opcional, recomendado)
- Tesseract OCR instalado en el sistema

### Opción 1: Setup con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone [tu-repo]
cd invoice-ai-processor

# Construir y levantar los contenedores
docker-compose up --build

# El backend estará disponible en http://localhost:8000
# El frontend estará disponible en http://localhost:3000
# Documentación API en http://localhost:8000/docs
```

### Opción 2: Setup Local

#### Backend
```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Descargar modelos de spaCy
python -m spacy download es_core_news_lg

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

## Uso del Sistema

### 1. Subir Facturas
- Arrastra y suelta archivos PDF en la zona de carga
- O haz clic para seleccionar archivos
- Soporta procesamiento por lotes de múltiples facturas

### 2. Procesamiento Automático
- El sistema extrae automáticamente:
  - Número de factura
  - Fecha de emisión
  - Datos del proveedor (nombre, CIF, dirección)
  - Datos del cliente
  - Líneas de detalle (descripción, cantidad, precio unitario, total)
  - Base imponible
  - IVA
  - Total factura

### 3. Revisión de Resultados
- Visualiza los datos extraídos en formato tabla
- Verifica el nivel de confianza de cada campo
- Edita manualmente si es necesario

### 4. Exportación
- Descarga en formato JSON para integración con sistemas
- Descarga en formato Excel para revisión manual

## API Documentation

Una vez que el backend esté ejecutándose, accede a la documentación interactiva en:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Endpoints Principales

#### POST /api/v1/upload
Sube uno o más archivos PDF de facturas

#### GET /api/v1/process/{invoice_id}
Procesa una factura específica y devuelve los datos extraídos

#### POST /api/v1/export
Exporta resultados en el formato especificado (json/excel)

## Testing

### Backend
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend
```bash
cd frontend
npm test
```

## Roadmap y Mejoras Futuras

- [ ] Soporte para múltiples idiomas
- [ ] Integración con sistemas ERP (SAP, Odoo)
- [ ] Machine Learning para mejorar precisión con el uso
- [ ] Detección automática de duplicados
- [ ] API webhooks para integración asíncrona
- [ ] Dashboard de analytics y métricas
- [ ] Soporte para otros tipos de documentos (albaranes, presupuestos)

## Casos de Uso

### Departamento de Contabilidad
Procesa cientos de facturas recibidas mensualmente, reduciendo tiempo de data entry de 40 horas a 2 horas de revisión.

### Empresas de Logística
Automatiza la extracción de datos de albaranes de entrega para actualización de sistemas de inventario.

### Despachos Legales
Extrae información clave de documentos judiciales para categorización y archivo automático.

## Licencia

Este proyecto es un portfolio profesional. Para uso comercial, contactar a eduardo@tu-dominio.com

## Contacto y Soporte

**Eduardo García Tímermans**
- Email: eduardogarciatimermans@gmail.com
- LinkedIn: [tu-perfil]
- GitHub: [tu-perfil]
- Teléfono: +34 673963532

---

**⚡ Demo en Vivo:** [Próximamente - despliegue en Railway/Render]

**📹 Video Demo:** [Link a YouTube con demo de 2-3 minutos]
