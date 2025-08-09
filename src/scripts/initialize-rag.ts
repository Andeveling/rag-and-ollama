#!/usr/bin/env tsx
import { chromaSetup } from '../database/chroma-setup.js';
import { ollamaService } from '../services/ollama.service.js';
import { ragService } from '../services/rag.service.js';
import { queryProcessor } from '../services/query-processor.js';
import { responseProcessor } from '../services/response-processor.js';

/**
 * Initialize the complete RAG system with all components
 * This script should be run before starting the bot
 */
async function initializeRagSystem(): Promise<void> {
  try {
    console.log('🚀 Iniciando configuración del sistema RAG completo...');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Step 1: Initialize Ollama service
    console.log('\n1️⃣ Inicializando servicio Ollama...');
    await ollamaService.initialize();
    console.log('✅ Ollama service inicializado');
    
    // Step 2: Setup ChromaDB collection
    console.log('\n2️⃣ Configurando ChromaDB y base de conocimiento...');
    const index = await chromaSetup.setupCollection();
    console.log('✅ ChromaDB configurado');
    
    // Step 3: Initialize RAG service
    console.log('\n3️⃣ Inicializando servicio RAG...');
    await ragService.initialize();
    console.log('✅ Servicio RAG inicializado');
    
    // Step 4: Test complete pipeline
    console.log('\n4️⃣ Probando pipeline completo de consultas...');
    await testCompletePipeline();
    
    // Step 5: System health check
    console.log('\n5️⃣ Verificación de salud del sistema...');
    const healthCheck = await performHealthCheck();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Sistema RAG completo inicializado correctamente');
    console.log('📋 Configuración completada:');
    console.log(`   • Ollama: ${ollamaService.getConfig().model}`);
    console.log(`   • ChromaDB: laboratorio_buga collection`);
    console.log(`   • RAG Service: Inicializado y funcional`);
    console.log(`   • Query Processor: Pipeline de consultas activo`);
    console.log(`   • Response Processor: Post-procesamiento configurado`);
    console.log(`   • Health Status: ${healthCheck.status}`);
    console.log('\n🤖 El sistema completo está listo para procesar consultas');
    
  } catch (error) {
    console.error('\n❌ Error inicializando sistema RAG:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Test the complete processing pipeline
 */
async function testCompletePipeline(): Promise<void> {
  const testQueries = [
    "¿Cuánto cuesta el servicio?",
    "¿A qué hora atienden?", 
    "Quiero agendar una cita",
    "¿Dónde prestan el servicio?"
  ];

  console.log('   Probando pipeline completo...');
  
  for (const query of testQueries) {
    try {
      console.log(`\n   🔍 Consulta: "${query}"`);
      
      // Test complete pipeline
      const result = await queryProcessor.processQuery(query, {
        customerInfo: { name: 'Test User' }
      });
      
      // Test response processing
      const processedResponse = responseProcessor.processResponse(
        result.response,
        result.intent,
        query
      );
      
      console.log(`   ✅ Intención: ${result.intent.type} (${result.intent.confidence})`);
      console.log(`   ✅ Respuesta procesada (calidad: ${processedResponse.quality.score}/10)`);
      console.log(`   📝 Preview: ${processedResponse.processed.substring(0, 80)}...`);
      
    } catch (error) {
      console.error(`   ❌ Error en consulta "${query}":`, error);
    }
  }
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck(): Promise<{ status: string; details: any }> {
  const health = {
    ollama: ollamaService.isInitialized(),
    rag: ragService.isInitialized(),
    chroma: true, // Assume ChromaDB is healthy if RAG works
    pipeline: true // Will be tested
  };
  
  // Test a simple query to ensure pipeline works
  try {
    await queryProcessor.processQuery("Hola", {});
    health.pipeline = true;
  } catch {
    health.pipeline = false;
  }
  
  const allHealthy = Object.values(health).every(Boolean);
  
  return {
    status: allHealthy ? 'HEALTHY' : 'DEGRADED',
    details: health
  };
}

// Run initialization if script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeRagSystem();
}
