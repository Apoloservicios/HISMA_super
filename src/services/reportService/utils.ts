// src/services/reportService/utils.ts - REEMPLAZAR ARCHIVO COMPLETO
import { OilChange } from '../../types';

/**
 * Colores estándar para reportes
 */
export const REPORT_COLORS = {
  primary: [46, 125, 50],      // Verde principal
  secondary: [27, 94, 32],     // Verde oscuro
  accent: [251, 192, 45],      // Amarillo
  success: [76, 175, 80],      // Verde éxito
  warning: [255, 152, 0],      // Naranja advertencia
  error: [244, 67, 54],        // Rojo error
  text: [33, 33, 33],          // Texto principal
  textLight: [117, 117, 117],  // Texto secundario
  chart: [
    [76, 175, 80],   // Verde
    [33, 150, 243],  // Azul
    [255, 152, 0],   // Naranja
    [156, 39, 176],  // Púrpura
    [255, 235, 59],  // Amarillo
    [96, 125, 139]   // Gris azulado
  ]
};

/**
 * FUNCIÓN NUEVA: Limpiar texto para PDF (evita caracteres raros)
 */
export const sanitizeText = (text: any): string => {
  if (text === null || text === undefined || text === '') {
    return 'No especificado';
  }
  
  let cleanText = String(text);
  
  // Reemplazar caracteres problemáticos
  cleanText = cleanText
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caracteres de control
    .replace(/[\u2018\u2019]/g, "'") // Comillas curvas simples
    .replace(/[\u201C\u201D]/g, '"') // Comillas curvas dobles
    .replace(/[\u2013\u2014]/g, '-') // Guiones largos
    .replace(/[\u2026]/g, '...') // Puntos suspensivos
    .replace(/[\u00A0]/g, ' ') // Espacios no separables
    .trim();
  
  return cleanText || 'No especificado';
};

/**
 * FUNCIÓN NUEVA: Agregar texto seguro al PDF
 */
export const addSafeTextToPDF = (
  pdf: any, 
  text: any, 
  x: number, 
  y: number, 
  options?: any
): void => {
  const safeText = sanitizeText(text);
  
  try {
    if (options) {
      pdf.text(safeText, x, y, options);
    } else {
      pdf.text(safeText, x, y);
    }
  } catch (error) {
    console.warn('Error agregando texto al PDF:', error);
    try {
      const fallbackText = String(text || 'Error').replace(/[^\x20-\x7E]/g, '?');
      pdf.text(fallbackText, x, y, options);
    } catch (fallbackError) {
      console.error('Error crítico en PDF:', fallbackError);
      pdf.text('Error de texto', x, y, options);
    }
  }
};

/**
 * FUNCIÓN MEJORADA: Convertir cualquier valor a Date
 */
export const toDate = (value: any): Date => {
  if (!value) return new Date();
  
  if (value instanceof Date) return value;
  
  if (value.toDate && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      console.warn('Error convirtiendo Timestamp a Date:', error);
      return new Date();
    }
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  return new Date();
};

/**
 * FUNCIÓN MEJORADA: Formateo seguro de moneda (evita valores null)
 */
export const formatCurrency = (amount: any): string => {
  if (amount === null || amount === undefined || amount === '') {
    return '$0,00';
  }
  
  const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
  
  if (isNaN(numAmount)) {
    return '$0,00';
  }
  
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  } catch (error) {
    console.warn('Error formateando moneda:', error);
    return `$${numAmount.toFixed(2)}`;
  }
};

/**
 * FUNCIÓN MEJORADA: Formateo seguro de fecha
 */
export const formatDate = (date: any): string => {
  if (!date) {
    return 'Sin fecha';
  }
  
  try {
    const dateObj = toDate(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.warn('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
};

/**
 * FUNCIÓN MEJORADA: Formateo seguro de fecha y hora
 */
export const formatDateTime = (date: any): string => {
  if (!date) {
    return 'Sin fecha';
  }
  
  try {
    const dateObj = toDate(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return `${dateObj.toLocaleDateString('es-ES')} ${dateObj.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } catch (error) {
    console.warn('Error formateando fecha y hora:', error);
    return 'Fecha inválida';
  }
};

/**
 * FUNCIÓN MEJORADA: Configuración común de PDF con caracteres seguros
 */
export const setupPDFHeader = (
  pdf: any, 
  title: string, 
  subtitle: string, 
  lubricentroName: string
): number => {
  let yPos = 20;
  const primaryColor = REPORT_COLORS.primary;
  
  // Configurar soporte para caracteres especiales
  try {
    pdf.setFont('helvetica', 'normal');
    if (pdf.setCharSet) {
      pdf.setCharSet('utf-8');
    }
  } catch (error) {
    console.warn('Error configurando charset PDF:', error);
  }
  
  // Header con fondo
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, 210, 35, 'F');
  
  // Título principal
  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  addSafeTextToPDF(pdf, title, 105, 18, { align: 'center' });
  
  // Subtítulo
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  addSafeTextToPDF(pdf, subtitle || lubricentroName, 105, 26, { align: 'center' });
  
  // Fecha de generación
  pdf.setFontSize(10);
  addSafeTextToPDF(pdf, `Generado el ${formatDate(new Date())}`, 105, 31, { align: 'center' });
  
  return 50;
};

/**
 * FUNCIÓN MEJORADA: Configuración de pie de página con texto seguro
 */
export const setupPDFFooter = (
  pdf: any, 
  lubricentroName: string, 
  reportTitle: string
): void => {
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    pdf.setDrawColor(REPORT_COLORS.primary[0], REPORT_COLORS.primary[1], REPORT_COLORS.primary[2]);
    pdf.setLineWidth(0.5);
    pdf.line(20, 280, 190, 280);
    
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    addSafeTextToPDF(pdf, `${sanitizeText(reportTitle)} - ${sanitizeText(lubricentroName)}`, 20, 285);
    addSafeTextToPDF(pdf, `Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
    addSafeTextToPDF(pdf, `Generado por Sistema HISMA el ${formatDate(new Date())}`, 105, 290, { align: 'center' });
  }
};

/**
 * FUNCIÓN MEJORADA: Creación de caja estadística
 */
export const createStatBox = (
  pdf: any,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: any,
  color: number[]
): void => {
  // Fondo de la caja
  pdf.setFillColor(color[0], color[1], color[2]);
  
  // Usar roundedRect si está disponible, sino rect normal
  try {
    if (typeof pdf.roundedRect === 'function') {
      pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    } else {
      pdf.rect(x, y, width, height, 'F');
    }
  } catch (error) {
    pdf.rect(x, y, width, height, 'F');
  }
  
  // Texto del valor
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  const formattedValue = sanitizeText(String(value));
  addSafeTextToPDF(pdf, formattedValue, x + width/2, y + height/2 + 2, { align: 'center' });
  
  // Etiqueta
  pdf.setFontSize(8);
  addSafeTextToPDF(pdf, sanitizeText(label), x + width/2, y + height - 4, { align: 'center' });
};

/**
 * FUNCIÓN NUEVA: Generar nombre de archivo seguro
 */
export const generateFileName = (
  reportType: string,
  lubricentroName: string,
  extension: string = 'pdf'
): string => {
  const safeReportType = sanitizeText(reportType).replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const safeLubricentroName = sanitizeText(lubricentroName).replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  const dateStr = formatDate(new Date()).replace(/\//g, '-');
  
  return `${safeReportType}_${safeLubricentroName}_${dateStr}.${extension}`;
};

/**
 * FUNCIÓN NUEVA: Limpiar datos de cambio de aceite
 */
export const cleanOilChangeData = (oilChange: any): any => {
  return {
    ...oilChange,
    nombreCliente: sanitizeText(oilChange.nombreCliente),
    dominioVehiculo: sanitizeText(oilChange.dominioVehiculo),
    marcaVehiculo: sanitizeText(oilChange.marcaVehiculo),
    modeloVehiculo: sanitizeText(oilChange.modeloVehiculo),
    tipoVehiculo: sanitizeText(oilChange.tipoVehiculo),
    marcaAceite: sanitizeText(oilChange.marcaAceite),
    tipoAceite: sanitizeText(oilChange.tipoAceite),
    sae: sanitizeText(oilChange.sae),
    nombreOperario: sanitizeText(oilChange.nombreOperario),
    observaciones: sanitizeText(oilChange.observaciones),
    celular: sanitizeText(oilChange.celular),
    kmActuales: typeof oilChange.kmActuales === 'number' ? oilChange.kmActuales : 0,
    kmProximo: typeof oilChange.kmProximo === 'number' ? oilChange.kmProximo : 0,
    cantidadAceite: typeof oilChange.cantidadAceite === 'number' ? oilChange.cantidadAceite : 0,
    añoVehiculo: typeof oilChange.añoVehiculo === 'number' ? oilChange.añoVehiculo : new Date().getFullYear(),
    nroCambio: sanitizeText(oilChange.nroCambio)
  };
};

/**
 * FUNCIÓN NUEVA: Limpiar datos de garantía
 */
export const cleanWarrantyData = (warranty: any): any => {
  return {
    ...warranty,
    marca: sanitizeText(warranty.marca),
    modelo: sanitizeText(warranty.modelo),
    descripcion: sanitizeText(warranty.descripcion),
    clienteNombre: sanitizeText(warranty.clienteNombre),
    clienteTelefono: sanitizeText(warranty.clienteTelefono),
    clienteEmail: sanitizeText(warranty.clienteEmail),
    vehiculoDominio: sanitizeText(warranty.vehiculoDominio),
    vehiculoMarca: sanitizeText(warranty.vehiculoMarca),
    vehiculoModelo: sanitizeText(warranty.vehiculoModelo),
    numeroSerie: sanitizeText(warranty.numeroSerie),
    facturaNumero: sanitizeText(warranty.facturaNumero),
    observaciones: sanitizeText(warranty.observaciones),
    precio: typeof warranty.precio === 'number' ? warranty.precio : 0,
    garantiaMeses: typeof warranty.garantiaMeses === 'number' ? warranty.garantiaMeses : 0,
    garantiaKilometros: typeof warranty.garantiaKilometros === 'number' ? warranty.garantiaKilometros : 0,
    kilometrajeVenta: typeof warranty.kilometrajeVenta === 'number' ? warranty.kilometrajeVenta : 0
  };
};

/**
 * FUNCIÓN MEJORADA: Parsear rango de fechas
 */
export const parseDateRange = (dateRange: string, fallbackData?: OilChange[]): {
  startDate: Date;
  endDate: Date;
  daysInPeriod: number;
} => {
  // Intentar parsear el rango de fechas
  if (dateRange && dateRange.includes(' - ')) {
    try {
      const dates = dateRange.split(' - ').map(d => d.trim());
      
      const parseDate = (dateStr: string): Date => {
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      };
      
      const startDate = parseDate(dates[0]);
      const endDate = parseDate(dates[1]);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return { startDate, endDate, daysInPeriod: Math.max(1, daysInPeriod) };
      }
    } catch (error) {
      console.warn('Error parseando fechas del rango:', error);
    }
  }
  
  // Fallback usando datos
  if (fallbackData && fallbackData.length > 0) {
    const serviceDates = fallbackData.map(change => toDate(change.fecha))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (serviceDates.length > 0) {
      const startDate = serviceDates[0];
      const endDate = serviceDates[serviceDates.length - 1];
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { startDate, endDate, daysInPeriod: Math.max(1, daysInPeriod) };
    }
  }
  
  // Fallback final
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  return { startDate, endDate, daysInPeriod: 30 };
};

/**
 * Análisis de datos de cambios de aceite
 */
export const analyzeOilChanges = (changes: OilChange[]) => {
  if (!changes || changes.length === 0) {
    return {
      vehicleAnalysis: { brands: [], models: [], years: [] },
      lubricantAnalysis: { brands: [], types: [], viscosities: [] },
      serviceAnalysis: { additionalServices: [], revenue: 0 },
      profitabilityAnalysis: { tickets: [], customers: [] }
    };
  }

  // Limpiar datos antes de procesar
  const cleanChanges = changes.map(cleanOilChangeData);

  // Análisis de vehículos
  const vehicleBrands = cleanChanges.reduce((acc, change) => {
    acc[change.marcaVehiculo] = (acc[change.marcaVehiculo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const vehicleModels = cleanChanges.reduce((acc, change) => {
    const key = `${change.marcaVehiculo} ${change.modeloVehiculo}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Análisis de lubricantes
  const oilBrands = cleanChanges.reduce((acc, change) => {
    acc[change.marcaAceite] = (acc[change.marcaAceite] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    vehicleAnalysis: {
      brands: Object.entries(vehicleBrands).map(([brand, count]) => ({ brand, count })),
      models: Object.entries(vehicleModels).map(([model, count]) => ({ model, count })),
      years: []
    },
    lubricantAnalysis: {
      brands: Object.entries(oilBrands).map(([brand, count]) => ({ brand, count })),
      types: [],
      viscosities: []
    },
    serviceAnalysis: { additionalServices: [], revenue: 0 },
    profitabilityAnalysis: { tickets: [], customers: [] }
  };
};