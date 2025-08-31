// src/types/qrTypes.ts - TIPOS PARA COMPATIBILIDAD
// ✅ Exportar tipos para que otros componentes puedan usarlos

export interface QRCustomOptions {
  headerText?: string;
  footerText?: string;
  includeDate?: boolean;
  includeCompanyName?: boolean;
  paperSize?: 'thermal' | 'A4';
  qrSize?: number;
  fontSize?: number;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  colors?: {
    background: string;
    text: string;
    border: string;
  };
  instructions?: string;
}

export interface QRConfiguration {
  lubricentroId: string;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
  includeDate: boolean;
  includeCompanyName: boolean;
  paperSize: 'thermal' | 'A4';
  qrSize: number;
  fontSize: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  colors: {
    background: string;
    text: string;
    border: string;
  };
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ COMPATIBILIDAD con sistema existente
  useCustomQR?: boolean;
  customOptions?: QRCustomOptions;
  autoPrint?: boolean;
}

// ✅ SOLO re-exportar el servicio, los tipos ya están definidos aquí
export { qrServiceNative } from '../services/qrServiceNative';