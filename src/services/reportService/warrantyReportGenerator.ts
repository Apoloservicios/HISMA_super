// src/services/reportService/warrantyReportGenerator.ts
import { Warranty } from '../../types/warranty';
import { 
  WarrantyReportData, 
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
  generateFileName 
} from './utils';

/**
 * Generador especializado para reportes de garantías
 */
export class WarrantyReportGenerator implements ReportGenerator<WarrantyReportData> {
  
  /**
   * Genera un reporte PDF completo de garantías
   */
  async generatePDF(data: WarrantyReportData, config?: ReportConfig): Promise<void> {
    try {
      // Importación dinámica de jsPDF
      const jsPDF = await import('jspdf');
      const pdf = new jsPDF.default();
      
      const primaryColor = REPORT_COLORS.primary;
      const warningColor = REPORT_COLORS.warning;
      const errorColor = REPORT_COLORS.error;
      const successColor = REPORT_COLORS.success;
      
      // Header del reporte
      let yPos = setupPDFHeader(
        pdf,
        'REPORTE INTEGRAL DE GARANTÍAS',
        data.lubricentroName,
        data.lubricentroName
      );
      
      // Información del período
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Período: ${data.dateRange}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Dashboard ejecutivo con estadísticas visuales
      pdf.setFontSize(16);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DASHBOARD EJECUTIVO', 20, yPos);
      yPos += 15;
      
      // Crear cajas de estadísticas
      const stats = [
        { label: 'TOTAL', value: data.stats.total.toString(), color: successColor },
        { label: 'VIGENTES', value: data.stats.vigentes.toString(), color: successColor },
        { label: 'POR VENCER', value: data.stats.vencenEn30Dias.toString(), color: warningColor },
        { label: 'VENCIDAS', value: data.stats.vencidas.toString(), color: errorColor }
      ];
      
      const boxWidth = 42;
      const boxHeight = 25;
      let xStart = 20;
      
      stats.forEach((stat) => {
        createStatBox(pdf, xStart, yPos, boxWidth, boxHeight, stat.label, stat.value, stat.color as number[]);
        xStart += boxWidth + 5;
      });
      
      yPos += 35;
      
      // Resumen financiero
      pdf.setFillColor(248, 250, 252);
      pdf.rect(15, yPos - 5, 180, 25, 'F');
      pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setLineWidth(1);
      pdf.rect(15, yPos - 5, 180, 25);
      
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMEN FINANCIERO', 20, yPos + 3);
      
      yPos += 12;
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const financialData = [
        ['Total facturado:', formatCurrency(data.stats.totalFacturado)],
        ['Promedio por garantía:', formatCurrency(data.stats.total > 0 ? data.stats.totalFacturado / data.stats.total : 0)],
        ['Reclamaciones procesadas:', `${data.stats.reclamadas} (${data.stats.total > 0 ? ((data.stats.reclamadas / data.stats.total) * 100).toFixed(1) : 0}%)`]
      ];
      
      financialData.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 20, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 100, yPos);
        yPos += 6;
      });
      
      yPos += 15;
      
      // Alertas críticas
      if (data.stats.vencenEn7Dias > 0) {
        pdf.setFillColor(254, 242, 242);
        pdf.rect(15, yPos - 5, 180, 15, 'F');
        pdf.setDrawColor(errorColor[0], errorColor[1], errorColor[2]);
        pdf.setLineWidth(2);
        pdf.rect(15, yPos - 5, 180, 15);
        
        pdf.setFontSize(12);
        pdf.setTextColor(errorColor[0], errorColor[1], errorColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`🚨 URGENTE: ${data.stats.vencenEn7Dias} garantías vencen en los próximos 7 días`, 20, yPos + 5);
        yPos += 20;
      }
      
      // Análisis por categorías
      if (data.stats.categoriasMasVendidas.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANÁLISIS POR CATEGORÍAS', 20, yPos);
        yPos += 12;
        
        data.stats.categoriasMasVendidas.slice(0, 8).forEach((categoria, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          const percentage = data.stats.total > 0 ? ((categoria.cantidad / data.stats.total) * 100).toFixed(1) : '0';
          
          // Barra visual
          const barWidth = Math.max(2, (categoria.cantidad / Math.max(...data.stats.categoriasMasVendidas.map(c => c.cantidad), 1)) * 60);
          pdf.setFillColor(REPORT_COLORS.chart[index % REPORT_COLORS.chart.length]);
          pdf.rect(25, yPos - 2, barWidth, 4, 'F');
          
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${categoria.categoria}: ${categoria.cantidad} garantías (${percentage}%)`, 90, yPos);
          yPos += 8;
        });
        
        yPos += 10;
      }
      
      // Análisis por marcas
      if (data.stats.marcasMasVendidas.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TOP MARCAS MÁS VENDIDAS', 20, yPos);
        yPos += 12;
        
        data.stats.marcasMasVendidas.slice(0, 6).forEach((marca, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          const percentage = data.stats.total > 0 ? ((marca.cantidad / data.stats.total) * 100).toFixed(1) : '0';
          
          // Ranking visual
          pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.roundedRect(22, yPos - 3, 8, 8, 2, 2, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.text((index + 1).toString(), 26, yPos + 2, { align: 'center' });
          
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text(`${marca.marca}: ${marca.cantidad} productos (${percentage}%)`, 35, yPos + 1);
          yPos += 10;
        });
        
        yPos += 10;
      }
      
      // Nueva página para garantías críticas
      if (data.warranties.length > 0) {
        pdf.addPage();
        yPos = 20;
        
        // Garantías que requieren atención
        const today = new Date();
        const criticalWarranties = data.warranties.filter(warranty => {
          const vencimiento = toDate(warranty.fechaVencimiento);
          const daysToExpire = Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysToExpire <= 30;
        }).sort((a, b) => {
          const daysA = Math.ceil((toDate(a.fechaVencimiento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const daysB = Math.ceil((toDate(b.fechaVencimiento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysA - daysB;
        });
        
        if (criticalWarranties.length > 0) {
          pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.rect(0, 0, 210, 25, 'F');
          
          pdf.setFontSize(18);
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.text('GARANTÍAS QUE REQUIEREN ATENCIÓN', 105, 15, { align: 'center' });
          
          yPos = 35;
          
          criticalWarranties.slice(0, 15).forEach((warranty, index) => {
            if (yPos > 250) {
              pdf.addPage();
              yPos = 20;
            }
            
            const daysToExpire = Math.ceil((toDate(warranty.fechaVencimiento).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysToExpire < 0;
            const isUrgent = daysToExpire >= 0 && daysToExpire <= 7;
            
            // Color de fondo según urgencia
            if (isOverdue) {
              pdf.setFillColor(254, 242, 242);
            } else if (isUrgent) {
              pdf.setFillColor(255, 251, 235);
            } else {
              pdf.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 252 : 255);
            }
            pdf.rect(15, yPos - 3, 180, 16, 'F');
            
            // Borde de color según estado
            const borderColor = isOverdue ? errorColor : isUrgent ? warningColor : successColor;
            pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
            pdf.setLineWidth(1);
            pdf.rect(15, yPos - 3, 180, 16);
            
            // Información de la garantía
            pdf.setFontSize(10);
            pdf.setTextColor(60, 60, 60);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${warranty.marca} ${warranty.modelo}`, 20, yPos + 2);
            
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Cliente: ${warranty.clienteNombre}`, 20, yPos + 6);
            pdf.text(`Precio: ${formatCurrency(warranty.precio)}`, 20, yPos + 10);
            
            // Estado y días restantes
            pdf.setTextColor(borderColor[0], borderColor[1], borderColor[2]);
            pdf.setFont('helvetica', 'bold');
            const statusText = isOverdue ? `VENCIDA HACE ${Math.abs(daysToExpire)} DÍAS` :
                              isUrgent ? `VENCE EN ${daysToExpire} DÍAS` :
                              `${daysToExpire} DÍAS RESTANTES`;
            pdf.text(statusText, 130, yPos + 2);
            
            pdf.setTextColor(60, 60, 60);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Vencimiento: ${formatDate(warranty.fechaVencimiento)}`, 130, yPos + 6);
            
            if (warranty.clienteTelefono) {
              pdf.text(`Tel: ${warranty.clienteTelefono}`, 130, yPos + 10);
            }
            
            yPos += 19;
          });
          
          if (criticalWarranties.length > 15) {
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`... y ${criticalWarranties.length - 15} garantías más que requieren atención`, 20, yPos);
          }
        }
      }
      
      // Nueva página para recomendaciones
      pdf.addPage();
      yPos = 20;
      
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, 210, 25, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PLAN DE ACCIÓN Y RECOMENDACIONES', 105, 15, { align: 'center' });
      
      yPos = 40;
      
      // Recomendaciones estratégicas
      const recommendations = this.generateRecommendations(data);
      
      recommendations.forEach((section) => {
        // Header de sección
        pdf.setFillColor(section.color[0], section.color[1], section.color[2]);
        pdf.roundedRect(15, yPos - 5, 180, 15, 3, 3, 'F');
        
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text(section.title, 20, yPos + 5);
        
        yPos += 20;
        
        // Items de la sección
        section.items.forEach((item, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          
          // Numeración con cuadrado
          pdf.setFillColor(section.color[0], section.color[1], section.color[2]);
          pdf.roundedRect(22, yPos - 3, 6, 6, 1, 1, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.text((index + 1).toString(), 25, yPos + 1, { align: 'center' });
          
          // Texto del item
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
      
      // Configurar pie de página
      setupPDFFooter(pdf, data.lubricentroName, 'Reporte de Garantías');
      
      // Guardar archivo
      const fileName = generateFileName('Reporte_Garantias', data.lubricentroName, 'pdf');
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error al generar reporte PDF de garantías:', error);
      throw error;
    }
  }
  
  /**
   * Exporta datos de garantías a Excel
   */
  async exportToExcel(data: WarrantyReportData, config?: ReportConfig): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      
      if (!data.warranties || data.warranties.length === 0) {
        throw new Error('No hay datos de garantías para exportar');
      }
      
      // Preparar datos principales
      const mainData = data.warranties.map(warranty => ({
        'Fecha de Venta': formatDate(warranty.fechaVenta),
        'Categoría': warranty.categoria,
        'Marca': warranty.marca,
        'Modelo': warranty.modelo,
        'Número de Serie': warranty.numeroSerie || '',
        'Descripción': warranty.descripcion,
        'Cliente': warranty.clienteNombre,
        'Teléfono': warranty.clienteTelefono || '',
        'Email': warranty.clienteEmail || '',
        'Vehículo Dominio': warranty.vehiculoDominio || '',
        'Vehículo Marca': warranty.vehiculoMarca || '',
        'Vehículo Modelo': warranty.vehiculoModelo || '',
        'Kilometraje Venta': warranty.kilometrajeVenta || '',
        'Tipo Garantía': warranty.tipoGarantia,
        'Meses Garantía': warranty.garantiaMeses || '',
        'Kilómetros Garantía': warranty.garantiaKilometros || '',
        'Fecha Vencimiento': formatDate(warranty.fechaVencimiento),
        'Estado': warranty.estado,
        'Precio': warranty.precio,
        'Factura': warranty.facturaNumero || '',
        'Vendedor': warranty.vendedorNombre,
        'Observaciones': warranty.observaciones || '',
        'Condiciones Especiales': warranty.condicionesEspeciales || '',
        'Días para Vencer': this.calculateDaysToExpire(warranty)
      }));
      
      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      
      // Hoja principal
      const ws = XLSX.utils.json_to_sheet(mainData);
      
      // Configurar anchos de columna
      const colWidths = [
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
        { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 10 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
        { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 12 }
      ];
      
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, 'Garantías');
      
      // Hoja de resumen estadístico
      const statsData = [
        { Métrica: 'Total de Garantías', Valor: data.stats.total },
        { Métrica: 'Garantías Vigentes', Valor: data.stats.vigentes },
        { Métrica: 'Garantías Vencidas', Valor: data.stats.vencidas },
        { Métrica: 'Garantías Reclamadas', Valor: data.stats.reclamadas },
        { Métrica: 'Vencen en 30 días', Valor: data.stats.vencenEn30Dias },
        { Métrica: 'Vencen en 7 días', Valor: data.stats.vencenEn7Dias },
        { Métrica: 'Total Facturado', Valor: formatCurrency(data.stats.totalFacturado || 0) },
        { Métrica: 'Promedio por Garantía', Valor: formatCurrency(data.stats.total > 0 ? data.stats.totalFacturado / data.stats.total : 0) },
        { Métrica: 'Período del Reporte', Valor: data.dateRange },
        { Métrica: 'Fecha de Exportación', Valor: formatDate(new Date()) }
      ];
      
      const statsWs = XLSX.utils.json_to_sheet(statsData);
      statsWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, statsWs, 'Resumen');
      
      // Hoja de análisis por categorías
      if (data.stats.categoriasMasVendidas.length > 0) {
        const categoryData = data.stats.categoriasMasVendidas.map(cat => ({
          'Categoría': cat.categoria,
          'Cantidad': cat.cantidad,
          'Porcentaje': `${((cat.cantidad / data.stats.total) * 100).toFixed(1)}%`
        }));
        
        const categoryWs = XLSX.utils.json_to_sheet(categoryData);
        categoryWs['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, categoryWs, 'Por Categoría');
      }
      
      // Hoja de análisis por marcas
      if (data.stats.marcasMasVendidas.length > 0) {
        const brandData = data.stats.marcasMasVendidas.map(brand => ({
          'Marca': brand.marca,
          'Cantidad': brand.cantidad,
          'Porcentaje': `${((brand.cantidad / data.stats.total) * 100).toFixed(1)}%`
        }));
        
        const brandWs = XLSX.utils.json_to_sheet(brandData);
        brandWs['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, brandWs, 'Por Marca');
      }
      
      // Guardar archivo
      const fileName = generateFileName('Garantias_Completo', data.lubricentroName, 'xlsx');
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error al exportar garantías a Excel:', error);
      throw error;
    }
  }
  
  /**
   * Calcula los días hasta el vencimiento
   */
  private calculateDaysToExpire(warranty: Warranty): number {
    const today = new Date();
    const vencimiento = toDate(warranty.fechaVencimiento);
    return Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Genera recomendaciones basadas en los datos
   */
  private generateRecommendations(data: WarrantyReportData) {
    const recommendations = [];
    
    // Recomendaciones críticas
    if (data.stats.vencenEn7Dias > 0 || data.stats.vencidas > 0) {
      recommendations.push({
        title: 'ACCIONES CRÍTICAS - ALTA PRIORIDAD',
        color: REPORT_COLORS.error,
        items: [
          `Contactar inmediatamente a clientes con ${data.stats.vencidas} garantías vencidas`,
          `Enviar recordatorios urgentes a ${data.stats.vencenEn7Dias} clientes con vencimientos próximos`,
          'Implementar sistema de alertas automáticas para evitar vencimientos',
          'Revisar proceso de seguimiento de garantías'
        ]
      });
    }
    
    // Recomendaciones de mejora
    if (data.stats.vencenEn30Dias > 0) {
      recommendations.push({
        title: 'OPORTUNIDADES DE MEJORA',
        color: REPORT_COLORS.warning,
        items: [
          `Preparar campaña de renovación para ${data.stats.vencenEn30Dias} garantías próximas a vencer`,
          'Ofrecer servicios complementarios a clientes con garantías vigentes',
          'Desarrollar programa de fidelización basado en garantías',
          'Analizar patrones de reclamos para mejorar selección de productos'
        ]
      });
    }
    
    // Recomendaciones estratégicas
    recommendations.push({
      title: 'ESTRATEGIAS DE CRECIMIENTO',
      color: REPORT_COLORS.success,
      items: [
        'Expandir categorías de productos con mejor desempeño de garantías',
        'Fortalecer relaciones con marcas que generan menos reclamos',
        'Implementar programa de capacitación sobre garantías para el equipo',
        'Crear base de datos de satisfacción del cliente post-garantía'
      ]
    });
    
    return recommendations;
  }
}