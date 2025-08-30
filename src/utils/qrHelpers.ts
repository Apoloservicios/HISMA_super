// ==============================================
// src/utils/qrHelpers.ts - Utilidades adicionales
// ==============================================

/**
 * Utilidades helper para el sistema de QR
 */

export const validateDominio = (dominio: string): boolean => {
  // Validación básica de dominio argentino
  const dominioRegex = /^[A-Z]{2,3}\d{3}[A-Z]{0,2}$/i;
  return dominioRegex.test(dominio.replace(/\s+/g, ''));
};

export const formatDominio = (dominio: string): string => {
  return dominio.replace(/\s+/g, '').toUpperCase();
};

export const generateQRFilename = (
  dominio: string,
  nroCambio: string,
  type: 'simple' | 'custom' | 'logo' = 'custom'
): string => {
  const cleanDominio = formatDominio(dominio);
  const timestamp = new Date().toISOString().split('T')[0];
  return `qr-${type}-${cleanDominio}-${nroCambio}-${timestamp}.png`;
};

export const getQRPresets = () => ({
  default: {
    primaryText: 'Escanea y revisa tu Servicio',
    fontSize: 12,
    textColor: '#333333',
    backgroundColor: '#ffffff',
  },
  premium: {
    primaryText: 'Servicio Premium - Tu Historial',
    fontSize: 13,
    textColor: '#1f2937',
    backgroundColor: '#f8fafc',
  },
  compact: {
    primaryText: 'Ver Historial',
    fontSize: 10,
    textColor: '#6b7280',
    backgroundColor: '#ffffff',
  },
  branded: {
    primaryText: '¡Consulta tu Servicio Aquí!',
    fontSize: 14,
    textColor: '#dc2626',
    backgroundColor: '#fef2f2',
  }
});