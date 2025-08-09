/**
 * Data models for appointment management system
 * Defines TypeScript interfaces and enums for type safety
 */

export interface Customer {
  id: string;
  phoneNumber: string;
  name: string;
  address: string;
  neighborhood?: string;
  referencePoint?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  id: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  isActive: boolean;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  customerId: string;
  appointmentDate: Date;
  timeSlotId: string;
  sampleType: string;
  specialInstructions?: string;
  medicalOrderReceived: boolean;
  status: AppointmentStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationHistory {
  id: string;
  customerId?: string;
  phoneNumber: string;
  messageType: MessageType;
  messageText?: string;
  messageData?: Record<string, any>;
  createdAt: Date;
}

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enums for type safety
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum MessageType {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing'
}

// DTOs for data transfer
export interface CreateCustomerDto {
  phoneNumber: string;
  name: string;
  address: string;
  neighborhood?: string;
  referencePoint?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  address?: string;
  neighborhood?: string;
  referencePoint?: string;
}

export interface CreateAppointmentDto {
  customerId: string;
  appointmentDate: string; // YYYY-MM-DD format
  timeSlotId: string;
  sampleType: string;
  specialInstructions?: string;
}

export interface UpdateAppointmentDto {
  appointmentDate?: string;
  timeSlotId?: string;
  sampleType?: string;
  specialInstructions?: string;
  medicalOrderReceived?: boolean;
  status?: AppointmentStatus;
}

// Query filters and options
export interface AppointmentFilters {
  customerId?: string;
  status?: AppointmentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  phoneNumber?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Validation schemas
export const SAMPLE_TYPES = [
  'Sangre venosa',
  'Sangre capilar', 
  'Orina',
  'Deposiciones',
  'Esputo',
  'Otros'
] as const;

export type SampleType = typeof SAMPLE_TYPES[number];

// Business rules constants
export const BUSINESS_RULES = {
  MAX_APPOINTMENTS_PER_DAY: 10,
  SERVICE_START_TIME: '05:30',
  SERVICE_END_TIME: '06:30',
  BASE_PRICE: 20000,
  ADVANCE_BOOKING_DAYS: 1,
  CANCELLATION_HOURS: 2
} as const;

// Service area validation
export const BUGA_NEIGHBORHOODS = [
  'Centro',
  'La Merced',
  'San José',
  'La Magdalena',
  'El Jardín',
  'Los Fundadores',
  'La Estación',
  'El Estadio',
  'San Fernando',
  'La Esperanza'
] as const;

export type BugaNeighborhood = typeof BUGA_NEIGHBORHOODS[number];

// Appointment availability
export interface AppointmentSlot {
  date: string;
  timeSlot: TimeSlot;
  available: boolean;
  appointmentCount: number;
}

export interface AvailabilityQuery {
  dateFrom: Date;
  dateTo: Date;
  timeSlotId?: string;
}

// Error types
export class AppointmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppointmentError';
  }
}

export class ValidationError extends AppointmentError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppointmentError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppointmentError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
