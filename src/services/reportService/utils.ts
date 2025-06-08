// src/services/reportService/utils.ts
import { DateRange, REPORT_COLORS } from './types';
import { OilChange } from '../../types';

/**
 * Utilidades comunes para el sistema de reportes
 */

/**
 * Conversión segura de fechas
 */
export const toDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

/**
 * Parseo seguro de rangos de fechas
 */
export const parseDateRange = (dateRangeStr: string, fallbackData: OilChange[] = []): DateRange => {
  const dates = dateRangeStr.split(' - ');
  if (dates.length === 2) {
    try {
      const parseDate = (dateStr: string): Date => {
        if (dateStr.includes('/')) {
          const parts = dateStr.trim().split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
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
 * Formateo de moneda argentina
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount);
};

/**
 * Formateo de fecha en español
 */
export const formatDate = (date: Date | any): string => {
  return toDate(date).toLocaleDateString('es-ES');
};

/**
 * Formateo de fecha y hora
 */
export const formatDateTime = (date: Date | any): string => {
  const d = toDate(date);
  return `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;
};

/**
 * Configuración común de PDF
 */
export const setupPDFHeader = (
  pdf: any, 
  title: string, 
  subtitle: string, 
  lubricentroName: string
): number => {
  let yPos = 20;
  const primaryColor = REPORT_COLORS.primary;
  
  // Header con fondo
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, 210, 35, 'F');
  
  // Título principal
  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 105, 18, { align: 'center' });
  
  // Subtítulo
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(subtitle || lubricentroName, 105, 26, { align: 'center' });
  
  // Fecha de generación
  pdf.setFontSize(10);
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, 31, { align: 'center' });
  
  return 50; // Retorna la posición Y después del header
};

/**
 * Configuración de pie de página
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
    pdf.text(`${reportTitle} - ${lubricentroName}`, 20, 285);
    pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
    pdf.text(`Generado por Sistema HISMA el ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
  }
};

/**
 * Creación de caja estadística visual
 */
export const createStatBox = (
  pdf: any,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  color: number[]
): void => {
  // Fondo de la caja
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.roundedRect(x, y, width, height, 3, 3, 'F');
  
  // Texto en blanco
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width/2, y + 6, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.text(value, x + width/2, y + 15, { align: 'center' });
  
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.text('unidades', x + width/2, y + 20, { align: 'center' });
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

  // Análisis de vehículos
  const vehicleBrands = changes.reduce((acc, change) => {
    acc[change.marcaVehiculo] = (acc[change.marcaVehiculo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const vehicleModels = changes.reduce((acc, change) => {
    const key = `${change.marcaVehiculo} ${change.modeloVehiculo}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Análisis de lubricantes
  const oilBrands = changes.reduce((acc, change) => {
    acc[change.marcaAceite] = (acc[change.marcaAceite] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const oilTypes = changes.reduce((acc, change) => {
    acc[change.tipoAceite] = (acc[change.tipoAceite] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const viscosities = changes.reduce((acc, change) => {
    acc[change.sae] = (acc[change.sae] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Análisis de servicios adicionales
  const totalServices = changes.length;
  const airFilterCount = changes.filter(c => c.filtroAire).length;
  const fuelFilterCount = changes.filter(c => c.filtroCombustible).length;
  const cabinFilterCount = changes.filter(c => c.filtroHabitaculo).length;

  return {
    vehicleAnalysis: {
      brands: Object.entries(vehicleBrands)
        .map(([marca, cantidad]) => ({ marca, cantidad, porcentaje: (cantidad / totalServices) * 100 }))
        .sort((a, b) => b.cantidad - a.cantidad),
      models: Object.entries(vehicleModels)
        .map(([modelo, cantidad]) => ({ modelo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10),
      years: [] // Se puede implementar si se tiene el campo año
    },
    lubricantAnalysis: {
      brands: Object.entries(oilBrands)
        .map(([marca, cantidad]) => ({ marca, cantidad, porcentaje: (cantidad / totalServices) * 100 }))
        .sort((a, b) => b.cantidad - a.cantidad),
      types: Object.entries(oilTypes)
        .map(([tipo, cantidad]) => ({ tipo, cantidad, porcentaje: (cantidad / totalServices) * 100 }))
        .sort((a, b) => b.cantidad - a.cantidad),
      viscosities: Object.entries(viscosities)
        .map(([viscosidad, cantidad]) => ({ viscosidad, cantidad, porcentaje: (cantidad / totalServices) * 100 }))
        .sort((a, b) => b.cantidad - a.cantidad)
    },
    serviceAnalysis: {
      airFilterPercentage: totalServices > 0 ? (airFilterCount / totalServices) * 100 : 0,
      fuelFilterPercentage: totalServices > 0 ? (fuelFilterCount / totalServices) * 100 : 0,
      cabinFilterPercentage: totalServices > 0 ? (cabinFilterCount / totalServices) * 100 : 0,
      additionalServicesRevenue: 0, // Se puede calcular si se tienen precios
      servicesByVehicleType: []
    },
    profitabilityAnalysis: {
      averageTicketByVehicleType: [],
      mostProfitableServices: [],
      topCustomers: [],
      monthlyRevenue: []
    }
  };
};

/**
 * Sanitización de nombres de archivo
 */
export const sanitizeFileName = (fileName: string, maxLength: number = 50): string => {
  return fileName
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, '_') // Reemplazar espacios por guiones bajos
    .substring(0, maxLength); // Limitar longitud
};

/**
 * Generación de nombres de archivo únicos
 */
export const generateFileName = (
  reportType: string, 
  lubricentroName: string, 
  extension: string
): string => {
  const date = new Date().toISOString().split('T')[0];
  const safeName = sanitizeFileName(lubricentroName);
  return `${reportType}_${safeName}_${date}.${extension}`;
};