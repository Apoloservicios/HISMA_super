// src/config/constants.ts - Archivo completo y corregido

export const TRIAL_LIMITS = {
  DAYS: 7,
  SERVICES: 10, // ✅ Límite coherente de 10 servicios
  USERS: 2
};

// Constantes adicionales para mayor claridad
export const SUBSCRIPTION_LIMITS = {
  TRIAL: {
    DAYS: 7,
    SERVICES: 10,
    USERS: 2
  },
  BASIC: {
    SERVICES: 50,
    USERS: 3
  },
  PROFESSIONAL: {
    SERVICES: 150,
    USERS: 5
  },
  PREMIUM: {
    SERVICES: null, // Ilimitado
    USERS: 10
  },
  ENTERPRISE: {
    SERVICES: null, // Ilimitado
    USERS: 20
  }
};

// Mensajes coherentes para el usuario
export const TRIAL_MESSAGES = {
  SERVICES_REMAINING: (remaining: number) => 
    `Te quedan ${remaining} servicios disponibles en tu período de prueba`,
  SERVICES_EXHAUSTED: 
    'Has agotado los 10 servicios disponibles durante el período de prueba',
  TRIAL_EXPIRING: (days: number) => 
    `Tu período de prueba expira en ${days} día${days !== 1 ? 's' : ''}`,
  TRIAL_EXPIRED: 
    'Tu período de prueba ha expirado',
  CONTACT_SUPPORT: 
    'Contacta con soporte para activar tu suscripción y continuar usando el sistema'
};

// Configuración de la aplicación
export const APP_CONFIG = {
  SUPPORT_EMAIL: 'soporte@hisma.com.ar',
  SUPPORT_WHATSAPP: '+5491112345678',
  COMPANY_NAME: 'HISMA',
  PAGINATION_SIZE: 10,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
};

// Estados permitidos para entidades
export const ENTITY_STATES = {
  LUBRICENTRO: ['activo', 'trial', 'inactivo'] as const,
  USER: ['activo', 'pendiente', 'inactivo'] as const,
  PAYMENT: ['paid', 'pending', 'overdue'] as const,
};

// Roles de usuario
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user'
} as const;

// Configuración de validaciones
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  CUIT: /^\d{11}$/,
  DOMINIO: {
    CURRENT: /^[A-Za-z]{2}[0-9]{3}[A-Za-z]{2}$/,    // AA123BB
    OLD: /^[A-Za-z]{3}[0-9]{3}$/,                    // AAA123
    MOTORCYCLE: /^[A-Za-z]{1}[0-9]{3}[A-Za-z]{3}$/   // A123BCD
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SPECIAL: false
  }
};

// Configuración de notificaciones
export const NOTIFICATION_CONFIG = {
  TRIAL_EXPIRY_WARNING_DAYS: 2,
  SERVICE_REMINDER_DAYS: 30,
  PAYMENT_REMINDER_DAYS: 7,
  AUTO_HIDE_SUCCESS_DURATION: 3000,
  AUTO_HIDE_ERROR_DURATION: 5000
};

// Configuración de archivos y uploads
export const FILE_CONFIG = {
  MAX_LOGO_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_LOGO_TYPES: ['image/jpeg', 'image/png'],
  MAX_PDF_SIZE: 10 * 1024 * 1024, // 10MB
  STORAGE_PATHS: {
    LOGOS: 'lubricentros/{id}/logo',
    DOCUMENTS: 'documents/{lubricentroId}',
    TEMP: 'temp'
  }
};

// Configuración de reportes
export const REPORT_CONFIG = {
  DEFAULT_DATE_RANGE: 30, // días
  MAX_EXPORT_RECORDS: 5000,
  CHART_COLORS: [
    '#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9',
    '#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb'
  ]
};

// URLs y endpoints
export const API_ENDPOINTS = {
  FIREBASE_CONFIG: {
    // Estas se configuran en .env
    API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
    AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    APP_ID: process.env.REACT_APP_FIREBASE_APP_ID
  }
};

// Configuración de la interfaz
export const UI_CONFIG = {
  THEME: {
    PRIMARY_COLOR: '#1976d2',
    SECONDARY_COLOR: '#dc004e',
    SUCCESS_COLOR: '#4caf50',
    WARNING_COLOR: '#ff9800',
    ERROR_COLOR: '#f44336',
    INFO_COLOR: '#2196f3'
  },
  BREAKPOINTS: {
    MOBILE: 640,
    TABLET: 768,
    DESKTOP: 1024,
    LARGE: 1280
  }
};

// Configuración de caché
export const CACHE_CONFIG = {
  LUBRICENTROS_TTL: 5 * 60 * 1000, // 5 minutos
  USERS_TTL: 2 * 60 * 1000, // 2 minutos
  STATS_TTL: 1 * 60 * 1000, // 1 minuto
  LONG_TERM_TTL: 30 * 60 * 1000 // 30 minutos
};