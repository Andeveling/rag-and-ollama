import { addKeyword, EVENTS, utils } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { PostgreSQLAdapter } from '@builderbot/database-postgres';
import { availabilityService } from '../services/availability.service.js';
import { customerService } from '../services/customer.service.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { notificationService } from '../services/notification.service.js';
import { SAMPLE_TYPES, CreateAppointmentDto, BUSINESS_RULES } from '../models/appointment.model.js';

/**
 * Schedule appointment flow - Handles new appointment booking
 */
export const scheduleFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>([
    'agendar',
    'nueva cita',
    'quiero agendar',
    'agenda',
    'reservar',
    'cita nueva'
])
.addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    try {
        console.log(`📝 Iniciando proceso de agendamiento: ${ctx.from}`);
        
        // Get customer from state or create if needed
        let customerId = state.get('customerId');
        if (!customerId) {
            const customer = await customerService.findOrCreateFromWhatsApp(ctx.from, ctx.pushName);
            customerId = customer.id;
            await state.update({ customerId, customerName: customer.name });
        }
        
        const customer = await customerService.findById(customerId);
        if (!customer) {
            await flowDynamic('❌ Hubo un problema accediendo a tu información. Por favor intenta de nuevo más tarde.');
            return;
        }
        
        // Check if customer has pending appointments (limit check)
        const pendingCount = await customerService.hasPendingAppointments(customerId);
        if (pendingCount) {
            await flowDynamic([
                '⚠️ **Tienes una cita pendiente**',
                '',
                'Solo puedes tener una cita activa a la vez.',
                '',
                'Opciones disponibles:',
                '• Ver mi cita actual: escribe "ver citas"',
                '• Cancelar cita actual: escribe "cancelar cita"',
                '• Reprogramar: escribe "reprogramar"'
            ].join('\n'));
            return;
        }
        
        await flowDynamic([
            '📝 **¡Perfecto! Agendemos tu cita**',
            '',
            'Te ayudo a programar tu análisis clínico a domicilio.',
            '',
            '💰 **Precio:** $20,000 COP',
            '🕐 **Horario:** 5:30 AM - 6:30 AM',
            '📍 **Área:** Perímetro urbano de Buga',
            '',
            'Empecemos... 👇'
        ].join('\n'));
        
        await utils.delay(1500);
        
        // Check if customer has valid address
        if (!customer.address || customer.address.trim() === '') {
            await flowDynamic([
                '📍 **Necesito tu dirección completa**',
                '',
                'Para brindarte el servicio a domicilio, proporciona:',
                '',
                '• **Barrio** (ej: Centro, La Merced)',
                '• **Dirección** (ej: Carrera 5 #10-25)',
                '• **Punto de referencia** (opcional)',
                '',
                '🏠 **Ejemplo:** "Barrio Centro, Carrera 5 #10-25, frente al parque principal"',
                '',
                '📝 Escribe tu dirección completa:'
            ].join('\n'));
            
            // Go to address collection flow
            return gotoFlow(addressCollectionFlow);
        }
        
        // Show available dates
        await flowDynamic('📅 Consultando disponibilidad...');
        await utils.delay(1000);
        
        const availabilityText = await availabilityService.getAvailabilitySummary(7);
        await flowDynamic(availabilityText);
        
        await utils.delay(1000);
        await flowDynamic([
            '📅 **¿Para qué fecha te gustaría agendar?**',
            '',
            'Puedes escribir:',
            '• "hoy" o "mañana"',
            '• Una fecha específica (ej: "15 de enero")',
            '• "el lunes" o "el martes", etc.',
            '',
            '📝 ¿Qué fecha prefieres?'
        ].join('\n'));
        
        await state.update({ step: 'date_selection' });
        
    } catch (error) {
        console.error('❌ Error iniciando agendamiento:', error);
        await flowDynamic('❌ Hubo un problema iniciando el proceso de agendamiento. Por favor intenta de nuevo.');
    }
})
.addAction(
    { capture: true },
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
        try {
            const step = state.get('step');
            const userMessage = ctx.body.trim().toLowerCase();
            
            if (step === 'date_selection') {
                return await handleDateSelection(ctx, { flowDynamic, state, gotoFlow });
            } else if (step === 'time_selection') {
                return await handleTimeSelection(ctx, { flowDynamic, state, gotoFlow });
            } else if (step === 'sample_type') {
                return await handleSampleTypeSelection(ctx, { flowDynamic, state, gotoFlow });
            } else if (step === 'confirmation') {
                return await handleBookingConfirmation(ctx, { flowDynamic, state, gotoFlow });
            }
            
            // Default fallback
            await flowDynamic('🤔 No estoy seguro en qué paso estamos. Empecemos de nuevo.');
            return gotoFlow(scheduleFlow);
            
        } catch (error) {
            console.error('❌ Error en proceso de agendamiento:', error);
            await flowDynamic('❌ Hubo un problema. ¿Podrías intentar de nuevo?');
            return fallBack();
        }
    }
);

/**
 * Address collection flow - Collects and validates customer address
 */
export const addressCollectionFlow = addKeyword<BaileysProvider, PostgreSQLAdapter>(EVENTS.ACTION)
.addAction(
    { capture: true },
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
        try {
            const customerId = state.get('customerId');
            const address = ctx.body.trim();
            
            if (address.length < 10) {
                await flowDynamic([
                    '⚠️ **La dirección parece muy corta**',
                    '',
                    'Por favor proporciona una dirección más completa:',
                    '• Barrio',
                    '• Carrera/Calle y número',
                    '• Punto de referencia (opcional)',
                    '',
                    '📝 Intenta de nuevo:'
                ].join('\n'));
                return fallBack();
            }
            
            // Validate Buga address using customer service
            try {
                await customerService.updateCustomer(customerId, { address });
                
                await flowDynamic([
                    '✅ **Dirección validada correctamente**',
                    '',
                    `📍 **Tu dirección:** ${address}`,
                    '',
                    '🎯 ¡Continuemos con tu cita!'
                ].join('\n'));
                
                await utils.delay(1500);
                
                // Continue with scheduling
                return gotoFlow(scheduleFlow);
                
            } catch (validationError) {
                console.error('❌ Error validando dirección:', validationError);
                
                await flowDynamic([
                    '❌ **Problema con la dirección**',
                    '',
                    validationError.message || 'La dirección no es válida para nuestro servicio.',
                    '',
                    'Solo atendemos en el **perímetro urbano de Buga**.',
                    '',
                    '📝 ¿Podrías proporcionar una dirección dentro de Buga?'
                ].join('\n'));
                
                return fallBack();
            }
            
        } catch (error) {
            console.error('❌ Error recopilando dirección:', error);
            await flowDynamic('❌ Hubo un problema validando tu dirección. Por favor intenta de nuevo.');
            return fallBack();
        }
    }
);

// Helper functions for handling different steps

async function handleDateSelection(ctx: any, { flowDynamic, state, gotoFlow }: any) {
    const userMessage = ctx.body.trim().toLowerCase();
    let selectedDate: Date;
    
    try {
        // Parse date from user input
        selectedDate = parseDateInput(userMessage);
        
        if (!selectedDate) {
            await flowDynamic([
                '❌ **No pude entender la fecha**',
                '',
                'Por favor intenta con:',
                '• "hoy" o "mañana"',
                '• "15 de enero"',
                '• "el lunes próximo"',
                '',
                '📅 ¿Para qué fecha?'
            ].join('\n'));
            return;
        }
        
        // Validate date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            await flowDynamic('❌ No puedo agendar citas para fechas pasadas. ¿Qué tal mañana o una fecha futura?');
            return;
        }
        
        // Check availability for selected date
        const slots = await availabilityService.getAvailableSlots(selectedDate);
        
        if (slots.length === 0 || !slots.some(slot => slot.available)) {
            await flowDynamic([
                '😔 **No hay disponibilidad para esa fecha**',
                '',
                'Te sugiero estas alternativas:'
            ].join('\n'));
            
            await utils.delay(1000);
            const alternatives = await availabilityService.getAvailabilitySummary(5);
            await flowDynamic(alternatives);
            return;
        }
        
        // Show available time slots
        const availableSlots = slots.filter(slot => slot.available);
        let timeMessage = `✅ **Disponible para ${selectedDate.toLocaleDateString('es-CO')}**\n\n`;
        timeMessage += '🕐 **Horarios disponibles:**\n\n';
        
        availableSlots.forEach((slot, index) => {
            timeMessage += `${index + 1}️⃣ ${slot.timeSlot.startTime} - ${slot.timeSlot.endTime}\n`;
        });
        
        timeMessage += '\n📝 Responde con el número de tu horario preferido (1, 2, etc.):';
        
        await flowDynamic(timeMessage);
        
        await state.update({ 
            selectedDate: selectedDate.toISOString(),
            availableSlots: JSON.stringify(availableSlots),
            step: 'time_selection'
        });
        
    } catch (error) {
        console.error('❌ Error procesando fecha:', error);
        await flowDynamic('❌ Hubo un problema procesando la fecha. ¿Podrías intentar de nuevo?');
    }
}

async function handleTimeSelection(ctx: any, { flowDynamic, state, gotoFlow }: any) {
    const userInput = ctx.body.trim();
    const selectedIndex = parseInt(userInput) - 1;
    
    try {
        const availableSlots = JSON.parse(state.get('availableSlots'));
        
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= availableSlots.length) {
            await flowDynamic([
                '❌ **Opción inválida**',
                '',
                'Por favor responde con el número correspondiente al horario que prefieres.',
                '',
                '📝 ¿Qué horario eliges?'
            ].join('\n'));
            return;
        }
        
        const selectedSlot = availableSlots[selectedIndex];
        const selectedDate = new Date(state.get('selectedDate'));
        
        await state.update({
            selectedTimeSlot: JSON.stringify(selectedSlot),
            step: 'sample_type'
        });
        
        // Show sample types
        let sampleMessage = '🔬 **¿Qué tipo de análisis necesitas?**\n\n';
        
        SAMPLE_TYPES.forEach((sampleType, index) => {
            sampleMessage += `${index + 1}️⃣ ${sampleType}\n`;
        });
        
        sampleMessage += '\n📝 Responde con el número del tipo de muestra:';
        
        await flowDynamic(sampleMessage);
        
    } catch (error) {
        console.error('❌ Error procesando horario:', error);
        await flowDynamic('❌ Hubo un problema seleccionando el horario. ¿Podrías intentar de nuevo?');
    }
}

async function handleSampleTypeSelection(ctx: any, { flowDynamic, state, gotoFlow }: any) {
    const userInput = ctx.body.trim();
    const selectedIndex = parseInt(userInput) - 1;
    
    try {
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= SAMPLE_TYPES.length) {
            await flowDynamic([
                '❌ **Opción inválida**',
                '',
                'Por favor responde con el número correspondiente al tipo de análisis.',
                '',
                '📝 ¿Qué tipo de muestra necesitas?'
            ].join('\n'));
            return;
        }
        
        const selectedSampleType = SAMPLE_TYPES[selectedIndex];
        await state.update({ selectedSampleType, step: 'confirmation' });
        
        // Show booking summary
        const customerId = state.get('customerId');
        const customer = await customerService.findById(customerId);
        const selectedDate = new Date(state.get('selectedDate'));
        const selectedTimeSlot = JSON.parse(state.get('selectedTimeSlot'));
        
        const summaryMessage = [
            '📋 **RESUMEN DE TU CITA**',
            '',
            `👤 **Cliente:** ${customer.name}`,
            `📅 **Fecha:** ${selectedDate.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
            `🕐 **Hora:** ${selectedTimeSlot.timeSlot.startTime} - ${selectedTimeSlot.timeSlot.endTime}`,
            `📍 **Dirección:** ${customer.address}`,
            `🔬 **Tipo de muestra:** ${selectedSampleType}`,
            `💰 **Precio:** $${BUSINESS_RULES.BASE_PRICE.toLocaleString('es-CO')} COP`,
            '',
            '✅ **¿Confirmas estos datos?**',
            '',
            'Responde:',
            '• "sí" o "confirmar" para agendar',
            '• "no" o "cambiar" para modificar',
            '• "cancelar" para salir'
        ].join('\n');
        
        await flowDynamic(summaryMessage);
        
    } catch (error) {
        console.error('❌ Error procesando tipo de muestra:', error);
        await flowDynamic('❌ Hubo un problema. ¿Podrías intentar de nuevo?');
    }
}

async function handleBookingConfirmation(ctx: any, { flowDynamic, state, gotoFlow }: any) {
    const userResponse = ctx.body.trim().toLowerCase();
    
    if (userResponse.includes('sí') || userResponse.includes('si') || 
        userResponse.includes('confirmar') || userResponse.includes('acepto')) {
        
        try {
            // Create appointment
            const customerId = state.get('customerId');
            const selectedDate = new Date(state.get('selectedDate'));
            const selectedTimeSlot = JSON.parse(state.get('selectedTimeSlot'));
            const selectedSampleType = state.get('selectedSampleType');
            
            const appointmentData: CreateAppointmentDto = {
                customerId,
                appointmentDate: selectedDate.toISOString().split('T')[0],
                timeSlotId: selectedTimeSlot.timeSlot.id,
                sampleType: selectedSampleType
            };
            
            const appointment = await appointmentRepository.create(appointmentData);
            const customer = await customerService.findById(customerId);
            
            // Send confirmation
            await notificationService.sendAppointmentConfirmation(appointment, customer);
            
            await flowDynamic([
                '🎉 **¡CITA AGENDADA EXITOSAMENTE!**',
                '',
                `📋 **Número de cita:** ${appointment.id.substring(0, 8).toUpperCase()}`,
                '',
                '✅ **Tu cita ha sido confirmada**',
                '',
                '📱 **¿Qué sigue?**',
                '• Recibirás un recordatorio el día anterior',
                '• Ten lista tu orden médica',
                '• Asegúrate de estar en casa en el horario acordado',
                '',
                '📞 **Para cancelar o reprogramar:**',
                'Contacta con mínimo 2 horas de anticipación.',
                '',
                '¡Gracias por confiar en nosotros! 🙏'
            ].join('\n'));
            
            // Clear state
            await state.clear();
            
        } catch (error) {
            console.error('❌ Error creando cita:', error);
            await flowDynamic('❌ Hubo un problema agendando tu cita. Por favor intenta de nuevo o contacta directamente.');
        }
        
    } else if (userResponse.includes('no') || userResponse.includes('cambiar') || 
               userResponse.includes('modificar')) {
        
        await flowDynamic([
            '🔄 **¿Qué te gustaría cambiar?**',
            '',
            '1️⃣ Fecha',
            '2️⃣ Horario',
            '3️⃣ Tipo de muestra',
            '4️⃣ Dirección',
            '',
            '📝 Responde con el número de lo que quieres modificar:'
        ].join('\n'));
        
        await state.update({ step: 'modification' });
        
    } else if (userResponse.includes('cancelar')) {
        
        await flowDynamic([
            '❌ **Proceso de agendamiento cancelado**',
            '',
            'Si cambias de opinión, simplemente escribe:',
            '• "agendar cita" para empezar de nuevo',
            '• "ayuda" para ver otras opciones',
            '',
            '¡Estoy aquí cuando me necesites! 😊'
        ].join('\n'));
        
        await state.clear();
        
    } else {
        
        await flowDynamic([
            '🤔 **No estoy seguro de tu respuesta**',
            '',
            'Por favor responde:',
            '• "sí" para confirmar la cita',
            '• "no" para hacer cambios',
            '• "cancelar" para salir',
            '',
            '📝 ¿Qué decides?'
        ].join('\n'));
    }
}

// Helper function to parse date input
function parseDateInput(input: string): Date | null {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (input.includes('hoy')) {
        return today;
    }
    
    if (input.includes('mañana')) {
        return tomorrow;
    }
    
    // Handle day names
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    for (let i = 0; i < dayNames.length; i++) {
        if (input.includes(dayNames[i])) {
            const targetDate = new Date(today);
            const currentDay = today.getDay();
            const targetDay = i;
            const daysToAdd = targetDay >= currentDay ? targetDay - currentDay : 7 - currentDay + targetDay;
            targetDate.setDate(today.getDate() + daysToAdd);
            return targetDate;
        }
    }
    
    // Try to parse specific dates (basic implementation)
    const dateRegex = /(\d{1,2})\s*de\s*(\w+)/i;
    const match = input.match(dateRegex);
    
    if (match) {
        const day = parseInt(match[1]);
        const monthName = match[2].toLowerCase();
        
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                           'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        
        const monthIndex = monthNames.indexOf(monthName);
        
        if (monthIndex !== -1 && day >= 1 && day <= 31) {
            const targetDate = new Date(today.getFullYear(), monthIndex, day);
            
            // If the date is in the past, assume next year
            if (targetDate < today) {
                targetDate.setFullYear(today.getFullYear() + 1);
            }
            
            return targetDate;
        }
    }
    
    return null;
}
