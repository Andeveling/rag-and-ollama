# 🧪 Marcela Salazar - Bot WhatsApp RAG

Sistema inteligente de agendamiento de citas para análisis clínicos a domicilio en Buga, Colombia, potenciado por RAG (Retrieval Augmented Generation) con ChromaDB y Ollama.
**Desarrollado y operado por Marcela Salazar.**

## 📋 Características Principales

### 🤖 Inteligencia Artificial
- **RAG System** con ChromaDB para respuestas contextuales
- **Ollama + Gemma 2B** para procesamiento de lenguaje natural en español
- **Detección de intención** automática para direccionamiento de flujos
- **Procesamiento de consultas** con mejora contextual

### 📅 Sistema de Citas
- **Agendamiento automatizado** con validación de disponibilidad
- **Horario específico**: 5:30 AM - 6:30 AM todos los días
- **Precio fijo**: $20,000 COP por servicio a domicilio
- **Gestión completa** de citas: crear, consultar, cancelar, reprogramar

### 🏠 Validación Geográfica
- **Área de servicio**: Perímetro urbano de Buga únicamente
- **Validación automática** de direcciones
- **Verificación de barrios** y sectores atendidos

### 📱 Notificaciones Automatizadas
- **Confirmaciones** de cita inmediatas
- **Recordatorios** diarios a las 6:00 PM
- **Instrucciones de preparación** a las 8:00 PM
- **Notificaciones de cancelación** y reagendamiento

### 🗃️ Gestión de Datos
- **PostgreSQL** para almacenamiento persistente
- **ChromaDB** para búsqueda vectorial
- **Gestión de clientes** con historial completo
- **Estadísticas** y métricas de uso

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   BuilderBot    │    │   Services      │
│   Users         │◄──►│   Framework     │◄──►│   Layer         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Conversation  │    │   PostgreSQL    │    │   ChromaDB      │
│   Flows         │    │   Database      │    │   Vector DB     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Notification  │    │   Customer      │    │   RAG           │
│   System        │    │   Management    │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   Ollama        │
                                                │   (Gemma 2B)    │
                                                └─────────────────┘
```

## 📁 Estructura del Proyecto

```
src/
├── config/
│   └── environment.ts          # Configuración del entorno
├── database/
│   └── schema.sql             # Esquema PostgreSQL
├── flows/
│   ├── main.flows.ts          # Flujos principales (bienvenida, ayuda)
│   ├── schedule.flows.ts      # Flujos de agendamiento
│   └── appointment.flows.ts   # Flujos de gestión de citas
├── models/
│   └── appointment.model.ts   # Modelos de datos TypeScript
├── repositories/
│   └── appointment.repository.ts # Capa de acceso a datos
├── services/
│   ├── rag.service.ts         # Servicio RAG con ChromaDB/Ollama
│   ├── query-processor.ts    # Procesador de consultas
│   ├── availability.service.ts # Gestión de disponibilidad
│   ├── customer.service.ts    # Gestión de clientes
│   └── notification.service.ts # Sistema de notificaciones
├── utils/
│   └── idle.utils.ts          # Utilidades para timeouts
├── app.ts                     # Punto de entrada principal
└── bot.ts                     # Configuración principal del bot
```

## 🚀 Instalación y Configuración

### 1. Dependencias del Sistema

```bash
# Instalar Node.js 18+ y pnpm
npm install -g pnpm

# Instalar Docker y Docker Compose
# Seguir instrucciones específicas para tu OS

# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Configurar Variables de Entorno

```bash
# Copiar ejemplo de configuración
cp .env.example .env

# Configurar variables requeridas
POSTGRES_DB_HOST=localhost
POSTGRES_DB_PORT=5432
POSTGRES_DB_NAME=marcela_salazar
POSTGRES_DB_USER=postgres
POSTGRES_DB_PASSWORD=tu_password

CHROMA_URL=http://localhost:8000
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma:2b

PORT=3008
```

### 3. Inicializar Servicios

```bash
# Instalar dependencias
pnpm install

# Iniciar servicios con Docker
docker compose up -d

# Configurar Ollama
ollama pull gemma:2b
ollama pull nomic-embed-text

# Ejecutar setup de base de datos
pnpm run db:setup
```

### 4. Poblar ChromaDB

```bash
# Ejecutar setup de ChromaDB con documentos de Marcela Salazar
pnpm run chroma:setup
```

### 5. Iniciar el Bot

```bash
# Desarrollo
pnpm run dev

# Producción
pnpm run build
pnpm start
```

## 💬 Comandos de WhatsApp

### Comandos Principales
- `hola` - Iniciar conversación
- `ayuda` - Ver comandos disponibles
- `agendar cita` - Iniciar proceso de agendamiento
- `ver citas` - Consultar citas existentes
- `cancelar cita` - Cancelar cita programada

### Consultas por RAG
- `¿Qué servicios ofrecen?`
- `¿Cuál es el precio?`
- `¿A qué hora atienden?`
- `¿Qué necesito para el examen de sangre?`
- Y cualquier pregunta relacionada con servicios médicos

## 🔄 Flujos de Conversación

### 1. Flujo de Bienvenida
- Identificación automática de cliente nuevo/existente
- Mensaje personalizado basado en historial
- Detección de intención para direccionamiento

### 2. Flujo de Agendamiento
1. **Validación de dirección** (perímetro urbano Buga)
2. **Selección de fecha** (parsing inteligente de fechas)
3. **Selección de horario** (slots disponibles)
4. **Tipo de muestra** (6 opciones disponibles)
5. **Confirmación** y creación de cita

### 3. Flujo de Gestión
- **Consultar citas**: Ver estado y detalles
- **Cancelar**: Con validación de política (2h anticipación)
- **Modificar**: Reprogramación de citas existentes

## 📊 API Endpoints

### Salud del Sistema
- `GET /health` - Estado del bot
- `GET /v1/stats` - Estadísticas y configuración

### Integración Externa
- `POST /v1/messages` - Enviar mensajes programáticamente
- `POST /v1/reminders` - Disparar recordatorios manuales

## ⚙️ Servicios y Configuración

### ChromaDB (Vector Database)
- **Puerto**: 8000
- **Colección**: `marcela_salazar_knowledge`
- **Embeddings**: nomic-embed-text
- **Documentos**: 8 documentos de servicios médicos

### Ollama (LLM)
- **Modelo**: Gemma 2B (optimizado para español)
- **Puerto**: 11434
- **Configuración**: Temperatura 0.3, contexto médico

### PostgreSQL
- **Puerto**: 5432
- **Tablas**: customers, appointments, time_slots, conversation_history
- **Indices**: Optimizados para consultas frecuentes

### Cron Jobs
- **18:00**: Recordatorios diarios
- **20:00**: Instrucciones de preparación
- **Cada 30min**: Health check

## 🧪 Testing y Desarrollo

### Scripts Disponibles
```bash
pnpm run dev          # Desarrollo con hot reload
pnpm run build        # Build para producción
pnpm run test         # Ejecutar tests
pnpm run db:setup     # Configurar base de datos
pnpm run chroma:setup # Poblar ChromaDB
```

### Logging
- **Console logs** estructurados con emojis
- **Error tracking** con contexto de conversación
- **Performance monitoring** para queries RAG

## 🚨 Monitoreo y Mantenimiento

### Métricas Importantes
- **Tiempo de respuesta** RAG (objetivo: <2s)
- **Tasa de éxito** en agendamientos (objetivo: >90%)
- **Satisfacción** de validación de direcciones
- **Uptime** del sistema (objetivo: >99%)

### Backup y Recuperación
- **PostgreSQL**: Backup diario automático
- **ChromaDB**: Backup de colecciones
- **Logs**: Rotación automática

## 🔒 Seguridad

### Validaciones Implementadas
- **Sanitización** de inputs de usuario
- **Validación** de números telefónicos colombianos
- **Verificación** de área de servicio geográfico
- **Rate limiting** en endpoints API

### Privacidad de Datos
- **Encriptación** en tránsito (HTTPS)
- **Anonimización** de logs sensibles
- **Retención** limitada de conversaciones

## 📈 Roadmap Futuro

### Próximas Características
- [ ] **Integración con laboratorio** real para resultados
- [ ] **Pagos online** integrados
- [ ] **Notificaciones push** personalizadas
- [ ] **Dashboard web** para administración
- [ ] **Analytics avanzados** de conversaciones
- [ ] **Multi-idioma** (inglés)

### Optimizaciones Técnicas
- [ ] **Caché Redis** para consultas frecuentes
- [ ] **Load balancing** para alta concurrencia
- [ ] **Microservicios** arquitectura
- [ ] **GraphQL** API

## 🤝 Contribución

Este proyecto implementa las mejores prácticas de desarrollo:
- **TypeScript** strict mode
- **ESLint + Prettier** para código consistente
- **Conventional commits** para historial claro
- **Docker** para deployment consistente

## 📄 Licencia

Proyecto desarrollado para Marcela Salazar - Todos los derechos reservados.

---

**🚀 Bot Status**: ✅ Completamente funcional  
**📋 Implementación**: Fase 4 de 6 completada  
**🧪 Última actualización**: Enero 2025

Para soporte técnico o consultas: contactar al equipo de desarrollo.
