import { appointmentRepository } from '../repositories/appointment.repository';
import { 
  AppointmentSlot, 
  TimeSlot, 
  BUSINESS_RULES,
  ValidationError,
  AppointmentFilters 
} from '../models/appointment.model.js';
import { serviceConfig } from '../config/environment.js';

/**
 * Availability checking service for appointment slots
 * Manages time slots and capacity for laboratory appointments
 */
export class AvailabilityService {
  
  /**
   * Get available appointment slots for a date range
   */
  async getAvailableSlots(
    fromDate: Date, 
    toDate: Date = fromDate
  ): Promise<AppointmentSlot[]> {
    try {
      console.log(`🔍 Buscando disponibilidad desde ${fromDate.toDateString()} hasta ${toDate.toDateString()}`);
      
      // Validate date range
      this.validateDateRange(fromDate, toDate);
      
      // Get available slots from repository
      const slots = await appointmentRepository.getAvailableSlots(fromDate, toDate);
      
      // Filter out past time slots if date is today
      const availableSlots = this.filterPastSlots(slots);
      
      console.log(`✅ Encontrados ${availableSlots.length} slots disponibles`);
      return availableSlots;
      
    } catch (error) {
      console.error('❌ Error obteniendo disponibilidad:', error);
      throw error;
    }
  }

  /**
   * Get available slots for today
   */
  async getTodayAvailability(): Promise<AppointmentSlot[]> {
    const today = new Date();
    return await this.getAvailableSlots(today, today);
  }

  /**
   * Get available slots for tomorrow
   */
  async getTomorrowAvailability(): Promise<AppointmentSlot[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return await this.getAvailableSlots(tomorrow, tomorrow);
  }

  /**
   * Get available slots for the next N days
   */
  async getUpcomingAvailability(days: number = 7): Promise<AppointmentSlot[]> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);
    
    return await this.getAvailableSlots(today, endDate);
  }

  /**
   * Check if a specific slot is available
   */
  async isSlotAvailable(date: Date, timeSlotId: string): Promise<boolean> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const slots = await this.getAvailableSlots(date, date);
      
      const targetSlot = slots.find(
        slot => slot.date === dateStr && slot.timeSlot.id === timeSlotId
      );
      
      return targetSlot?.available || false;
      
    } catch (error) {
      console.error('❌ Error verificando disponibilidad del slot:', error);
      return false;
    }
  }

  /**
   * Get next available slot
   */
  async getNextAvailableSlot(): Promise<AppointmentSlot | null> {
    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30); // Look ahead 30 days
      
      const allSlots = await this.getAvailableSlots(today, endDate);
      const availableSlots = allSlots.filter(slot => slot.available);
      
      if (availableSlots.length === 0) {
        return null;
      }
      
      // Sort by date and return first available
      availableSlots.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime);
      });
      
      return availableSlots[0];
      
    } catch (error) {
      console.error('❌ Error buscando próximo slot disponible:', error);
      return null;
    }
  }

  /**
   * Get capacity information for a date
   */
  async getDayCapacity(date: Date): Promise<DayCapacity> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const slots = await this.getAvailableSlots(date, date);
      
      const totalSlots = slots.length;
      const availableSlots = slots.filter(slot => slot.available).length;
      const bookedSlots = totalSlots - availableSlots;
      const capacity = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
      
      return {
        date: dateStr,
        totalSlots,
        availableSlots,
        bookedSlots,
        capacityPercentage: Math.round(capacity),
        isFull: availableSlots === 0,
        hasAvailability: availableSlots > 0
      };
      
    } catch (error) {
      console.error('❌ Error calculando capacidad del día:', error);
      throw error;
    }
  }

  /**
   * Get working hours information
   */
  getWorkingHours(): WorkingHoursInfo {
    return {
      startTime: serviceConfig.startTime,
      endTime: serviceConfig.endTime,
      duration: this.calculateDuration(serviceConfig.startTime, serviceConfig.endTime),
      timezone: 'America/Bogota',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    };
  }

  /**
   * Check if service is currently operating
   */
  isCurrentlyOperating(): boolean {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 5); // HH:MM
    
    return currentTime >= serviceConfig.startTime && 
           currentTime <= serviceConfig.endTime;
  }

  /**
   * Get time until next service window
   */
  getTimeUntilNextService(): TimeUntilService {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 5);
    
    if (this.isCurrentlyOperating()) {
      return {
        isOperating: true,
        timeUntilNext: null,
        nextServiceDate: null
      };
    }
    
    // Calculate next service window
    const nextServiceDate = new Date(now);
    
    // If current time is after service hours, move to next day
    if (currentTime > serviceConfig.endTime) {
      nextServiceDate.setDate(nextServiceDate.getDate() + 1);
    }
    
    // Set time to service start
    const [hours, minutes] = serviceConfig.startTime.split(':').map(Number);
    nextServiceDate.setHours(hours, minutes, 0, 0);
    
    const timeUntilNext = nextServiceDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      isOperating: false,
      timeUntilNext: `${hoursUntil}h ${minutesUntil}m`,
      nextServiceDate: nextServiceDate.toISOString()
    };
  }

  /**
   * Generate human-readable availability summary
   */
  async getAvailabilitySummary(days: number = 3): Promise<string> {
    try {
      const slots = await this.getUpcomingAvailability(days);
      
      if (slots.length === 0) {
        return 'No hay disponibilidad en los próximos días. Por favor contacta directamente.';
      }
      
      const availableSlots = slots.filter(slot => slot.available);
      
      if (availableSlots.length === 0) {
        return 'No hay citas disponibles en los próximos días. Te recomendamos intentar para fechas más adelante.';
      }
      
      // Group by date
      const slotsByDate = availableSlots.reduce((groups, slot) => {
        const date = slot.date;
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(slot);
        return groups;
      }, {} as Record<string, AppointmentSlot[]>);
      
      const summaryParts = [];
      
      for (const [date, dateSlots] of Object.entries(slotsByDate)) {
        const formattedDate = this.formatDateForUser(new Date(date));
        const timeSlots = dateSlots.map(slot => slot.timeSlot.startTime).join(', ');
        summaryParts.push(`• **${formattedDate}**: ${timeSlots}`);
      }
      
      return `📅 **Disponibilidad próximos días:**\n\n${summaryParts.join('\n')}\n\n¿Te gustaría agendar alguna de estas citas?`;
      
    } catch (error) {
      console.error('❌ Error generando resumen de disponibilidad:', error);
      return 'Hubo un problema consultando la disponibilidad. Por favor intenta más tarde.';
    }
  }

  /**
   * Validate date range for availability queries
   */
  private validateDateRange(fromDate: Date, toDate: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if from date is not in the past
    if (fromDate < today) {
      throw new ValidationError('No se pueden consultar fechas pasadas', 'fromDate');
    }
    
    // Check if date range is not too large
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throw new ValidationError('El rango de fechas no puede ser mayor a 90 días', 'dateRange');
    }
    
    // Check if from date is not too far in the future
    const maxAdvanceDays = 60;
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    
    if (fromDate > maxDate) {
      throw new ValidationError(`No se pueden agendar citas con más de ${maxAdvanceDays} días de anticipación`, 'fromDate');
    }
  }

  /**
   * Filter out past slots if date is today
   */
  private filterPastSlots(slots: AppointmentSlot[]): AppointmentSlot[] {
    const now = new Date();
    const today = now.toDateString();
    const currentTime = now.toTimeString().substr(0, 5);
    
    return slots.filter(slot => {
      const slotDate = new Date(slot.date).toDateString();
      
      // If slot is not today, include it
      if (slotDate !== today) {
        return true;
      }
      
      // If slot is today, check if time has not passed
      return slot.timeSlot.startTime > currentTime;
    });
  }

  /**
   * Calculate duration between two time strings
   */
  private calculateDuration(startTime: string, endTime: string): string {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;
    const durationMinutes = endMinutesTotal - startMinutesTotal;
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Format date for user-friendly display
   */
  private formatDateForUser(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else {
      return date.toLocaleDateString('es-CO', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }
}

// Interfaces for return types
export interface DayCapacity {
  date: string;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  capacityPercentage: number;
  isFull: boolean;
  hasAvailability: boolean;
}

export interface WorkingHoursInfo {
  startTime: string;
  endTime: string;
  duration: string;
  timezone: string;
  workingDays: string[];
}

export interface TimeUntilService {
  isOperating: boolean;
  timeUntilNext: string | null;
  nextServiceDate: string | null;
}

// Export singleton instance
export const availabilityService = new AvailabilityService();
