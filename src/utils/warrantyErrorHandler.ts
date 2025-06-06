// src/utils/warrantyErrorHandler.ts

export interface WarrantyError {
  code: string;
  message: string;
  details?: any;
}

export interface WarrantyErrorHandlerResult {
  title: string;
  message: string;
  action?: string;
  retry?: boolean;
}

/**
 * Maneja errores específicos del sistema de garantías
 */
export const handleWarrantyError = (error: any): WarrantyErrorHandlerResult => {
  console.error('Error en sistema de garantías:', error);

  // Error de permisos de Firebase
  if (error?.code === 'permission-denied') {
    return {
      title: 'Permisos Insuficientes',
      message: 'No tiene permisos para realizar esta acción en el sistema de garantías.',
      action: 'Contacte al administrador si cree que esto es un error.',
      retry: false
    };
  }

  // Error de datos inválidos o campo no válido
  if (error?.code === 'invalid-argument' || error?.message?.includes('invalid field') || error?.message?.includes('garantiaKilometros')) {
    return {
      title: 'Datos No Válidos',
      message: 'Los datos de la garantía contienen campos no válidos o están incompletos.',
      action: 'Revise la información ingresada y corrija los errores.',
      retry: false
    };
  }

  // Error de red o conexión
  if (error?.code === 'unavailable' || error?.message?.includes('network')) {
    return {
      title: 'Error de Conexión',
      message: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
      action: 'Intente nuevamente en unos momentos.',
      retry: true
    };
  }

  // Error de usuario no autenticado
  if (error?.code === 'unauthenticated') {
    return {
      title: 'Sesión Expirada',
      message: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
      action: 'Será redirigido al login automáticamente.',
      retry: false
    };
  }

  // Error de documento no encontrado
  if (error?.code === 'not-found') {
    return {
      title: 'Garantía No Encontrada',
      message: 'La garantía solicitada no existe o ha sido eliminada.',
      action: 'Verifique el ID de la garantía e intente nuevamente.',
      retry: false
    };
  }

  // Error de límite excedido
  if (error?.code === 'resource-exhausted') {
    return {
      title: 'Límite Excedido',
      message: 'Se ha excedido el límite de operaciones permitidas.',
      action: 'Espere unos minutos antes de volver a intentar.',
      retry: true
    };
  }

  // Error genérico de Firebase
  if (error?.code && error?.message) {
    return {
      title: 'Error del Sistema',
      message: `Error: ${error.message}`,
      action: 'Si el problema persiste, contacte al soporte técnico.',
      retry: true
    };
  }

  // Error desconocido
  return {
    title: 'Error Inesperado',
    message: 'Ha ocurrido un error inesperado en el sistema de garantías.',
    action: 'Por favor, recargue la página o contacte al soporte técnico.',
    retry: true
  };
};

/**
 * Registra errores para análisis posterior
 */
export const logWarrantyError = (error: any, context?: string) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error?.message || 'Error desconocido',
      code: error?.code || 'unknown',
      stack: error?.stack || 'No stack trace',
    },
    context: context || 'warranty-system',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };

  console.error('Warranty Error Log:', errorLog);
  
  // Aquí podrías enviar el error a un servicio de logging como Sentry
  // o Firebase Analytics en el futuro
};

/**
 * Wrapper para funciones async que maneja errores automáticamente
 */
export const withWarrantyErrorHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logWarrantyError(error, context);
      throw error; // Re-lanza el error para que el componente lo maneje
    }
  };
};

/**
 * Valida si un error requiere reautenticación
 */
export const requiresReauth = (error: any): boolean => {
  return error?.code === 'unauthenticated' || 
         error?.code === 'permission-denied';
};

/**
 * Determina si un error es temporal y se puede reintentar
 */
export const isRetryableError = (error: any): boolean => {
  const retryableCodes = [
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
    'aborted',
    'internal'
  ];
  
  return retryableCodes.includes(error?.code) ||
         error?.message?.includes('network') ||
         error?.message?.includes('timeout');
};