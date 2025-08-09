<<<<<<< HEAD
<file upload>
=======
import { VectorStoreIndex, BaseQueryEngine } from "llamaindex";
import { chromaSetup } from '../database/chroma-setup.js';
import { ollamaService } from './ollama.service.js';

/**
 * RAG Service for intelligent appointment-related queries
 * Handles retrieval-augmented generation for laboratory service information
 */
export class RagService {
  private queryEngine: BaseQueryEngine | null = null;
  private index: VectorStoreIndex | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the RAG service with ChromaDB and Ollama
   */
  async initialize(): Promise<void> {
    try {
      console.log('🧠 Inicializando servicio RAG...');
      
      // Ensure Ollama service is initialized
      if (!ollamaService.isInitialized()) {
        await ollamaService.initialize();
      }
      
      // Setup ChromaDB collection and get index
      this.index = await chromaSetup.setupCollection();
      
      // Create query engine with Spanish-optimized configuration
      this.queryEngine = this.index.asQueryEngine({
        similarityTopK: 3 // Retrieve top 3 most relevant documents
      });
      
      this.initialized = true;
      console.log('✅ Servicio RAG inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando servicio RAG:', error);
      throw new Error(`Failed to initialize RAG service: ${error}`);
    }
  }

  /**
   * Process a query and generate an intelligent response
   */
  async processQuery(userQuery: string, context?: any): Promise<string> {
    if (!this.initialized || !this.queryEngine) {
      throw new Error('RAG service not initialized. Call initialize() first.');
    }

    try {
      console.log(`🔍 Procesando consulta: "${userQuery}"`);
      
      // Enhance query with context if provided
      const enhancedQuery = this.enhanceQuery(userQuery, context);
      
      // Query the RAG system
      const response = await this.queryEngine.query({ 
        query: enhancedQuery 
      });
      
      // Post-process response for consistency
      const processedResponse = this.postProcessResponse(response, userQuery);
      
      console.log('✅ Consulta procesada exitosamente');
      return processedResponse;
      
    } catch (error) {
      console.error('❌ Error procesando consulta RAG:', error);
      
      // Return fallback response
      return this.getFallbackResponse(userQuery);
    }
  }

  /**
   * Enhance user query with additional context
   */
  private enhanceQuery(userQuery: string, context?: any): string {
    const enhancedQuery = userQuery;
    
    // Add service context
    let serviceContext = `
    Contexto del servicio:
    - Laboratorio domiciliario en Buga, Colombia
    - Horario: 5:30 AM - 6:30 AM
    - Precio: $20,000 COP
    - Área: Perímetro urbano de Buga
    
    Pregunta del usuario: ${userQuery}
    
    Responde de manera conversacional, amigable y en español. 
    Si la pregunta es sobre horarios, precios o ubicación, proporciona información específica.
    Si es sobre agendamiento, explica el proceso paso a paso.
    `;
    
    // Add customer context if available
    if (context?.customerInfo) {
      serviceContext += `\nInformación del cliente: ${JSON.stringify(context.customerInfo)}`;
    }
    
    // Add conversation context if available
    if (context?.conversationHistory) {
      serviceContext += `\nHistorial reciente: ${context.conversationHistory.slice(-3).join(', ')}`;
    }
    
    return serviceContext;
  }

  /**
   * Post-process RAG response for consistency and formatting
   */
  private postProcessResponse(response: any, originalQuery: string): string {
    let processedText = response.toString();
    
    // Remove any unwanted prefixes or suffixes
    processedText = processedText.replace(/^(Respuesta:|Answer:)/i, '').trim();
    
    // Ensure Spanish language consistency
    processedText = this.ensureSpanishResponse(processedText);
    
    // Add conversational elements
    processedText = this.addConversationalTone(processedText, originalQuery);
    
    // Ensure proper formatting
    processedText = this.formatResponse(processedText);
    
    return processedText;
  }

  /**
   * Ensure response is in Spanish
   */
  private ensureSpanishResponse(text: string): string {
    // Common English to Spanish replacements
    const replacements: Record<string, string> = {
      'appointment': 'cita',
      'schedule': 'agendar',
      'laboratory': 'laboratorio',
      'service': 'servicio',
      'price': 'precio',
      'cost': 'costo',
      'time': 'horario',
      'available': 'disponible',
      'medical order': 'orden médica'
    };
    
    let spanishText = text;
    for (const [english, spanish] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      spanishText = spanishText.replace(regex, spanish);
    }
    
    return spanishText;
  }

  /**
   * Add conversational tone to response
   */
  private addConversationalTone(text: string, originalQuery: string): string {
    // Add friendly greeting for certain query types
    if (originalQuery.toLowerCase().includes('hola') || originalQuery.toLowerCase().includes('buenas')) {
      return `¡Hola! Me da mucho gusto ayudarte. ${text}`;
    }
    
    // Add helpful closing for information queries
    if (originalQuery.toLowerCase().includes('precio') || 
        originalQuery.toLowerCase().includes('horario') ||
        originalQuery.toLowerCase().includes('cómo')) {
      return `${text}\n\n¿Te gustaría que te ayude a agendar una cita o tienes alguna otra pregunta?`;
    }
    
    return text;
  }

  /**
   * Format response with proper structure
   */
  private formatResponse(text: string): string {
    // Ensure proper line breaks and spacing
    let formatted = text.replace(/\n{3,}/g, '\n\n');
    
    // Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    
    // Ensure it ends with proper punctuation
    if (!/[.!?]$/.test(formatted.trim())) {
      formatted += '.';
    }
    
    return formatted.trim();
  }

  /**
   * Provide fallback response when RAG fails
   */
  private getFallbackResponse(userQuery: string): string {
    const fallbackResponses = {
      pricing: 'El costo del servicio domiciliario es de $20,000 pesos colombianos, que incluye todo: desplazamiento, toma de muestras y procesamiento.',
      schedule: 'Nuestro horario de atención es de 5:30 AM a 6:30 AM, únicamente en el perímetro urbano de Buga.',
      booking: 'Para agendar una cita necesito tu nombre completo, dirección en Buga y el tipo de exámenes. También será necesaria la orden médica.',
      general: 'Soy el asistente del laboratorio domiciliario de Buga. Puedo ayudarte con información sobre precios, horarios y agendamiento de citas. ¿En qué te puedo ayudar?'
    };
    
    const query = userQuery.toLowerCase();
    
    if (query.includes('precio') || query.includes('costo') || query.includes('cuánto')) {
      return fallbackResponses.pricing;
    }
    
    if (query.includes('horario') || query.includes('hora') || query.includes('cuándo')) {
      return fallbackResponses.schedule;
    }
    
    if (query.includes('agendar') || query.includes('cita') || query.includes('reservar')) {
      return fallbackResponses.booking;
    }
    
    return fallbackResponses.general;
  }

  /**
   * Get query engine for advanced use cases
   */
  getQueryEngine(): BaseQueryEngine | null {
    return this.queryEngine;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasQueryEngine: this.queryEngine !== null,
      hasIndex: this.index !== null,
      ollamaReady: ollamaService.isInitialized()
    };
  }
}

// Export singleton instance
export const ragService = new RagService();
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
