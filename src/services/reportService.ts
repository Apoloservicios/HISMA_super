// src/services/reportService.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { OilChangeStats, OperatorStats, OilChange, User } from '../types';

/**
 * Servicio para generar reportes en diferentes formatos
 */
export const reportService = {
  /**
   * Genera un informe en PDF con las estadísticas y gráficos de cambios de aceite
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
   * Genera un archivo Excel con los datos de cambios de aceite
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
   * Exporta estadísticas de operadores a Excel
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
      
      XLSX.utils.book_append_sheet(wb, ws, 'Estadisticas_Operadores'); // Máximo 31 caracteres
      
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
      
      // Guardar archivo (limitar nombre de archivo)
      const safeFileName = `Reporte_Operadores_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, safeFileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al exportar estadísticas de operadores:', error);
      throw error;
    }
  },

  /**
   * Captura una imagen de un elemento HTML
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
   * Genera un reporte detallado de un vehículo específico
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
        ['Primer servicio:', new Date(vehicleChanges[vehicleChanges.length - 1].fecha).toLocaleDateString('es-ES')],
        ['Último servicio:', new Date(latestChange.fecha).toLocaleDateString('es-ES')]
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
          `Fecha: ${new Date(change.fecha).toLocaleDateString('es-ES')}`,
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
        pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
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
   * Genera un reporte detallado de un operador específico
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
        ['Primer servicio del período:', new Date(operatorChanges[operatorChanges.length - 1].fecha).toLocaleDateString('es-ES')],
        ['Último servicio del período:', new Date(operatorChanges[0].fecha).toLocaleDateString('es-ES')]
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
        pdf.text(`${change.nroCambio} - ${new Date(change.fecha).toLocaleDateString('es-ES')}`, 25, yPos);
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
        pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
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
   * Genera un reporte de evolución temporal
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
      
      // Título
      pdf.setFontSize(18);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE EVOLUCIÓN TEMPORAL', 105, yPos, { align: 'center' });
      yPos += 10;
      
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text(lubricentroName, 105, yPos, { align: 'center' });
      yPos += 5;
      pdf.text(`Período: ${dateRange}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Análisis temporal
      const weeklyData: { [key: string]: number } = {};
      const monthlyData: { [key: string]: number } = {};
      
      oilChanges.forEach(change => {
        const date = new Date(change.fecha);
        
        // Por semana
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
        
        // Por mes
        const monthKey = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });
      
      // Estadísticas generales
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMEN DE ACTIVIDAD', 20, yPos);
      yPos += 10;
      
      const totalServices = oilChanges.length;
      const daysInPeriod = Math.ceil((new Date(dateRange.split(' - ')[1]).getTime() - new Date(dateRange.split(' - ')[0]).getTime()) / (1000 * 60 * 60 * 24));
      const averagePerDay = (totalServices / daysInPeriod).toFixed(1);
      const averagePerWeek = (totalServices / (daysInPeriod / 7)).toFixed(1);
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const summaryStats = [
        ['Total de servicios:', totalServices.toString()],
        ['Días analizados:', daysInPeriod.toString()],
        ['Promedio diario:', `${averagePerDay} servicios/día`],
        ['Promedio semanal:', `${averagePerWeek} servicios/semana`],
        ['Pico máximo semanal:', Math.max(...Object.values(weeklyData)).toString()]
      ];
      
      summaryStats.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 90, yPos);
        yPos += 6;
      });
      
      yPos += 15;
      
      // Análisis por días de la semana
      const dayOfWeekData: { [key: string]: number } = {};
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      oilChanges.forEach(change => {
        const dayOfWeek = new Date(change.fecha).getDay();
        const dayName = dayNames[dayOfWeek];
        dayOfWeekData[dayName] = (dayOfWeekData[dayName] || 0) + 1;
      });
      
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ANÁLISIS POR DÍA DE LA SEMANA', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      dayNames.forEach(day => {
        const count = dayOfWeekData[day] || 0;
        const percentage = ((count / totalServices) * 100).toFixed(1);
        pdf.text(`${day}: ${count} servicios (${percentage}%)`, 25, yPos);
        yPos += 5;
      });
      
      yPos += 15;
      
      // Recomendaciones
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TENDENCIAS Y RECOMENDACIONES', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const recommendations = [];
      const bestDay = Object.entries(dayOfWeekData).reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const worstDay = Object.entries(dayOfWeekData).reduce((a, b) => a[1] < b[1] ? a : b)[0];
      
      recommendations.push(`• ${bestDay} es el día más activo con ${dayOfWeekData[bestDay]} servicios`);
      recommendations.push(`• ${worstDay} es el día menos activo con ${dayOfWeekData[worstDay]} servicios`);
      
      if (parseFloat(averagePerDay) < 5) {
        recommendations.push('• Considere promociones para incrementar la actividad diaria');
      }
      
      recommendations.push('• Programe mantenimiento de equipos en días de menor actividad');
      recommendations.push('• Use estos datos para optimizar horarios de personal');
      
      recommendations.forEach(rec => {
        const lines = pdf.splitTextToSize(rec, 160);
        lines.forEach((line: string) => {
          pdf.text(line, 25, yPos);
          yPos += 5;
        });
        yPos += 2;
      });
      
      // Pie de página
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Reporte de Evolución - ${lubricentroName}`, 20, 285);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
      
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
   * Genera un reporte de próximos cambios de aceite
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
      
      // Título
      pdf.setFontSize(18);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE PRÓXIMOS CAMBIOS', 105, yPos, { align: 'center' });
      yPos += 10;
      
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text(lubricentroName, 105, yPos, { align: 'center' });
      yPos += 5;
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Análisis de urgencia
      const today = new Date();
      const overdue = upcomingChanges.filter(change => new Date(change.fechaProximoCambio) < today);
      const urgent = upcomingChanges.filter(change => {
        const days = Math.ceil((new Date(change.fechaProximoCambio).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 7;
      });
      const normal = upcomingChanges.filter(change => {
        const days = Math.ceil((new Date(change.fechaProximoCambio).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return days > 7;
      });
      
      // Resumen ejecutivo
      pdf.setFontSize(12);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMEN EJECUTIVO', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const summary = [
        ['Total de próximos cambios:', upcomingChanges.length.toString()],
        ['Cambios vencidos (URGENTE):', overdue.length.toString()],
        ['Cambios próximos (≤7 días):', urgent.length.toString()],
        ['Cambios normales (>7 días):', normal.length.toString()]
      ];
      
      summary.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, 25, yPos);
        pdf.setFont('helvetica', 'normal');
        if (label.includes('vencidos')) {
          pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
        } else if (label.includes('próximos')) {
          pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
        } else {
          pdf.setTextColor(60, 60, 60);
        }
        pdf.text(value, 100, yPos);
        pdf.setTextColor(60, 60, 60);
        yPos += 6;
      });
      
      yPos += 15;
      
      // Cambios vencidos
      if (overdue.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('🚨 CAMBIOS VENCIDOS - ACCIÓN INMEDIATA', 20, yPos);
        yPos += 10;
        
        overdue.forEach((change, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          const daysOverdue = Math.abs(Math.ceil((new Date(change.fechaProximoCambio).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          
          pdf.setFontSize(9);
          pdf.setTextColor(overdueColor[0], overdueColor[1], overdueColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${change.nombreCliente} - ${change.dominioVehiculo}`, 25, yPos);
          yPos += 5;
          
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`   ${change.marcaVehiculo} ${change.modeloVehiculo} | Vencido hace ${daysOverdue} días`, 25, yPos);
          yPos += 4;
          pdf.text(`   Tel: ${change.celular || 'No registrado'}`, 25, yPos);
          yPos += 8;
        });
        
        yPos += 10;
      }
      
      // Cambios urgentes
      if (urgent.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text('⚠️ CAMBIOS PRÓXIMOS (7 DÍAS)', 20, yPos);
        yPos += 10;
        
        urgent.forEach((change, index) => {
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          const daysRemaining = Math.ceil((new Date(change.fechaProximoCambio).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          pdf.setFontSize(9);
          pdf.setTextColor(urgentColor[0], urgentColor[1], urgentColor[2]);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${index + 1}. ${change.nombreCliente} - ${change.dominioVehiculo}`, 25, yPos);
          yPos += 5;
          
          pdf.setTextColor(60, 60, 60);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`   ${change.marcaVehiculo} ${change.modeloVehiculo} | En ${daysRemaining} días`, 25, yPos);
          yPos += 4;
          pdf.text(`   Tel: ${change.celular || 'No registrado'}`, 25, yPos);
          yPos += 8;
        });
      }
      
      // Nueva página para plan de acción
      pdf.addPage();
      yPos = 20;
      
      pdf.setFontSize(14);
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PLAN DE ACCIÓN RECOMENDADO', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'normal');
      
      const actionPlan = [
        '1. CONTACTAR INMEDIATAMENTE a clientes con cambios vencidos',
        '2. PROGRAMAR citas para cambios urgentes (≤7 días)',
        '3. ENVIAR recordatorios por WhatsApp',
        '4. PREPARAR inventario necesario',
        '5. ORGANIZAR agenda de trabajo',
        '',
        'SUGERENCIAS ADICIONALES:',
        '• Ofrecer descuentos por pronto pago a clientes vencidos',
        '• Implementar recordatorios automáticos',
        '• Contactar por teléfono si no responden WhatsApp'
      ];
      
      actionPlan.forEach(item => {
        if (item === '') {
          yPos += 5;
        } else {
          const lines = pdf.splitTextToSize(item, 160);
          lines.forEach((line: string) => {
            pdf.text(line, 25, yPos);
            yPos += 6;
          });
          yPos += 2;
        }
      });
      
      // Pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Reporte de Próximos Cambios - ${lubricentroName}`, 20, 285);
        pdf.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
        pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
      }
      
      // Guardar
      const fileName = `Proximos_Cambios_${lubricentroName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar reporte de próximos cambios:', error);
      throw error;
    }
  }
};

export default reportService;