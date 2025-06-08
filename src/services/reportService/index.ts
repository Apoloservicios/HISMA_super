// src/services/reportService/index.ts
import { OilChangeStats, OperatorStats, OilChange, User, Warranty } from '../../types';
import { WarrantyStats } from '../../types/warranty';
import { 
  OilChangeReportData, 
  OperatorReportData, 
  VehicleReportData, 
  WarrantyReportData,
  AdvancedAnalysisData,
  ReportConfig,
  ReportType,
  ExportFormat 
} from './types';
import { WarrantyReportGenerator } from './warrantyReportGenerator';
import { AdvancedAnalysisGenerator } from './advancedAnalysisGenerator';
import { analyzeOilChanges, generateFileName, toDate } from './utils';

/**
 * NUEVO SERVICIO DE REPORTES MODULARIZADO
 * Versión refactorizada y mejorada del reportService original
 */
class ReportService {
  private warrantyGenerator: WarrantyReportGenerator;
  private advancedGenerator: AdvancedAnalysisGenerator;
  
  constructor() {
    this.warrantyGenerator = new WarrantyReportGenerator();
    this.advancedGenerator = new AdvancedAnalysisGenerator();
  }
  
  // ===========================================
  // REPORTES DE GARANTÍAS - NUEVA FUNCIONALIDAD
  // ===========================================
  
  /**
   * Genera reporte completo de garantías en PDF
   */
  async generateWarrantyReport(
    warranties: Warranty[],
    stats: WarrantyStats,
    lubricentroName: string,
    dateRange: string,
    config?: ReportConfig
  ): Promise<void> {
    const data: WarrantyReportData = {
      lubricentroName,
      dateRange,
      generatedAt: new Date(),
      warranties,
      stats
    };
    
    return this.warrantyGenerator.generatePDF(data, config);
  }
  
  /**
   * Exporta garantías a Excel con análisis detallado
   */
  async exportWarrantiesToExcel(
    warranties: Warranty[],
    stats: WarrantyStats,
    lubricentroName: string,
    dateRange: string,
    config?: ReportConfig
  ): Promise<void> {
    const data: WarrantyReportData = {
      lubricentroName,
      dateRange,
      generatedAt: new Date(),
      warranties,
      stats
    };
    
    return this.warrantyGenerator.exportToExcel(data, config);
  }
  
  // ===========================================
  // ANÁLISIS AVANZADO - NUEVA FUNCIONALIDAD
  // ===========================================
  
  /**
   * Genera análisis avanzado completo con métricas detalladas
   */
  async generateAdvancedAnalysis(
    oilChanges: OilChange[],
    lubricentroName: string,
    dateRange: string,
    config?: ReportConfig
  ): Promise<void> {
    // Procesar datos para análisis avanzado
    const analysis = analyzeOilChanges(oilChanges);
    
    const data: AdvancedAnalysisData = {
      lubricentroName,
      dateRange,
      generatedAt: new Date(),
      vehicleAnalysis: {
        brandDistribution: analysis.vehicleAnalysis.brands,
        modelsByBrand: this.groupModelsByBrand(oilChanges),
        yearDistribution: this.analyzeVehicleYears(oilChanges),
        averageKmByBrand: this.calculateAverageKmByBrand(oilChanges),
        fleetAnalysis: this.analyzeFleetTypes(oilChanges)
      },
      lubricantAnalysis: {
        oilBrands: analysis.lubricantAnalysis.brands,
        oilTypes: analysis.lubricantAnalysis.types,
        viscosities: analysis.lubricantAnalysis.viscosities,
        brandVehicleCorrelation: this.analyzeBrandVehicleCorrelation(oilChanges)
      },
      serviceAnalysis: {
        airFilterPercentage: analysis.serviceAnalysis.airFilterPercentage || 0,
        fuelFilterPercentage: analysis.serviceAnalysis.fuelFilterPercentage || 0,
        cabinFilterPercentage: analysis.serviceAnalysis.cabinFilterPercentage || 0,
        additionalServicesRevenue: 0, // Se puede calcular si se tienen precios
        servicesByVehicleType: this.analyzeServicesByVehicleType(oilChanges)
      },
      profitabilityAnalysis: {
        averageTicketByVehicleType: this.calculateTicketByVehicleType(oilChanges),
        mostProfitableServices: this.analyzeMostProfitableServices(oilChanges),
        topCustomers: this.analyzeTopCustomers(oilChanges),
        monthlyRevenue: this.calculateMonthlyRevenue(oilChanges)
      }
    };
    
    return this.advancedGenerator.generatePDF(data, config);
  }
  
  /**
   * Exporta análisis avanzado a Excel
   */
  async exportAdvancedAnalysisToExcel(
    oilChanges: OilChange[],
    lubricentroName: string,
    dateRange: string,
    config?: ReportConfig
  ): Promise<void> {
    const analysis = analyzeOilChanges(oilChanges);
    
    const data: AdvancedAnalysisData = {
      lubricentroName,
      dateRange,
      generatedAt: new Date(),
      vehicleAnalysis: {
        brandDistribution: analysis.vehicleAnalysis.brands,
        modelsByBrand: this.groupModelsByBrand(oilChanges),
        yearDistribution: this.analyzeVehicleYears(oilChanges),
        averageKmByBrand: this.calculateAverageKmByBrand(oilChanges),
        fleetAnalysis: this.analyzeFleetTypes(oilChanges)
      },
      lubricantAnalysis: {
        oilBrands: analysis.lubricantAnalysis.brands,
        oilTypes: analysis.lubricantAnalysis.types,
        viscosities: analysis.lubricantAnalysis.viscosities,
        brandVehicleCorrelation: this.analyzeBrandVehicleCorrelation(oilChanges)
      },
      serviceAnalysis: {
        airFilterPercentage: analysis.serviceAnalysis.airFilterPercentage || 0,
        fuelFilterPercentage: analysis.serviceAnalysis.fuelFilterPercentage || 0,
        cabinFilterPercentage: analysis.serviceAnalysis.cabinFilterPercentage || 0,
        additionalServicesRevenue: 0,
        servicesByVehicleType: this.analyzeServicesByVehicleType(oilChanges)
      },
      profitabilityAnalysis: {
        averageTicketByVehicleType: this.calculateTicketByVehicleType(oilChanges),
        mostProfitableServices: this.analyzeMostProfitableServices(oilChanges),
        topCustomers: this.analyzeTopCustomers(oilChanges),
        monthlyRevenue: this.calculateMonthlyRevenue(oilChanges)
      }
    };
    
    return this.advancedGenerator.exportToExcel(data, config);
  }
  
  // ===========================================
  // FUNCIONES DE ANÁLISIS DETALLADO
  // ===========================================
  
  /**
   * Agrupa modelos por marca de vehículo
   */
  private groupModelsByBrand(oilChanges: OilChange[]) {
    const brandModels: { [key: string]: { [key: string]: number } } = {};
    
    oilChanges.forEach(change => {
      const brand = change.marcaVehiculo;
      const model = change.modeloVehiculo;
      
      if (!brandModels[brand]) {
        brandModels[brand] = {};
      }
      
      brandModels[brand][model] = (brandModels[brand][model] || 0) + 1;
    });
    
    return Object.entries(brandModels).map(([marca, modelos]) => ({
      marca,
      modelos: Object.entries(modelos)
        .map(([modelo, cantidad]) => ({ modelo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
    }));
  }
  
  /**
   * Analiza distribución por años de vehículos
   */
  private analyzeVehicleYears(oilChanges: OilChange[]) {
    const yearCounts: { [key: number]: number } = {};
    const currentYear = new Date().getFullYear();
    
    oilChanges.forEach(change => {
      if (change.añoVehiculo) {
        yearCounts[change.añoVehiculo] = (yearCounts[change.añoVehiculo] || 0) + 1;
      }
    });
    
    return Object.entries(yearCounts).map(([año, cantidad]) => ({
      año: parseInt(año),
      cantidad,
      tipo: (currentYear - parseInt(año)) <= 5 ? 'nuevo' as const : 'usado' as const
    })).sort((a, b) => b.año - a.año);
  }
  
  /**
   * Calcula kilometraje promedio por marca
   */
  private calculateAverageKmByBrand(oilChanges: OilChange[]) {
    const brandKm: { [key: string]: number[] } = {};
    
    oilChanges.forEach(change => {
      const brand = change.marcaVehiculo;
      if (!brandKm[brand]) {
        brandKm[brand] = [];
      }
      brandKm[brand].push(change.kmActuales);
    });
    
    return Object.entries(brandKm).map(([marca, kms]) => ({
      marca,
      kmPromedio: Math.round(kms.reduce((sum, km) => sum + km, 0) / kms.length)
    }));
  }
  
  /**
   * Analiza tipos de flota (particular vs comercial)
   */
  private analyzeFleetTypes(oilChanges: OilChange[]) {
    // Heurística: vehículos comerciales suelen ser utilitarios, pick-ups, etc.
    const comercialTypes = ['utilitario', 'pickup', 'camion', 'van', 'furgon'];
    let particular = 0;
    let comercial = 0;
    
    oilChanges.forEach(change => {
      const tipo = change.tipoVehiculo.toLowerCase();
      if (comercialTypes.some(ct => tipo.includes(ct))) {
        comercial++;
      } else {
        particular++;
      }
    });
    
    const total = particular + comercial;
    return [
      { tipo: 'particular' as const, cantidad: particular, porcentaje: (particular / total) * 100 },
      { tipo: 'comercial' as const, cantidad: comercial, porcentaje: (comercial / total) * 100 }
    ];
  }
  
  /**
   * Analiza correlación entre marca de vehículo y aceite preferido
   */
  private analyzeBrandVehicleCorrelation(oilChanges: OilChange[]) {
    const correlations: { [key: string]: { [key: string]: number } } = {};
    
    oilChanges.forEach(change => {
      const vehicleBrand = change.marcaVehiculo;
      const oilBrand = change.marcaAceite;
      
      if (!correlations[vehicleBrand]) {
        correlations[vehicleBrand] = {};
      }
      
      correlations[vehicleBrand][oilBrand] = (correlations[vehicleBrand][oilBrand] || 0) + 1;
    });
    
    return Object.entries(correlations).map(([marcaVehiculo, aceites]) => {
      const aceitePreferido = Object.entries(aceites)
        .sort(([,a], [,b]) => b - a)[0];
      
      return {
        marcaVehiculo,
        aceitePreferido: aceitePreferido ? aceitePreferido[0] : 'N/A',
        frecuencia: aceitePreferido ? aceitePreferido[1] : 0
      };
    });
  }
  
  /**
   * Analiza servicios por tipo de vehículo
   */
  private analyzeServicesByVehicleType(oilChanges: OilChange[]) {
    const servicesByType: { [key: string]: { filtroAire: number; filtroCombustible: number; filtroHabitaculo: number; total: number } } = {};
    
    oilChanges.forEach(change => {
      const tipo = change.tipoVehiculo;
      if (!servicesByType[tipo]) {
        servicesByType[tipo] = { filtroAire: 0, filtroCombustible: 0, filtroHabitaculo: 0, total: 0 };
      }
      
      servicesByType[tipo].total++;
      if (change.filtroAire) servicesByType[tipo].filtroAire++;
      if (change.filtroCombustible) servicesByType[tipo].filtroCombustible++;
      if (change.filtroHabitaculo) servicesByType[tipo].filtroHabitaculo++;
    });
    
    return Object.entries(servicesByType).map(([tipoVehiculo, stats]) => {
      const servicios = [];
      if (stats.filtroAire / stats.total > 0.3) servicios.push('Filtro Aire');
      if (stats.filtroCombustible / stats.total > 0.3) servicios.push('Filtro Combustible');
      if (stats.filtroHabitaculo / stats.total > 0.3) servicios.push('Filtro Habitáculo');
      
      return {
        tipoVehiculo,
        servicios,
        porcentaje: servicios.length > 0 ? ((servicios.length / 3) * 100) : 0
      };
    });
  }
  
  /**
   * Calcula ticket promedio por tipo de vehículo
   */
  private calculateTicketByVehicleType(oilChanges: OilChange[]) {
    // Para este cálculo necesitaríamos precios, por ahora estimamos basado en cantidad de aceite
    const ticketsByType: { [key: string]: number[] } = {};
    
    oilChanges.forEach(change => {
      const tipo = change.tipoVehiculo;
      if (!ticketsByType[tipo]) {
        ticketsByType[tipo] = [];
      }
      
      // Estimación básica: cantidad de aceite * precio estimado + servicios adicionales
      let estimatedTicket = change.cantidadAceite * 800; // Precio estimado por litro
      if (change.filtroAceite) estimatedTicket += 1500;
      if (change.filtroAire) estimatedTicket += 1200;
      if (change.filtroCombustible) estimatedTicket += 2000;
      if (change.filtroHabitaculo) estimatedTicket += 1800;
      
      ticketsByType[tipo].push(estimatedTicket);
    });
    
    return Object.entries(ticketsByType).map(([tipoVehiculo, tickets]) => ({
      tipoVehiculo,
      ticketPromedio: Math.round(tickets.reduce((sum, ticket) => sum + ticket, 0) / tickets.length)
    }));
  }
  
  /**
   * Analiza servicios más rentables
   */
  private analyzeMostProfitableServices(oilChanges: OilChange[]) {
    const services = [
      { servicio: 'Cambio de Aceite', margen: 40, frecuencia: oilChanges.length },
      { servicio: 'Filtro de Aceite', margen: 60, frecuencia: oilChanges.filter(c => c.filtroAceite).length },
      { servicio: 'Filtro de Aire', margen: 70, frecuencia: oilChanges.filter(c => c.filtroAire).length },
      { servicio: 'Filtro de Combustible', margen: 65, frecuencia: oilChanges.filter(c => c.filtroCombustible).length },
      { servicio: 'Filtro de Habitáculo', margen: 75, frecuencia: oilChanges.filter(c => c.filtroHabitaculo).length }
    ];
    
    return services.sort((a, b) => (b.margen * b.frecuencia) - (a.margen * a.frecuencia));
  }
  
  /**
   * Analiza top clientes más valiosos
   */
  private analyzeTopCustomers(oilChanges: OilChange[]) {
    const customerStats: { [key: string]: { servicios: number; gasto: number } } = {};
    
    oilChanges.forEach(change => {
      const cliente = change.nombreCliente;
      if (!customerStats[cliente]) {
        customerStats[cliente] = { servicios: 0, gasto: 0 };
      }
      
      customerStats[cliente].servicios++;
      
      // Estimación de gasto
      let estimatedCost = change.cantidadAceite * 800;
      if (change.filtroAceite) estimatedCost += 1500;
      if (change.filtroAire) estimatedCost += 1200;
      if (change.filtroCombustible) estimatedCost += 2000;
      if (change.filtroHabitaculo) estimatedCost += 1800;
      
      customerStats[cliente].gasto += estimatedCost;
    });
    
    return Object.entries(customerStats)
      .map(([cliente, stats]) => ({ cliente, ...stats }))
      .sort((a, b) => b.gasto - a.gasto)
      .slice(0, 20);
  }
  
  /**
   * Calcula ingresos mensuales estimados
   */
  private calculateMonthlyRevenue(oilChanges: OilChange[]) {
    const monthlyRevenue: { [key: string]: number } = {};
    
    oilChanges.forEach(change => {
      const date = toDate(change.fecha);
      const monthKey = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      
      // Estimación de ingresos
      let revenue = change.cantidadAceite * 800;
      if (change.filtroAceite) revenue += 1500;
      if (change.filtroAire) revenue += 1200;
      if (change.filtroCombustible) revenue += 2000;
      if (change.filtroHabitaculo) revenue += 1800;
      
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + revenue;
    });
    
    return Object.entries(monthlyRevenue).map(([mes, ingresos]) => ({
      mes,
      ingresos
    }));
  }
  
  // ===========================================
  // FUNCIONES DE EXPORTACIÓN HEREDADAS (MANTENEMOS COMPATIBILIDAD)
  // ===========================================
  
  /**
   * Exporta datos genéricos a Excel
   */
  async exportToExcel(data: any[], sheetName: string = 'Reporte'): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      
      if (!data || data.length === 0) {
        throw new Error('No hay datos para exportar');
      }
      
      const sanitizedSheetName = sheetName.substring(0, 31);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Configurar anchos de columna
      const colWidths = Object.keys(data[0]).map(key => {
        const maxLength = Math.max(
          key.length,
          ...data.map(row => String(row[key] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);
      
      // Crear hoja de resumen
      const summaryData = [
        { Métrica: 'Total de Registros', Valor: data.length },
        { Métrica: 'Fecha de Exportación', Valor: new Date().toLocaleDateString('es-ES') },
        { Métrica: 'Hora de Exportación', Valor: new Date().toLocaleTimeString('es-ES') }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
      
      const fileName = generateFileName(sanitizedSheetName, 'Exportacion', 'xlsx');
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      throw new Error(`Error al exportar a Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  // ===========================================
  // FUNCIONES HEREDADAS PARA COMPATIBILIDAD
  // ===========================================
  
  /**
   * Genera reporte específico de operador (COMPATIBILIDAD)
   */
  async generateOperatorReport(
    operator: User,
    operatorChanges: OilChange[],
    lubricentroName: string,
    dateRange: string
  ): Promise<void> {
    try {
      const jsPDF = await import('jspdf');
      const pdf = new jsPDF.default();
      
      let yPos = 20;
      const primaryColor = [46, 125, 50];
      
      // Título
      pdf.setFontSize(18);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`REPORTE DE OPERADOR`, 105, yPos, { align: 'center' });
      yPos += 8;
      
      pdf.setFontSize(16);
      pdf.text(`${operator.nombre} ${operator.apellido}`, 105, yPos, { align: 'center' });
      yPos += 10;
      
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(lubricentroName, 105, yPos, { align: 'center' });
      yPos += 5;
      pdf.text(`Período: ${dateRange}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Estadísticas básicas
      const totalServices = operatorChanges.length;
      const uniqueVehicles = Array.from(new Set(operatorChanges.map(c => c.dominioVehiculo))).length;
      
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTADÍSTICAS DE RENDIMIENTO', 20, yPos);
      yPos += 10;
      
      const stats = [
        ['Servicios realizados:', totalServices.toString()],
        ['Vehículos únicos atendidos:', uniqueVehicles.toString()],
        ['Promedio por día:', (totalServices / 30).toFixed(1)]
      ];
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      stats.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 90, yPos);
        yPos += 6;
      });
      
      // Guardar
      const fileName = `Reporte_Operador_${operator.nombre}_${operator.apellido}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error al generar reporte de operador:', error);
      throw error;
    }
  }
  
  /**
   * Exporta estadísticas de operadores a Excel (COMPATIBILIDAD)
   */
  async exportOperatorStatsToExcel(
    operatorStats: OperatorStats[],
    lubricentroName: string,
    dateRange: string
  ): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      
      if (!operatorStats || operatorStats.length === 0) {
        throw new Error('No hay estadísticas de operadores para exportar');
      }
      
      const totalServices = operatorStats.reduce((sum, op) => sum + op.count, 0);
      
      const excelData = operatorStats.map((operator, index) => ({
        'Posición': index + 1,
        'Operario': operator.operatorName,
        'Cantidad de Servicios': operator.count,
        'Porcentaje del Total': `${((operator.count / totalServices) * 100).toFixed(1)}%`,
        'Promedio Diario': (operator.count / 30).toFixed(1)
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 18 }, 
        { wch: 15 }, { wch: 15 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Estadisticas_Operadores');
      
      const fileName = `Reporte_Operadores_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error al exportar estadísticas de operadores:', error);
      throw error;
    }
  }
  
  /**
   * Genera reporte específico de vehículo (COMPATIBILIDAD)
   */
  async generateVehicleReport(
    vehicleChanges: OilChange[],
    vehicleDomain: string,
    lubricentroName: string
  ): Promise<void> {
    try {
      if (!vehicleChanges || vehicleChanges.length === 0) {
        throw new Error('No hay datos del vehículo para generar el reporte');
      }
      
      const jsPDF = await import('jspdf');
      const pdf = new jsPDF.default();
      
      let yPos = 20;
      const primaryColor = [46, 125, 50];
      
      // Título
      pdf.setFontSize(18);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`HISTORIAL DEL VEHÍCULO: ${vehicleDomain}`, 105, yPos, { align: 'center' });
      yPos += 10;
      
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text(lubricentroName, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Información básica del vehículo
      const latestChange = vehicleChanges[0];
      const totalChanges = vehicleChanges.length;
      
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMACIÓN DEL VEHÍCULO', 20, yPos);
      yPos += 10;
      
      const vehicleInfo = [
        ['Dominio:', latestChange.dominioVehiculo],
        ['Marca:', latestChange.marcaVehiculo],
        ['Modelo:', latestChange.modeloVehiculo],
        ['Tipo:', latestChange.tipoVehiculo],
        ['Cliente:', latestChange.nombreCliente],
        ['Total de cambios:', totalChanges.toString()]
      ];
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      vehicleInfo.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 70, yPos);
        yPos += 6;
      });
      
      // Guardar
      const fileName = `Historial_Vehiculo_${vehicleDomain}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error al generar reporte de vehículo:', error);
      throw error;
    }
  }
}

// Instancia única del servicio
const reportServiceInstance = new ReportService();

// Exportar métodos para mantener compatibilidad con código existente
export const generateWarrantyReport = (warranties: Warranty[], stats: WarrantyStats, lubricentroName: string, dateRange: string) => 
  reportServiceInstance.generateWarrantyReport(warranties, stats, lubricentroName, dateRange);

export const exportWarrantiesToExcel = (warranties: Warranty[], stats: WarrantyStats, lubricentroName: string, dateRange: string) => 
  reportServiceInstance.exportWarrantiesToExcel(warranties, stats, lubricentroName, dateRange);

export const generateAdvancedAnalysis = (oilChanges: OilChange[], lubricentroName: string, dateRange: string) => 
  reportServiceInstance.generateAdvancedAnalysis(oilChanges, lubricentroName, dateRange);

export const exportAdvancedAnalysisToExcel = (oilChanges: OilChange[], lubricentroName: string, dateRange: string) => 
  reportServiceInstance.exportAdvancedAnalysisToExcel(oilChanges, lubricentroName, dateRange);

export const exportToExcel = (data: any[], sheetName: string) => 
  reportServiceInstance.exportToExcel(data, sheetName);

// ✅ NUEVAS EXPORTACIONES PARA COMPATIBILIDAD
export const generateOperatorReport = (operator: User, operatorChanges: OilChange[], lubricentroName: string, dateRange: string) =>
  reportServiceInstance.generateOperatorReport(operator, operatorChanges, lubricentroName, dateRange);

export const exportOperatorStatsToExcel = (operatorStats: OperatorStats[], lubricentroName: string, dateRange: string) =>
  reportServiceInstance.exportOperatorStatsToExcel(operatorStats, lubricentroName, dateRange);

export const generateVehicleReport = (vehicleChanges: OilChange[], vehicleDomain: string, lubricentroName: string) =>
  reportServiceInstance.generateVehicleReport(vehicleChanges, vehicleDomain, lubricentroName);

// Exportar también la clase para uso avanzado
export { ReportService };

// Exportar tipos
export * from './types';

export default reportServiceInstance;