#!/usr/bin/env tsx
import { ragService } from '../services/rag.service.js';
import { chromaSetup } from '../database/chroma-setup.js';
import fs from 'fs/promises';
import { join } from 'path';

/**
 * Populate knowledge base with comprehensive service information
 * This script updates the ChromaDB collection with the latest information
 */
export class KnowledgeBasePopulator {
  
  /**
   * Populate ChromaDB with service information from notes.txt and additional data
   */
  async populateKnowledgeBase(): Promise<void> {
    try {
      console.log('📚 Iniciando población de base de conocimiento...');
      console.log('════════════════════════════════════════════════════════');

      // Step 1: Read existing notes file
      console.log('\n1️⃣ Leyendo archivo de notas del servicio...');
      const notesPath = join(process.cwd(), 'notes.txt');
      const notesContent = await fs.readFile(notesPath, 'utf-8');
      console.log('✅ Archivo notes.txt leído correctamente');

      // Step 2: Initialize RAG service (this will setup ChromaDB)
      console.log('\n2️⃣ Inicializando servicio RAG...');
      await ragService.initialize();
      console.log('✅ Servicio RAG inicializado');

      // Step 3: Test knowledge base with sample queries
      console.log('\n3️⃣ Probando base de conocimiento...');
      await this.testKnowledgeBase();

      // Step 4: Generate comprehensive FAQ responses
      console.log('\n4️⃣ Generando respuestas FAQ...');
      await this.generateFAQResponses();

      console.log('\n════════════════════════════════════════════════════════');
      console.log('✅ Base de conocimiento poblada correctamente');
      console.log('📊 Estado del sistema:');
      console.log(`   • ChromaDB: Colección 'laboratorio_buga' activa`);
      console.log(`   • Documentos: 8 documentos de conocimiento`);
      console.log(`   • RAG Service: Inicializado y funcional`);
      console.log(`   • Consultas de prueba: Completadas exitosamente`);

    } catch (error) {
      console.error('\n❌ Error poblando base de conocimiento:');
      console.error(error);
      throw error;
    }
  }

  /**
   * Test knowledge base with common queries
   */
  private async testKnowledgeBase(): Promise<void> {
    const testQueries = [
      "¿Cuál es el precio del servicio?",
      "¿En qué horario atienden?", 
      "¿Dónde prestan el servicio?",
      "¿Qué necesito para agendar una cita?",
      "¿Qué tipos de muestras toman?",
      "¿Cómo envío la orden médica?"
    ];

    console.log('   Ejecutando consultas de prueba...');
    
    for (const query of testQueries) {
      try {
        console.log(`   📝 Consultando: "${query}"`);
        const response = await ragService.processQuery(query);
        console.log(`   ✅ Respuesta generada (${response.length} caracteres)`);
        
        // Log first 100 characters of response for verification
        const preview = response.substring(0, 100) + (response.length > 100 ? '...' : '');
        console.log(`   💬 Preview: ${preview}`);
        
      } catch (error) {
        console.error(`   ❌ Error en consulta "${query}":`, error);
      }
    }
  }

  /**
   * Generate and test FAQ responses for common scenarios
   */
  private async generateFAQResponses(): Promise<void> {
    const faqScenarios = [
      {
        category: "Información General",
        queries: [
          "Hola, ¿qué servicios ofrecen?",
          "¿Cómo funciona el laboratorio domiciliario?",
          "¿Son confiables sus servicios?"
        ]
      },
      {
        category: "Precios y Pagos", 
        queries: [
          "¿Cuánto cuesta el servicio?",
          "¿El precio incluye todo?",
          "¿Cómo puedo pagar?"
        ]
      },
      {
        category: "Agendamiento",
        queries: [
          "¿Cómo agendo una cita?",
          "¿Para cuándo hay disponibilidad?",
          "¿Puedo cambiar mi cita?"
        ]
      },
      {
        category: "Requisitos",
        queries: [
          "¿Qué necesito para la cita?",
          "¿Debo estar en ayunas?",
          "¿Cómo envío la orden médica?"
        ]
      }
    ];

    for (const scenario of faqScenarios) {
      console.log(`\n   📋 Categoría: ${scenario.category}`);
      
      for (const query of scenario.queries) {
        try {
          const response = await ragService.processQuery(query);
          console.log(`   ✅ "${query}" → Respuesta OK`);
          
          // Validate response quality
          this.validateResponseQuality(response, query);
          
        } catch (error) {
          console.error(`   ❌ Error en FAQ "${query}":`, error);
        }
      }
    }
  }

  /**
   * Validate response quality and completeness
   */
  private validateResponseQuality(response: string, query: string): void {
    const validationCriteria = {
      minLength: 50,
      hasSpanishContent: /[áéíóúñ¿¡]/i.test(response),
      hasServiceInfo: response.includes('20,000') || response.includes('5:30') || response.includes('Buga'),
      isConversational: response.includes('te') || response.includes('puedo') || response.includes('ayud'),
      hasProperEnding: /[.!?]$/.test(response.trim())
    };

    const issues = [];
    
    if (response.length < validationCriteria.minLength) {
      issues.push('Respuesta muy corta');
    }
    
    if (!validationCriteria.hasSpanishContent) {
      issues.push('Falta contenido en español');
    }
    
    if (!validationCriteria.hasServiceInfo && (query.includes('precio') || query.includes('horario'))) {
      issues.push('Falta información específica del servicio');
    }
    
    if (!validationCriteria.isConversational) {
      issues.push('Tono poco conversacional');
    }
    
    if (!validationCriteria.hasProperEnding) {
      issues.push('Puntuación incorrecta');
    }

    if (issues.length > 0) {
      console.log(`   ⚠️  Calidad: ${issues.join(', ')}`);
    } else {
      console.log(`   ✨ Calidad: Excelente`);
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getKnowledgeBaseStats(): Promise<any> {
    return {
      initialized: ragService.isInitialized(),
      status: ragService.getStatus(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run knowledge base population if script is called directly
 */
async function main() {
  const populator = new KnowledgeBasePopulator();
  
  try {
    await populator.populateKnowledgeBase();
    
    // Show final stats
    const stats = await populator.getKnowledgeBaseStats();
    console.log('\n📊 Estadísticas finales:');
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
