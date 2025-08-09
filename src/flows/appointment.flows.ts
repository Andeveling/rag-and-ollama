import { addKeyword, EVENTS, utils } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { PostgreSQLAdapter } from '@builderbot/database-postgres';
import { customerService } from '../services/customer.service.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { notificationService } from '../services/notification.service.js';
import { availabilityService } from '../services/availability.service.js';
import { AppointmentStatus, BUSINESS_RULES } from '../models/appointment.model.js';

/**
 * View appointments flow - Shows customer's current and past appointments
 */
export const viewAppointmentFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>([
    'ver citas',
    'mis citas',
    'consultar cita',
    'cita actual',
    'estado cita'
])
.addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    try {
        console.log(`👀 Consultando citas: ${ctx.from}`);
        
        // Get customer
        let customerId = state.get('customerId');
        if (!customerId) {
            const customer = await customerService.findOrCreateFromWhatsApp(ctx.from, ctx.pushName);
            customerId = customer.id;
            await state.update({ customerId, customerName: customer.name });
        }
        
        const customer = await customerService.findById(customerId);
        if (!customer) {
            await flowDynamic('❌ No pude encontrar tu información. Por favor intenta de nuevo.');
            return;
        }
        
        await flowDynamic('🔍 Consultando tus citas...');
        await utils.delay(1000);
        
        // Get customer appointments
        const appointments = await appointmentRepository.getCustomerAppointments(customerId, { limit: 10 });
        
        if (appointments.length === 0) {
            await flowDynamic([
                '📅 **No tienes citas registradas**',
                '',
                '¿Te gustaría agendar tu primera cita?',
                '',
                '📝 Responde "sí" para agendar o "no" si necesitas algo más.'
            ].join('\n'));
            
            await state.update({ step: 'schedule_suggestion' });
            return;
        }
        
        // Separate appointments by status
        const pendingAppointments = appointments.filter(apt => 
            ['scheduled', 'confirmed'].includes(apt.status)
        );
        const completedAppointments = appointments.filter(apt => 
            apt.status === 'completed'
        );
        const cancelledAppointments = appointments.filter(apt => 
            apt.status === 'cancelled'
        );
        
        let message = `📋 **TUS CITAS - ${customer.name}**\n\n`;
        
        // Show pending appointments first
        if (pendingAppointments.length > 0) {
            message += '🟢 **CITAS ACTIVAS:**\n\n';
            
            for (const apt of pendingAppointments) {
                const timeSlot = await appointmentRepository.findTimeSlotById(apt.timeSlotId);
                const appointmentDate = apt.appointmentDate.toLocaleDateString('es-CO', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                const statusIcon = apt.status === 'confirmed' ? '✅' : '⏳';
                const statusText = apt.status === 'confirmed' ? 'Confirmada' : 'Programada';
                
                message += `${statusIcon} **${appointmentDate}**\n`;
                message += `🕐 ${timeSlot?.startTime} - ${timeSlot?.endTime}\n`;
                message += `🔬 ${apt.sampleType}\n`;
                message += `📋 Estado: ${statusText}\n`;
                message += `💰 $${apt.totalAmount.toLocaleString('es-CO')} COP\n`;
                message += `📊 ID: ${apt.id.substring(0, 8).toUpperCase()}\n\n`;
            }
        }
        
        // Show recent completed appointments
        if (completedAppointments.length > 0) {
            message += '✅ **CITAS COMPLETADAS (últimas 3):**\n\n';
            
            const recentCompleted = completedAppointments.slice(0, 3);
            for (const apt of recentCompleted) {
                const appointmentDate = apt.appointmentDate.toLocaleDateString('es-CO', {
                    month: 'short',
                    day: 'numeric'
                });
                
                message += `• ${appointmentDate} - ${apt.sampleType}\n`;
            }
            message += '\n';
        }
        
        // Show statistics
        const stats = await customerService.getCustomerStats(customerId);
        message += `📊 **RESUMEN:**\n`;
        message += `• Total citas: ${stats.totalAppointments}\n`;
        message += `• Completadas: ${stats.completedAppointments}\n`;
        message += `• Pendientes: ${stats.pendingAppointments}\n`;
        
        if (stats.isFrequentCustomer) {
            message += `⭐ Cliente frecuente\n`;
        }
        
        await flowDynamic(message);
        
        // Show action options if there are pending appointments
        if (pendingAppointments.length > 0) {
            await utils.delay(1500);
            await flowDynamic([
                '🔧 **¿Qué te gustaría hacer?**',
                '',
                '1️⃣ Ver detalles de una cita',
                '2️⃣ Cancelar cita',
                '3️⃣ Reprogramar cita',
                '4️⃣ Agendar nueva cita',
                '5️⃣ No hacer nada por ahora',
                '',
                '📝 Responde con el número de tu opción:'
            ].join('\n'));
            
            await state.update({ 
                step: 'appointment_actions',
                pendingAppointments: JSON.stringify(pendingAppointments)
            });
        }
        
    } catch (error) {
        console.error('❌ Error consultando citas:', error);
        await flowDynamic('❌ Hubo un problema consultando tus citas. Por favor intenta de nuevo.');
    }
})
.addAction(
    { capture: true },
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
        try {
            const step = state.get('step');
            const userInput = ctx.body.trim();
            
            if (step === 'schedule_suggestion') {
                if (userInput.toLowerCase().includes('sí') || userInput.toLowerCase().includes('si')) {
                    return gotoFlow(scheduleFlow);
                } else {
                    await flowDynamic('👍 Perfecto. Si necesitas algo más, simplemente escríbeme. ¡Estoy aquí para ayudarte!');
                    await state.clear();
                }
                return;
            }
            
            if (step === 'appointment_actions') {
                const option = parseInt(userInput);
                const pendingAppointments = JSON.parse(state.get('pendingAppointments') || '[]');
                
                switch (option) {
                    case 1:
                        return await handleAppointmentDetails(pendingAppointments, { flowDynamic, state });
                    case 2:
                        return gotoFlow(cancelAppointmentFlow);
                    case 3:
                        return gotoFlow(rescheduleAppointmentFlow);
                    case 4:
                        return gotoFlow(scheduleFlow);
                    case 5:
                        await flowDynamic('👍 Perfecto. ¡Que tengas un buen día!');
                        await state.clear();
                        return;
                    default:
                        await flowDynamic([
                            '❌ **Opción no válida**',
                            '',
                            'Por favor responde con un número del 1 al 5.',
                            '',
                            '📝 ¿Qué opción eliges?'
                        ].join('\n'));
                        return fallBack();
                }
            }
            
        } catch (error) {
            console.error('❌ Error procesando acción:', error);
            await flowDynamic('❌ Hubo un problema procesando tu solicitud. ¿Podrías intentar de nuevo?');
            return fallBack();
        }
    }
);

/**
 * Modify appointment flow - Entry point for cancellations and rescheduling
 */
export const modifyAppointmentFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>([
    'cancelar',
    'reprogramar',
    'cambiar cita',
    'modificar cita'
])
.addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    try {
        // Get customer and check for pending appointments
        let customerId = state.get('customerId');
        if (!customerId) {
            const customer = await customerService.findOrCreateFromWhatsApp(ctx.from, ctx.pushName);
            customerId = customer.id;
            await state.update({ customerId, customerName: customer.name });
        }
        
        const appointments = await appointmentRepository.getCustomerAppointments(customerId, {
            status: ['scheduled', 'confirmed'],
            limit: 5
        });
        
        if (appointments.length === 0) {
            await flowDynamic([
                '📅 **No tienes citas activas para modificar**',
                '',
                '¿Te gustaría agendar una nueva cita?',
                '',
                'Responde "sí" para agendar o "no" si necesitas algo más.'
            ].join('\n'));
            
            await state.update({ step: 'schedule_suggestion' });
            return;
        }
        
        await flowDynamic([
            '🔧 **¿Qué te gustaría hacer?**',
            '',
            '1️⃣ Cancelar cita',
            '2️⃣ Reprogramar cita',
            '',
            '📝 Responde con el número de tu opción:'
        ].join('\n'));
        
        await state.update({ 
            step: 'modify_action',
            appointments: JSON.stringify(appointments)
        });
        
    } catch (error) {
        console.error('❌ Error en modificación de citas:', error);
        await flowDynamic('❌ Hubo un problema. Por favor intenta de nuevo.');
    }
})
.addAction(
    { capture: true },
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
        const step = state.get('step');
        const userInput = ctx.body.trim();
        
        if (step === 'schedule_suggestion') {
            if (userInput.toLowerCase().includes('sí') || userInput.toLowerCase().includes('si')) {
                return gotoFlow(scheduleFlow);
            } else {
                await flowDynamic('👍 Perfecto. ¡Que tengas un buen día!');
                await state.clear();
            }
            return;
        }
        
        if (step === 'modify_action') {
            const option = parseInt(userInput);
            
            switch (option) {
                case 1:
                    return gotoFlow(cancelAppointmentFlow);
                case 2:
                    return gotoFlow(rescheduleAppointmentFlow);
                default:
                    await flowDynamic([
                        '❌ **Opción no válida**',
                        '',
                        'Por favor responde:',
                        '1 para cancelar',
                        '2 para reprogramar',
                        '',
                        '📝 ¿Qué eliges?'
                    ].join('\n'));
                    return fallBack();
            }
        }
    }
);

/**
 * Cancel appointment flow - Handles appointment cancellations
 */
export const cancelAppointmentFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>(EVENTS.ACTION)
.addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    try {
        const customerId = state.get('customerId');
        const appointments = await appointmentRepository.getCustomerAppointments(customerId, {
            status: ['scheduled', 'confirmed'],
            limit: 5
        });
        
        if (appointments.length === 0) {
            await flowDynamic('📅 No tienes citas activas para cancelar.');
            return;
        }
        
        if (appointments.length === 1) {
            // Only one appointment, show details and ask for confirmation
            const apt = appointments[0];
            const timeSlot = await appointmentRepository.findTimeSlotById(apt.timeSlotId);
            const appointmentDate = apt.appointmentDate.toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            await flowDynamic([
                '❌ **CANCELAR CITA**',
                '',
                `📅 **Fecha:** ${appointmentDate}`,
                `🕐 **Hora:** ${timeSlot?.startTime} - ${timeSlot?.endTime}`,
                `🔬 **Tipo:** ${apt.sampleType}`,
                `📋 **ID:** ${apt.id.substring(0, 8).toUpperCase()}`,
                '',
                '⚠️ **¿Estás seguro de que quieres cancelar esta cita?**',
                '',
                'Responde:',
                '• "sí" para cancelar',
                '• "no" para mantener la cita'
            ].join('\n'));
            
            await state.update({ 
                step: 'cancel_confirmation',
                appointmentToCancel: JSON.stringify(apt)
            });
            
        } else {
            // Multiple appointments, let user choose
            let message = '❌ **¿Qué cita quieres cancelar?**\n\n';
            
            appointments.forEach((apt, index) => {
                const appointmentDate = apt.appointmentDate.toLocaleDateString('es-CO', {
                    month: 'short',
                    day: 'numeric'
                });
                message += `${index + 1}️⃣ ${appointmentDate} - ${apt.sampleType}\n`;
            });
            
            message += '\n📝 Responde con el número de la cita a cancelar:';
            
            await flowDynamic(message);
            await state.update({ 
                step: 'select_appointment',
                appointments: JSON.stringify(appointments)
            });
        }
        
    } catch (error) {
        console.error('❌ Error en cancelación:', error);
        await flowDynamic('❌ Hubo un problema. Por favor intenta de nuevo.');
    }
})
.addAction(
    { capture: true },
    async (ctx, { flowDynamic, state, fallBack }) => {
        try {
            const step = state.get('step');
            const userInput = ctx.body.trim().toLowerCase();
            
            if (step === 'cancel_confirmation') {
                if (userInput.includes('sí') || userInput.includes('si')) {
                    const appointment = JSON.parse(state.get('appointmentToCancel'));
                    
                    // Check cancellation policy (2 hours before)
                    const now = new Date();
                    const appointmentDateTime = new Date(appointment.appointmentDate);
                    const timeSlot = await appointmentRepository.findTimeSlotById(appointment.timeSlotId);
                    
                    // Set appointment time
                    const [hours, minutes] = timeSlot.startTime.split(':');
                    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));
                    
                    const hoursUntilAppt = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                    
                    if (hoursUntilAppt < BUSINESS_RULES.CANCELLATION_HOURS) {
                        await flowDynamic([
                            '⏰ **Cancelación tardía**',
                            '',
                            `Solo quedan ${Math.round(hoursUntilAppt * 60)} minutos para tu cita.`,
                            `Nuestra política requiere ${BUSINESS_RULES.CANCELLATION_HOURS} horas de anticipación.`,
                            '',
                            '¿Aún deseas cancelar? (Puede aplicar una penalización)',
                            '',
                            'Responde "confirmar cancelación" para continuar.'
                        ].join('\n'));
                        
                        await state.update({ step: 'late_cancel_confirmation' });
                        return;
                    }
                    
                    // Cancel appointment
                    await appointmentRepository.updateStatus(appointment.id, AppointmentStatus.CANCELLED);
                    const customer = await customerService.findById(state.get('customerId'));
                    await notificationService.sendAppointmentCancellation(appointment, customer);
                    
                    await flowDynamic([
                        '✅ **CITA CANCELADA EXITOSAMENTE**',
                        '',
                        'Tu cita ha sido cancelada y el horario queda disponible para otros clientes.',
                        '',
                        '📅 **¿Te gustaría reprogramar para otra fecha?**',
                        '',
                        'Responde "sí" para agendar nueva cita.'
                    ].join('\n'));
                    
                    await state.update({ step: 'reschedule_suggestion' });
                    
                } else {
                    await flowDynamic('👍 Perfecto. Tu cita se mantiene programada. ¡Nos vemos pronto!');
                    await state.clear();
                }
                
            } else if (step === 'late_cancel_confirmation') {
                if (userInput.includes('confirmar cancelación')) {
                    const appointment = JSON.parse(state.get('appointmentToCancel'));
                    
                    await appointmentRepository.updateStatus(appointment.id, AppointmentStatus.CANCELLED);
                    const customer = await customerService.findById(state.get('customerId'));
                    await notificationService.sendAppointmentCancellation(
                        appointment, 
                        customer, 
                        'Cancelación tardía'
                    );
                    
                    await flowDynamic([
                        '✅ **CITA CANCELADA**',
                        '',
                        '⚠️ **Nota:** Debido a la cancelación tardía, podrías tener restricciones para futuras citas.',
                        '',
                        'Gracias por informarnos.'
                    ].join('\n'));
                    
                    await state.clear();
                } else {
                    await flowDynamic('👍 Tu cita se mantiene programada. ¡Te esperamos!');
                    await state.clear();
                }
                
            } else if (step === 'reschedule_suggestion') {
                if (userInput.includes('sí') || userInput.includes('si')) {
                    await state.clear();
                    await flowDynamic('📝 Te ayudo a agendar una nueva cita...');
                    // Note: Would redirect to schedule flow in complete implementation
                    return fallBack('Por favor escribe "agendar cita" para empezar el proceso.');
                } else {
                    await flowDynamic('👍 Perfecto. ¡Que tengas un buen día!');
                    await state.clear();
                }
            }
            
        } catch (error) {
            console.error('❌ Error en confirmación de cancelación:', error);
            await flowDynamic('❌ Hubo un problema procesando la cancelación. Por favor intenta de nuevo.');
            return fallBack();
        }
    }
);

/**
 * Reschedule appointment flow - Handles appointment rescheduling
 */
export const rescheduleAppointmentFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>(EVENTS.ACTION)
.addAction(async (ctx, { flowDynamic, state }) => {
    await flowDynamic([
        '🔄 **REPROGRAMAR CITA**',
        '',
        'Esta función te permitirá cambiar la fecha y hora de tu cita actual.',
        '',
        '⏳ Preparando opciones de reprogramación...'
    ].join('\n'));
    
    // Implementation would be similar to scheduleFlow but for existing appointments
    // For now, direct to customer service
    await utils.delay(2000);
    
    await flowDynamic([
        '🚧 **Función en desarrollo**',
        '',
        'Para reprogramar tu cita, por favor contacta directamente:',
        '',
        '📞 **Opciones:**',
        '• Responde con "cancelar cita" y luego "agendar nueva"',
        '• Contacta por teléfono para cambios urgentes',
        '',
        '¡Disculpa las molestias!'
    ].join('\n'));
    
    await state.clear();
});

// Helper functions

async function handleAppointmentDetails(appointments: any[], { flowDynamic, state }: any) {
    if (appointments.length === 1) {
        const apt = appointments[0];
        const timeSlot = await appointmentRepository.findTimeSlotById(apt.timeSlotId);
        const appointmentDate = apt.appointmentDate.toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const details = [
            '📋 **DETALLES DE TU CITA**',
            '',
            `📅 **Fecha:** ${appointmentDate}`,
            `🕐 **Hora:** ${timeSlot?.startTime} - ${timeSlot?.endTime}`,
            `🔬 **Tipo de muestra:** ${apt.sampleType}`,
            `💰 **Valor:** $${apt.totalAmount.toLocaleString('es-CO')} COP`,
            `📋 **Estado:** ${apt.status === 'confirmed' ? 'Confirmada ✅' : 'Programada ⏳'}`,
            `📊 **ID de cita:** ${apt.id.substring(0, 8).toUpperCase()}`,
            '',
            apt.specialInstructions ? `📝 **Instrucciones:** ${apt.specialInstructions}` : '',
            '',
            '⏰ **Recuerda:**',
            '• Estar en casa en el horario acordado',
            '• Tener lista tu orden médica',
            '• Seguir las instrucciones de preparación'
        ].filter(line => line !== '').join('\n');
        
        await flowDynamic(details);
        
    } else {
        let message = '📋 **Elige la cita para ver detalles:**\n\n';
        
        appointments.forEach((apt, index) => {
            const appointmentDate = apt.appointmentDate.toLocaleDateString('es-CO', {
                month: 'short',
                day: 'numeric'
            });
            message += `${index + 1}️⃣ ${appointmentDate} - ${apt.sampleType}\n`;
        });
        
        message += '\n📝 Responde con el número:';
        
        await flowDynamic(message);
        await state.update({ step: 'appointment_detail_selection' });
    }
}

// Import scheduleFlow to avoid circular dependency issues
let scheduleFlow: any;
export function setScheduleFlow(flow: any) {
    scheduleFlow = flow;
}
