// src/components/qr/index.ts - Versión corregida

// Componentes
export { default as AdvancedQRManager } from './AdvancedQRManager';
export { default as CustomQRCodeGenerator } from './CustomQRCodeGenerator';
export { default as QRCodeGeneratorNative } from './QRCodeGeneratorNative'; // ✅ CAMBIADO: usar export default

// Servicios
export { customQRService } from '../../services/customQRService';
export { qrServiceNative } from '../../services/qrServiceNative';

// Hook
export { useQRManager } from '../../hooks/useQRManager';

// Tipos
export type { QRCustomOptions } from '../../services/customQRService';
export type { QRManagerReturn } from '../../hooks/useQRManager';