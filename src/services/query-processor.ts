import { ragService } from './rag.service.js';

/**
 * Query processing pipeline with context enhancement
 * Handles preprocessing, context injection, and query optimization
 */
export class QueryProcessor {
  
  /**
   * Process a user query with context enhancement
   */
  async processQuery(
    userQuery: string, 
    context: QueryContext = {}
  ): Promise<ProcessedQueryResult> {
    try {
      console.log(`🔧 Procesando consulta: "${userQuery}"`);
      
      // Step 1: Preprocess the query
      const preprocessed = this.preprocessQuery(userQuery);
      console.log(`✅ Query preprocesado: "${preprocessed}"`);
      
      // Step 2: Detect query intent
      const intent = this.detectIntent(preprocessed);
      console.log(`🎯 Intención detectada: ${intent.type} (confianza: ${intent.confidence})`);
      
      // Step 3: Enhance with context
      const enhanced = this.enhanceWithContext(preprocessed, context, intent);
      console.log(`🚀 Query mejorado con contexto`);
      
      // Step 4: Process with RAG system
      const ragResponse = await ragService.processQuery(enhanced, context);
      console.log(`🤖 Respuesta RAG generada`);
      
      // Step 5: Build result
      const result: ProcessedQueryResult = {
        originalQuery: userQuery,
        preprocessedQuery: preprocessed,
        enhancedQuery: enhanced,
        intent,
        response: ragResponse,
        context,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() // Will be updated at the end
      };
      
      result.processingTime = Date.now() - new Date(result.timestamp).getTime();
      console.log(`⏱️  Tiempo de procesamiento: ${result.processingTime}ms`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error procesando consulta:', error);
      
      // Return fallback result
      return this.createFallbackResult(userQuery, context, error as Error);
    }
  }

  /**
   * Preprocess user query for better understanding
   */
  private preprocessQuery(userQuery: string): string {
    let processed = userQuery.trim();
    
    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Expand common abbreviations
    const abbreviations: Record<string, string> = {
      'q': 'que',
      'x': 'por', 
      'xq': 'porque',
      'pq': 'porque',
      'tb': 'también',
      'tmb': 'también',
      'h': 'hora',
      'hrs': 'horas'
    };
    
    for (const [abbrev, expansion] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      processed = processed.replace(regex, expansion);
    }
    
    // Normalize common typos
    const typos: Record<string, string> = {
      'ola': 'hola',
      'q tal': 'qué tal',
      'cuanto': 'cuánto',
      'cuando': 'cuándo',
      'donde': 'dónde',
      'como': 'cómo'
    };
    
    for (const [typo, correction] of Object.entries(typos)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      processed = processed.replace(regex, correction);
    }
    
    // Ensure proper punctuation
    if (!/[.!?]$/.test(processed)) {
      processed += '.';
    }
    
    return processed;
  }

  /**
   * Detect user intent from query
   */
  private detectIntent(query: string): QueryIntent {
    const lowercaseQuery = query.toLowerCase();
    
    // Intent patterns with confidence scores
    const intentPatterns: IntentPattern[] = [
      {
        type: 'greeting',
        patterns: ['hola', 'buenas', 'saludos', 'buenos días', 'buenas tardes'],
        confidence: 0.9
      },
      {
        type: 'pricing',
        patterns: ['precio', 'costo', 'cuánto', 'valor', 'tarifa'],
        confidence: 0.95
      },
      {
        type: 'scheduling',
        patterns: ['horario', 'hora', 'cuándo', 'disponible', 'atienden'],
        confidence: 0.9
      },
      {
        type: 'booking',
        patterns: ['agendar', 'cita', 'reservar', 'apartar'],
        confidence: 0.95
      },
      {
        type: 'location',
        patterns: ['dónde', 'ubicación', 'dirección', 'buga', 'área'],
        confidence: 0.9
      },
      {
        type: 'requirements',
        patterns: ['necesito', 'requisitos', 'orden médica', 'ayunas'],
        confidence: 0.85
      },
      {
        type: 'samples',
        patterns: ['muestras', 'sangre', 'orina', 'exámenes', 'laboratorio'],
        confidence: 0.8
      },
      {
        type: 'help',
        patterns: ['ayuda', 'información', 'servicios', 'qué hacen'],
        confidence: 0.7
      }
    ];
    
    let bestMatch: QueryIntent = { type: 'general', confidence: 0.1 };
    
    for (const pattern of intentPatterns) {
      for (const keyword of pattern.patterns) {
        if (lowercaseQuery.includes(keyword)) {
          if (pattern.confidence > bestMatch.confidence) {
            bestMatch = {
              type: pattern.type,
              confidence: pattern.confidence
            };
          }
        }
      }
    }
    
    // Adjust confidence based on query length and specificity
    if (query.length < 10) {
      bestMatch.confidence *= 0.8; // Lower confidence for very short queries
    }
    
    if (query.split(' ').length > 10) {
      bestMatch.confidence *= 1.1; // Higher confidence for detailed queries
    }
    
    return bestMatch;
  }

  /**
   * Enhance query with contextual information
   */
  private enhanceWithContext(
    query: string, 
    context: QueryContext, 
    intent: QueryIntent
  ): string {
    let enhanced = query;
    
    // Add intent-specific context
    switch (intent.type) {
      case 'pricing':
        enhanced += ' (El usuario pregunta específicamente por precios y costos del servicio domiciliario)';
        break;
        
      case 'scheduling':
        enhanced += ' (El usuario pregunta por horarios y disponibilidad del servicio)';
        break;
        
      case 'booking':
        enhanced += ' (El usuario quiere agendar una cita, proporcionar proceso paso a paso)';
        break;
        
      case 'location':
        enhanced += ' (El usuario pregunta por cobertura geográfica y ubicaciones atendidas)';
        break;
        
      case 'greeting':
        enhanced += ' (Saludo inicial, responder amistosamente y ofrecer ayuda)';
        break;
    }
    
    // Add customer context if available
    if (context.customerInfo) {
      enhanced += ` [Cliente: ${context.customerInfo.name || 'N/A'}]`;
    }
    
    // Add conversation history context
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentMessages = context.conversationHistory.slice(-2).join(' | ');
      enhanced += ` [Contexto previo: ${recentMessages}]`;
    }
    
    // Add temporal context
    const now = new Date();
    const timeContext = `[Hora actual: ${now.toLocaleTimeString('es-CO')}, Fecha: ${now.toLocaleDateString('es-CO')}]`;
    enhanced += ` ${timeContext}`;
    
    return enhanced;
  }

  /**
   * Create fallback result when processing fails
   */
  private createFallbackResult(
    originalQuery: string, 
    context: QueryContext, 
    error: Error
  ): ProcessedQueryResult {
    return {
      originalQuery,
      preprocessedQuery: originalQuery,
      enhancedQuery: originalQuery,
      intent: { type: 'general', confidence: 0.1 },
      response: 'Lo siento, hubo un problema procesando tu consulta. ¿Podrías reformularla? Puedo ayudarte con información sobre precios, horarios y agendamiento de citas.',
      context,
      timestamp: new Date().toISOString(),
      processingTime: 0,
      error: error.message
    };
  }
}

// Types and interfaces
export interface QueryContext {
  customerInfo?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  conversationHistory?: string[];
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface QueryIntent {
  type: 'greeting' | 'pricing' | 'scheduling' | 'booking' | 'location' | 'requirements' | 'samples' | 'help' | 'general';
  confidence: number;
}

export interface ProcessedQueryResult {
  originalQuery: string;
  preprocessedQuery: string;
  enhancedQuery: string;
  intent: QueryIntent;
  response: string;
  context: QueryContext;
  timestamp: string;
  processingTime: number;
  error?: string;
}

interface IntentPattern {
  type: QueryIntent['type'];
  patterns: string[];
  confidence: number;
}

// Export singleton instance
export const queryProcessor = new QueryProcessor();
