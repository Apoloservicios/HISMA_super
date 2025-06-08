// src/services/reportService/advancedAnalysisGenerator.ts
import { OilChange } from '../../types';
import { 
  AdvancedAnalysisData, 
  ReportGenerator, 
  ReportConfig, 
  REPORT_COLORS 
} from './types';
import { 
  toDate, 
  formatDate, 
  formatCurrency, 
  setupPDFHeader, 
  setupPDFFooter,
  createStatBox,
  generateFileName,
  analyzeOilChanges 
} from './utils';

/**
 * Generador de análisis avanzado con métricas detalladas
 */
export class AdvancedAnalysisGenerator implements ReportGenerator<AdvancedAnalysisData> {
  
  /**
   * Genera un reporte PDF con análisis avanzado completo
   */
  async generatePDF(data: AdvancedAnalysisData, config?: ReportConfig): Promise<void> {
    try {
      const jsPDF = await import('jspdf');
      const pdf = new jsPDF.default();
      
      const primaryColor = REPORT_COLORS.primary;
      const chartColors = REPORT_COLORS.chart;
      
      // Header del reporte
      let yPos = setupPDFHeader(
        pdf,
        'ANÁLISIS AVANZADO DE OPERACIONES',
        'Métricas Detalladas e Insights Estratégicos',
        data.lubricentroName
      );
      
      // Información del período
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Período: ${data.dateRange}`, 105, yPos, { align: 'center' });
      yPos += 20;
      
      // Dashboard ejecutivo general
      pdf.setFontSize(18);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🎯 DASHBOARD EJECUTIVO', 20, yPos);
      yPos += 15;
      
      // Métricas clave en cajas visuales
      const keyMetrics = this.calculateKeyMetrics(data);
      const metricsBoxes = [
        { label: 'MARCAS VEHICULOS', value: keyMetrics.vehicleBrands.toString(), color: REPORT_COLORS.success },
        { label: 'TIPOS ACEITE', value: keyMetrics.oilTypes.toString(), color: REPORT_COLORS.info },
        { label: 'SERVICIOS EXTRA', value: `${keyMetrics.additionalServicesRate}%`, color: REPORT_COLORS.warning },
        { label: 'TICKET PROMEDIO', value: keyMetrics.averageTicket, color: REPORT_COLORS.error }
      ];
      
      const boxWidth = 42;
      const boxHeight = 25;
      let xStart = 20;
      
      metricsBoxes.forEach((metric) => {
        createStatBox(pdf, xStart, yPos, boxWidth, boxHeight, metric.label, metric.value, metric.color);
        xStart += boxWidth + 5;
      });
      
      yPos += 35;
      
      // ===========================================
      // SECCIÓN 1: ANÁLISIS DE VEHÍCULOS
      // ===========================================
      pdf.addPage();
      yPos = 20;
      
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🚗 ANÁLISIS DETALLADO DE VEHÍCULOS', 105, 18, { align: 'center' });
      
      yPos = 45;
      
      // Top 10 marcas más atendidas
      pdf.setFontSize(14);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOP 10 MARCAS MÁS ATENDIDAS', 20, yPos);
      yPos += 12;
      
      data.vehicleAnalysis.brandDistribution.slice(0, 10).forEach((brand, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        
        // Ranking visual
        const isTop3 = index < 3;
        const rankColor = isTop3 ? [255, 193, 7] : primaryColor;
        
        pdf.setFillColor(rankColor[0], rankColor[1], rankColor[2]);
        pdf.roundedRect(22, yPos - 3, 8, 8, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text((index + 1).toString(), 26, yPos + 2, { align: 'center' });
        
        // Barra de progreso
        const maxBrand = data.vehicleAnalysis.brandDistribution[0];
        const barWidth = Math.max(5, (brand.cantidad / maxBrand.cantidad) * 80);
        pdf.setFillColor(chartColors[index % chartColors.length]);
        pdf.rect(35, yPos - 2, barWidth, 4, 'F');
        
        // Información de la marca
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`${brand.marca}`, 120, yPos + 1);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${brand.cantidad} servicios (${brand.porcentaje.toFixed(1)}%)`, 155, yPos + 1);
        
        yPos += 10;
      });
      
      yPos += 10;
      
      // Análisis de modelos por marca (top 5 marcas)
      pdf.setFontSize(14);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MODELOS MÁS FRECUENTES POR MARCA LÍDER', 20, yPos);
      yPos += 12;
      
      data.vehicleAnalysis.modelsByBrand.slice(0, 3).forEach((brandModels) => {
        if (yPos > 230) {
          pdf.addPage();
          yPos = 20;
        }
        
        // Header de marca
        pdf.setFillColor(248, 250, 252);
        pdf.rect(20, yPos - 3, 170, 8, 'F');
        pdf.setFontSize(11);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`📊 ${brandModels.marca}`, 25, yPos + 2);
        yPos += 12;
        
        // Top 3 modelos de esta marca
        brandModels.modelos.slice(0, 3).forEach((modelo, idx) => {
          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${idx + 1}. ${modelo.modelo}: ${modelo.cantidad} servicios`, 30, yPos);
          yPos += 5;
        });
        
        yPos += 8;
      });
      
      // ===========================================
      // SECCIÓN 2: ANÁLISIS DE LUBRICANTES
      // ===========================================
      pdf.addPage();
      yPos = 20;
      
      pdf.setFillColor(REPORT_COLORS.info[0], REPORT_COLORS.info[1], REPORT_COLORS.info[2]);
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🛢️ ANÁLISIS DE LUBRICANTES Y ACEITES', 105, 18, { align: 'center' });
      
      yPos = 45;
      
      // Marcas de aceite más vendidas
      pdf.setFontSize(14);
      pdf.setTextColor(REPORT_COLORS.info[0], REPORT_COLORS.info[1], REPORT_COLORS.info[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MARCAS DE ACEITE MÁS VENDIDAS', 20, yPos);
      yPos += 12;
      
      data.lubricantAnalysis.oilBrands.slice(0, 8).forEach((brand, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        
        // Medalla para top 3
        if (index < 3) {
          const medals = ['🥇', '🥈', '🥉'];
          pdf.setFontSize(12);
          pdf.text(medals[index], 25, yPos + 1);
        } else {
          pdf.setFillColor(REPORT_COLORS.info[0], REPORT_COLORS.info[1], REPORT_COLORS.info[2]);
          pdf.roundedRect(25, yPos - 2, 6, 6, 1, 1, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.text((index + 1).toString(), 28, yPos + 2, { align: 'center' });
        }
        
        // Información de la marca
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`${brand.marca}: ${brand.cantidad} ventas (${brand.porcentaje.toFixed(1)}%)`, 40, yPos + 1);
        
        yPos += 8;
      });
      
      yPos += 15;
      
      // Tipos de aceite más utilizados
      pdf.setFontSize(14);
      pdf.setTextColor(REPORT_COLORS.info[0], REPORT_COLORS.info[1], REPORT_COLORS.info[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TIPOS DE ACEITE MÁS UTILIZADOS', 20, yPos);
      yPos += 12;
      
      data.lubricantAnalysis.oilTypes.forEach((type, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        
        // Barra visual proporcional
        const maxType = data.lubricantAnalysis.oilTypes[0];
        const barWidth = Math.max(10, (type.cantidad / maxType.cantidad) * 100);
        pdf.setFillColor(chartColors[index % chartColors.length]);
        pdf.rect(25, yPos - 2, barWidth, 4, 'F');
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${type.tipo}: ${type.cantidad} servicios (${type.porcentaje.toFixed(1)}%)`, 130, yPos + 1);
        
        yPos += 8;
      });
      
      yPos += 15;
      
      // Viscosidades más demandadas
      pdf.setFontSize(14);
      pdf.setTextColor(REPORT_COLORS.info[0], REPORT_COLORS.info[1], REPORT_COLORS.info[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VISCOSIDADES MÁS DEMANDADAS (SAE)', 20, yPos);
      yPos += 12;
      
      data.lubricantAnalysis.viscosities.slice(0, 6).forEach((viscosity, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${viscosity.viscosidad}: ${viscosity.cantidad} servicios (${viscosity.porcentaje.toFixed(1)}%)`, 25, yPos);
        
        yPos += 6;
      });
      
      // ===========================================
      // SECCIÓN 3: ANÁLISIS DE SERVICIOS ADICIONALES
      // ===========================================
      pdf.addPage();
      yPos = 20;
      
      pdf.setFillColor(REPORT_COLORS.warning[0], REPORT_COLORS.warning[1], REPORT_COLORS.warning[2]);
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🔧 ANÁLISIS DE SERVICIOS ADICIONALES', 105, 18, { align: 'center' });
      
      yPos = 45;
      
      // Porcentajes de servicios adicionales
      const serviceStats = [
        { name: 'Filtro de Aire', percentage: data.serviceAnalysis.airFilterPercentage },
        { name: 'Filtro de Combustible', percentage: data.serviceAnalysis.fuelFilterPercentage },
        { name: 'Filtro de Habitáculo', percentage: data.serviceAnalysis.cabinFilterPercentage }
      ];
      
      pdf.setFontSize(14);
      pdf.setTextColor(REPORT_COLORS.warning[0], REPORT_COLORS.warning[1], REPORT_COLORS.warning[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ADOPCIÓN DE SERVICIOS ADICIONALES', 20, yPos);
      yPos += 15;
      
      serviceStats.forEach((service, index) => {
        // Barra de progreso visual
        const barWidth = (service.percentage / 100) * 120;
        const barColor = service.percentage >= 50 ? REPORT_COLORS.success : 
                        service.percentage >= 25 ? REPORT_COLORS.warning : 
                        REPORT_COLORS.error;
        
        pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
        pdf.roundedRect(25, yPos - 3, barWidth, 8, 2, 2, 'F');
        
        // Porcentaje en la barra
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        if (barWidth > 20) {
          pdf.text(`${service.percentage.toFixed(1)}%`, 25 + barWidth/2, yPos + 2, { align: 'center' });
        }
        
        // Nombre del servicio
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(service.name, 150, yPos + 1);
        
        yPos += 15;
      });
      
      yPos += 10;
      
      // Análisis de oportunidades
      pdf.setFillColor(255, 248, 220);
      pdf.rect(15, yPos - 5, 180, 40, 'F');
      pdf.setDrawColor(REPORT_COLORS.warning[0], REPORT_COLORS.warning[1], REPORT_COLORS.warning[2]);
      pdf.setLineWidth(1);
      pdf.rect(15, yPos - 5, 180, 40);
      
      pdf.setFontSize(12);
      pdf.setTextColor(REPORT_COLORS.warning[0], REPORT_COLORS.warning[1], REPORT_COLORS.warning[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('💡 OPORTUNIDADES IDENTIFICADAS', 20, yPos + 5);
      
      yPos += 15;
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const opportunities = this.generateServiceOpportunities(serviceStats);
      opportunities.forEach(opportunity => {
        const lines = pdf.splitTextToSize(`• ${opportunity}`, 165);
        lines.forEach((line: string) => {
          pdf.text(line, 25, yPos);
          yPos += 5;
        });
      });
      
      // ===========================================
      // SECCIÓN 4: ANÁLISIS DE RENTABILIDAD
      // ===========================================
      pdf.addPage();
      yPos = 20;
      
      pdf.setFillColor(REPORT_COLORS.success[0], REPORT_COLORS.success[1], REPORT_COLORS.success[2]);
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('💰 ANÁLISIS DE RENTABILIDAD', 105, 18, { align: 'center' });
      
      yPos = 45;
      
      // Ticket promedio por tipo de vehículo
      if (data.profitabilityAnalysis.averageTicketByVehicleType.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(REPORT_COLORS.success[0], REPORT_COLORS.success[1], REPORT_COLORS.success[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TICKET PROMEDIO POR TIPO DE VEHÍCULO', 20, yPos);
        yPos += 12;
        
        data.profitabilityAnalysis.averageTicketByVehicleType.forEach((ticket, index) => {
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${ticket.tipoVehiculo}:`, 25, yPos);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${formatCurrency(ticket.ticketPromedio)}`, 100, yPos);
          
          yPos += 8;
        });
        
        yPos += 10;
      }
      
      // Top clientes más valiosos
      if (data.profitabilityAnalysis.topCustomers.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(REPORT_COLORS.success[0], REPORT_COLORS.success[1], REPORT_COLORS.success[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TOP 10 CLIENTES MÁS VALIOSOS', 20, yPos);
        yPos += 12;
        
        data.profitabilityAnalysis.topCustomers.slice(0, 10).forEach((customer, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          // Ranking visual
          if (index < 3) {
            const medals = ['🥇', '🥈', '🥉'];
            pdf.setFontSize(10);
            pdf.text(medals[index], 25, yPos + 1);
          } else {
            pdf.setFillColor(REPORT_COLORS.success[0], REPORT_COLORS.success[1], REPORT_COLORS.success[2]);
            pdf.roundedRect(25, yPos - 2, 6, 6, 1, 1, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.text((index + 1).toString(), 28, yPos + 2, { align: 'center' });
          }
          
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text(`${customer.cliente}`, 35, yPos + 1);
          pdf.text(`${customer.servicios} servicios`, 120, yPos + 1);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${formatCurrency(customer.gasto)}`, 155, yPos + 1);
          
          yPos += 10;
        });
      }
      
      // ===========================================
      // SECCIÓN 5: RECOMENDACIONES ESTRATÉGICAS
      // ===========================================
      pdf.addPage();
      yPos = 20;
      
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, 210, 25, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🎯 RECOMENDACIONES ESTRATÉGICAS', 105, 15, { align: 'center' });
      
      yPos = 40;
      
      const strategicRecommendations = this.generateStrategicRecommendations(data);
      
      strategicRecommendations.forEach((section) => {
        // Header de sección
        pdf.setFillColor(section.color[0], section.color[1], section.color[2]);
        pdf.roundedRect(15, yPos - 5, 180, 15, 3, 3, 'F');
        
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text(section.title, 20, yPos + 5);
        
        yPos += 20;
        
        // Items de recomendación
        section.items.forEach((item, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          // Ícono de recomendación
          pdf.setFillColor(section.color[0], section.color[1], section.color[2]);
          pdf.roundedRect(22, yPos - 3, 6, 6, 1, 1, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.text((index + 1).toString(), 25, yPos + 1, { align: 'center' });
          
          // Texto de recomendación
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const lines = pdf.splitTextToSize(item, 160);
          lines.forEach((line: string, lineIndex: number) => {
            pdf.text(line, 32, yPos + (lineIndex * 5));
          });
          
          yPos += Math.max(6, lines.length * 5);
        });
        
        yPos += 8;
      });
      
      // Resumen final
      if (yPos < 200) {
        yPos = Math.max(yPos + 15, 220);
        
        pdf.setFillColor(240, 248, 255);
        pdf.rect(15, yPos - 10, 180, 50, 'F');
        pdf.setDrawColor(REPORT_COLORS.info[0], REPORT_COLORS.info[1], REPORT_COLORS.info[2]);
        pdf.setLineWidth(2);
        pdf.rect(15, yPos - 10, 180, 50);
        
        pdf.setFontSize(14);
        pdf.setTextColor(REPORT_COLORS.info[0], REPORT_COLORS.info[1], REPORT_COLORS.info[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('🚀 PRÓXIMOS PASOS SUGERIDOS', 20, yPos);
        
        yPos += 10;
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        
        const nextSteps = [
          '1. Implementar las recomendaciones de alta prioridad en los próximos 30 días',
          '2. Establecer métricas de seguimiento para medir el progreso',
          '3. Revisar este análisis mensualmente para ajustar estrategias',
          '4. Capacitar al equipo en las oportunidades identificadas'
        ];
        
        nextSteps.forEach(step => {
          pdf.text(step, 20, yPos);
          yPos += 6;
        });
      }
      
      // Configurar pie de página
      setupPDFFooter(pdf, data.lubricentroName, 'Análisis Avanzado');
      
      // Guardar archivo
      const fileName = generateFileName('Analisis_Avanzado', data.lubricentroName, 'pdf');
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error al generar análisis avanzado PDF:', error);
      throw error;
    }
  }
  
  /**
   * Exporta el análisis avanzado a Excel
   */
  async exportToExcel(data: AdvancedAnalysisData, config?: ReportConfig): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      
      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      
      // Hoja 1: Análisis de Vehículos
      if (data.vehicleAnalysis.brandDistribution.length > 0) {
        const vehicleData = data.vehicleAnalysis.brandDistribution.map(brand => ({
          'Marca': brand.marca,
          'Cantidad': brand.cantidad,
          'Porcentaje': `${brand.porcentaje.toFixed(1)}%`
        }));
        
        const vehicleWs = XLSX.utils.json_to_sheet(vehicleData);
        vehicleWs['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, vehicleWs, 'Análisis Vehículos');
      }
      
      // Hoja 2: Análisis de Lubricantes
      if (data.lubricantAnalysis.oilBrands.length > 0) {
        const lubricantData = data.lubricantAnalysis.oilBrands.map(oil => ({
          'Marca Aceite': oil.marca,
          'Cantidad': oil.cantidad,
          'Porcentaje': `${oil.porcentaje.toFixed(1)}%`
        }));
        
        const lubricantWs = XLSX.utils.json_to_sheet(lubricantData);
        lubricantWs['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, lubricantWs, 'Análisis Lubricantes');
      }
      
      // Hoja 3: Servicios Adicionales
      const servicesData = [
        { 'Servicio': 'Filtro de Aire', 'Porcentaje': `${data.serviceAnalysis.airFilterPercentage.toFixed(1)}%` },
        { 'Servicio': 'Filtro de Combustible', 'Porcentaje': `${data.serviceAnalysis.fuelFilterPercentage.toFixed(1)}%` },
        { 'Servicio': 'Filtro de Habitáculo', 'Porcentaje': `${data.serviceAnalysis.cabinFilterPercentage.toFixed(1)}%` }
      ];
      
      const servicesWs = XLSX.utils.json_to_sheet(servicesData);
      servicesWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, servicesWs, 'Servicios Adicionales');
      
      // Hoja 4: Top Clientes
      if (data.profitabilityAnalysis.topCustomers.length > 0) {
        const customersData = data.profitabilityAnalysis.topCustomers.map((customer, index) => ({
          'Posición': index + 1,
          'Cliente': customer.cliente,
          'Servicios': customer.servicios,
          'Gasto Total': customer.gasto,
          'Promedio por Servicio': customer.servicios > 0 ? (customer.gasto / customer.servicios).toFixed(0) : 0
        }));
        
        const customersWs = XLSX.utils.json_to_sheet(customersData);
        customersWs['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, customersWs, 'Top Clientes');
      }
      
      // Hoja 5: Resumen Ejecutivo
      const keyMetrics = this.calculateKeyMetrics(data);
      const summaryData = [
        { Métrica: 'Marcas de Vehículos Atendidas', Valor: keyMetrics.vehicleBrands },
        { Métrica: 'Tipos de Aceite Diferentes', Valor: keyMetrics.oilTypes },
        { Métrica: 'Tasa de Servicios Adicionales', Valor: `${keyMetrics.additionalServicesRate}%` },
        { Métrica: 'Ticket Promedio Estimado', Valor: keyMetrics.averageTicket },
        { Métrica: 'Período del Análisis', Valor: data.dateRange },
        { Métrica: 'Fecha de Generación', Valor: formatDate(new Date()) }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen Ejecutivo');
      
      // Guardar archivo
      const fileName = generateFileName('Analisis_Avanzado_Completo', data.lubricentroName, 'xlsx');
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error al exportar análisis avanzado a Excel:', error);
      throw error;
    }
  }
  
  /**
   * Calcula métricas clave para el dashboard
   */
  private calculateKeyMetrics(data: AdvancedAnalysisData) {
    return {
      vehicleBrands: data.vehicleAnalysis.brandDistribution.length,
      oilTypes: data.lubricantAnalysis.oilTypes.length,
      additionalServicesRate: Math.round(
        (data.serviceAnalysis.airFilterPercentage + 
         data.serviceAnalysis.fuelFilterPercentage + 
         data.serviceAnalysis.cabinFilterPercentage) / 3
      ),
      averageTicket: data.profitabilityAnalysis.averageTicketByVehicleType.length > 0 
        ? formatCurrency(
            data.profitabilityAnalysis.averageTicketByVehicleType.reduce((sum, ticket) => sum + ticket.ticketPromedio, 0) / 
            data.profitabilityAnalysis.averageTicketByVehicleType.length
          )
        : 'N/A'
    };
  }
  
  /**
   * Genera oportunidades basadas en análisis de servicios
   */
  private generateServiceOpportunities(serviceStats: any[]) {
    const opportunities = [];
    
    serviceStats.forEach(service => {
      if (service.percentage < 30) {
        opportunities.push(`Incrementar venta de ${service.name} (actual: ${service.percentage.toFixed(1)}%)`);
      }
    });
    
    if (opportunities.length === 0) {
      opportunities.push('Mantener el buen desempeño en servicios adicionales');
      opportunities.push('Explorar nuevos servicios complementarios');
    }
    
    opportunities.push('Implementar paquetes promocionales que incluyan múltiples filtros');
    opportunities.push('Capacitar al equipo en técnicas de venta consultiva');
    
    return opportunities;
  }
  
  /**
   * Genera recomendaciones estratégicas
   */
  private generateStrategicRecommendations(data: AdvancedAnalysisData) {
    const recommendations = [];
    
    // Recomendaciones para vehículos
    if (data.vehicleAnalysis.brandDistribution.length > 0) {
      const topBrand = data.vehicleAnalysis.brandDistribution[0];
      recommendations.push({
        title: '🚗 ESTRATEGIA DE VEHÍCULOS',
        color: REPORT_COLORS.info,
        items: [
          `Fortalecer especialización en ${topBrand.marca} (marca líder con ${topBrand.cantidad} servicios)`,
          'Desarrollar expertise técnico específico para las marcas más atendidas',
          'Crear paquetes de mantenimiento diferenciados por marca de vehículo',
          'Implementar programa de fidelización para clientes de marcas premium'
        ]
      });
    }
    
    // Recomendaciones para lubricantes
    if (data.lubricantAnalysis.oilBrands.length > 0) {
      const topOil = data.lubricantAnalysis.oilBrands[0];
      recommendations.push({
        title: '🛢️ ESTRATEGIA DE LUBRICANTES',
        color: REPORT_COLORS.warning,
        items: [
          `Optimizar stock de ${topOil.marca} (marca preferida con ${topOil.porcentaje.toFixed(1)}%)`,
          'Negociar mejores condiciones con proveedores de aceites top',
          'Educar clientes sobre beneficios de aceites sintéticos vs minerales',
          'Implementar sistema de recomendación automática según tipo de vehículo'
        ]
      });
    }
    
    // Recomendaciones de rentabilidad
    recommendations.push({
      title: '💰 ESTRATEGIA DE RENTABILIDAD',
      color: REPORT_COLORS.success,
      items: [
        'Desarrollar programa VIP para los top 10 clientes más valiosos',
        'Implementar sistema de precios dinámicos según valor del cliente',
        'Crear ofertas personalizadas basadas en historial de servicios',
        'Establecer métricas de seguimiento de rentabilidad por cliente'
      ]
    });
    
    return recommendations;
  }
}