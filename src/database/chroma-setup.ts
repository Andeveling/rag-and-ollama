import { ChromaVectorStore } from "@llamaindex/chroma";
import { Document, VectorStoreIndex, Settings, storageContextFromDefaults } from "llamaindex";
import { Ollama } from "@llamaindex/ollama";
import { OllamaEmbedding } from "@llamaindex/ollama";
import { chromaConfig, ollamaConfig } from '../config/environment.js';

/**
 * Setup ChromaDB collection with laboratory services knowledge base
 * This script populates the vector database with service information
 */
export class ChromaSetup {
  private vectorStore: ChromaVectorStore;
  private ollama: Ollama;
  private embedding: OllamaEmbedding;

  constructor() {
    // Initialize Ollama services
    this.ollama = new Ollama({ 
      model: ollamaConfig.model
    });
    
    this.embedding = new OllamaEmbedding({ 
      model: ollamaConfig.embeddingModel
    });

    // Set global LlamaIndex settings
    Settings.llm = this.ollama;
    Settings.embedModel = this.embedding;

    // Initialize ChromaDB vector store
    this.vectorStore = new ChromaVectorStore({
      collectionName: "laboratorio_buga"
    });
  }

  /**
   * Create knowledge base documents from service information
   */
  private createKnowledgeDocuments(): Document[] {
    const documents: Document[] = [
      // Service Area and Coverage
      new Document({
        text: "El servicio de laboratorio domiciliario está disponible únicamente en el perímetro urbano de Buga, Colombia. No se atienden direcciones fuera del perímetro urbano de la ciudad.",
        metadata: { 
          category: "cobertura", 
          topic: "area_servicio",
          keywords: "buga, perimetro urbano, cobertura, area"
        },
        id_: "coverage_area"
      }),

      // Service Hours and Availability
      new Document({
        text: "Los servicios de toma de muestras domiciliarias se realizan en horario matutino entre las 5:30 AM y las 6:30 AM. Este es el único horario disponible para el servicio a domicilio.",
        metadata: { 
          category: "horarios", 
          topic: "disponibilidad",
          keywords: "horario, 5:30am, 6:30am, mañana, disponibilidad"
        },
        id_: "service_hours"
      }),

      // Pricing Information
      new Document({
        text: "El costo del servicio domiciliario es de $20,000 pesos colombianos. Este precio incluye todo: el desplazamiento, la toma de muestras y el procesamiento. No hay costos adicionales.",
        metadata: { 
          category: "precios", 
          topic: "costo_servicio",
          keywords: "precio, 20000, pesos, colombianos, costo, tarifa"
        },
        id_: "service_pricing"
      }),

      // Requirements and Preparations
      new Document({
        text: "Requisitos importantes: Si los exámenes requieren muestra de orina o material fecal, estas muestras deben estar tomadas antes de la cita. El paciente debe estar en condiciones adecuadas según las indicaciones médicas (ayuno, etc.). Es necesario confirmar la cita antes de las 5:30 AM.",
        metadata: { 
          category: "requisitos", 
          topic: "preparacion",
          keywords: "requisitos, muestra, orina, fecal, ayuno, confirmacion, preparacion"
        },
        id_: "service_requirements"
      }),

      // Medical Order Requirements
      new Document({
        text: "Para completar la cita es obligatorio presentar la orden médica. La orden puede ser enviada por WhatsApp como fotografía. Sin orden médica no se puede realizar el servicio.",
        metadata: { 
          category: "documentos", 
          topic: "orden_medica",
          keywords: "orden medica, fotografia, whatsapp, obligatorio, documentos"
        },
        id_: "medical_order"
      }),

      // Sample Types and Procedures
      new Document({
        text: "Se realizan diferentes tipos de muestras: sangre venosa, sangre capilar, orina, deposiciones, esputo y otros según la orden médica. Todas las muestras se toman siguiendo protocolos de bioseguridad.",
        metadata: { 
          category: "muestras", 
          topic: "tipos_muestras",
          keywords: "sangre, orina, deposiciones, esputo, muestras, bioseguridad"
        },
        id_: "sample_types"
      }),

      // Booking Process
      new Document({
        text: "Para agendar una cita: 1) Proporcionar nombre completo, 2) Indicar dirección exacta en Buga perímetro urbano, 3) Especificar tipo de exámenes, 4) Confirmar fecha disponible, 5) Enviar orden médica por WhatsApp.",
        metadata: { 
          category: "proceso", 
          topic: "agendamiento",
          keywords: "agendar, cita, nombre, direccion, examenes, fecha, proceso"
        },
        id_: "booking_process"
      }),

      // Contact and Communication
      new Document({
        text: "Toda la comunicación se realiza por WhatsApp. Las confirmaciones, cambios de cita y envío de órdenes médicas se manejan a través de este bot. Mantenemos comunicación directa con el paciente.",
        metadata: { 
          category: "comunicacion", 
          topic: "whatsapp",
          keywords: "whatsapp, comunicacion, confirmacion, cambios, bot"
        },
        id_: "communication"
      }),

      // Service Quality and Safety
      new Document({
        text: "Contamos con personal técnico capacitado, equipos esterilizados y seguimos todos los protocolos de bioseguridad. La calidad y seguridad del paciente son nuestra prioridad.",
        metadata: { 
          category: "calidad", 
          topic: "seguridad",
          keywords: "personal, tecnico, bioseguridad, calidad, seguridad, protocolos"
        },
        id_: "quality_safety"
      })
    ];

    return documents;
  }

  /**
   * Initialize and populate ChromaDB collection
   */
  async setupCollection(): Promise<VectorStoreIndex> {
    try {
      console.log('🔧 Iniciando configuración de ChromaDB...');
      
      // Create knowledge base documents
      const documents = this.createKnowledgeDocuments();
      console.log(`📚 Creados ${documents.length} documentos de conocimiento`);

      // Create storage context with vector store
      const storageContext = await storageContextFromDefaults({ 
        vectorStore: this.vectorStore 
      });

      // Create and populate index
      console.log('🔍 Creando índice vectorial...');
      const index = await VectorStoreIndex.fromDocuments(documents, storageContext);
      
      console.log('✅ ChromaDB configurado correctamente');
      console.log(`📊 Colección: laboratorio_buga`);
      console.log(`🌐 URL: ${chromaConfig.url}`);
      
      return index;
    } catch (error) {
      console.error('❌ Error configurando ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Test the setup with a sample query
   */
  async testSetup(index: VectorStoreIndex): Promise<void> {
    try {
      console.log('🧪 Probando configuración con consulta de prueba...');
      
      const queryEngine = index.asQueryEngine();
      const response = await queryEngine.query({ 
        query: "¿Cuál es el precio del servicio y en qué horario atienden?" 
      });
      
      console.log('✅ Consulta de prueba exitosa:');
      console.log(`📝 Respuesta: ${response.toString()}`);
    } catch (error) {
      console.error('❌ Error en consulta de prueba:', error);
      throw error;
    }
  }

  /**
   * Get vector store instance
   */
  getVectorStore(): ChromaVectorStore {
    return this.vectorStore;
  }
}

// Export singleton instance
export const chromaSetup = new ChromaSetup();
