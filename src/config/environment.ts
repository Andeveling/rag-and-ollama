<<<<<<< HEAD
<file upload>
=======
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') })

interface DatabaseConfig {
  host: string
  user: string
  password: string
  database: string
  port: number
}

interface ChromaConfig {
  host: string
  port: number
  url: string
}

interface OllamaConfig {
  host: string
  port: number
  url: string
  model: string
  embeddingModel: string
}

interface BotConfig {
  port: number
  name: string
  phoneNumber?: string
  sessionPath: string
  qrTimeout: number
}

interface ServiceConfig {
  area: string
  basePrice: number
  startTime: string
  endTime: string
  maxAppointmentsPerDay: number
}

interface AppConfig {
  nodeEnv: string
  database: DatabaseConfig
  chroma: ChromaConfig
  ollama: OllamaConfig
  bot: BotConfig
  service: ServiceConfig
  logging: {
    level: string
    file: string
  }
}

// Environment variable validation
const requiredEnvVars = [
  'POSTGRES_DB_HOST',
  'POSTGRES_DB_USER', 
  'POSTGRES_DB_PASSWORD',
  'POSTGRES_DB_NAME',
  'CHROMA_HOST',
  'OLLAMA_HOST'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Create configuration object
export const appConfig: AppConfig = {
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    host: process.env.POSTGRES_DB_HOST!,
    user: process.env.POSTGRES_DB_USER!,
    password: process.env.POSTGRES_DB_PASSWORD!,
    database: process.env.POSTGRES_DB_NAME!,
    port: parseInt(process.env.POSTGRES_DB_PORT || "5432", 10),
  },

  chroma: {
    host: process.env.CHROMA_HOST!,
    port: parseInt(process.env.CHROMA_PORT || "8000", 10),
    get url() {
      return `http://${this.host}:${this.port}`
    },
  },

  ollama: {
    host: process.env.OLLAMA_HOST!,
    port: parseInt(process.env.OLLAMA_PORT || "11434", 10),
    model: process.env.OLLAMA_MODEL || "gemma3:1b",
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
    get url() {
      return `http://${this.host}:${this.port}`
    },
  },

  bot: {
    port: parseInt(process.env.BOT_PORT || "3008", 10),
    name: process.env.BOT_NAME || "Laboratorio Buga Bot",
    phoneNumber: process.env.BOT_PHONE_NUMBER,
    sessionPath: process.env.WHATSAPP_SESSION_PATH || "./bot_sessions",
    qrTimeout: parseInt(process.env.WHATSAPP_QR_TIMEOUT || "60000", 10),
  },

  service: {
    area: process.env.SERVICE_AREA || "Buga perimetro urbano",
    basePrice: parseInt(process.env.BASE_PRICE || "20000", 10),
    startTime: process.env.SERVICE_START_TIME || "05:30",
    endTime: process.env.SERVICE_END_TIME || "06:30",
    maxAppointmentsPerDay: parseInt(process.env.MAX_APPOINTMENTS_PER_DAY || "10", 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "./logs/bot.log",
  },
}

// Configuration validation
export const validateConfig = (): boolean => {
  try {
    // Validate port ranges
    if (appConfig.database.port < 1 || appConfig.database.port > 65535) {
      throw new Error('Invalid database port')
    }
    
    if (appConfig.bot.port < 1 || appConfig.bot.port > 65535) {
      throw new Error('Invalid bot port')
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(appConfig.service.startTime) || !timeRegex.test(appConfig.service.endTime)) {
      throw new Error('Invalid time format for service hours')
    }

    // Validate base price
    if (appConfig.service.basePrice < 0) {
      throw new Error('Invalid base price')
    }

    return true
  } catch (error) {
    console.error('Configuration validation failed:', error)
    return false
  }
}

// Export individual configs for convenience
export const {
  database: dbConfig,
  chroma: chromaConfig,
  ollama: ollamaConfig,
  bot: botConfig,
  service: serviceConfig
} = appConfig
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
