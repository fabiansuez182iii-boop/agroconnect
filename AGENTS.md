# AgroConnect - Project Context

## 🌱 Project Overview
AgroConnect es una plataforma tecnológica que conecta agricultores colombianos con mercados directos, eliminando intermediarios y optimizando la cadena de suministro agrícola.

**Contexto**: Proyecto Formativo ADSO - SENA

## 🏗️ Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Assets**: Cloudinary (imágenes optimizadas)
- **Design**: Penpot (UI/UX) + Stitch (código generado)
- **Documentation**: Marp (presentaciones PDF)
- **AI Assistants**: OpenCode + 8 MCPs

## 🤖 AI Provider Strategy

### Use Local (Ollama) for:
- Procesamiento de datos sensibles de agricultores
- Análisis de ubicaciones GPS de fincas
- Información financiera privada
- Cualquier dato que NO deba salir del equipo

### Use Groq (Cloud - Fast) for:
- Generación de código React/Node.js
- Autocompletado en tiempo real
- Refactorización rápida
- Generación de tests unitarios
- Documentación técnica de APIs

### Use OpenRouter for:
- Análisis profundo de requisitos del SENA
- Revisión de arquitectura
- Generación de documentación ejecutiva
- Tasks que requieran razonamiento complejo (Claude 3.5 Sonnet)
- Traducciones y contenido multilingüe

## 🎨 Design System
- **Primary Green**: `#2E7D32` (confianza, agricultura)
- **Accent Yellow**: `#F9A825` (cosecha, energía)
- **Typography**: Inter (UI) + Merriweather (contenido)

## 📋 SENA Deliverables
1. Documento de análisis de requisitos
2. Diagrama de arquitectura C4
3. Prototipo funcional (MVP)
4. Plan de pruebas
5. Presentación ejecutiva (Marp)
6. Video demostrativo

## 🚀 Project Structure
AgroConnect/
├── frontend/ # React + Vite
├── backend/ # Node.js + Express
├── docs/ # Documentación Marp
├── designs/ # Archivos Penpot
├── scripts/ # Scripts de automatización
└── docker/ # Configuración Docker

## 🔐 Security Guidelines
- Nunca commitear API keys (usar `.env` + `direnv`)
- Validar todos los inputs del lado servidor
- Usar HTTPS en producción
- Sanitizar datos antes de mostrar en UI
- Rate limiting en endpoints públicos

## 📞 Key Contacts
- **Instructor SENA**: [Nombre]
- **Equipo de desarrollo**: Fabián (Arquitecto)
- **Stakeholders**: Agricultores de la región

## 🧠 Ollama Models (Local AI)

Hardware: ASUS Vivobook M3604YA (AMD Ryzen 7 7730U, 16GB RAM, ~5.6GB disponible)

### Modelos disponibles (ordenados por tamaño):
| Modelo | Tamaño | RAM Req | Uso Recomendado |
|--------|--------|---------|-----------------|
| `qwen2.5-coder:1.5b` | 986 MB | ~1.2 GB | Chat rápido, tareas simples |
| **`qwen2.5-coder:3b`** ⭐ | 1.9 GB | ~2.0 GB | **DEFAULT para código** |
| `llama3.2:3b` | 2.0 GB | ~2.0 GB | Tareas generales rápidas |
| `qwen2.5-coder:7b` | 4.7 GB | ~4.3 GB | Solo con Chrome cerrado |
| `llama3.1:8b` | 4.9 GB | ~5.0 GB | Análisis profundo (cerrar apps) |

### Reglas de uso:
1. **DEFAULT**: Siempre preferir `@ollama/qwen2.5-coder:3b` para generación de código
2. Antes de usar modelos 7B+, cerrar Chrome: `pkill -f chrome`
3. Verificar RAM libre: `free -h` (necesitas >5GB para modelos 7B+)
4. Si necesitas máxima calidad sin comprometer RAM: usar `@groq/` o `@openrouter/`
5. Para datos sensibles de agricultores: SIEMPRE usar Ollama (privacidad 100% local)

## 📋 Task Management Strategy

### Herramienta oficial: Jira
- Todos los issues, historias de usuario y bugs se gestionan en Jira
- Integración nativa con GitHub (commits, PRs, branches)
- Reportes de sprint para entregables del SENA

### Convenciones:
- **Tipos de issue**: Story, Task, Bug, Epic
- **Prioridades**: Highest, High, Medium, Low, Lowest
- **Etiquetas**: frontend, backend, database, api, design, security, etc.
- **Story Points**: 1, 2, 3, 5, 8, 13 (Fibonacci)

### Recordatorios personales rápidos:
Usar Google Calendar con prefijo `[TAREA]`:
`@google-workspace Crea un evento [TAREA] <descripción> para <fecha>`
