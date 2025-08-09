import { Ollama } from "@llamaindex/ollama";
import { OllamaEmbedding } from "@llamaindex/ollama";
import { Settings } from "llamaindex";
import { ollamaConfig } from '../config/environment.js';

/**
 * Ollama service for local LLM processing
 * Handles initialization and configuration of Ollama models
 */
export class OllamaService {
  private llm: Ollama;
  private embedding: OllamaEmbedding;
  private initialized: boolean = false;

  constructor() {
    this.llm = new Ollama({
      model: ollamaConfig.model
    });

    this.embedding = new OllamaEmbedding({
      model: ollamaConfig.embeddingModel
    });
  }

  /**
   * Initialize Ollama service and configure LlamaIndex settings
   */
  async initialize(): Promise<void> {
    try {
      console.log('🤖 Inicializando servicio Ollama...');
      console.log(`📋 Modelo LLM: ${ollamaConfig.model}`);
      console.log(`🔤 Modelo Embedding: ${ollamaConfig.embeddingModel}`);
      
      // Test connection to Ollama
      await this.testConnection();
      
      // Configure global LlamaIndex settings
      Settings.llm = this.llm;
      Settings.embedModel = this.embedding;
      
      this.initialized = true;
      console.log('✅ Ollama servicio inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando Ollama:', error);
      throw new Error(`Failed to initialize Ollama service: ${error}`);
    }
  }

  /**
   * Test connection to Ollama server
   */
  private async testConnection(): Promise<void> {
    try {
      console.log('🔍 Probando conexión con Ollama...');
      
      // Test LLM with a simple query
      const testResponse = await this.llm.complete({ 
        prompt: "Responde solo con 'OK' si puedes procesar este mensaje." 
      });
      
      if (!testResponse || !testResponse.text) {
        throw new Error('No response from Ollama LLM');
      }
      
      console.log('✅ Conexión con Ollama LLM establecida');
      console.log(`📝 Respuesta de prueba: ${testResponse.text.trim()}`);
      
    } catch (error) {
      console.error('❌ Error probando conexión Ollama:', error);
      throw new Error(`Ollama connection test failed: ${error}`);
    }
  }

  /**
   * Get LLM instance
   */
  getLLM(): Ollama {
    if (!this.initialized) {
      throw new Error('OllamaService not initialized. Call initialize() first.');
    }
    return this.llm;
  }

  /**
   * Get embedding model instance
   */
  getEmbedding(): OllamaEmbedding {
    if (!this.initialized) {
      throw new Error('OllamaService not initialized. Call initialize() first.');
    }
    return this.embedding;
  }

  /**
   * Generate completion using the LLM
   */
  async generateCompletion(prompt: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('OllamaService not initialized. Call initialize() first.');
    }

    try {
      const response = await this.llm.complete({ prompt });
      return response.text;
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.initialized) {
      throw new Error('OllamaService not initialized. Call initialize() first.');
    }

    try {
      const embedding = await this.embedding.getTextEmbedding(text);
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service configuration
   */
  getConfig() {
    return {
      model: ollamaConfig.model,
      embeddingModel: ollamaConfig.embeddingModel,
      host: ollamaConfig.host,
      port: ollamaConfig.port,
      initialized: this.initialized
    };
  }
}

// Export singleton instance
export const ollamaService = new OllamaService();
