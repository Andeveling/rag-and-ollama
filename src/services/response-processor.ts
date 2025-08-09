import { QueryIntent, ProcessedQueryResult } from './query-processor.js';

/**
 * Response post-processing for consistency and validation
 * Ensures responses are properly formatted, accurate, and user-friendly
 */
export class ResponseProcessor {
  
  /**
   * Post-process RAG response for final delivery
   */
  processResponse(
    ragResponse: string, 
    intent: QueryIntent, 
    originalQuery: string,
    context?: any
  ): ProcessedResponse {
    try {
      console.log(`📝 Post-procesando respuesta para intención: ${intent.type}`);
      
      // Step 1: Clean and normalize response
      let processed = this.cleanResponse(ragResponse);
      
      // Step 2: Apply intent-specific formatting
      processed = this.applyIntentFormatting(processed, intent);
      
      // Step 3: Ensure conversational tone
      processed = this.ensureConversationalTone(processed, originalQuery);
      
      // Step 4: Validate and enhance content
      processed = this.validateAndEnhance(processed, intent);
      
      // Step 5: Add contextual elements
      processed = this.addContextualElements(processed, intent, context);
      
      // Step 6: Final quality check
      const quality = this.assessResponseQuality(processed, intent, originalQuery);
      
      const result: ProcessedResponse = {
        original: ragResponse,
        processed,
        intent,
        quality,
        timestamp: new Date().toISOString(),
        enhancements: this.getAppliedEnhancements()
      };
      
      console.log(`✅ Respuesta procesada (calidad: ${quality.score}/10)`);
      return result;
      
    } catch (error) {
      console.error('❌ Error post-procesando respuesta:', error);
      return this.createFallbackResponse(ragResponse, intent, error as Error);
    }
  }

  /**
   * Clean and normalize response text
   */
  private cleanResponse(response: string): string {
    let cleaned = response;
    
    // Remove unwanted prefixes/suffixes
    cleaned = cleaned.replace(/^(Respuesta:|Answer:|Bot:|AI:)/i, '').trim();
    cleaned = cleaned.replace(/\(fin de respuesta\)$/i, '').trim();
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Fix common formatting issues
    cleaned = cleaned.replace(/\s+([,.!?])/g, '$1'); // Remove space before punctuation
    cleaned = cleaned.replace(/([.!?])\s*([a-záéíóúñ])/gi, '$1 $2'); // Ensure space after punctuation
    
    // Ensure proper capitalization
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    return cleaned.trim();
  }

  /**
   * Apply intent-specific formatting
   */
  private applyIntentFormatting(response: string, intent: QueryIntent): string {
    let formatted = response;
    
    switch (intent.type) {
      case 'pricing':
        // Ensure price is prominently displayed
        if (formatted.includes('20000') || formatted.includes('20,000')) {
          formatted = formatted.replace(
            /20,?000/g, 
            '**$20,000 pesos colombianos**'
          );
        }
        break;
        
      case 'scheduling':
        // Highlight time information
        if (formatted.includes('5:30') || formatted.includes('6:30')) {
          formatted = formatted.replace(
            /(5:30|6:30)(\s*AM?)/gi,
            '**$1$2**'
          );
        }
        break;
        
      case 'location':
        // Emphasize service area
        formatted = formatted.replace(
          /(buga|perímetro urbano)/gi,
          '**$1**'
        );
        break;
        
      case 'booking':
        // Structure booking steps
        if (formatted.includes('1)') || formatted.includes('2)')) {
          // Already has structured steps
        } else {
          // Add structure if missing
          formatted = this.addBookingStructure(formatted);
        }
        break;
        
      case 'greeting':
        // Add welcoming emoji or tone
        if (!formatted.includes('👋') && !formatted.includes('¡')) {
          formatted = `¡Hola! ${formatted}`;
        }
        break;
    }
    
    return formatted;
  }

  /**
   * Ensure conversational and friendly tone
   */
  private ensureConversationalTone(response: string, originalQuery: string): string {
    let conversational = response;
    
    // Add personal pronouns if missing
    if (!conversational.includes('te ') && !conversational.includes('tu ')) {
      conversational = conversational.replace(
        /puedo ayudar/gi,
        'te puedo ayudar'
      );
    }
    
    // Add question prompts to engage user
    const questionPrompts = [
      '¿Te gustaría agendar una cita?',
      '¿Necesitas más información?',
      '¿Hay algo más en lo que te pueda ayudar?',
      '¿Tienes alguna otra pregunta?'
    ];
    
    // Add appropriate question based on intent
    if (!conversational.includes('?') || conversational.split('?').length < 2) {
      const randomPrompt = questionPrompts[Math.floor(Math.random() * questionPrompts.length)];
      conversational += ` ${randomPrompt}`;
    }
    
    return conversational;
  }

  /**
   * Validate and enhance content accuracy
   */
  private validateAndEnhance(response: string, intent: QueryIntent): string {
    let enhanced = response;
    
    // Validate key information is present
    const validationChecks = {
      pricing: ['20,000', '$', 'pesos', 'colombianos'],
      scheduling: ['5:30', '6:30', 'AM', 'mañana'],
      location: ['Buga', 'perímetro', 'urbano'],
      booking: ['cita', 'agendar', 'nombre', 'dirección']
    };
    
    const requiredTerms = validationChecks[intent.type as keyof typeof validationChecks];
    if (requiredTerms) {
      for (const term of requiredTerms) {
        if (!enhanced.toLowerCase().includes(term.toLowerCase())) {
          enhanced = this.addMissingInformation(enhanced, intent.type, term);
        }
      }
    }
    
    // Ensure accuracy of key facts
    enhanced = enhanced.replace(/\$?20\.?000/g, '$20,000');
    enhanced = enhanced.replace(/5:30.*7:00/gi, '5:30 AM - 6:30 AM');
    
    return enhanced;
  }

  /**
   * Add contextual elements based on time, user, etc.
   */
  private addContextualElements(response: string, intent: QueryIntent, context?: any): string {
    let contextual = response;
    
    // Add time-sensitive information
    const now = new Date();
    const hour = now.getHours();
    
    if (intent.type === 'booking' && hour > 18) {
      contextual += '\n\n💡 *Tip*: Como es tarde, te recomiendo confirmar tu cita temprano mañana antes de las 5:30 AM.';
    }
    
    if (intent.type === 'scheduling' && hour < 6) {
      contextual += '\n\n⏰ Si necesitas servicio para hoy, aún estás a tiempo de confirmar tu cita.';
    }
    
    // Add customer-specific context
    if (context?.customerInfo?.name) {
      contextual = contextual.replace(/te puedo/g, `te puedo, ${context.customerInfo.name},`);
    }
    
    return contextual;
  }

  /**
   * Assess response quality
   */
  private assessResponseQuality(response: string, intent: QueryIntent, originalQuery: string): ResponseQuality {
    const criteria = {
      length: response.length >= 50 && response.length <= 500,
      hasSpanish: /[áéíóúñ¿¡]/i.test(response),
      isConversational: response.includes('te ') || response.includes('puedo'),
      hasKeyInfo: this.hasRequiredInformation(response, intent),
      properPunctuation: /[.!?]$/.test(response.trim()),
      noRepetition: !this.hasExcessiveRepetition(response),
      relevantToQuery: this.isRelevantToQuery(response, originalQuery)
    };
    
    const score = Object.values(criteria).filter(Boolean).length;
    const maxScore = Object.keys(criteria).length;
    
    return {
      score: Math.round((score / maxScore) * 10),
      criteria,
      issues: this.identifyIssues(criteria),
      suggestions: this.generateSuggestions(criteria)
    };
  }

  /**
   * Check if response has required information for intent
   */
  private hasRequiredInformation(response: string, intent: QueryIntent): boolean {
    const requirements = {
      pricing: response.includes('20,000') || response.includes('20000'),
      scheduling: response.includes('5:30') || response.includes('6:30'),
      location: response.toLowerCase().includes('buga'),
      booking: response.includes('nombre') || response.includes('dirección')
    };
    
    return requirements[intent.type as keyof typeof requirements] ?? true;
  }

  /**
   * Check for excessive repetition
   */
  private hasExcessiveRepetition(response: string): boolean {
    const words = response.toLowerCase().split(/\s+/);
    const wordCounts: Record<string, number> = {};
    
    for (const word of words) {
      if (word.length > 3) { // Only check words longer than 3 characters
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
    
    // Check if any word appears more than 3 times
    return Object.values(wordCounts).some(count => count > 3);
  }

  /**
   * Check if response is relevant to original query
   */
  private isRelevantToQuery(response: string, originalQuery: string): boolean {
    const queryWords = originalQuery.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    for (const qWord of queryWords) {
      if (qWord.length > 3 && responseWords.includes(qWord)) {
        matchCount++;
      }
    }
    
    return matchCount >= Math.min(2, queryWords.length * 0.3);
  }

  /**
   * Add missing information based on intent
   */
  private addMissingInformation(response: string, intentType: string, missingTerm: string): string {
    const additions = {
      pricing: {
        '$': ' El costo es de $20,000 pesos colombianos.',
        'colombianos': ' El precio está en pesos colombianos.'
      },
      scheduling: {
        '5:30': ' El horario de atención es de 5:30 AM a 6:30 AM.',
        'mañana': ' El servicio se presta en horas de la mañana.'
      },
      location: {
        'Buga': ' El servicio cubre el perímetro urbano de Buga, Colombia.',
        'perímetro': ' Solo atendemos dentro del perímetro urbano.'
      }
    };
    
    const addition = additions[intentType as keyof typeof additions]?.[missingTerm];
    if (addition) {
      return response + addition;
    }
    
    return response;
  }

  /**
   * Add booking structure if missing
   */
  private addBookingStructure(response: string): string {
    const structure = `

**Para agendar tu cita necesito:**
1. Tu nombre completo
2. Dirección exacta en Buga
3. Tipo de exámenes
4. Envío de orden médica por WhatsApp`;
    
    return response + structure;
  }

  /**
   * Identify quality issues
   */
  private identifyIssues(criteria: Record<string, boolean>): string[] {
    const issues = [];
    
    if (!criteria.length) issues.push('Respuesta muy corta o muy larga');
    if (!criteria.hasSpanish) issues.push('Falta contenido en español');
    if (!criteria.isConversational) issues.push('Tono poco conversacional');
    if (!criteria.hasKeyInfo) issues.push('Falta información clave');
    if (!criteria.properPunctuation) issues.push('Puntuación incorrecta');
    if (!criteria.noRepetition) issues.push('Repetición excesiva');
    if (!criteria.relevantToQuery) issues.push('Poco relevante a la consulta');
    
    return issues;
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(criteria: Record<string, boolean>): string[] {
    const suggestions = [];
    
    if (!criteria.isConversational) {
      suggestions.push('Agregar más elementos conversacionales (te, puedo, etc.)');
    }
    
    if (!criteria.hasKeyInfo) {
      suggestions.push('Incluir información específica del servicio');
    }
    
    return suggestions;
  }

  /**
   * Get list of enhancements applied
   */
  private getAppliedEnhancements(): string[] {
    return [
      'Limpieza de formato',
      'Formateo específico por intención',
      'Tono conversacional',
      'Validación de contenido',
      'Elementos contextuales'
    ];
  }

  /**
   * Create fallback response when processing fails
   */
  private createFallbackResponse(original: string, intent: QueryIntent, error: Error): ProcessedResponse {
    return {
      original,
      processed: 'Disculpa, tuve un problema procesando la respuesta. ¿Podrías reformular tu pregunta?',
      intent,
      quality: {
        score: 1,
        criteria: {},
        issues: ['Error en procesamiento'],
        suggestions: ['Reintentar la consulta']
      },
      timestamp: new Date().toISOString(),
      enhancements: [],
      error: error.message
    };
  }
}

// Types and interfaces
export interface ProcessedResponse {
  original: string;
  processed: string;
  intent: QueryIntent;
  quality: ResponseQuality;
  timestamp: string;
  enhancements: string[];
  error?: string;
}

export interface ResponseQuality {
  score: number; // 0-10
  criteria: Record<string, boolean>;
  issues: string[];
  suggestions: string[];
}

// Export singleton instance
export const responseProcessor = new ResponseProcessor();
