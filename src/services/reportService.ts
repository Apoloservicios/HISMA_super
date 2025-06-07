// src/services/reportService.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { OilChangeStats, OperatorStats, OilChange, User } from '../types';

/**
 * ✅ FUNCIÓN HELPER PARA CONVERSIÓN SEGURA DE FECHAS
 * Maneja todos los tipos de fecha posibles (Date, Timestamp de Firebase, string, number)
 */
const toDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
    // Timestamp de Firebase
    return dateValue.toDate();
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

/**
 * ✅ FUNCIÓN HELPER PARA PARSEAR RANGOS DE FECHAS DE MANERA SEGURA
 */
const parseDateRange = (dateRangeStr: string, fallbackData: OilChange[] = []) => {
  const dates = dateRangeStr.split(' - ');
  if (dates.length === 2) {
    try {
      const parseDate = (dateStr: string): Date => {
        // Formato DD/MM/YYYY
        if (dateStr.includes('/')) {
          const parts = dateStr.trim().split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
        // Formato YYYY-MM-DD o otros formatos estándar
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      };
      
      const startDate = parseDate(dates[0]);
      const endDate = parseDate(dates[1]);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    } catch (error) {
      console.warn('Error parseando fechas del rango:', error);
    }
  }
  
  // Si no se puede parsear, usar las fechas de los datos
  if (fallbackData && fallbackData.length > 0) {
    const serviceDates = fallbackData.map(change => toDate(change.fecha))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (serviceDates.length > 0) {
      return {
        startDate: serviceDates[0],
        endDate: serviceDates[serviceDates.length - 1]
      };
    }
  }
  
  // Fallback final: último mes
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  return { startDate, endDate };
};

/**
 * ✅ SERVICIO DE REPORTES COMPLETO Y CORREGIDO
 */
export const reportService = {
  /**
   * ✅ Genera un informe en PDF con las estadísticas y gráficos de cambios de aceite
   */
  generatePdfReport: async (
    stats: OilChangeStats,
    operatorStats: OperatorStats[],
    lubricentroName: string,
    dateRange: string
  ): Promise<void> => {
    try {
      const pdf = new jsPDF();
      let yPos = 20;
      
      // Configuración de colores
      const primaryColor = [46, 125, 50];
      const secondaryColor = [27, 94, 32];
      
      // Título principal
      pdf.setFontSize(20);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORME DE OPERACIONES', 105, yPos, { align: 'center' });
      yPos += 12;
      
      // Subtítulo
      pdf.setFontSize(16);
      pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      pdf.text(lubricentroName, 105, yPos, { align: 'center' });
      yPos += 8;
      
      // Fecha del reporte
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Período: ${dateRange}`, 105, yPos, { align: 'center' });
      yPos += 5;
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Línea separadora
      pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setLineWidth(1);
      pdf.line(20, yPos, 190, yPos);
      yPos += 15;
      
      // Resumen Ejecutivo
      pdf.setFontSize(14);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMEN EJECUTIVO', 20, yPos);
      yPos += 10;
      
      // Estadísticas principales
      const monthlyGrowth = stats.lastMonth > 0 
        ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100 
        : stats.thisMonth > 0 ? 100 : 0;
      
      const averageDaily = (stats.thisMonth / 30).toFixed(1);
      const returnRate = stats.total > 0 
        ? ((stats.upcoming30Days / stats.total) * 100).toFixed(1) 
        : '0';
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const kpiData = [
        ['Total de cambios:', stats.total.toString()],
        ['Cambios este mes:', stats.thisMonth.toString()],
        ['Crecimiento mensual:', `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%`],
        ['Promedio diario:', `${averageDaily} cambios/día`],
        ['Tasa de retorno:', `${returnRate}%`],
        ['Próximos 30 días:', `${stats.upcoming30Days} servicios programados`]
      ];
      
      kpiData.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 90, yPos);
        yPos += 7;
      });
      
      yPos += 10;
      
      // Rendimiento por Operador
      if (operatorStats.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RENDIMIENTO POR OPERADOR', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(9);
        pdf.setTextColor(40, 40, 40);
        
        // Encabezados
        pdf.setFont('helvetica', 'bold');
        pdf.text('Operador', 25, yPos);
        pdf.text('Cantidad', 100, yPos);
        pdf.text('Porcentaje', 140, yPos);
        yPos += 5;
        
        // Línea
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, yPos, 190, yPos);
        yPos += 5;
        
        // Contenido
        pdf.setFont('helvetica', 'normal');
        const totalServices = operatorStats.reduce((sum, op) => sum + op.count, 0);
        
        operatorStats.forEach((operator, index) => {
          const percentage = totalServices > 0 
            ? ((operator.count / totalServices) * 100).toFixed(1) 
            : '0';
          
          if (index % 2 === 0) {
            pdf.setFillColor(248, 248, 248);
            pdf.rect(20, yPos - 3, 170, 6, 'F');
          }
          
          pdf.text(operator.operatorName, 25, yPos);
          pdf.text(operator.count.toString(), 100, yPos);
          pdf.text(`${percentage}%`, 140, yPos);
          
          yPos += 8;
          
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
        });
      }
      
      // Nueva página para recomendaciones
      pdf.addPage();
      yPos = 20;
      
      pdf.setFontSize(14);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ANÁLISIS Y RECOMENDACIONES', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      // Recomendaciones automáticas
      const recommendations = [];
      
      if (monthlyGrowth > 10) {
        recommendations.push('✓ Excelente crecimiento mensual. Considere expandir la capacidad de servicio.');
      } else if (monthlyGrowth < -10) {
        recommendations.push('⚠ Decrecimiento significativo. Revise estrategias de marketing y retención.');
      }
      
      if (parseFloat(averageDaily) < 3) {
        recommendations.push('• Considere promociones para incrementar el flujo diario de clientes.');
      }
      
      if (parseFloat(returnRate) < 20) {
        recommendations.push('• Implemente un sistema de recordatorios para mejorar la tasa de retorno.');
      }
      
      recommendations.push('• Mantenga un seguimiento regular de estos indicadores.');
      recommendations.push('• Solicite feedback de clientes para mejorar la calidad del servicio.');
      
      recommendations.forEach(rec => {
        const lines = pdf.splitTextToSize(rec, 160);
        lines.forEach((line: string) => {
          pdf.text(line, 25, yPos);
          yPos += 6;
        });
        yPos += 2;
      });
      
      // Pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`${lubricentroName} - Informe de Operaciones`, 20, 285);
        pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        pdf.text(`Generado por Sistema HISMA`, 105, 290, { align: 'center' });
      }
      
      // Guardar
      const fileName = `Informe_${lubricentroName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar informe PDF:', error);
      throw error;
    }
  },

  /**
   * ✅ Genera un archivo Excel con los datos de cambios de aceite
   */
  exportToExcel: async (data: any[], sheetName: string = 'Reporte'): Promise<void> => {
    try {
      // Importar XLSX dinámicamente
      const XLSX = await import('xlsx');
      
      if (!data || data.length === 0) {
        throw new Error('No hay datos para exportar');
      }
      
      // Limitar nombre de hoja a 31 caracteres (requisito de Excel)
      const sanitizedSheetName = sheetName.substring(0, 31);
      
      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      
      // Crear hoja principal
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
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);
      
      // Crear hoja de resumen
      if (data.length > 0) {
        const summaryData = [
          { Métrica: 'Total de Registros', Valor: data.length },
          { Métrica: 'Fecha de Exportación', Valor: new Date().toLocaleDateString('es-ES') },
          { Métrica: 'Hora de Exportación', Valor: new Date().toLocaleTimeString('es-ES') }
        ];
        
        // Estadísticas adicionales
        if (data.some(row => row['Marca Aceite'])) {
          const marcasAceite = Array.from(new Set(data.map(row => row['Marca Aceite']).filter(Boolean)));
          summaryData.push({ Métrica: 'Marcas de Aceite Diferentes', Valor: marcasAceite.length });
        }
        
        if (data.some(row => row['Tipo'])) {
          const tiposVehiculo = Array.from(new Set(data.map(row => row['Tipo']).filter(Boolean)));
          summaryData.push({ Métrica: 'Tipos de Vehículo', Valor: tiposVehiculo.length });
        }
        
        if (data.some(row => row['Operario'])) {
          const operarios = Array.from(new Set(data.map(row => row['Operario']).filter(Boolean)));
          summaryData.push({ Métrica: 'Operarios Diferentes', Valor: operarios.length });
        }
        
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
      }
      
      // Generar nombre de archivo (también limitar longitud)
      const fileName = `${sanitizedSheetName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      throw new Error(`Error al exportar a Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  },

  /**
   * ✅ Exporta estadísticas de operadores a Excel
   */
  exportOperatorStatsToExcel: async (
    operatorStats: OperatorStats[],
    lubricentroName: string,
    dateRange: string
  ): Promise<void> => {
    try {
      const XLSX = await import('xlsx');
      
      if (!operatorStats || operatorStats.length === 0) {
        throw new Error('No hay estadísticas de operadores para exportar');
      }
      
      // Preparar datos
      const totalServices = operatorStats.reduce((sum, op) => sum + op.count, 0);
      
      const excelData = operatorStats.map((operator, index) => ({
        'Posición': index + 1,
        'Operario': operator.operatorName,
        'Cantidad de Servicios': operator.count,
        'Porcentaje del Total': `${((operator.count / totalServices) * 100).toFixed(1)}%`,
        'Promedio Diario': (operator.count / 30).toFixed(1),
        'Rendimiento': operator.count >= totalServices / operatorStats.length ? 'Por encima del promedio' : 'Por debajo del promedio'
      }));
      
      // Crear libro
      const wb = XLSX.utils.book_new();
      
      // Hoja principal (limitar nombre a 31 caracteres)
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 18 }, 
        { wch: 15 }, { wch: 15 }, { wch: 25 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Estadisticas_Operadores');
      
      // Hoja de resumen
      const summaryData = [
        { Métrica: 'Lubricentro', Valor: lubricentroName },
        { Métrica: 'Período', Valor: dateRange },
        { Métrica: 'Total de Operadores', Valor: operatorStats.length },
        { Métrica: 'Total de Servicios', Valor: totalServices },
        { Métrica: 'Promedio por Operador', Valor: (totalServices / operatorStats.length).toFixed(1) },
        { Métrica: 'Mejor Operario', Valor: operatorStats[0]?.operatorName || 'N/A' },
        { Métrica: 'Servicios del Mejor', Valor: operatorStats[0]?.count || 0 },
        { Métrica: 'Fecha de Exportación', Valor: new Date().toLocaleDateString('es-ES') }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
      
      // Guardar archivo
      const safeFileName = `Reporte_Operadores_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, safeFileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al exportar estadísticas de operadores:', error);
      throw error;
    }
  },

  /**
   * ✅ Captura una imagen de un elemento HTML
   */
  captureElement: async (element: HTMLElement): Promise<string> => {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        width: element.scrollWidth,
        height: element.scrollHeight
      });
      
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      console.error('Error al capturar elemento:', error);
      throw error;
    }
  },

  /**
   * ✅ Genera un reporte detallado de un vehículo específico
   */
  generateVehicleReport: async (
    vehicleChanges: OilChange[],
    vehicleDomain: string,
    lubricentroName: string
  ): Promise<void> => {
    try {
      if (!vehicleChanges || vehicleChanges.length === 0) {
        throw new Error('No hay datos del vehículo para generar el reporte');
      }
      
      const pdf = new jsPDF();
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
      
      // Información del vehículo
      const latestChange = vehicleChanges[0];
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMACIÓN DEL VEHÍCULO', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const vehicleInfo = [
        ['Dominio:', latestChange.dominioVehiculo],
        ['Marca:', latestChange.marcaVehiculo],
        ['Modelo:', latestChange.modeloVehiculo],
        ['Tipo:', latestChange.tipoVehiculo],
        ['Año:', latestChange.añoVehiculo?.toString() || 'No especificado'],
        ['Cliente:', latestChange.nombreCliente],
        ['Teléfono:', latestChange.celular || 'No registrado']
      ];
      
      vehicleInfo.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 70, yPos);
        yPos += 6;
      });
      
      yPos += 10;
      
      // Estadísticas
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTADÍSTICAS DE MANTENIMIENTO', 20, yPos);
      yPos += 10;
      
      const totalChanges = vehicleChanges.length;
      const kmActual = latestChange.kmActuales;
      const kmPrimero = vehicleChanges[vehicleChanges.length - 1].kmActuales;
      const kmRecorridos = kmActual - kmPrimero;
      const promedioKmEntreCambios = totalChanges > 1 ? Math.round(kmRecorridos / (totalChanges - 1)) : 0;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const stats = [
        ['Total de cambios realizados:', totalChanges.toString()],
        ['Kilometraje actual:', `${kmActual.toLocaleString()} km`],
        ['Kilómetros recorridos:', `${kmRecorridos.toLocaleString()} km`],
        ['Promedio km entre cambios:', `${promedioKmEntreCambios.toLocaleString()} km`],
        ['Primer servicio:', toDate(vehicleChanges[vehicleChanges.length - 1].fecha).toLocaleDateString('es-ES')],
        ['Último servicio:', toDate(latestChange.fecha).toLocaleDateString('es-ES')]
      ];
      
      stats.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 100, yPos);
        yPos += 6;
      });
      
      // Nueva página para historial
      pdf.addPage();
      yPos = 20;
      
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HISTORIAL DETALLADO DE SERVICIOS', 20, yPos);
      yPos += 15;
      
      // Servicios
      vehicleChanges.forEach((change, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFillColor(240, 240, 240);
        pdf.rect(20, yPos - 5, 170, 8, 'F');
        
        pdf.setFontSize(10);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`SERVICIO #${totalChanges - index} - ${change.nroCambio}`, 25, yPos);
        yPos += 10;
        
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        
        const serviceDetails = [
          `Fecha: ${toDate(change.fecha).toLocaleDateString('es-ES')}`,
          `Kilometraje: ${change.kmActuales.toLocaleString()} km`,
          `Aceite: ${change.marcaAceite} ${change.tipoAceite} ${change.sae} (${change.cantidadAceite}L)`,
          `Operario: ${change.nombreOperario}`
        ];
        
        serviceDetails.forEach(detail => {
          pdf.text(detail, 30, yPos);
          yPos += 5;
        });
        
        // Servicios adicionales
        const additionalServices = [];
        if (change.filtroAceite) additionalServices.push('Filtro de aceite');
        if (change.filtroAire) additionalServices.push('Filtro de aire');
        if (change.filtroHabitaculo) additionalServices.push('Filtro de habitáculo');
        if (change.filtroCombustible) additionalServices.push('Filtro de combustible');
        
        if (additionalServices.length > 0) {
          pdf.text(`Servicios adicionales: ${additionalServices.join(', ')}`, 30, yPos);
          yPos += 5;
        }
        
        if (change.observaciones) {
          pdf.text(`Observaciones: ${change.observaciones}`, 30, yPos);
          yPos += 5;
        }
        
        yPos += 8;
      });
      
      // Pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Historial del vehículo ${vehicleDomain} - ${lubricentroName}`, 20, 285);
        pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        pdf.text(`Generado el ${toDate(new Date()).toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
      }
      
      // Guardar
      const fileName = `Historial_Vehiculo_${vehicleDomain}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar reporte de vehículo:', error);
      throw error;
    }
  },

  /**
   * ✅ Genera un reporte detallado de un operador específico
   */
  generateOperatorReport: async (
    operator: User,
    operatorChanges: OilChange[],
    lubricentroName: string,
    dateRange: string
  ): Promise<void> => {
    try {
      if (!operatorChanges || operatorChanges.length === 0) {
        throw new Error('No hay datos del operador para generar el reporte');
      }
      
      const pdf = new jsPDF();
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
      
      // Información del operador
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INFORMACIÓN DEL OPERADOR', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const operatorInfo = [
        ['Nombre completo:', `${operator.nombre} ${operator.apellido}`],
        ['Email:', operator.email],
        ['Rol:', operator.role === 'admin' ? 'Administrador' : 'Operario'],
        ['Estado:', operator.estado]
      ];
      
      operatorInfo.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 80, yPos);
        yPos += 6;
      });
      
      yPos += 10;
      
      // Estadísticas de rendimiento
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTADÍSTICAS DE RENDIMIENTO', 20, yPos);
      yPos += 10;
      
      const totalServices = operatorChanges.length;
      const vehicleTypes = Array.from(new Set(operatorChanges.map(c => c.tipoVehiculo)));
      const uniqueVehicles = Array.from(new Set(operatorChanges.map(c => c.dominioVehiculo)));
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const performanceStats = [
        ['Servicios realizados:', totalServices.toString()],
        ['Vehículos únicos atendidos:', uniqueVehicles.length.toString()],
        ['Tipos de vehículos:', vehicleTypes.join(', ')],
        ['Primer servicio del período:', toDate(operatorChanges[operatorChanges.length - 1].fecha).toLocaleDateString('es-ES')],
        ['Último servicio del período:', toDate(operatorChanges[0].fecha).toLocaleDateString('es-ES')]
      ];
      
      performanceStats.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 90, yPos);
        yPos += 6;
      });
      
      // Nueva página para detalle
      pdf.addPage();
      yPos = 20;
      
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DETALLE DE SERVICIOS REALIZADOS', 20, yPos);
      yPos += 15;
      
      // Últimos 20 servicios
      const servicesToShow = operatorChanges.slice(0, 20);
      
      servicesToShow.forEach((change) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFillColor(245, 245, 245);
        pdf.rect(20, yPos - 5, 170, 8, 'F');
        
        pdf.setFontSize(9);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${change.nroCambio} - ${toDate(change.fecha).toLocaleDateString('es-ES')}`, 25, yPos);
        yPos += 8;
        
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        
        const serviceInfo = `${change.nombreCliente} | ${change.dominioVehiculo} | ${change.marcaVehiculo} ${change.modeloVehiculo} | ${change.kmActuales.toLocaleString()} km`;
        pdf.text(serviceInfo, 25, yPos);
        yPos += 4;
        
        const oilInfo = `Aceite: ${change.marcaAceite} ${change.tipoAceite} ${change.sae} (${change.cantidadAceite}L)`;
        pdf.text(oilInfo, 25, yPos);
        yPos += 6;
      });
      
      if (operatorChanges.length > 20) {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`... y ${operatorChanges.length - 20} servicios más`, 25, yPos);
      }
      
      // Pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Reporte de ${operator.nombre} ${operator.apellido} - ${lubricentroName}`, 20, 285);
        pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        pdf.text(`Generado el ${toDate(new Date()).toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
      }
      
      // Guardar
      const fileName = `Reporte_Operador_${operator.nombre}_${operator.apellido}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar reporte de operador:', error);
      throw error;
    }
  },

  /**
   * ✅ Genera un reporte de evolución temporal - VERSIÓN COMPLETA CORREGIDA
   */
  generateEvolutionReport: async (
    oilChanges: OilChange[],
    lubricentroName: string,
    dateRange: string
  ): Promise<void> => {
    try {
      if (!oilChanges || oilChanges.length === 0) {
        throw new Error('No hay datos para generar el reporte de evolución');
      }

      const pdf = new jsPDF();
      let yPos = 20;
      const primaryColor = [46, 125, 50];
      
      // Header con diseño mejorado
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, 210, 30, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE EVOLUCIÓN TEMPORAL', 105, 15, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text(lubricentroName, 105, 22, { align: 'center' });
      
      yPos = 45;
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(12);
      pdf.text(`Período: ${dateRange}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Cálculo correcto de fechas con función helper
      const { startDate, endDate } = parseDateRange(dateRange, oilChanges);
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const safeDaysInPeriod = Math.max(1, daysInPeriod);
      const totalServices = oilChanges.length;
      
      const averagePerDay = (totalServices / safeDaysInPeriod).toFixed(1);
      const averagePerWeek = (totalServices / Math.max(1, safeDaysInPeriod / 7)).toFixed(1);
      
      // Análisis temporal mejorado
      const weeklyData: { [key: string]: number } = {};
      const monthlyData: { [key: string]: number } = {};
      const dailyData: { [key: string]: number } = {};
      const dayOfWeekData: { [key: string]: number } = {};
      
      // Inicializar días de la semana
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      dayNames.forEach(day => dayOfWeekData[day] = 0);
      
      oilChanges.forEach(change => {
        const date = toDate(change.fecha);
        
        if (isNaN(date.getTime())) return;
        
        // Por día
        const dayKey = date.toLocaleDateString('es-ES');
        dailyData[dayKey] = (dailyData[dayKey] || 0) + 1;
        
        // Por día de la semana
        const dayOfWeek = date.getDay();
        const dayName = dayNames[dayOfWeek];
        dayOfWeekData[dayName]++;
        
        // Por semana
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = `Semana del ${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
        
        // Por mes
        const monthKey = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });
      
      // Resumen ejecutivo
      pdf.setFillColor(248, 250, 252);
      pdf.rect(15, yPos - 5, 180, 45, 'F');
      pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setLineWidth(1);
      pdf.rect(15, yPos - 5, 180, 45);
      
      pdf.setFontSize(14);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMEN EJECUTIVO', 20, yPos + 3);
      yPos += 12;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const summaryStats = [
        ['Total de servicios:', totalServices.toString()],
        ['Días analizados:', safeDaysInPeriod.toString()],
        ['Promedio diario:', `${averagePerDay} servicios/día`],
        ['Promedio semanal:', `${averagePerWeek} servicios/semana`],
        ['Días con actividad:', Object.keys(dailyData).length.toString()],
        ['Pico máximo diario:', Math.max(...Object.values(dailyData), 0).toString()]
      ];
      
      // Mostrar en dos columnas
      summaryStats.forEach(([label, value], index) => {
        const x = index < 3 ? 20 : 110;
        const y = yPos + ((index % 3) * 6);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, x, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, x + 60, y);
      });
      
      yPos += 25;
      
      // Análisis por días de la semana
      pdf.setFontSize(14);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ANÁLISIS POR DÍA DE LA SEMANA', 20, yPos);
      yPos += 12;
      
      const maxDayCount = Math.max(...Object.values(dayOfWeekData));
      
      dayNames.forEach((day) => {
        const count = dayOfWeekData[day];
        const percentage = totalServices > 0 ? ((count / totalServices) * 100).toFixed(1) : '0.0';
        const isMaxDay = count === maxDayCount && count > 0;
        
        // Barra visual proporcional
        const barWidth = Math.max(2, (count / Math.max(maxDayCount, 1)) * 50);
        const barColor = isMaxDay ? [76, 175, 80] : [200, 200, 200];
        
        pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
        pdf.rect(25, yPos - 2, barWidth, 4, 'F');
        
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont(isMaxDay ? 'helvetica' : 'helvetica', isMaxDay ? 'bold' : 'normal');
        
        const dayText = isMaxDay ? `${day} (MEJOR)` : day;
        pdf.text(`${dayText}: ${count} servicios (${percentage}%)`, 80, yPos);
        yPos += 7;
      });
      
      yPos += 8;
      
      // Análisis mensual si hay múltiples meses
      if (Object.keys(monthlyData).length > 1) {
        pdf.setFontSize(14);
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EVOLUCIÓN MENSUAL', 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        
        Object.entries(monthlyData).forEach(([month, count]) => {
          const percentage = ((count / totalServices) * 100).toFixed(1);
          pdf.text(`${month}: ${count} servicios (${percentage}%)`, 25, yPos);
          yPos += 5;
        });
        
        yPos += 10;
      }
      
      // Nueva página para recomendaciones
      if (yPos > 200) {
        pdf.addPage();
        yPos = 20;
      }
      
      // Recomendaciones
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, yPos - 10, 210, 20, 'F');
      
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INSIGHTS Y RECOMENDACIONES', 105, yPos, { align: 'center' });
      
      yPos += 20;
      
      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const recommendations = [];
      
      // Recomendaciones basadas en datos
      const sortedDays = Object.entries(dayOfWeekData)
        .filter(([_, count]) => count > 0)
        .sort(([, a], [, b]) => b - a);
      
      if (sortedDays.length > 0) {
        const [bestDay, bestCount] = sortedDays[0];
        recommendations.push(`${bestDay} es su día más productivo con ${bestCount} servicios (${((bestCount / totalServices) * 100).toFixed(1)}%)`);
        
        if (sortedDays.length > 1) {
          const [worstDay, worstCount] = sortedDays[sortedDays.length - 1];
          recommendations.push(`${worstDay} tiene menor actividad con ${worstCount} servicios - oportunidad de mejora`);
        }
      }
      
      const avgDaily = parseFloat(averagePerDay);
      if (avgDaily < 3) {
        recommendations.push('Considere promociones especiales para incrementar la actividad diaria');
        recommendations.push('Implemente recordatorios por WhatsApp para atraer más clientes');
      } else if (avgDaily > 10) {
        recommendations.push('Excelente volumen! Considere optimizar procesos para mantener la calidad');
        recommendations.push('Evalúe si necesita personal adicional para manejar la demanda');
      }
      
      if (safeDaysInPeriod >= 30) {
        recommendations.push('Analice patrones estacionales para una mejor planificación de recursos');
      }
      
      recommendations.push('Use días de menor actividad para mantenimiento preventivo de equipos');
      recommendations.push('Aproveche tiempos libres para capacitación del personal');
      recommendations.push('Implemente un sistema de recordatorios automáticos para aumentar retención');
      recommendations.push('Considere ofertas especiales en días de baja actividad');
      
      recommendations.forEach((rec, index) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(15, yPos - 3, 180, 8, 'F');
        }
        
        const lines = pdf.splitTextToSize(`• ${rec}`, 170);
        lines.forEach((line: string) => {
          pdf.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 3;
      });
      
      // Pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setLineWidth(0.5);
        pdf.line(20, 280, 190, 280);
        
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Reporte de Evolución - ${lubricentroName}`, 20, 285);
        pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} por Sistema HISMA`, 105, 290, { align: 'center' });
      }
      
      // Guardar
      const fileName = `Reporte_Evolucion_${lubricentroName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar reporte de evolución:', error);
      throw error;
    }
  },

  /**
   * ✅ Genera un reporte de próximos cambios de aceite - VERSIÓN COMPLETA MEJORADA
   */
  generateUpcomingChangesReport: async (
    upcomingChanges: OilChange[],
    lubricentroName: string
  ): Promise<void> => {
    try {
      if (!upcomingChanges || upcomingChanges.length === 0) {
        throw new Error('No hay próximos cambios para generar el reporte');
      }

      const pdf = new jsPDF();
      let yPos = 20;
      const primaryColor = [46, 125, 50];
      const urgentColor = [255, 152, 0];
      const overdueColor = [244, 67, 54];
      const normalColor = [76, 175, 80];
      
      // Header profesional
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, 210, 35, 'F');
      
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE PRÓXIMOS CAMBIOS', 105, 18, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(lubricentroName, 105, 26, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 105, 31, { align: 'center' });
      
      yPos = 50;
      
      // Análisis de urgencia
      const today = new Date();
      const overdue = upcomingChanges.filter(change => {
        const nextDate = toDate(change.fechaProximoCambio);
        return nextDate < today;
      });
      
      const urgent = upcomingChanges.filter(change => {
        const nextDate = toDate(change.fechaProximoCambio);
        const days = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 7;
      });
      
      const normal = upcomingChanges.filter(change => {
        const nextDate = toDate(change.fechaProximoCambio);
        const days = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days > 7 && days <= 30;
      });
      
      const distant = upcomingChanges.filter(change => {
        const nextDate = toDate(change.fechaProximoCambio);
        const days = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days > 30;
      });
      
      // Dashboard ejecutivo
      pdf.setFontSize(16);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DASHBOARD EJECUTIVO', 20, yPos);
      yPos += 15;
      
      // Crear cajas de estadísticas visuales
      const stats = [
        { label: 'VENCIDOS', value: overdue.length, color: overdueColor },
        { label: 'URGENTES (≤7 días)', value: urgent.length, color: urgentColor },
        { label: 'PRÓXIMOS (8-30 días)', value: normal.length, color: normalColor },
        { label: 'PROGRAMADOS (>30 días)', value: distant.length, color: [33, 150, 243] }
      ];
      
      const boxWidth = 42;
      const boxHeight = 25;
      let xStart = 20;
      
      stats.forEach((stat) => {
        // Fondo de la caja
        pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.roundedRect(xStart, yPos - 3, boxWidth, boxHeight, 3, 3, 'F');
        
        // Texto en blanco
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(stat.label, xStart + boxWidth/2, yPos + 3, { align: 'center' });
        
        pdf.setFontSize(16);
        pdf.text(stat.value.toString(), xStart + boxWidth/2, yPos + 12, { align: 'center' });
        
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.text('servicios', xStart + boxWidth/2, yPos + 17, { align: 'center' });
        
        xStart += boxWidth + 3;
      });
      
      yPos += 35;
      
      // Alertas visuales
      if (overdue.length > 0) {
        pdf.setFillColor(254, 242, 242);
        pdf.rect(15, yPos - 5, 180, 10, 'F');
        pdf.setDrawColor(overdueColor[0], overdueColor[1], overdueColor[2]);
        pdf.setLineWidth(2);
        pdf.rect(15, yPos - 5, 180, 10);
        
        pdf.setFontSize(12);
        pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`CRÍTICO: ${overdue.length} cambios VENCIDOS requieren contacto inmediato`, 20, yPos + 2);
        yPos += 18;
      }
      
      if (urgent.length > 0) {
        pdf.setFillColor(255, 251, 235);
        pdf.rect(15, yPos - 5, 180, 10, 'F');
        pdf.setDrawColor(urgentColor[0], urgentColor[1], urgentColor[2]);
        pdf.setLineWidth(2);
        pdf.rect(15, yPos - 5, 180, 10);
        
        pdf.setFontSize(12);
        pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`URGENTE: ${urgent.length} cambios en los próximos 7 días`, 20, yPos + 2);
        yPos += 18;
      }
      
      // Sección de cambios vencidos
      if (overdue.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CAMBIOS VENCIDOS - ACCIÓN INMEDIATA REQUERIDA', 20, yPos);
        yPos += 12;
        
        overdue.slice(0, 12).forEach((change, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          const nextDate = toDate(change.fechaProximoCambio);
          const daysOverdue = Math.abs(Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Fondo alternado
          if (index % 2 === 0) {
            pdf.setFillColor(254, 242, 242);
            pdf.rect(18, yPos - 3, 174, 14, 'F');
          }
          
          pdf.setDrawColor(overdueColor[0], overdueColor[1], overdueColor[2]);
          pdf.setLineWidth(0.5);
          pdf.rect(18, yPos - 3, 174, 14);
          
          pdf.setFontSize(10);
          pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${change.nombreCliente}`, 22, yPos + 2);
          
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${change.dominioVehiculo} • ${change.marcaVehiculo} ${change.modeloVehiculo}`, 22, yPos + 6);
          
          pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`VENCIDO HACE ${daysOverdue} DÍAS`, 130, yPos + 2);
          
          if (change.celular) {
            pdf.setTextColor(60, 60, 60);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Tel: ${change.celular}`, 130, yPos + 6);
          }
          
          pdf.setTextColor(120, 120, 120);
          pdf.setFontSize(8);
          pdf.text(`Vencía: ${nextDate.toLocaleDateString('es-ES')}`, 130, yPos + 9);
          
          yPos += 17;
        });
        
        if (overdue.length > 12) {
          pdf.setFontSize(10);
          pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`... y ${overdue.length - 12} cambios vencidos más`, 22, yPos);
          yPos += 10;
        }
        
        yPos += 10;
      }
      
      // Cambios urgentes
      if (urgent.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CAMBIOS URGENTES (PRÓXIMOS 7 DÍAS)', 20, yPos);
        yPos += 12;
        
        urgent.slice(0, 15).forEach((change, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          const nextDate = toDate(change.fechaProximoCambio);
          const daysRemaining = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (index % 2 === 0) {
            pdf.setFillColor(255, 251, 235);
            pdf.rect(18, yPos - 3, 174, 14, 'F');
          }
          
          pdf.setDrawColor(urgentColor[0], urgentColor[1], urgentColor[2]);
          pdf.setLineWidth(0.5);
          pdf.rect(18, yPos - 3, 174, 14);
          
          pdf.setFontSize(10);
          pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${change.nombreCliente}`, 22, yPos + 2);
          
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${change.dominioVehiculo} • ${change.marcaVehiculo} ${change.modeloVehiculo}`, 22, yPos + 6);
          
          const urgencyText = daysRemaining === 0 ? 'HOY' : 
                            daysRemaining === 1 ? 'MAÑANA' : 
                            `EN ${daysRemaining} DÍAS`;
          
          pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(urgencyText, 130, yPos + 2);
          
          if (change.celular) {
            pdf.setTextColor(60, 60, 60);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Tel: ${change.celular}`, 130, yPos + 6);
          }
          
          pdf.setTextColor(120, 120, 120);
          pdf.setFontSize(8);
          pdf.text(`Programado: ${nextDate.toLocaleDateString('es-ES')}`, 130, yPos + 9);
          
          yPos += 17;
        });
        
        if (urgent.length > 15) {
          pdf.setFontSize(10);
          pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`... y ${urgent.length - 15} cambios urgentes más`, 22, yPos);
          yPos += 10;
        }
        
        yPos += 10;
      }
      
      // Nueva página para plan de acción
      pdf.addPage();
      yPos = 20;
      
      // Plan de acción
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, 0, 210, 25, 'F');
      
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PLAN DE ACCIÓN ESTRATÉGICO', 105, 15, { align: 'center' });
      
      yPos = 40;
      
      // Acciones prioritarias
      const priorityActions = [
        { 
          title: 'PRIMERA PRIORIDAD - CRÍTICO', 
          items: [
            'Contactar INMEDIATAMENTE por teléfono a clientes con cambios vencidos',
            'Enviar mensajes urgentes por WhatsApp con llamada a la acción clara',
            'Ofrecer descuentos especiales por pronto pago (15-20%)',
            'Programar citas para los próximos 2-3 días hábiles'
          ],
          color: overdueColor
        },
        { 
          title: 'SEGUNDA PRIORIDAD - URGENTE', 
          items: [
            'Contactar a clientes con vencimientos en 7 días o menos',
            'Enviar recordatorios preventivos personalizados',
            'Confirmar disponibilidad de aceites y filtros necesarios',
            'Preparar agenda de trabajo optimizada para la semana'
          ],
          color: urgentColor
        },
        { 
          title: 'PLANIFICACIÓN ESTRATÉGICA', 
          items: [
            'Organizar calendario de servicios para próximos 30 días',
            'Verificar inventario de productos más demandados',
            'Implementar sistema de recordatorios automáticos',
            'Capacitar personal en técnicas de retención de clientes'
          ],
          color: normalColor
        }
      ];
      
      priorityActions.forEach((section) => {
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
      
      // Consejos adicionales
      if (yPos < 180) {
        pdf.setFillColor(240, 248, 255);
        pdf.rect(15, yPos - 5, 180, 45, 'F');
        pdf.setDrawColor(33, 150, 243);
        pdf.setLineWidth(1);
        pdf.rect(15, yPos - 5, 180, 45);
        
        pdf.setFontSize(12);
        pdf.setTextColor(33, 150, 243);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CONSEJOS DE EXPERTO', 20, yPos + 5);
        
        yPos += 15;
        const expertTips = [
          '• Personalice mensajes con nombre del cliente y datos del vehículo',
          '• Use WhatsApp Business para imagen más profesional',
          '• Implemente recordatorios 15, 7 y 3 días antes del vencimiento',
          '• Ofrezca servicios adicionales (bujías, batería, frenos)',
          '• Mantenga base de datos actualizada con nuevos números',
          '• Documente respuestas para mejorar estrategias futuras'
        ];
        
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        
        expertTips.forEach((tip) => {
          const lines = pdf.splitTextToSize(tip, 165);
          lines.forEach((line: string) => {
            pdf.text(line, 20, yPos);
            yPos += 4;
          });
        });
      }
      
      // Resumen de contactos
      if (yPos < 200) {
        yPos = Math.max(yPos + 10, 210);
        
        pdf.setFillColor(248, 250, 252);
        pdf.rect(15, yPos - 5, 180, 30, 'F');
        pdf.setDrawColor(34, 197, 94);
        pdf.setLineWidth(1);
        pdf.rect(15, yPos - 5, 180, 30);
        
        pdf.setFontSize(12);
        pdf.setTextColor(34, 197, 94);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RESUMEN DE CONTACTABILIDAD', 20, yPos + 5);
        
        yPos += 15;
        const totalWithPhone = upcomingChanges.filter(change => change.celular).length;
        const overdueWithPhone = overdue.filter(change => change.celular).length;
        const urgentWithPhone = urgent.filter(change => change.celular).length;
        const contactabilityRate = ((totalWithPhone / upcomingChanges.length) * 100).toFixed(1);
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont('helvetica', 'normal');
        
        const contactStats = [
          `Clientes contactables: ${totalWithPhone} de ${upcomingChanges.length} (${contactabilityRate}%)`,
          `Vencidos contactables: ${overdueWithPhone} clientes`,
          `Urgentes contactables: ${urgentWithPhone} clientes`
        ];
        
        contactStats.forEach((stat) => {
          pdf.text(stat, 20, yPos);
          yPos += 5;
        });
      }
      
      // Mensaje motivacional
      if (yPos < 240) {
        yPos = Math.max(yPos + 15, 250);
        
        pdf.setFillColor(34, 197, 94);
        pdf.roundedRect(30, yPos - 8, 150, 25, 5, 5, 'F');
        
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('¡El seguimiento proactivo es clave del éxito!', 105, yPos, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Contactar a tiempo aumenta la fidelidad y demuestra profesionalismo', 105, yPos + 6, { align: 'center' });
        
        pdf.setFontSize(9);
        pdf.text('Los clientes valoran el cuidado preventivo de sus vehículos', 105, yPos + 12, { align: 'center' });
      }
      
      // Pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setLineWidth(0.5);
        pdf.line(20, 280, 190, 280);
        
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Reporte de Próximos Cambios - ${lubricentroName}`, 20, 285);
        pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        pdf.text(`Generado por Sistema HISMA el ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
      }
      
      // Guardar
      const todayStr = new Date().toISOString().split('T')[0];
      const fileName = `Proximos_Cambios_${lubricentroName.replace(/\s+/g, '_')}_${todayStr}.pdf`;
      pdf.save(fileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar reporte de próximos cambios:', error);
      throw error;
    }
  }
};

export default reportService;