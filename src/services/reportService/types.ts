// src/services/reportService/types.ts
import { OilChange, User, Warranty } from '../../types';

/**
 * Tipos para el sistema de reportes modularizado
 */

// Tipos base para reportes
export interface BaseReportData {
  lubricentroName: string;
  dateRange: string;
  generatedAt: Date;
}

// Datos para reportes de cambios de aceite
export interface OilChangeReportData extends BaseReportData {
  changes: OilChange[];
  totalServices: number;
  averageDaily: number;
  monthlyGrowth: number;
}

// Datos para reportes de operadores
export interface OperatorReportData extends BaseReportData {
  operator: User;
  changes: OilChange[];
  totalServices: number;
  uniqueVehicles: number;
  averageDaily: number;
}

// Datos para reportes de vehículos
export interface VehicleReportData extends BaseReportData {
  vehicleDomain: string;
  changes: OilChange[];
  totalServices: number;
  kmTraveled: number;
  averageKmBetweenChanges: number;
}

// Datos para reportes de garantías - NUEVO
export interface WarrantyReportData extends BaseReportData {
  warranties: Warranty[];
  stats: {
    total: number;
    vigentes: number;
    vencidas: number;
    reclamadas: number;
    vencenEn30Dias: number;
    vencenEn7Dias: number;
    totalFacturado: number;
    categoriasMasVendidas: { categoria: string; cantidad: number }[];
    marcasMasVendidas: { marca: string; cantidad: number }[];
  };
}

// Datos para análisis avanzado - NUEVO
export interface AdvancedAnalysisData extends BaseReportData {
  vehicleAnalysis: {
    brandDistribution: { marca: string; cantidad: number; porcentaje: number }[];
    modelsByBrand: { marca: string; modelos: { modelo: string; cantidad: number }[] }[];
    yearDistribution: { año: number; cantidad: number; tipo: 'nuevo' | 'usado' }[];
    averageKmByBrand: { marca: string; kmPromedio: number }[];
    fleetAnalysis: { tipo: 'particular' | 'comercial'; cantidad: number; porcentaje: number }[];
  };
  lubricantAnalysis: {
    oilBrands: { marca: string; cantidad: number; porcentaje: number }[];
    oilTypes: { tipo: string; cantidad: number; porcentaje: number }[];
    viscosities: { viscosidad: string; cantidad: number; porcentaje: number }[];
    brandVehicleCorrelation: { marcaVehiculo: string; aceitePreferido: string; frecuencia: number }[];
  };
  serviceAnalysis: {
    airFilterPercentage: number;
    fuelFilterPercentage: number;
    cabinFilterPercentage: number;
    additionalServicesRevenue: number;
    servicesByVehicleType: { tipoVehiculo: string; servicios: string[]; porcentaje: number }[];
  };
  profitabilityAnalysis: {
    averageTicketByVehicleType: { tipoVehiculo: string; ticketPromedio: number }[];
    mostProfitableServices: { servicio: string; margen: number; frecuencia: number }[];
    topCustomers: { cliente: string; servicios: number; gasto: number }[];
    monthlyRevenue: { mes: string; ingresos: number }[];
  };
}

// Configuración de reportes
export interface ReportConfig {
  includeCharts: boolean;
  includeRecommendations: boolean;
  includeDetailedData: boolean;
  maxRecordsPerSection: number;
  language: 'es' | 'en';
}

// Tipos de reportes disponibles
export type ReportType = 
  | 'oil_changes'
  | 'operators'
  | 'vehicles'
  | 'warranties'
  | 'evolution'
  | 'upcoming_changes'
  | 'advanced_analysis';

// Formato de exportación
export type ExportFormat = 'pdf' | 'excel' | 'csv';

// Interfaz para generadores de reportes
export interface ReportGenerator<T extends BaseReportData> {
  generatePDF(data: T, config?: ReportConfig): Promise<void>;
  exportToExcel(data: T, config?: ReportConfig): Promise<void>;
}

// Utilidades para fechas
export interface DateRange {
  startDate: Date;
  endDate: Date;
  daysInPeriod: number;
}

// Colores para gráficos y reportes
export const REPORT_COLORS = {
  primary: [46, 125, 50] as number[],
  secondary: [27, 94, 32] as number[],
  success: [76, 175, 80] as number[],
  warning: [255, 152, 0] as number[],
  error: [244, 67, 54] as number[],
  info: [33, 150, 243] as number[],
  chart: ['#4caf50', '#66bb6a', '#81c784', '#2196f3', '#64b5f6', '#ff9800', '#ffb74d']
};