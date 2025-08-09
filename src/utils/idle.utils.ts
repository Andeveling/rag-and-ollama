<<<<<<< HEAD
<file upload>
=======
import { EVENTS, addKeyword } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { PostgreSQLAdapter } from '@builderbot/database-postgres';

// Object to store timers for each user
const timers: Record<string, NodeJS.Timeout> = {};

// Flow for handling inactivity
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
    
    // Clean up state and timer
    stop(ctx);
    await state.clear();
});

/**
 * Start the inactivity timer for a user
 */
export const start = (ctx: any, gotoFlow: (a: any) => Promise<void>, ms: number) => {
    // Stop existing timer if any
    stop(ctx);
    
    timers[ctx.from] = setTimeout(() => {
        console.log(`⏰ User timeout: ${ctx.from}`);
        gotoFlow(idleFlow).catch(console.error);
    }, ms);
    
    console.log(`⏰ Started idle timer for ${ctx.from}: ${ms}ms`);
};

/**
 * Reset the inactivity timer for a user
 */
export const reset = (ctx: any, gotoFlow: (a: any) => Promise<void>, ms: number) => {
    stop(ctx);
    
    if (timers[ctx.from]) {
        console.log(`⏰ Reset countdown for user: ${ctx.from}`);
    }
    
    start(ctx, gotoFlow, ms);
};

/**
 * Stop the inactivity timer for a user
 */
export const stop = (ctx: any) => {
    if (timers[ctx.from]) {
        clearTimeout(timers[ctx.from]);
        delete timers[ctx.from];
        console.log(`⏰ Stopped idle timer for user: ${ctx.from}`);
    }
};

/**
 * Clean up all timers (useful for shutdown)
 */
export const cleanup = () => {
    Object.keys(timers).forEach(userId => {
        clearTimeout(timers[userId]);
        delete timers[userId];
    });
    console.log('⏰ Cleaned up all idle timers');
};

// Export default idle timeout (2 minutes)
export const DEFAULT_IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
