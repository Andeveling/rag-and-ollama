import { addKeyword, EVENTS, utils } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { PostgreSQLAdapter } from '@builderbot/database-postgres';
import { ragService } from '../services/rag.service';
import { customerService } from '../services/customer.service';
import { availabilityService } from '../services/availability.service';
import { notificationService } from '../services/notification.service';

/**
 * Welcome flow - Entry point for all conversations
 * Handles initial greetings and RAG-powered responses
 */
export const welcomeFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>([
    EVENTS.WELCOME,
    'hola',
    'hello', 
    'hi',
    'buenos dias',
    'buenas tardes',
    'buenas noches',
    'info',
    'información',
    'laboratorio'
])
.addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
    try {
        console.log(`📞 Nueva conversación iniciada: ${ctx.from}`);
        
        // Find or create customer from WhatsApp
        const customer = await customerService.findOrCreateFromWhatsApp(
            ctx.from,
            ctx.pushName || ctx.name
        );
        
        // Store customer in conversation state
        await state.update({ 
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phoneNumber
        });
        
        // Check if returning customer with appointment history
        const hasHistory = await customerService.hasPendingAppointments(customer.id);
        const stats = await customerService.getCustomerStats(customer.id);
        
        let welcomeMessage = '';
        
        if (stats.totalAppointments > 0) {
            // Returning customer
            welcomeMessage = `¡Hola ${customer.name}! 👋\n\n`;
            welcomeMessage += `Bienvenido de nuevo a **Marcela Salazar** 🧪\n\n`;
            
            if (hasHistory) {
                welcomeMessage += `Veo que tienes citas programadas. ¿En qué puedo ayudarte hoy?\n\n`;
                welcomeMessage += `• Ver mis citas 📅\n`;
                welcomeMessage += `• Agendar nueva cita 📝\n`;
                welcomeMessage += `• Cancelar/reprogramar ⏰\n`;
                welcomeMessage += `• Información de servicios ℹ️\n\n`;
            } else {
                welcomeMessage += `¿Te gustaría agendar una nueva cita o necesitas información sobre nuestros servicios?\n\n`;
            }
        } else {
            // New customer
            welcomeMessage = `¡Hola ${customer.name}! 👋\n\n`;
            welcomeMessage += `Bienvenido a **Marcela Salazar** 🧪\n\n`;
            welcomeMessage += `Ofrecemos servicios de análisis clínicos **a domicilio** en el perímetro urbano de Buga.\n\n`;
            welcomeMessage += `💰 **Precio:** $20,000 COP\n`;
            welcomeMessage += `🕐 **Horario:** 5:30 AM - 6:30 AM\n`;
            welcomeMessage += `📍 **Área:** Buga urbano\n\n`;
            welcomeMessage += `¿En qué puedo ayudarte?\n\n`;
            welcomeMessage += `• Agendar cita 📝\n`;
            welcomeMessage += `• Ver servicios disponibles 🔬\n`;
            welcomeMessage += `• Preguntar sobre el proceso 💬\n`;
        }
        
        await flowDynamic(welcomeMessage);
        
        // Set timeout for idle users (2 minutes)
        await state.update({ lastInteraction: Date.now() });
        
    } catch (error) {
        console.error('❌ Error en flujo de bienvenida:', error);
    await flowDynamic('¡Hola! Bienvenido a Marcela Salazar. Estamos experimentando un pequeño problema técnico, pero estoy aquí para ayudarte. ¿En qué puedo asistirte?');
    }
})
.addAction(
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow, state, fallBack }) => {
        try {
            const userMessage = ctx.body.toLowerCase().trim();
            
            // Update last interaction
            await state.update({ lastInteraction: Date.now() });
            
            // Check if user is confirming after availability query
            const lastResponse = state.get('lastBotResponse') || '';
            const isConfirmingAvailability = lastResponse.includes('disponible') || lastResponse.includes('disponibilidad');
            
            if (isConfirmingAvailability && (
                userMessage.includes('sí') || userMessage.includes('si') || 
                userMessage.includes('así es') || userMessage.includes('asi es') ||
                userMessage.includes('perfecto') || userMessage.includes('ok') ||
                userMessage.includes('excelente') || userMessage.includes('genial') ||
                userMessage.includes('quiero') || userMessage.includes('proceder') ||
                userMessage === 'si' || userMessage === 'sí'
            )) {
                console.log('🎯 Intent: Confirmando disponibilidad - proceder a agendar');
                await state.update({ suggestionOffered: false });
                await flowDynamic('¡Excelente! 📝 Te ayudo a agendar tu cita...');
                return fallBack('Por favor escribe "agendar cita" para continuar con el proceso.');
            }
            
            // Intent detection for common actions
            if (userMessage.includes('agendar') || userMessage.includes('cita') || userMessage.includes('agenda')) {
                console.log('🎯 Intent: Agendar cita');
                await state.clear();
                await flowDynamic('📝 Te ayudo a agendar una cita...');
                    await state.update({ suggestionOffered: false });
                return fallBack('Por favor escribe "agendar cita" para empezar el proceso de agendamiento.');
            }
            
            if (userMessage.includes('ver') && userMessage.includes('cita') || 
                userMessage.includes('consultar') || userMessage.includes('mis cita')) {
                console.log('🎯 Intent: Ver citas');
                await state.clear();
                await flowDynamic('👀 Consultando tus citas...');
                    await state.update({ suggestionOffered: false });
                return fallBack('Por favor escribe "ver citas" para consultar tus citas.');
            }
            
            if (userMessage.includes('cancelar') || userMessage.includes('reprogramar') || 
                userMessage.includes('cambiar')) {
                console.log('🎯 Intent: Modificar cita');
                await state.clear();
                await flowDynamic('🔧 Te ayudo a modificar tu cita...');
                    await state.update({ suggestionOffered: false });
                return fallBack('Por favor escribe "cancelar cita" o "reprogramar cita" según necesites.');
            }
            
            if (userMessage.includes('precio') || userMessage.includes('costo') || 
                userMessage.includes('tarifa') || userMessage.includes('valor')) {
                await flowDynamic('💰 **Precio del servicio a domicilio:** $20,000 COP\n\nEste valor incluye:\n• Traslado a tu domicilio\n• Toma de muestra profesional\n• Transporte de muestra al laboratorio\n• Procesamiento del análisis\n\n¿Te gustaría agendar una cita?');
                return fallBack();
            }
            
            if (userMessage.includes('horario') || userMessage.includes('hora') || 
                userMessage.includes('cuando')) {
                const workingHours = availabilityService.getWorkingHours();
                const isOperating = availabilityService.isCurrentlyOperating();
                const statusText = isOperating ? '🟢 Actualmente en servicio' : '🔴 Fuera de horario';
                
                const response = `🕐 **Horarios de atención:**\n\n⏰ ${workingHours.startTime} - ${workingHours.endTime}\n${statusText}\n\nAtendemos todos los días de la semana en el perímetro urbano de Buga.\n\n¿Te gustaría ver la disponibilidad para agendar?`;
                await flowDynamic(response);
                await state.update({ lastBotResponse: response });
                return fallBack();
            }
            
            // Handle availability questions
            if (userMessage.includes('disponibilidad') || userMessage.includes('disponible') ||
                userMessage.includes('mañana') || userMessage.includes('manana') ||
                userMessage.includes('hoy') || userMessage.includes('fecha')) {
                console.log('🎯 Intent: Consulta de disponibilidad');
                const response = '📅 ¡Sí! Tenemos disponibilidad para mañana y los próximos días.\n\nNuestro horario es de 5:30 AM a 6:30 AM en el perímetro urbano de Buga.\n\n¿Te gustaría proceder a agendar tu cita? 😊';
                await flowDynamic(response);
                await state.update({ lastBotResponse: response });
                return fallBack();
            }
            
            // Use RAG service for other queries
            console.log(`🤖 Procesando consulta con RAG: ${userMessage}`);
            const ragResponse = await ragService.processQuery(userMessage, {
                conversationHistory: [],
                customerContext: {
                    customerId: state.get('customerId'),
                    name: state.get('customerName'),
                    phone: state.get('customerPhone')
                }
            });
            
            await flowDynamic(ragResponse);
            
            // Store the bot's response to detect follow-up confirmations
            await state.update({ lastBotResponse: ragResponse });

                // Only offer suggestion if not already offered in this conversation
                const suggestionOffered = state.get('suggestionOffered');
                if (!suggestionOffered) {
                    await utils.delay(1000);
                    await flowDynamic('¿Te gustaría realizar alguna de estas acciones?\n\n• Agendar cita 📝\n• Ver disponibilidad 📅\n• Consultar precios 💰');
                    await state.update({ suggestionOffered: true });
                }
                return fallBack();
            
        } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
            await flowDynamic('Disculpa, hubo un problema procesando tu mensaje. ¿Podrías intentar de nuevo o ser más específico sobre lo que necesitas?');
            return fallBack();
        }
    }
);

/**
 * Help flow - Shows available commands and options
 */
export const helpFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>([
    'ayuda',
    'help',
    'comandos',
    'opciones',
    'menu',
    'que puedes hacer'
])
.addAnswer([
    '🆘 **Centro de Ayuda - Marcela Salazar**',
    '',
    '**Comandos disponibles:**',
    '',
    '📝 **Agendar cita:**',
    '• "agendar cita"',
    '• "nueva cita"',
    '• "quiero agendar"',
    '',
    '👀 **Ver mis citas:**',
    '• "ver citas"',
    '• "mis citas"',
    '• "consultar cita"',
    '',
    '⏰ **Modificar citas:**',
    '• "cancelar cita"',
    '• "reprogramar"',
    '• "cambiar cita"',
    '',
    '💰 **Información:**',
    '• "precio" - Ver tarifas',
    '• "horarios" - Ver horarios de atención',
    '• "servicios" - Ver servicios disponibles',
    '',
    '❓ **Para otras consultas:**',
    'Simplemente escribe tu pregunta y te ayudaré con información específica.',
    '',
    '¿En qué puedo ayudarte hoy?'
].join('\n'));

/**
 * Idle timeout flow - Handles inactive users
 */
export const idleFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>(EVENTS.ACTION)
.addAction(async (ctx, { flowDynamic, state }) => {
    const customerName = state.get('customerName') || 'Cliente';
    
    await flowDynamic([
        `Hola ${customerName}, he notado que no has respondido en un tiempo. ⏰`,
        '',
        'Si necesitas ayuda más tarde, simplemente escríbeme:',
        '• "hola" para empezar de nuevo',
        '• "ayuda" para ver opciones disponibles',
        '',
        'Estaré aquí cuando me necesites. 😊'
    ].join('\n'));
});

/**
 * Error handling flow - Handles unrecognized inputs
 */
export const errorFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>(EVENTS.ACTION)
.addAction(async (ctx, { flowDynamic, fallBack, state }) => {
    const templates = notificationService.getNotificationTemplates();
    
    await flowDynamic([
        '🤔 No estoy seguro de entender lo que necesitas.',
        '',
        'Puedes intentar:',
        '• Ser más específico sobre lo que buscas',
        '• Usar palabras como "agendar", "cita", "precio", "horario"',
        '• Escribir "ayuda" para ver todas las opciones',
        '',
        '¿Podrías intentar de nuevo?'
    ].join('\n'));
    
    return fallBack();
});

// Export flows array for easy import
export const mainFlows = [
    welcomeFlow,
    helpFlow,
    idleFlow,
    errorFlow
];
