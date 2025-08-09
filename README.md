# 🏥 WhatsApp RAG Bot - Laboratorio Domiciliario Buga

Bot inteligente de WhatsApp para agendamiento de citas de laboratorio domiciliario en Buga, Colombia, potenciado por tecnología RAG (Retrieval Augmented Generation).

## 📋 Estado del Proyecto

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

### ✅ Fase 1: Core Infrastructure Setup (COMPLETADO)
- [x] **TASK-001**: Esquema PostgreSQL para citas y clientes
- [x] **TASK-002**: Docker Compose actualizado con PostgreSQL
- [x] **TASK-003**: Configuración de entorno
- [x] **TASK-004**: ChromaDB collection setup
- [x] **TASK-005**: Servicio Ollama inicializado

### ✅ Fase 2: RAG System Implementation (COMPLETADO)
- [x] **TASK-006**: Servicio RAG para consultas inteligentes
- [x] **TASK-007**: Scripts de población de knowledge base
- [x] **TASK-008**: Pipeline de procesamiento de consultas
- [x] **TASK-009**: Post-procesamiento de respuestas

### 🔄 En Desarrollo
- Fase 3: Appointment Management System

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   BuilderBot     │    │   PostgreSQL    │
│   (Baileys)     │◄──►│   Framework      │◄──►│   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ChromaDB      │◄──►│   RAG System     │◄──►│   Ollama LLM    │
│   (Vector DB)   │    │   (LlamaIndex)   │    │   (Gemma)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Configuración Inicial

### 1. Dependencias del Sistema

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar modelos necesarios
ollama pull gemma:2b
ollama pull nomic-embed-text
```

### 2. Variables de Entorno

```bash
# Copiar configuración de ejemplo
cp .env.example .env

# Editar variables según tu entorno
nano .env
```

### 3. Servicios Docker

```bash
# Iniciar servicios de base de datos
docker-compose up -d postgres chroma

# Verificar que los servicios estén corriendo
docker-compose ps
```

### 4. Inicializar Sistema RAG

```bash
# Instalar dependencias
pnpm install

# Compilar proyecto
pnpm run build

# Inicializar sistema RAG (próximamente)
# pnpm run init-rag
```

## 📊 Características Implementadas

### 🏗️ Infraestructura
- ✅ Esquema de base de datos PostgreSQL
- ✅ Configuración Docker multi-servicio
- ✅ Sistema de configuración con TypeScript
- ✅ Servicio Ollama integrado
- ✅ ChromaDB configurado para RAG

### 🗃️ Base de Datos
- **Clientes**: Información de contacto y direcciones
- **Citas**: Agendamiento con horarios 5:30-6:30 AM
- **Historial**: Conversaciones de WhatsApp
- **Configuración**: Parámetros del sistema

### 🤖 Sistema RAG Completo
- **Knowledge Base**: 8 documentos con información del servicio
- **Query Processing**: Pipeline inteligente con detección de intenciones
- **Response Processing**: Post-procesamiento para consistencia y calidad
- **Vector Store**: ChromaDB para búsqueda semántica
- **LLM Local**: Ollama con Gemma 2B
- **Embeddings**: nomic-embed-text

## 📋 Información del Servicio

### 📍 Cobertura
- **Área**: Perímetro urbano de Buga, Colombia
- **Horario**: 5:30 AM - 6:30 AM
- **Precio**: $20.000 COP (todo incluido)

### 📋 Requisitos
- Orden médica (foto por WhatsApp)
- Muestras de orina/fecal preparadas previamente
- Confirmación antes de las 5:30 AM
- Dirección dentro del perímetro urbano

### 🩸 Tipos de Muestras
- Sangre venosa y capilar
- Orina y deposiciones
- Esputo y otras según orden médica

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
pnpm run dev          # Servidor de desarrollo con hot-reload
pnpm run build        # Compilar para producción
pnpm run start        # Ejecutar en producción

# Sistema RAG
pnpm run init-rag     # Inicializar sistema RAG completo
pnpm run populate-kb  # Poblar base de conocimiento

# Linting
pnpm run lint         # Verificar código con ESLint
```

## 📂 Estructura del Proyecto

```
src/
├── config/           # Configuración de ambiente
├── database/         # Esquemas y setup de BD
├── services/         # Servicios principales
├── scripts/          # Scripts de inicialización
├── flows/           # Flujos de conversación (próximamente)
├── models/          # Modelos de datos (próximamente)
└── app.ts           # Aplicación principal
```

## 🔄 Próximos Pasos

### Fase 2: RAG System Implementation
1. Servicio RAG para consultas inteligentes
2. Pipeline de procesamiento de consultas
3. Post-procesamiento de respuestas

### Fase 3: Appointment Management System
1. Modelos y repositorios de citas
2. Servicio de disponibilidad
3. Sistema de notificaciones

### Fase 4: WhatsApp Conversation Flows
1. Flujo de bienvenida
2. Agendamiento de citas
3. Gestión de citas existentes
4. Verificación de orden médica

## 🤝 Contribución

El proyecto sigue el plan de implementación detallado en `/plan/feature-whatsapp-rag-bot-1.md`.

## 📄 Licencia

ISC License
