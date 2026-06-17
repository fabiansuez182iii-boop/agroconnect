# 🌱 AgroConnect

> Plataforma tecnológica que conecta agricultores colombianos con mercados directos, eliminando intermediarios y optimizando la cadena de suministro agrícola.

**Proyecto Formativo ADSO - SENA 2026**

## 🏗️ Arquitectura

AgroConnect/
├── frontend/ # React + Vite + TypeScript + Tailwind CSS
├── backend/ # (Próximamente) Node.js + Express + PostgreSQL
├── docs/ # (Próximamente) Documentación Marp
├── AGENTS.md # Memoria institucional del proyecto (para IA)
└── README.md # Este archivo

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **TypeScript 5** (tipado fuerte, strict mode)
- **Vite 8** (build ultra-rápido con Rolldown)
- **Tailwind CSS 3** (design system personalizado)
- **Leaflet** + **OpenStreetMap** (mapas 100% open source)
- **ESLint 9** + **Prettier 3** (calidad de código nivel PhD)
- **Husky** + **lint-staged** (pre-commit hooks)

### IA & Herramientas
- **OpenCode** (IDE con IA integrada)
- **Ollama Local** (privacidad de datos sensibles)
- **Groq** (inferencia ultra-rápida <100ms)
- **OpenRouter** (acceso a 200+ modelos vía router)
- **8 MCP Servers** (Stitch, Cloudinary, GitHub, Jira, Notion, etc.)

## 🚀 Comandos de Desarrollo

```bash
# Desde la carpeta frontend/
cd frontend
npm install          # Instalar dependencias
npm run dev          # Servidor de desarrollo (http://localhost:5173/)
npm run build        # Build de producción
npm run lint         # Validar calidad de código
npm run format       # Formatear con Prettier
npm run quality      # format + lint:fix (one-click fix)

📊 Características Implementadas

✅ Mapa interactivo de Colombia con clustering de fincas
✅ Heatmap de productividad agrícola
✅ Búsqueda de ubicaciones con autocompletado
✅ Herramientas de dibujo para parcelas
✅ 4 capas base seleccionables (OSM, Satélite Esri, Topográfico, CartoDB)
✅ Dashboard con KPIs de fincas y cultivos
✅ Design system con paleta personalizada (verde agricultura, amarillo cosecha)

🎓 Créditos

Arquitecto de Software: Fabián
Institución: SENA - ADSO (Análisis y Desarrollo de Sistemas de Información)
Año: 2026

Construido con 💚 usando tecnologías 100% open source
