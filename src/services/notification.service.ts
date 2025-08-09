<<<<<<< HEAD
<file upload>
=======
import { availabilityService } from './availability.service.js';
import { customerService } from './customer.service.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { 
  Appointment, 
  Customer, 
  AppointmentStatus, 
  BUSINESS_RULES 
} from '../models/appointment.model.js';

/**
 * Notification service for appointment confirmations and reminders
 * Handles automated WhatsApp notifications and appointment confirmations
 */
export class NotificationService {
  
  /**
   * Send appointment confirmation message
   */
  async sendAppointmentConfirmation(appointment: Appointment, customer: Customer): Promise<boolean> {
    try {
      console.log(`📤 Enviando confirmación de cita: ${appointment.id}`);
      
      const confirmationMessage = await this.generateConfirmationMessage(appointment, customer);
      
      // In a real implementation, this would integrate with WhatsApp API
      // For now, we'll log the message and return success
      console.log(`WhatsApp Message to ${customer.phoneNumber}:`);
      console.log(confirmationMessage);
      
      // TODO: Integrate with WhatsApp Business API or BuilderBot
      // await this.sendWhatsAppMessage(customer.phoneNumber, confirmationMessage);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error enviando confirmación de cita:', error);
      return false;
    }
  }

  /**
   * Send appointment reminder message
   */
  async sendAppointmentReminder(appointment: Appointment, customer: Customer): Promise<boolean> {
    try {
      console.log(`⏰ Enviando recordatorio de cita: ${appointment.id}`);
      
      const reminderMessage = await this.generateReminderMessage(appointment, customer);
      
      console.log(`WhatsApp Reminder to ${customer.phoneNumber}:`);
      console.log(reminderMessage);
      
      // TODO: Integrate with WhatsApp API
      // await this.sendWhatsAppMessage(customer.phoneNumber, reminderMessage);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error enviando recordatorio de cita:', error);
      return false;
    }
  }

  /**
   * Send appointment cancellation message
   */
  async sendAppointmentCancellation(appointment: Appointment, customer: Customer, reason?: string): Promise<boolean> {
    try {
      console.log(`❌ Enviando notificación de cancelación: ${appointment.id}`);
      
      const cancellationMessage = await this.generateCancellationMessage(appointment, customer, reason);
      
      console.log(`WhatsApp Cancellation to ${customer.phoneNumber}:`);
      console.log(cancellationMessage);
      
      // TODO: Integrate with WhatsApp API
      // await this.sendWhatsAppMessage(customer.phoneNumber, cancellationMessage);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error enviando notificación de cancelación:', error);
      return false;
    }
  }

  /**
   * Send appointment rescheduling message
   */
  async sendAppointmentReschedule(
    oldAppointment: Appointment, 
    newAppointment: Appointment, 
    customer: Customer
  ): Promise<boolean> {
    try {
      console.log(`🔄 Enviando notificación de reagendamiento: ${oldAppointment.id} -> ${newAppointment.id}`);
      
      const rescheduleMessage = await this.generateRescheduleMessage(oldAppointment, newAppointment, customer);
      
      console.log(`WhatsApp Reschedule to ${customer.phoneNumber}:`);
      console.log(rescheduleMessage);
      
      // TODO: Integrate with WhatsApp API
      // await this.sendWhatsAppMessage(customer.phoneNumber, rescheduleMessage);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error enviando notificación de reagendamiento:', error);
      return false;
    }
  }

  /**
   * Send daily reminders for tomorrow's appointments
   */
  async sendDailyReminders(): Promise<void> {
    try {
      console.log('📅 Enviando recordatorios diarios...');
      
      // Get tomorrow's appointments
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const appointments = await appointmentRepository.findAppointments({
        status: AppointmentStatus.CONFIRMED,
        dateFrom: tomorrow,
        dateTo: tomorrow
      });
      
      console.log(`Encontradas ${appointments.length} citas para mañana`);
      
      for (const appointment of appointments) {
        const customer = await customerService.findById(appointment.customerId);
        
        if (customer) {
          await this.sendAppointmentReminder(appointment, customer);
          
          // Small delay between messages to avoid spam detection
          await this.delay(1000);
        }
      }
      
      console.log('✅ Recordatorios diarios enviados');
      
    } catch (error) {
      console.error('❌ Error enviando recordatorios diarios:', error);
    }
  }

  /**
   * Send preparation instructions for tomorrow's appointments
   */
  async sendPreparationInstructions(): Promise<void> {
    try {
      console.log('📋 Enviando instrucciones de preparación...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const appointments = await appointmentRepository.findAppointments({
        status: AppointmentStatus.CONFIRMED,
        dateFrom: tomorrow,
        dateTo: tomorrow
      });
      
      for (const appointment of appointments) {
        const customer = await customerService.findById(appointment.customerId);
        
        if (customer) {
          const instructionMessage = this.generatePreparationInstructions(appointment, customer);
          
          console.log(`WhatsApp Instructions to ${customer.phoneNumber}:`);
          console.log(instructionMessage);
          
          // TODO: Integrate with WhatsApp API
          // await this.sendWhatsAppMessage(customer.phoneNumber, instructionMessage);
          
          await this.delay(1000);
        }
      }
      
      console.log('✅ Instrucciones de preparación enviadas');
      
    } catch (error) {
      console.error('❌ Error enviando instrucciones de preparación:', error);
    }
  }

  /**
   * Generate appointment confirmation message
   */
  private async generateConfirmationMessage(appointment: Appointment, customer: Customer): Promise<string> {
    const timeSlot = await appointmentRepository.findTimeSlotById(appointment.timeSlotId);
    const appointmentDate = appointment.appointmentDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
  let message = `🧪 **CITA CONFIRMADA - Marcela Salazar**\n\n`;
    message += `Hola ${customer.name},\n\n`;
    message += `✅ Tu cita ha sido confirmada exitosamente:\n\n`;
    message += `📅 **Fecha:** ${appointmentDate}\n`;
    message += `🕐 **Hora:** ${timeSlot?.startTime} - ${timeSlot?.endTime}\n`;
    message += `📍 **Dirección:** ${customer.address}\n`;
    message += `🔬 **Tipo de muestra:** ${appointment.sampleType}\n`;
    message += `💰 **Valor:** $${appointment.totalAmount.toLocaleString('es-CO')} COP\n\n`;
    
    if (appointment.specialInstructions) {
      message += `📋 **Instrucciones especiales:**\n${appointment.specialInstructions}\n\n`;
    }
    
    message += `⏰ **Recuerda:**\n`;
    message += `• Nuestro técnico llegará puntualmente a tu domicilio\n`;
    message += `• Ten lista tu orden médica\n`;
    message += `• Asegúrate de estar en casa en el horario acordado\n\n`;
    
    message += `📞 Si necesitas cancelar o reprogramar, hazlo con mínimo 2 horas de anticipación.\n\n`;
    message += `¡Gracias por confiar en nosotros! 🙏`;
    
    return message;
  }

  /**
   * Generate appointment reminder message
   */
  private async generateReminderMessage(appointment: Appointment, customer: Customer): Promise<string> {
    const timeSlot = await appointmentRepository.findTimeSlotById(appointment.timeSlotId);
    const appointmentDate = appointment.appointmentDate;
    const isToday = appointmentDate.toDateString() === new Date().toDateString();
    const timeText = isToday ? 'hoy' : 'mañana';
    
  let message = `⏰ **RECORDATORIO DE CITA - Marcela Salazar**\n\n`;
    message += `Hola ${customer.name},\n\n`;
    message += `Te recordamos que tienes una cita programada para ${timeText}:\n\n`;
    message += `🕐 **Hora:** ${timeSlot?.startTime} - ${timeSlot?.endTime}\n`;
    message += `📍 **Dirección:** ${customer.address}\n`;
    message += `🔬 **Tipo de muestra:** ${appointment.sampleType}\n\n`;
    
    if (isToday) {
      message += `🚨 **¡Tu cita es HOY!**\n`;
      message += `Por favor asegúrate de:\n`;
      message += `• Estar en casa en el horario acordado\n`;
      message += `• Tener lista tu orden médica\n`;
      message += `• Cumplir con las instrucciones de preparación\n\n`;
    } else {
      message += `📋 **Preparación para mañana:**\n`;
      message += `• Ten lista tu orden médica\n`;
      message += `• Asegúrate de seguir las instrucciones de tu doctor\n`;
      message += `• Confirma que estarás en casa en el horario acordado\n\n`;
    }
    
    message += `📞 Para cancelaciones o reprogramaciones, contáctanos con mínimo 2 horas de anticipación.\n\n`;
    message += `¡Nos vemos ${timeText}! 👩‍⚕️👨‍⚕️`;
    
    return message;
  }

  /**
   * Generate appointment cancellation message
   */
  private async generateCancellationMessage(
    appointment: Appointment, 
    customer: Customer, 
    reason?: string
  ): Promise<string> {
    const timeSlot = await appointmentRepository.findTimeSlotById(appointment.timeSlotId);
    const appointmentDate = appointment.appointmentDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
  let message = `❌ **CITA CANCELADA - Marcela Salazar**\n\n`;
    message += `Hola ${customer.name},\n\n`;
    message += `Tu cita ha sido cancelada:\n\n`;
    message += `📅 **Fecha:** ${appointmentDate}\n`;
    message += `🕐 **Hora:** ${timeSlot?.startTime} - ${timeSlot?.endTime}\n`;
    message += `📍 **Dirección:** ${customer.address}\n\n`;
    
    if (reason) {
      message += `**Motivo:** ${reason}\n\n`;
    }
    
    message += `¿Deseas reprogramar tu cita? Simplemente responde a este mensaje y te ayudaremos a encontrar una nueva fecha disponible.\n\n`;
    message += `📞 También puedes contactarnos directamente.\n\n`;
    message += `¡Esperamos poder atenderte pronto! 🙏`;
    
    return message;
  }

  /**
   * Generate appointment rescheduling message
   */
  private async generateRescheduleMessage(
    oldAppointment: Appointment, 
    newAppointment: Appointment, 
    customer: Customer
  ): Promise<string> {
    const oldTimeSlot = await appointmentRepository.findTimeSlotById(oldAppointment.timeSlotId);
    const newTimeSlot = await appointmentRepository.findTimeSlotById(newAppointment.timeSlotId);
    
    const oldDate = oldAppointment.appointmentDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    const newDate = newAppointment.appointmentDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
  let message = `🔄 **CITA REAGENDADA - Marcela Salazar**\n\n`;
    message += `Hola ${customer.name},\n\n`;
    message += `Tu cita ha sido reagendada exitosamente:\n\n`;
    message += `❌ **Fecha anterior:** ${oldDate} a las ${oldTimeSlot?.startTime}\n`;
    message += `✅ **Nueva fecha:** ${newDate} a las ${newTimeSlot?.startTime}\n\n`;
    message += `📍 **Dirección:** ${customer.address}\n`;
    message += `🔬 **Tipo de muestra:** ${newAppointment.sampleType}\n`;
    message += `💰 **Valor:** $${newAppointment.totalAmount.toLocaleString('es-CO')} COP\n\n`;
    
    message += `⏰ **Recuerda:**\n`;
    message += `• Estar en casa en el nuevo horario acordado\n`;
    message += `• Tener lista tu orden médica\n`;
    message += `• Seguir las instrucciones de preparación\n\n`;
    
    message += `¡Gracias por tu comprensión! 🙏`;
    
    return message;
  }

  /**
   * Generate preparation instructions message
   */
  private generatePreparationInstructions(appointment: Appointment, customer: Customer): string {
  let message = `📋 **INSTRUCCIONES DE PREPARACIÓN - Marcela Salazar**\n\n`;
    message += `Hola ${customer.name},\n\n`;
    message += `Para tu cita de mañana, recuerda seguir estas instrucciones:\n\n`;
    
    // General instructions
    message += `🔬 **Instrucciones generales:**\n`;
    message += `• Ten lista tu orden médica original\n`;
    message += `• Mantén un documento de identidad a mano\n`;
    message += `• Asegúrate de estar en casa en el horario acordado\n`;
    message += `• Prepara un espacio cómodo y bien iluminado\n\n`;
    
    // Specific instructions based on sample type
    message += `💉 **Para tu tipo de muestra (${appointment.sampleType}):**\n`;
    
    switch (appointment.sampleType.toLowerCase()) {
      case 'sangre venosa':
        message += `• Ayuno de 8-12 horas si es requerido por tu médico\n`;
        message += `• Solo puedes beber agua\n`;
        message += `• Usa ropa cómoda con mangas fáciles de subir\n`;
        message += `• Mantente hidratado bebiendo agua\n`;
        break;
        
      case 'sangre capilar':
        message += `• Lava bien tus manos antes del procedimiento\n`;
        message += `• Mantén las manos calientes para mejor circulación\n`;
        message += `• Ayuno solo si es requerido por tu médico\n`;
        break;
        
      case 'orina':
        message += `• Recolecta la primera orina de la mañana si es posible\n`;
        message += `• Usa el recipiente estéril que te proporcionaremos\n`;
        message += `• Lava bien tus genitales antes de la recolección\n`;
        message += `• Recolecta la muestra del chorro medio\n`;
        break;
        
      case 'deposiciones':
        message += `• No uses laxantes 3 días antes del examen\n`;
        message += `• Recolecta la muestra en el recipiente estéril\n`;
        message += `• Evita contaminar la muestra con orina\n`;
        message += `• Refrigera la muestra si no puedes entregarla inmediatamente\n`;
        break;
        
      default:
        message += `• Sigue las instrucciones específicas de tu médico\n`;
        message += `• Pregunta a nuestro técnico si tienes dudas\n`;
    }
    
    message += `\n📞 Si tienes preguntas o necesitas aclarar algo, no dudes en contactarnos.\n\n`;
    message += `¡Nos vemos mañana! 👩‍⚕️👨‍⚕️`;
    
    return message;
  }

  /**
   * Get notification templates for different scenarios
   */
  getNotificationTemplates(): NotificationTemplates {
    return {
  welcome: `¡Hola! 👋 Bienvenido a Marcela Salazar. Estamos aquí para ayudarte con tus análisis clínicos a domicilio. ¿En qué podemos asistirte hoy?`,
      
  serviceInfo: `🧪 **Marcela Salazar - Servicio a Domicilio**\n\nOfrecemos toma de muestras en tu hogar:\n• Análisis de sangre\n• Exámenes de orina\n• Análisis de deposiciones\n• Y mucho más\n\n💰 Precio: $20,000 COP\n🕐 Horario: 5:30 AM - 6:30 AM\n📍 Área: Perímetro urbano de Buga\n\n¿Te gustaría agendar una cita?`,
      
      scheduleOptions: `📅 Para agendar tu cita, puedo ayudarte con:\n\n1️⃣ Ver disponibilidad\n2️⃣ Agendar nueva cita\n3️⃣ Consultar cita existente\n4️⃣ Cancelar o reprogramar\n\n¿Qué opción prefieres?`,
      
      noAvailability: `😔 No hay disponibilidad para la fecha solicitada. Te sugiero revisar estas alternativas:\n\n{alternatives}\n\n¿Alguna de estas opciones te conviene?`,
      
      confirmBooking: `✅ ¡Perfecto! Estoy a punto de confirmar tu cita:\n\n📅 {date}\n🕐 {time}\n📍 {address}\n🔬 {sampleType}\n💰 $20,000 COP\n\n¿Confirmas estos datos?`,
      
      addressValidation: `📍 Para brindarte el mejor servicio, necesito confirmar tu dirección dentro del perímetro urbano de Buga.\n\nPor favor proporciona:\n• Barrio\n• Carrera/Calle y número\n• Punto de referencia (opcional)`,
      
      orderReminder: `📄 **Importante:** No olvides tener lista tu orden médica para el día de la cita. Es indispensable para realizar los análisis correctos.`,
      
  thankYou: `🙏 ¡Gracias por confiar en Marcela Salazar! Esperamos verte pronto.\n\n¿Hay algo más en lo que pueda ayudarte?`
    };
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * TODO: Implement WhatsApp message sending
   * This would integrate with WhatsApp Business API or BuilderBot
   */
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
    // Implementation would depend on the WhatsApp integration method
    // Could be BuilderBot, WhatsApp Business API, or Twilio
    console.log(`[WhatsApp API] Sending to ${phoneNumber}: ${message}`);
    return true;
  }
}

// Interface for notification templates
export interface NotificationTemplates {
  welcome: string;
  serviceInfo: string;
  scheduleOptions: string;
  noAvailability: string;
  confirmBooking: string;
  addressValidation: string;
  orderReminder: string;
  thankYou: string;
}

// Export singleton instance
export const notificationService = new NotificationService();
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
