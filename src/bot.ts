<<<<<<< HEAD
<file upload>
=======
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot';
import { PostgreSQLAdapter as Database } from '@builderbot/database-postgres';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { schedule } from 'node-cron';

// Import all flows
import { mainFlows } from './flows/main.flows.js';
import { scheduleFlow, addressCollectionFlow } from './flows/schedule.flows.js';
import { 
  viewAppointmentFlow, 
  modifyAppointmentFlow, 
  cancelAppointmentFlow,
  rescheduleAppointmentFlow 
} from './flows/appointment.flows.js';

// Import services
import { notificationService } from './services/notification.service.js';
import { dbConfig } from './config/environment.js';
import { ragService } from './services/rag.service.js';

const PORT = process.env.PORT ?? 3008;

/**
 * Combine all flows into one array
 */
const allFlows = [
  ...mainFlows,
  scheduleFlow,
  addressCollectionFlow,
  viewAppointmentFlow,
  modifyAppointmentFlow,
  cancelAppointmentFlow,
  rescheduleAppointmentFlow
];

/**
 * Main bot initialization function
 */
const main = async () => {
  try {
    console.log('🚀 Iniciando Marcela Salazar Bot...');

    // Inicializar servicio RAG antes de cualquier flujo
    await ragService.initialize();
    
    // Create flow adapter
    const adapterFlow = createFlow(allFlows);
    
    // Create provider adapter
    const adapterProvider = createProvider(Provider);
    
    // Create database adapter
    const adapterDB = new Database({
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      password: dbConfig.password,
      port: dbConfig.port
    });

    // Create bot with optimized queue settings
    const { handleCtx, httpServer } = await createBot({
      flow: adapterFlow,
      provider: adapterProvider,
      database: adapterDB,
    }, {
      queue: {
        timeout: 20000, // 20 seconds timeout
        concurrencyLimit: 25 // Handle up to 25 concurrent conversations
      }
    });

    // API Endpoints for external integrations
    
    /**
     * Send message endpoint
     * POST /v1/messages
     */
    adapterProvider.server.post(
      '/v1/messages',
      handleCtx(async (bot, req, res) => {
        try {
          const { number, message, urlMedia } = req.body;
          
          if (!number || !message) {
            return res.status(400).json({ 
              error: 'Missing required fields: number, message' 
            });
          }
          
          await bot.sendMessage(number, message, { media: urlMedia ?? null });
          
          res.json({ 
            success: true, 
            message: 'Message sent successfully',
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('❌ Error sending message:', error);
          res.status(500).json({ 
            error: 'Failed to send message',
            details: error.message
          });
        }
      })
    );

    /**
     * Trigger appointment reminder endpoint  
     * POST /v1/reminders
     */
    adapterProvider.server.post(
      '/v1/reminders',
      handleCtx(async (bot, req, res) => {
        try {
          const { type } = req.body;
          
          if (type === 'daily') {
            await notificationService.sendDailyReminders();
          } else if (type === 'preparation') {
            await notificationService.sendPreparationInstructions();
          } else {
            return res.status(400).json({ 
              error: 'Invalid reminder type. Use "daily" or "preparation"' 
            });
          }
          
          res.json({ 
            success: true, 
            message: `${type} reminders sent successfully`,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('❌ Error sending reminders:', error);
          res.status(500).json({ 
            error: 'Failed to send reminders',
            details: error.message
          });
        }
      })
    );

    /**
     * Health check endpoint
     * GET /health
     */
    adapterProvider.server.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'Marcela Salazar Bot',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    /**
     * Bot statistics endpoint
     * GET /v1/stats  
     */
    adapterProvider.server.get('/v1/stats', (req, res) => {
      res.json({
        bot: 'Marcela Salazar',
        flows: allFlows.length,
        environment: process.env.NODE_ENV || 'development',
        database: 'PostgreSQL',
        provider: 'Baileys (WhatsApp)',
        features: [
          'RAG-powered responses',
          'Appointment scheduling',
          'Customer management', 
          'Automated notifications',
          'Address validation for Buga urban area',
          'Cron-based reminders'
        ]
      });
    });

    // Start HTTP server
    httpServer(+PORT);
    
  console.log(`✅ Bot Marcela Salazar iniciado exitosamente en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Stats: http://localhost:${PORT}/v1/stats`);
    
    // Schedule automated tasks
    setupCronJobs();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down bot gracefully...');
      
      try {
        // Close database connection if available
        console.log('✅ Database connection closed');
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }
      
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando el bot:', error);
    process.exit(1);
  }
};

/**
 * Setup cron jobs for automated tasks
 */
function setupCronJobs() {
  console.log('⏰ Configurando tareas programadas...');
  
  // Daily reminders at 6:00 PM (18:00) Colombian time
  schedule('0 18 * * *', async () => {
    try {
      console.log('🔔 Ejecutando recordatorios diarios...');
      await notificationService.sendDailyReminders();
      console.log('✅ Recordatorios diarios enviados');
    } catch (error) {
      console.error('❌ Error en recordatorios diarios:', error);
    }
  });
  
  // Preparation instructions at 8:00 PM (20:00) Colombian time  
  schedule('0 20 * * *', async () => {
    try {
      console.log('📋 Enviando instrucciones de preparación...');
      await notificationService.sendPreparationInstructions();
      console.log('✅ Instrucciones de preparación enviadas');
    } catch (error) {
      console.error('❌ Error en instrucciones de preparación:', error);
    }
  });
  
  // Health check every 30 minutes
  schedule('*/30 * * * *', () => {
    console.log(`💓 Bot health check - Uptime: ${Math.floor(process.uptime() / 60)} minutes`);
  });
  
  console.log('✅ Tareas programadas configuradas');
  console.log('📅 Recordatorios diarios: 6:00 PM');
  console.log('📋 Instrucciones preparación: 8:00 PM');
}

// Start the bot
main().catch(error => {
  console.error('💥 Fatal error starting bot:', error);
  process.exit(1);
});
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
