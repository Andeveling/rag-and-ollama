import { appointmentRepository } from '../repositories/appointment.repository.js';
import { 
  Customer, 
  CreateCustomerDto, 
  UpdateCustomerDto, 
  BUSINESS_RULES,
  ValidationError 
} from '../models/appointment.model.js';
import { serviceConfig } from '../config/environment.js';

/**
 * Customer management service for laboratory appointments
 * Handles customer data, validation, and Buga area verification
 */
export class CustomerService {
  
  /**
   * Create a new customer with validation
   */
  async createCustomer(customerData: CreateCustomerDto): Promise<Customer> {
    try {
      console.log(`👤 Creando cliente: ${customerData.name}`);
      
      // Validate customer data
      this.validateCustomerData(customerData);
      
      // Validate address is within Buga urban perimeter
      await this.validateBugaAddress(customerData.address);
      
      // Check if customer already exists by phone
      const existingCustomer = await this.findByPhone(customerData.phoneNumber);
      if (existingCustomer) {
        console.log(`⚠️ Cliente ya existe con teléfono: ${customerData.phoneNumber}`);
        throw new ValidationError('Ya existe un cliente registrado con este número de teléfono', 'phoneNumber');
      }
      
      // Create customer
      const customer = await appointmentRepository.createCustomer(customerData);
      
      console.log(`✅ Cliente creado exitosamente: ${customer.id}`);
      return customer;
      
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      throw error;
    }
  }

  /**
   * Update existing customer
   */
  async updateCustomer(customerId: string, updateData: UpdateCustomerDto): Promise<Customer> {
    try {
      console.log(`🔄 Actualizando cliente: ${customerId}`);
      
      // Validate update data
      if (Object.keys(updateData).length === 0) {
        throw new ValidationError('No hay datos para actualizar', 'updateData');
      }
      
      // Validate address if being updated
      if (updateData.address) {
        await this.validateBugaAddress(updateData.address);
      }
      
      // Check if new phone number conflicts with existing customer
      // Note: Phone number updates not supported in current DTO
      // This feature can be added later if needed
      
      const updatedCustomer = await appointmentRepository.updateCustomer(customerId, updateData);
      
      console.log(`✅ Cliente actualizado exitosamente: ${customerId}`);
      return updatedCustomer;
      
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      throw error;
    }
  }

  /**
   * Find customer by ID
   */
  async findById(customerId: string): Promise<Customer | null> {
    try {
      return await appointmentRepository.findCustomerById(customerId);
    } catch (error) {
      console.error('❌ Error buscando cliente por ID:', error);
      throw error;
    }
  }

  /**
   * Find customer by phone number
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      return await appointmentRepository.findCustomerByPhone(normalizedPhone);
    } catch (error) {
      console.error('❌ Error buscando cliente por teléfono:', error);
      throw error;
    }
  }

  /**
   * Find or create customer from WhatsApp interaction
   */
  async findOrCreateFromWhatsApp(phone: string, name?: string): Promise<Customer> {
    try {
      console.log(`🔍 Buscando o creando cliente desde WhatsApp: ${phone}`);
      
      const normalizedPhone = this.normalizePhoneNumber(phone);
      
      // Try to find existing customer
      let customer = await this.findByPhone(normalizedPhone);
      
      if (customer) {
        console.log(`✅ Cliente encontrado: ${customer.id}`);
        return customer;
      }
      
      // Create minimal customer record if not exists
      const customerName = name || 'Cliente WhatsApp';
      
      const newCustomerData: CreateCustomerDto = {
        name: customerName.trim(),
        phoneNumber: normalizedPhone,
        address: '', // Will be collected during appointment booking
        referencePoint: 'Cliente creado desde WhatsApp'
      };
      
      // Create without address validation for now
      customer = await appointmentRepository.createCustomer(newCustomerData);
      
      console.log(`✅ Cliente creado desde WhatsApp: ${customer.id}`);
      return customer;
      
    } catch (error) {
      console.error('❌ Error encontrando o creando cliente desde WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Get customer appointment history
   */
  async getCustomerHistory(customerId: string, limit: number = 10): Promise<any[]> {
    try {
      return await appointmentRepository.getCustomerAppointments(customerId, { limit });
    } catch (error) {
      console.error('❌ Error obteniendo historial del cliente:', error);
      throw error;
    }
  }

  /**
   * Check if customer has pending appointments
   */
  async hasPendingAppointments(customerId: string): Promise<boolean> {
    try {
      const appointments = await appointmentRepository.getCustomerAppointments(customerId, {
        status: ['scheduled', 'confirmed'],
        limit: 1
      });
      
      return appointments.length > 0;
    } catch (error) {
      console.error('❌ Error verificando citas pendientes:', error);
      return false;
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId: string): Promise<CustomerStats> {
    try {
      const allAppointments = await this.getCustomerHistory(customerId, 100);
      
      const stats: CustomerStats = {
        totalAppointments: allAppointments.length,
        completedAppointments: allAppointments.filter(apt => apt.status === 'completed').length,
        cancelledAppointments: allAppointments.filter(apt => apt.status === 'cancelled').length,
        pendingAppointments: allAppointments.filter(apt => ['scheduled', 'confirmed'].includes(apt.status)).length,
        lastAppointmentDate: null,
        averageRating: null,
        isFrequentCustomer: false
      };
      
      // Calculate last appointment date
      if (allAppointments.length > 0) {
        const sortedApts = allAppointments.sort((a, b) => 
          new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
        );
        stats.lastAppointmentDate = sortedApts[0].appointmentDate;
      }
      
      // Determine if frequent customer (3+ completed appointments)
      stats.isFrequentCustomer = stats.completedAppointments >= 3;
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error calculando estadísticas del cliente:', error);
      throw error;
    }
  }

  /**
   * Validate customer data
   */
  private validateCustomerData(customerData: CreateCustomerDto | UpdateCustomerDto): void {
    // Validate required fields for creation
    if ('name' in customerData && !customerData.name?.trim()) {
      throw new ValidationError('El nombre es requerido', 'name');
    }
    
    // Validate phone number
    if ('phoneNumber' in customerData && !this.isValidColombianPhone(customerData.phoneNumber)) {
      throw new ValidationError('Número de teléfono inválido. Debe ser un número colombiano válido', 'phoneNumber');
    }
    
    // Validate name length
    const maxNameLength = 100; // Define locally since not in BUSINESS_RULES
    if (customerData.name && customerData.name.length > maxNameLength) {
      throw new ValidationError(`El nombre no puede exceder ${maxNameLength} caracteres`, 'name');
    }
    
    // Validate address length if provided
    if (customerData.address && customerData.address.length > 500) {
      throw new ValidationError('La dirección no puede exceder 500 caracteres', 'address');
    }
    
    // Validate reference point length if provided
    if (customerData.referencePoint && customerData.referencePoint.length > 500) {
      throw new ValidationError('El punto de referencia no puede exceder 500 caracteres', 'referencePoint');
    }
  }

  /**
   * Validate address is within Buga urban perimeter
   */
  private async validateBugaAddress(address: string): Promise<void> {
    if (!address || address.trim() === '') {
      throw new ValidationError('La dirección es requerida para el servicio a domicilio', 'address');
    }
    
    // Normalize address for validation
    const normalizedAddress = address.toLowerCase().trim();
    
    // List of Buga urban area indicators
    const bugaUrbanIndicators = [
      'buga',
      'guadalajara de buga',
      'centro',
      'centro histórico',
      'barrio',
      'carrera',
      'calle',
      'avenida',
      'av.',
      'cr.',
      'cl.',
      'manzana',
      'casa',
      'edificio'
    ];
    
    // List of excluded areas (rural or outside service area)
    const excludedAreas = [
      'corregimiento',
      'vereda',
      'finca',
      'hacienda',
      'rural',
      'campo',
      'tulúa',
      'san pedro',
      'ginebra',
      'el cerrito',
      'guacarí',
      'yotoco'
    ];
    
    // Check for excluded areas first
    const hasExcludedArea = excludedAreas.some(excluded => 
      normalizedAddress.includes(excluded)
    );
    
    if (hasExcludedArea) {
      throw new ValidationError(
        'Lo sentimos, solo atendemos en el perímetro urbano de Buga. Esta dirección parece estar fuera de nuestra área de servicio.',
        'address'
      );
    }
    
    // Check for Buga indicators
    const hasBugaIndicator = bugaUrbanIndicators.some(indicator => 
      normalizedAddress.includes(indicator)
    );
    
    if (!hasBugaIndicator) {
      throw new ValidationError(
        'Por favor proporciona una dirección más específica dentro del perímetro urbano de Buga (incluye barrio, carrera/calle, etc.)',
        'address'
      );
    }
    
    // Additional validation for minimum address components
    const addressParts = normalizedAddress.split(/[\s,]+/);
    if (addressParts.length < 3) {
      throw new ValidationError(
        'La dirección debe incluir al menos: barrio, carrera/calle y número',
        'address'
      );
    }
    
    console.log(`✅ Dirección validada para Buga: ${address}`);
  }

  /**
   * Validate Colombian phone number
   */
  private isValidColombianPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    
    // Colombian mobile numbers: 10 digits starting with 3
    // Format: 3XXXXXXXXX
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      return true;
    }
    
    // With country code: +57 3XXXXXXXXX
    if (cleaned.length === 12 && cleaned.startsWith('573')) {
      return true;
    }
    
    // Landline numbers: 7 digits for local, 10 digits with area code
    // Buga area code: 2 (Valle del Cauca)
    if (cleaned.length === 7) {
      return true; // Local landline
    }
    
    if (cleaned.length === 10 && cleaned.startsWith('2')) {
      return true; // Landline with area code
    }
    
    return false;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Normalize Colombian phone number
   */
  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove country code if present
    if (cleaned.startsWith('57') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    }
    
    // Add leading zero for landlines if needed
    if (cleaned.length === 7) {
      // Local landline, add area code
      cleaned = '2' + cleaned; // Valle del Cauca area code
    }
    
    return cleaned;
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    const cleaned = this.normalizePhoneNumber(phone);
    
    if (cleaned.length === 10) {
      if (cleaned.startsWith('3')) {
        // Mobile: 3XX XXX XXXX
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
      } else {
        // Landline: (X) XXX XXXX
        return `(${cleaned.substring(0, 1)}) ${cleaned.substring(1, 4)} ${cleaned.substring(4)}`;
      }
    }
    
    return phone; // Return original if can't format
  }

  /**
   * Generate customer summary for WhatsApp
   */
  async getCustomerSummaryForChat(customerId: string): Promise<string> {
    try {
      const customer = await this.findById(customerId);
      if (!customer) {
        return 'Cliente no encontrado';
      }
      
      const stats = await this.getCustomerStats(customerId);
      const formattedPhone = this.formatPhoneNumber(customer.phoneNumber);
      
      let summary = `👤 **${customer.name}**\n`;
      summary += `📱 ${formattedPhone}\n`;
      
      if (customer.address) {
        summary += `📍 ${customer.address}\n`;
      }
      
      summary += `\n📊 **Historial:**\n`;
      summary += `• Total citas: ${stats.totalAppointments}\n`;
      summary += `• Completadas: ${stats.completedAppointments}\n`;
      summary += `• Pendientes: ${stats.pendingAppointments}\n`;
      
      if (stats.lastAppointmentDate) {
        const lastDate = new Date(stats.lastAppointmentDate).toLocaleDateString('es-CO');
        summary += `• Última cita: ${lastDate}\n`;
      }
      
      if (stats.isFrequentCustomer) {
        summary += `\n⭐ Cliente frecuente`;
      }
      
      return summary;
      
    } catch (error) {
      console.error('❌ Error generando resumen del cliente:', error);
      return 'Error obteniendo información del cliente';
    }
  }
}

// Interface for customer statistics
export interface CustomerStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
  lastAppointmentDate: string | null;
  averageRating: number | null;
  isFrequentCustomer: boolean;
}

// Export singleton instance
export const customerService = new CustomerService();
