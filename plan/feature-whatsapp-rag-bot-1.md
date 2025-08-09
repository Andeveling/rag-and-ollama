---
goal: Implementation of WhatsApp RAG Bot for Home Laboratory Appointments in Buga, Colombia
version: 1.0
date_created: 2025-08-09
last_updated: 2025-08-09
owner: Development Team
status: 'In progress'
tags: ['feature', 'whatsapp', 'rag', 'bot', 'healthcare', 'appointments']
---

# Implementation Plan: WhatsApp RAG Bot for Home Laboratory Appointments

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

This implementation plan details the complete development of an intelligent WhatsApp chatbot powered by RAG (Retrieval Augmented Generation) technology for scheduling home laboratory appointments in Buga, Colombia. The system will integrate ChromaDB for intelligent information retrieval, PostgreSQL for appointment management, and Ollama for local LLM processing using the existing BuilderBot framework foundation.

## 1. Requirements & Constraints

### Business Requirements
- **REQ-001**: Bot must handle appointment scheduling, modification, and cancellation for home laboratory services
- **REQ-002**: Service area limited to Buga's urban perimeter with 5:30 AM - 6:30 AM time slots
- **REQ-003**: Flat rate pricing of $20,000 COP for all services
- **REQ-004**: Medical order photo verification required before appointment completion
- **REQ-005**: Natural Spanish language conversation interface
- **REQ-006**: 24/7 availability for appointment management

### Technical Requirements
- **REQ-007**: Use existing BuilderBot framework with BaileysProvider for WhatsApp integration
- **REQ-008**: Implement ChromaDB for RAG-powered information retrieval
- **REQ-009**: PostgreSQL database for appointment and customer data persistence
- **REQ-010**: Ollama integration with Gemma model for local LLM processing
- **REQ-011**: Docker containerization for deployment

### Security Requirements
- **SEC-001**: Customer data encryption in PostgreSQL database
- **SEC-002**: Medical order photos not permanently stored (WhatsApp only)
- **SEC-003**: GDPR-compliant data handling practices
- **SEC-004**: Access control for appointment management endpoints

### Performance Constraints
- **CON-001**: Bot response time must be under 2 seconds for standard queries
- **CON-002**: System uptime above 99.5%
- **CON-003**: Query response accuracy above 90%
- **CON-004**: Support for concurrent user interactions

### Guidelines
- **GUD-001**: Maintain conversational and friendly tone in Spanish
- **GUD-002**: Follow existing BuilderBot flow patterns from app.ts
- **GUD-003**: Implement error handling for edge cases and service limitations
- **GUD-004**: Provide clear appointment confirmations and next steps

### Patterns to Follow
- **PAT-001**: Use addKeyword flows for conversation management as shown in app.ts
- **PAT-002**: Implement state management for multi-step appointment booking
- **PAT-003**: Follow RAG pattern with ChromaDB vector store and Ollama LLM
- **PAT-004**: Use PostgreSQL adapter following existing database connection pattern

## 2. Implementation Steps

### Phase 1: Core Infrastructure Setup ✅
**Objective**: Establish foundational components and database schemas

| Task ID | Description | Files Affected | Acceptance Criteria | Status |
|---------|-------------|----------------|---------------------|---------|
| TASK-001 | Create PostgreSQL schema for appointments, customers, and availability | `src/database/schema.sql` | Tables created with proper relationships and constraints | ✅ DONE |
| TASK-002 | Update Docker Compose to include PostgreSQL service | `docker-compose.yml` | PostgreSQL service running with persistent storage | ✅ DONE |
| TASK-003 | Create environment configuration for all services | `.env.example`, `src/config/environment.ts` | All required environment variables documented and typed | ✅ DONE |
| TASK-004 | Setup ChromaDB collection for laboratory services knowledge base | `src/database/chroma-setup.ts` | Collection populated with service information from notes.txt | ✅ DONE |
| TASK-005 | Initialize Ollama with Gemma model integration | `src/services/ollama.service.ts` | Ollama service configured and tested with local model | ✅ DONE |

### Phase 2: RAG System Implementation ✅
**Objective**: Build intelligent information retrieval system

| Task ID | Description | Files Affected | Acceptance Criteria | Status |
|---------|-------------|----------------|---------------------|---------|
| TASK-006 | Create RAG service for appointment-related queries | `src/services/rag.service.ts` | Service can answer questions about pricing, availability, requirements | ✅ DONE |
| TASK-007 | Implement knowledge base population scripts | `src/scripts/populate-knowledge-base.ts` | Script populates ChromaDB with comprehensive service information | ✅ DONE |
| TASK-008 | Create query processing pipeline with context enhancement | `src/services/query-processor.ts` | Queries enhanced with relevant context before LLM processing | ✅ DONE |
| TASK-009 | Implement response post-processing for consistency | `src/services/response-processor.ts` | Responses formatted consistently and validated for accuracy | ✅ DONE |

### Phase 3: Appointment Management System
**Objective**: Core appointment booking and management functionality

| Task ID | Description | Files Affected | Acceptance Criteria |
|---------|-------------|----------------|-------------------|
| TASK-010 | Create appointment data models and repositories | `src/models/appointment.model.ts`, `src/repositories/appointment.repository.ts` | CRUD operations for appointments with validation |
| TASK-011 | Implement availability checking service | `src/services/availability.service.ts` | Service checks and manages appointment slots (5:30-6:30 AM) |
| TASK-012 | Create customer management service | `src/services/customer.service.ts` | Customer data management with contact information validation |
| TASK-013 | Build appointment confirmation and notification system | `src/services/notification.service.ts` | Automated confirmations sent via WhatsApp |

### Phase 4: WhatsApp Conversation Flows
**Objective**: Implement conversational interface following BuilderBot patterns

| Task ID | Description | Files Affected | Acceptance Criteria |
|---------|-------------|----------------|-------------------|
| TASK-014 | Create welcome flow with service introduction | `src/flows/welcome.flow.ts` | Users greeted and informed about services in Spanish |
| TASK-015 | Implement appointment scheduling flow | `src/flows/scheduling.flow.ts` | Multi-step booking process with validation at each step |
| TASK-016 | Build appointment management flow (cancel/modify) | `src/flows/management.flow.ts` | Users can modify or cancel existing appointments |
| TASK-017 | Create information inquiry flow | `src/flows/information.flow.ts` | RAG-powered responses to service questions |
| TASK-018 | Implement medical order verification flow | `src/flows/medical-order.flow.ts` | Photo upload handling and appointment completion |

### Phase 5: Advanced Features and Error Handling
**Objective**: Robust system with comprehensive edge case handling

| Task ID | Description | Files Affected | Acceptance Criteria |
|---------|-------------|----------------|-------------------|
| TASK-019 | Implement conversation state management | `src/services/state.service.ts` | Persistent state across conversation turns |
| TASK-020 | Create fallback handlers for unrecognized inputs | `src/flows/fallback.flow.ts` | Graceful handling of out-of-scope requests |
| TASK-021 | Build appointment conflict resolution system | `src/services/conflict-resolution.service.ts` | Alternative suggestions when preferred slots unavailable |
| TASK-022 | Implement service area validation | `src/services/location.service.ts` | Verify addresses within Buga urban perimeter |

### Phase 6: Integration and Testing
**Objective**: Complete system integration with comprehensive testing

| Task ID | Description | Files Affected | Acceptance Criteria |
|---------|-------------|----------------|-------------------|
| TASK-023 | Update main app.ts with new flows integration | `src/app.ts` | All flows properly registered and functioning |
| TASK-024 | Create comprehensive test suite | `src/tests/` | Unit tests for all services and integration tests for flows |
| TASK-025 | Implement monitoring and logging | `src/services/monitoring.service.ts` | System health monitoring and conversation logging |
| TASK-026 | Performance optimization and caching | `src/services/cache.service.ts` | Response caching for common queries |

## 3. Alternatives

- **ALT-001**: Use external LLM API (OpenAI/Claude) instead of local Ollama - rejected due to privacy concerns and cost considerations for medical data
- **ALT-002**: Implement custom vector database instead of ChromaDB - rejected due to development complexity and maintenance overhead
- **ALT-003**: Use a different WhatsApp provider instead of Baileys - rejected to maintain consistency with existing BuilderBot ecosystem
- **ALT-004**: Store medical order photos permanently for compliance - rejected due to privacy requirements and storage concerns

## 4. Dependencies

- **DEP-001**: Ollama installed with Gemma model and nomic-embed-text embedding model
- **DEP-002**: ChromaDB server running and accessible (port 8000)
- **DEP-003**: PostgreSQL database server with appointment schema
- **DEP-004**: WhatsApp Business API setup through Baileys provider
- **DEP-005**: Docker and Docker Compose for containerized deployment
- **DEP-006**: Node.js environment with TypeScript support
- **DEP-007**: BuilderBot framework dependencies already in package.json

## 5. Files

### New Files to Create
- **FILE-001**: `src/database/schema.sql` - PostgreSQL database schema for appointments and customers
- **FILE-002**: `src/config/environment.ts` - Environment configuration management
- **FILE-003**: `src/services/rag.service.ts` - RAG implementation for intelligent responses
- **FILE-004**: `src/services/ollama.service.ts` - Ollama LLM integration service
- **FILE-005**: `src/services/availability.service.ts` - Appointment availability management
- **FILE-006**: `src/services/customer.service.ts` - Customer data management
- **FILE-007**: `src/models/appointment.model.ts` - Appointment data model
- **FILE-008**: `src/repositories/appointment.repository.ts` - Database operations for appointments
- **FILE-009**: `src/flows/welcome.flow.ts` - Welcome conversation flow
- **FILE-010**: `src/flows/scheduling.flow.ts` - Appointment scheduling flow
- **FILE-011**: `src/flows/management.flow.ts` - Appointment management flow
- **FILE-012**: `src/flows/information.flow.ts` - Information inquiry flow
- **FILE-013**: `src/services/notification.service.ts` - WhatsApp notification service

### Files to Modify
- **FILE-014**: `src/app.ts` - Update to integrate new flows and services
- **FILE-015**: `docker-compose.yml` - Add PostgreSQL service configuration
- **FILE-016**: `package.json` - Add any additional dependencies if needed
- **FILE-017**: `.env.example` - Add environment variables for new services

## 6. Testing

- **TEST-001**: Unit tests for RAG service with mock ChromaDB responses
- **TEST-002**: Integration tests for appointment scheduling flow end-to-end
- **TEST-003**: Unit tests for availability service with time slot validation
- **TEST-004**: Integration tests for WhatsApp message handling and responses
- **TEST-005**: Load tests for concurrent user conversations
- **TEST-006**: End-to-end tests for complete appointment booking process
- **TEST-007**: Error handling tests for edge cases and invalid inputs
- **TEST-008**: Database integration tests for appointment CRUD operations
- **TEST-009**: RAG accuracy tests with predefined question-answer pairs
- **TEST-010**: WhatsApp media handling tests for medical order photos

## 7. Risks & Assumptions

### Risks
- **RISK-001**: Ollama model accuracy may vary for medical terminology and Spanish language nuances
- **RISK-002**: ChromaDB performance may degrade with large knowledge bases
- **RISK-003**: WhatsApp API rate limits may affect system responsiveness during peak usage
- **RISK-004**: Docker deployment complexity with multiple interdependent services
- **RISK-005**: Medical order photo verification requires manual validation initially

### Assumptions
- **ASSUMPTION-001**: Users have reliable internet connection for WhatsApp interactions
- **ASSUMPTION-002**: Medical orders will be clear and readable in photo format
- **ASSUMPTION-003**: Buga urban perimeter addresses can be validated programmatically
- **ASSUMPTION-004**: Spanish language model performance is adequate for conversational flow
- **ASSUMPTION-005**: Single technician availability for 5:30-6:30 AM time slots is sufficient initially

## 8. Related Specifications / Further Reading

- [BuilderBot Documentation](https://builderbot.vercel.app/)
- [ChromaDB Integration Guide](https://docs.llamaindex.ai/en/stable/examples/vector_stores/ChromaIndexDemo/)
- [Ollama Local LLM Setup](https://github.com/ollama/ollama)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [PostgreSQL Best Practices for Healthcare Applications](https://www.postgresql.org/docs/current/)
