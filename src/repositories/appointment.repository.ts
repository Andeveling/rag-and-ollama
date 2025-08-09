<<<<<<< HEAD
<file upload>
=======
import { Pool, PoolClient } from 'pg';
import { 
  Appointment, 
  Customer, 
  TimeSlot,
  CreateAppointmentDto, 
  UpdateAppointmentDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  AppointmentFilters,
  PaginationOptions,
  PaginatedResult,
  AppointmentStatus,
  NotFoundError,
  ConflictError,
  AppointmentSlot
} from '../models/appointment.model.js';
import { dbConfig } from '../config/environment.js';

/**
 * Repository for appointment database operations
 * Handles CRUD operations with PostgreSQL
 */
export class AppointmentRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      max: 20, // maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Create a new appointment
   */
  async create(appointmentDto: CreateAppointmentDto): Promise<Appointment> {
    const client = await this.pool.connect();
    
    try {
      // Check if time slot is available
      await this.validateTimeSlotAvailability(
        client, 
        appointmentDto.appointmentDate, 
        appointmentDto.timeSlotId
      );

      const query = `
        INSERT INTO appointments (
          customer_id, appointment_date, time_slot_id, 
          sample_type, special_instructions, total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [
        appointmentDto.customerId,
        appointmentDto.appointmentDate,
        appointmentDto.timeSlotId,
        appointmentDto.sampleType,
        appointmentDto.specialInstructions || null,
        20000 // Base price from business rules
      ];

      const result = await client.query(query, values);
      const appointment = this.mapRowToAppointment(result.rows[0]);
      
      console.log(`✅ Cita creada: ${appointment.id}`);
      return appointment;
      
    } catch (error) {
      console.error('❌ Error creando cita:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find appointment by ID with customer and time slot details
   */
  async findById(id: string): Promise<Appointment | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT a.*, c.name as customer_name, c.phone_number, c.address,
               ts.start_time, ts.end_time
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN time_slots ts ON a.time_slot_id = ts.id
        WHERE a.id = $1
      `;
      
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToAppointment(result.rows[0]);
      
    } catch (error) {
      console.error('❌ Error buscando cita por ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update appointment
   */
  async update(id: string, updateDto: UpdateAppointmentDto): Promise<Appointment> {
    const client = await this.pool.connect();
    
    try {
      // Check if appointment exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError('Appointment', id);
      }

      // If changing date/time, validate availability
      if (updateDto.appointmentDate || updateDto.timeSlotId) {
        await this.validateTimeSlotAvailability(
          client,
          updateDto.appointmentDate || existing.appointmentDate.toISOString().split('T')[0],
          updateDto.timeSlotId || existing.timeSlotId,
          id // Exclude current appointment from availability check
        );
      }

      const setClause = [];
      const values = [];
      let paramCounter = 1;

      if (updateDto.appointmentDate) {
        setClause.push(`appointment_date = $${paramCounter++}`);
        values.push(updateDto.appointmentDate);
      }

      if (updateDto.timeSlotId) {
        setClause.push(`time_slot_id = $${paramCounter++}`);
        values.push(updateDto.timeSlotId);
      }

      if (updateDto.sampleType) {
        setClause.push(`sample_type = $${paramCounter++}`);
        values.push(updateDto.sampleType);
      }

      if (updateDto.specialInstructions !== undefined) {
        setClause.push(`special_instructions = $${paramCounter++}`);
        values.push(updateDto.specialInstructions);
      }

      if (updateDto.medicalOrderReceived !== undefined) {
        setClause.push(`medical_order_received = $${paramCounter++}`);
        values.push(updateDto.medicalOrderReceived);
      }

      if (updateDto.status) {
        setClause.push(`status = $${paramCounter++}`);
        values.push(updateDto.status);
      }

      // Always update the updated_at timestamp
      setClause.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE appointments 
        SET ${setClause.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      const result = await client.query(query, values);
      const updated = this.mapRowToAppointment(result.rows[0]);
      
      console.log(`✅ Cita actualizada: ${updated.id}`);
      return updated;
      
    } catch (error) {
      console.error('❌ Error actualizando cita:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel appointment (soft delete by changing status)
   */
  async cancel(id: string, reason?: string): Promise<Appointment> {
    const updateDto: UpdateAppointmentDto = {
      status: AppointmentStatus.CANCELLED
    };

    if (reason) {
      updateDto.specialInstructions = `CANCELADA: ${reason}`;
    }

    return await this.update(id, updateDto);
  }

  /**
   * Find appointments with filters and pagination
   */
  async findMany(
    filters: AppointmentFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<Appointment>> {
    const client = await this.pool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const values = [];
      let paramCounter = 1;

      // Build WHERE clause based on filters
      if (filters.customerId) {
        whereClause += ` AND a.customer_id = $${paramCounter++}`;
        values.push(filters.customerId);
      }

      if (filters.status) {
        whereClause += ` AND a.status = $${paramCounter++}`;
        values.push(filters.status);
      }

      if (filters.dateFrom) {
        whereClause += ` AND a.appointment_date >= $${paramCounter++}`;
        values.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereClause += ` AND a.appointment_date <= $${paramCounter++}`;
        values.push(filters.dateTo);
      }

      if (filters.phoneNumber) {
        whereClause += ` AND c.phone_number = $${paramCounter++}`;
        values.push(filters.phoneNumber);
      }

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const offset = (pagination.page - 1) * pagination.limit;
      const sortBy = pagination.sortBy || 'appointment_date';
      const sortOrder = pagination.sortOrder || 'DESC';

      const dataQuery = `
        SELECT a.*, c.name as customer_name, c.phone_number, c.address,
               ts.start_time, ts.end_time
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN time_slots ts ON a.time_slot_id = ts.id
        ${whereClause}
        ORDER BY a.${sortBy} ${sortOrder}
        LIMIT $${paramCounter++} OFFSET $${paramCounter}
      `;
      
      values.push(pagination.limit, offset);
      const dataResult = await client.query(dataQuery, values);

      const appointments = dataResult.rows.map(row => this.mapRowToAppointment(row));
      
      return {
        data: appointments,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit)
      };
      
    } catch (error) {
      console.error('❌ Error buscando citas:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get appointments for a specific date
   */
  async findByDate(date: string): Promise<Appointment[]> {
    const filters: AppointmentFilters = {
      dateFrom: new Date(date + 'T00:00:00'),
      dateTo: new Date(date + 'T23:59:59')
    };
    
    const result = await this.findMany(filters, { page: 1, limit: 100 });
    return result.data;
  }

  /**
   * Get available appointment slots for a date range
   */
  async getAvailableSlots(dateFrom: Date, dateTo: Date): Promise<AppointmentSlot[]> {
    const client = await this.pool.connect();
    
    try {
      // Get all time slots
      const timeSlotsQuery = 'SELECT * FROM time_slots WHERE is_active = true';
      const timeSlotsResult = await client.query(timeSlotsQuery);
      const timeSlots = timeSlotsResult.rows.map(row => this.mapRowToTimeSlot(row));

      const slots: AppointmentSlot[] = [];
      
      // Generate slots for each date in range
      const currentDate = new Date(dateFrom);
      while (currentDate <= dateTo) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        for (const timeSlot of timeSlots) {
          // Count existing appointments for this date/time
          const countQuery = `
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE appointment_date = $1 
            AND time_slot_id = $2 
            AND status NOT IN ('cancelled')
          `;
          
          const countResult = await client.query(countQuery, [dateStr, timeSlot.id]);
          const appointmentCount = parseInt(countResult.rows[0].count);
          
          slots.push({
            date: dateStr,
            timeSlot,
            available: appointmentCount < 10, // Max appointments per slot
            appointmentCount
          });
        }
        
        // Move to next date
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return slots;
      
    } catch (error) {
      console.error('❌ Error obteniendo slots disponibles:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate if time slot is available for appointment
   */
  private async validateTimeSlotAvailability(
    client: PoolClient, 
    appointmentDate: string, 
    timeSlotId: string,
    excludeAppointmentId?: string
  ): Promise<void> {
    let query = `
      SELECT COUNT(*) as count
      FROM appointments
      WHERE appointment_date = $1 
      AND time_slot_id = $2
      AND status NOT IN ('cancelled')
    `;
    
    const values = [appointmentDate, timeSlotId];
    
    if (excludeAppointmentId) {
      query += ` AND id != $3`;
      values.push(excludeAppointmentId);
    }

    const result = await client.query(query, values);
    const count = parseInt(result.rows[0].count);
    
    if (count >= 10) { // Max appointments per time slot
      throw new ConflictError(`Time slot is fully booked for ${appointmentDate}`);
    }
  }

  /**
   * Create a new customer
   */
  async createCustomer(customerDto: CreateCustomerDto): Promise<Customer> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO customers (phone_number, name, address, neighborhood, reference_point)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [
        customerDto.phoneNumber,
        customerDto.name,
        customerDto.address,
        customerDto.neighborhood || null,
        customerDto.referencePoint || null
      ];
      
      const result = await client.query(query, values);
      return this.mapRowToCustomer(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Update existing customer
   */
  async updateCustomer(customerId: string, updateDto: UpdateCustomerDto): Promise<Customer> {
    const client = await this.pool.connect();
    
    try {
      const setParts = [];
      const values = [];
      let paramCount = 1;
      
      if (updateDto.name !== undefined) {
        setParts.push(`name = $${paramCount++}`);
        values.push(updateDto.name);
      }
      
      if (updateDto.address !== undefined) {
        setParts.push(`address = $${paramCount++}`);
        values.push(updateDto.address);
      }
      
      if (updateDto.neighborhood !== undefined) {
        setParts.push(`neighborhood = $${paramCount++}`);
        values.push(updateDto.neighborhood);
      }
      
      if (updateDto.referencePoint !== undefined) {
        setParts.push(`reference_point = $${paramCount++}`);
        values.push(updateDto.referencePoint);
      }
      
      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }
      
      setParts.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(customerId);
      
      const query = `
        UPDATE customers 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Customer', customerId);
      }
      
      return this.mapRowToCustomer(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Find customer by ID
   */
  async findCustomerById(customerId: string): Promise<Customer | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM customers WHERE id = $1';
      const result = await client.query(query, [customerId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToCustomer(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Find customer by phone number
   */
  async findCustomerByPhone(phoneNumber: string): Promise<Customer | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM customers WHERE phone_number = $1';
      const result = await client.query(query, [phoneNumber]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToCustomer(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Get customer appointments with filtering
   */
  async getCustomerAppointments(
    customerId: string, 
    options: { status?: string[], limit?: number } = {}
  ): Promise<Appointment[]> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT a.*, ts.start_time, ts.end_time
        FROM appointments a
        JOIN time_slots ts ON a.time_slot_id = ts.id
        WHERE a.customer_id = $1
      `;
      
      const values = [customerId];
      let paramCount = 2;
      
      if (options.status && options.status.length > 0) {
        const statusPlaceholders = options.status.map(() => `$${paramCount++}`).join(', ');
        query += ` AND a.status IN (${statusPlaceholders})`;
        values.push(...options.status);
      }
      
      query += ` ORDER BY a.appointment_date DESC`;
      
      if (options.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(options.limit.toString());
      }
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToAppointment(row));
      
    } finally {
      client.release();
    }
  }

  /**
   * Find appointments by filters
   */
  async findAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
    const client = await this.pool.connect();
    
    try {
      let query = `
        SELECT a.*, ts.start_time, ts.end_time
        FROM appointments a
        JOIN time_slots ts ON a.time_slot_id = ts.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 1;
      
      if (filters.customerId) {
        query += ` AND a.customer_id = $${paramCount++}`;
        values.push(filters.customerId);
      }
      
      if (filters.status) {
        query += ` AND a.status = $${paramCount++}`;
        values.push(filters.status);
      }
      
      if (filters.dateFrom) {
        query += ` AND a.appointment_date >= $${paramCount++}`;
        values.push(filters.dateFrom.toISOString().split('T')[0]);
      }
      
      if (filters.dateTo) {
        query += ` AND a.appointment_date <= $${paramCount++}`;
        values.push(filters.dateTo.toISOString().split('T')[0]);
      }
      
      if (filters.phoneNumber) {
        query += ` AND EXISTS (
          SELECT 1 FROM customers c 
          WHERE c.id = a.customer_id 
          AND c.phone_number = $${paramCount++}
        )`;
        values.push(filters.phoneNumber);
      }
      
      query += ` ORDER BY a.appointment_date ASC, ts.start_time ASC`;
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToAppointment(row));
      
    } finally {
      client.release();
    }
  }

  /**
   * Update appointment status
   */
  async updateStatus(appointmentId: string, status: AppointmentStatus): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE appointments 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      const result = await client.query(query, [status, appointmentId]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Appointment', appointmentId);
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Find time slot by ID
   */
  async findTimeSlotById(timeSlotId: string): Promise<TimeSlot | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM time_slots WHERE id = $1';
      const result = await client.query(query, [timeSlotId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToTimeSlot(result.rows[0]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Customer model
   */
  private mapRowToCustomer(row: any): Customer {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      name: row.name,
      address: row.address,
      neighborhood: row.neighborhood,
      referencePoint: row.reference_point,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to Appointment model
   */
  private mapRowToAppointment(row: any): Appointment {
    return {
      id: row.id,
      customerId: row.customer_id,
      appointmentDate: new Date(row.appointment_date),
      timeSlotId: row.time_slot_id,
      sampleType: row.sample_type,
      specialInstructions: row.special_instructions,
      medicalOrderReceived: row.medical_order_received || false,
      status: row.status as AppointmentStatus,
      totalAmount: parseFloat(row.total_amount),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map database row to TimeSlot model
   */
  private mapRowToTimeSlot(row: any): TimeSlot {
    return {
      id: row.id,
      startTime: row.start_time,
      endTime: row.end_time,
      isActive: row.is_active,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const appointmentRepository = new AppointmentRepository();
>>>>>>> 25a86dc (feat: Implement Ollama service for local LLM processing)
