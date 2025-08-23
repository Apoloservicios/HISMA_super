// src/services/enhancedPdfService.ts - ARCHIVO COMPLETO CORREGIDO
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { OilChange, Lubricentro } from '../types';
// Renombrar la importación para evitar conflictos
import { 
  sanitizeText, 
  formatDate as safeFormatDate, 
  addSafeTextToPDF 
} from './reportService/utils';

// Logo predeterminado en base64 (un simple logo genérico)
const defaultLogoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4wEFBisYW4LrGwAAA9tJREFUeNrt3U9IVFEUx/HvGzVNRfwDpRZZ2SLSQoJolWVEm6y/tHARQZtolWULaVEbdREYLXPRHyjbSJsiFxH9wQiMMrLFgJlZUYtpXLeF5Ixv5r1535s/d+Y9zwcG4XLHd849575774wHIiIiIiIiIiIiIiIiIlIUdUAnMAKMA9+BFDADpIGfwCQwDAwA14HdgK92WVWB9BQQgU1rgTtA1YID6XA4nDZgNAcglq93wINygPENjs42bVkAERGRUgujPMbSCBwH9gC1QBXwCxgDngH9wOfQOueHH3V11K9YQcXixRQl/wW/5PGZpxz+P7+Bc8CzvEYF8NyKAWAAOAt4QDtwN49ebtOHnMboLLwfBV+heobfNbF9xhCwwtOA9OTxgZc8DVaeoXnU5wfv6zDww4MQ8jJPojVuP9RVQM+IxqS+v8DDEBJGrGZWbAe6C7TGDQM1Hobw1JGkBTiRh3WuHejIMj99JFkTcbA3eRWwFbgfwxo3CJx2/I59gG8zQBdwLPj8SXuHBccDOoN9xw1bXtgYkAlP9DzwBJgKJt7pYJcq22QxiNnfpCJa54DXOXz2jxhHxzGbOUUkXuX4fTMOQZxXOPnZb1M4bjPzHIJoVDj52Qsctt8pCMdF9UrEHPLMlheuQGx0CKLLcY3qtVnCUccgHgfnEXH13PJ35sJkEu/DRLzaphnYTf3GZo4tMPcTAz/B58i6Io5o1QJ7g+3YDXaPT38M6xtW77B62czhVk09hptdqRwOFuO+dnqLbSMzX/E04LHl0fPBPshvW57a3KizHnN9pI/SuCbfXcJxxIDNhTozPwJ8KaHTyoklODqgSDcyQyk9jHAUOJZXQhAyHIyOVxZf/ztwkpnTMSd9xhLMkx9+iRyRXo1JZqbUFcvFwKVyeegsxvOi8OZn/y0VBhGRwkd5jKURaAH2YR591mL+Yl4K+IA5fX6GedRmXiOj3L+Sqi3YLIbHxY/FvJPkcAHXuE9Al7ZfREQkPwdxdlx4FXP9eQrzsNwHx7VpHNsOkiGP7Ss7vGCh8YJU2vbXbdhXdnh8eTqXBsIvPRyLwWYTCO+K+GG4a4tMZl5rI4Aw3PXMQZCZl3JERCR2QE4CExFUGbfeaLG3BDaNYb7c7YZNr0GYd4cAbQqkTYGIiIj+6CrWyMv1yF6ksrc/';

// Función auxiliar para crear rectángulos redondeados de forma segura
const drawRoundedRect = (pdf: any, x: number, y: number, width: number, height: number, radius: number, style: string) => {
  try {
    // Si la biblioteca jsPDF tiene soporte nativo para roundedRect, usarlo
    if (typeof pdf.roundedRect === 'function') {
      pdf.roundedRect(x, y, width, height, radius, radius, style);
      return;
    }
  } catch (error) {
    console.warn('Error creando rectángulo redondeado:', error);
  }
  
  // Implementación alternativa simple (no redondeada)
  pdf.rect(x, y, width, height, style);
};

// Función helper para formatear fecha (usando la función local existente)
const formatDate = (date: any): string => {
  if (!date) return 'Sin fecha';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleDateString('es-ES');
  } catch (error) {
    console.warn('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
};

// Función para obtener días restantes
const getDaysRemaining = (futureDate: any): number => {
  try {
    const future = futureDate instanceof Date ? futureDate : new Date(futureDate);
    const today = new Date();
    const diffTime = future.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.warn('Error calculando días restantes:', error);
    return 0;
  }
};

/**
 * Servicio mejorado para la generación de PDF y utilidades relacionadas
 */
const enhancedPdfService = {
  /**
   * Genera un mensaje para compartir en WhatsApp con un formato mejorado y atractivo
   * @param oilChange - Cambio de aceite
   * @param lubricentroName - Nombre del lubricentro
   * @returns Objeto con el mensaje formateado y URLs para compartir
   */
  generateWhatsAppMessage: (oilChange: OilChange, lubricentroName: string): { 
    message: string, 
    whatsappUrl: string, 
    whatsappUrlWithPhone: string | null 
  } => {
    // Limpiar datos antes de usar
    const cleanData = {
      lubricentroName: sanitizeText(lubricentroName),
      nroCambio: sanitizeText(oilChange.nroCambio),
      marcaVehiculo: sanitizeText(oilChange.marcaVehiculo),
      modeloVehiculo: sanitizeText(oilChange.modeloVehiculo),
      dominioVehiculo: sanitizeText(oilChange.dominioVehiculo),
      nombreCliente: sanitizeText(oilChange.nombreCliente),
      fecha: safeFormatDate(oilChange.fecha),
      kmActuales: oilChange.kmActuales || 0,
      marcaAceite: sanitizeText(oilChange.marcaAceite),
      tipoAceite: sanitizeText(oilChange.tipoAceite),
      sae: sanitizeText(oilChange.sae),
      cantidadAceite: oilChange.cantidadAceite || 0,
      fechaProximoCambio: safeFormatDate(oilChange.fechaProximoCambio),
      kmProximo: oilChange.kmProximo || 0
    };

    // Crear un mensaje más atractivo con emojis y mejor formato
    const message = `
🔧 *${cleanData.lubricentroName}* 🔧
────────────────────
*CAMBIO DE ACEITE N°: ${cleanData.nroCambio}*
────────────────────

🚗 *Vehículo:* ${cleanData.marcaVehiculo} ${cleanData.modeloVehiculo}
🔢 *Dominio:* ${cleanData.dominioVehiculo}
👤 *Cliente:* ${cleanData.nombreCliente}
📅 *Fecha:* ${cleanData.fecha}
📊 *Kilometraje:* ${cleanData.kmActuales.toLocaleString()} km

🛢️ *Aceite utilizado:*
${cleanData.marcaAceite} ${cleanData.tipoAceite} ${cleanData.sae}
Cantidad: ${cleanData.cantidadAceite} litros

${oilChange.filtroAceite || oilChange.filtroAire || oilChange.filtroHabitaculo || oilChange.filtroCombustible ? '🔄 *Filtros cambiados:*' : ''}
${oilChange.filtroAceite ? '✅ Filtro de aceite' : ''}
${oilChange.filtroAire ? '✅ Filtro de aire' : ''}
${oilChange.filtroHabitaculo ? '✅ Filtro de habitáculo' : ''}
${oilChange.filtroCombustible ? '✅ Filtro de combustible' : ''}

📌 *PRÓXIMO CAMBIO:*
📆 ${cleanData.fechaProximoCambio} o
🛣️ ${cleanData.kmProximo.toLocaleString()} km
(lo que ocurra primero)

¡Gracias por confiar en nosotros!
────────────────────
`;
    
    // Crear URL para WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // URL con número telefónico si está disponible
    let whatsappUrlWithPhone = null;
    if (oilChange.celular) {
      const phoneNumber = sanitizeText(oilChange.celular).replace(/\D/g, '');
      if (phoneNumber) {
        whatsappUrlWithPhone = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
      }
    }
    
    return {
      message,
      whatsappUrl,
      whatsappUrlWithPhone
    };
  },
  
  /**
   * Genera un PDF con jsPDF con un diseño profesional mejorado
   * @param oilChange - Datos del cambio de aceite
   * @param lubricentro - Datos del lubricentro
   * @returns nombre del archivo generado
   */
  generateDirectPDF: async (oilChange: OilChange, lubricentro: Lubricentro | null): Promise<string> => {
    try {
      // Crear nuevo documento PDF con orientación portrait
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Configurar soporte para caracteres especiales
      try {
        pdf.setFont('helvetica', 'normal');
        // Remover setCharSet ya que no existe en jsPDF
      } catch (charsetError) {
        console.warn('Error configurando fuente:', charsetError);
      }
      
      const filename = `cambio-aceite-${sanitizeText(oilChange.nroCambio)}.pdf`;
      
      // Dimensiones de la página A4
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Márgenes
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Colores utilizados en el documento
      const primaryColor = [46, 125, 50]; // #2E7D32
      const secondaryColor = [27, 94, 32]; // #1B5E20
      const accentColor = [251, 192, 45]; // #FBC02D
      const textColor = [33, 33, 33]; // #212121
      const textLight = [117, 117, 117]; // #757575
      
      // === CONFIGURACIÓN INICIAL ===
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      let yPos = margin;
      
      // === ENCABEZADO ===
      if (lubricentro) {
        // Fondo verde para el encabezado
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.rect(0, 0, pageWidth, 35, 'F');
        
        // Nombre del lubricentro
        pdf.setFontSize(20);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        addSafeTextToPDF(pdf, sanitizeText(lubricentro.fantasyName), pageWidth / 2, 15, { align: 'center' });
        
        // Dirección
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        addSafeTextToPDF(pdf, sanitizeText(lubricentro.domicilio), pageWidth / 2, 25, { align: 'center' });
        
        // Teléfono si está disponible
        if (lubricentro.phone) {
          addSafeTextToPDF(pdf, `Tel: ${sanitizeText(lubricentro.phone)}`, pageWidth / 2, 30, { align: 'center' });
        }
        
        yPos = 45;
      }
      
      // Línea separadora
      pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // === DATOS DEL COMPROBANTE ===
      pdf.setFontSize(16);
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'COMPROBANTE DE CAMBIO DE ACEITE', margin, yPos);
      
      // Número de cambio en un rectángulo
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      drawRoundedRect(pdf, pageWidth - margin - 50, yPos - 8, 50, 12, 2, 'FD');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      const numeroText = `N° ${sanitizeText(oilChange.nroCambio)}`;
      addSafeTextToPDF(pdf, numeroText, pageWidth - margin - 25, yPos - 1, { align: 'center' });
      
      yPos += 15;
      
      // Dominio en formato destacado
      pdf.setFillColor(245, 245, 245);
      drawRoundedRect(pdf, margin, yPos - 8, contentWidth, 14, 2, 'F');
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const dominioText = `DOMINIO: ${sanitizeText(oilChange.dominioVehiculo)}`;
      addSafeTextToPDF(pdf, dominioText, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      
      // === SECCIÓN CLIENTE Y VEHÍCULO ===
      const columnWidth = contentWidth / 2 - 5;
      
      // Sección Cliente
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      drawRoundedRect(pdf, margin, yPos, columnWidth, 8, 1, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'DATOS DEL CLIENTE', margin + 5, yPos + 5.5);
      
      yPos += 10;
      const clientStartY = yPos;
      yPos += 3;
      
      // Contenido de datos del cliente
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Cliente:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.nombreCliente), margin + 35, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Teléfono:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.celular) || 'No registrado', margin + 35, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Fecha servicio:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, formatDate(oilChange.fechaServicio), margin + 35, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Operario:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.nombreOperario), margin + 35, yPos);
      
      // Ajustar la posición Y para la siguiente sección
      yPos = clientStartY;
      
      // Sección Vehículo
      pdf.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      drawRoundedRect(pdf, margin + columnWidth + 10, yPos - 10, columnWidth, 8, 1, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'DATOS DEL VEHÍCULO', margin + columnWidth + 15, yPos - 4.5);
      yPos += 3;
      
      // Contenido de datos del vehículo
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Marca:', margin + columnWidth + 12, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.marcaVehiculo), margin + columnWidth + 45, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Modelo:', margin + columnWidth + 12, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.modeloVehiculo), margin + columnWidth + 45, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Tipo:', margin + columnWidth + 12, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.tipoVehiculo), margin + columnWidth + 45, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Año:', margin + columnWidth + 12, yPos);
      pdf.setFont('helvetica', 'normal');
      const añoVehiculo = oilChange.añoVehiculo || new Date().getFullYear();
      addSafeTextToPDF(pdf, String(añoVehiculo), margin + columnWidth + 45, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Kilometraje:', margin + columnWidth + 12, yPos);
      pdf.setFont('helvetica', 'normal');
      const kmActuales = oilChange.kmActuales || 0;
      addSafeTextToPDF(pdf, `${kmActuales.toLocaleString()} km`, margin + columnWidth + 45, yPos);
      
      // Ajustar la posición Y para la siguiente sección
      yPos = Math.max(clientStartY + 31, yPos + 10);
      
      // === SECCIÓN ACEITE Y PRÓXIMO SERVICIO ===
      pdf.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      drawRoundedRect(pdf, margin, yPos, contentWidth, 8, 1, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(33, 33, 33); // Texto oscuro sobre fondo amarillo
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'DETALLES DEL SERVICIO', margin + 5, yPos + 5.5);
      yPos += 12;
      
      // Primera columna - Aceite
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Aceite:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      const aceiteInfo = `${sanitizeText(oilChange.marcaAceite)} ${sanitizeText(oilChange.tipoAceite)} ${sanitizeText(oilChange.sae)}`;
      addSafeTextToPDF(pdf, aceiteInfo, margin + 35, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Cantidad:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      const cantidadAceite = oilChange.cantidadAceite || 0;
      addSafeTextToPDF(pdf, `${cantidadAceite} litros`, margin + 35, yPos);
      
      // Segunda columna - Próximo servicio
      const nextServiceY = yPos - 7;
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Próx. cambio km:', margin + columnWidth + 12, nextServiceY);
      pdf.setFont('helvetica', 'normal');
      const kmProximo = oilChange.kmProximo || 0;
      addSafeTextToPDF(pdf, `${kmProximo.toLocaleString()} km`, margin + columnWidth + 60, nextServiceY);
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Próx. cambio fecha:', margin + columnWidth + 12, nextServiceY + 7);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, formatDate(oilChange.fechaProximoCambio), margin + columnWidth + 60, nextServiceY + 7);
      
      // Alerta de próximo cambio si es cercano o vencido
      const daysRemaining = getDaysRemaining(oilChange.fechaProximoCambio);
      
      if (daysRemaining <= 0) {
        // Alerta de cambio vencido
        yPos += 12;
        pdf.setFillColor(220, 53, 69); // Rojo para cambio vencido
        drawRoundedRect(pdf, margin, yPos, contentWidth, 10, 1, 'F');
        
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        const alertText = `¡ALERTA! Cambio vencido hace ${Math.abs(daysRemaining)} días`;
        addSafeTextToPDF(pdf, alertText, margin + (contentWidth / 2), yPos + 6.5, { align: 'center' });
        yPos += 15;
      } else if (daysRemaining <= 7) {
        // Alerta de cambio próximo
        yPos += 12;
        pdf.setFillColor(255, 193, 7); // Amarillo para cambio próximo
        drawRoundedRect(pdf, margin, yPos, contentWidth, 10, 1, 'F');
        
        pdf.setFontSize(11);
        pdf.setTextColor(33, 33, 33);
        pdf.setFont('helvetica', 'bold');
        
        let alertText = "";
        if (daysRemaining === 0) {
          alertText = "¡ATENCIÓN! Cambio programado para hoy";
        } else if (daysRemaining === 1) {
          alertText = "¡ATENCIÓN! Cambio programado para mañana";
        } else {
          alertText = `¡ATENCIÓN! Cambio en ${daysRemaining} días`;
        }
        
        addSafeTextToPDF(pdf, alertText, margin + (contentWidth / 2), yPos + 6.5, { align: 'center' });
        yPos += 15;
      } else {
        yPos += 10;
      }
      
      // === SECCIÓN SERVICIOS ADICIONALES ===
      const services = [
        { name: 'Filtro de aceite', done: oilChange.filtroAceite },
        { name: 'Filtro de aire', done: oilChange.filtroAire },
        { name: 'Filtro habitáculo', done: oilChange.filtroHabitaculo },
        { name: 'Filtro combustible', done: oilChange.filtroCombustible }
      ];
      
      // Solo mostrar servicios si alguno fue realizado
      if (services.some(service => service.done)) {
        pdf.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        drawRoundedRect(pdf, margin, yPos, contentWidth, 6, 1, 'F');
        
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        addSafeTextToPDF(pdf, 'SERVICIOS ADICIONALES', margin + 5, yPos + 4);
        yPos += 10;
        
        const startY = yPos;
        const itemsPerRow = 2;
        const serviceItemWidth = (contentWidth - 10) / itemsPerRow - 5;
        const serviceItemHeight = 12;
        let currentColumn = 0;
        
        services.forEach((service) => {
          const itemX = margin + (currentColumn % itemsPerRow) * (serviceItemWidth + 5);
          const itemY = startY + Math.floor(currentColumn / itemsPerRow) * (serviceItemHeight + 2);
          
          const bgColorDone = service.done ? [237, 247, 237] : [253, 237, 237];
          const borderColorDone = service.done ? [76, 175, 80] : [244, 67, 54];
          
          pdf.setFillColor(bgColorDone[0], bgColorDone[1], bgColorDone[2]);
          pdf.setDrawColor(borderColorDone[0], borderColorDone[1], borderColorDone[2]);
          drawRoundedRect(pdf, itemX, itemY, serviceItemWidth, serviceItemHeight, 1, 'FD');
          
          pdf.setFontSize(10);
          const textColorStatus = service.done ? [46, 125, 50] : [211, 47, 47];
          pdf.setTextColor(textColorStatus[0], textColorStatus[1], textColorStatus[2]);
          pdf.setFont('helvetica', 'bold');
          addSafeTextToPDF(pdf, service.done ? '✓' : '✗', itemX + 4, itemY + 5);
          
          pdf.setFontSize(8);
          pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
          pdf.setFont('helvetica', 'bold');
          addSafeTextToPDF(pdf, service.name, itemX + 10, itemY + 5);
          
          currentColumn++;
        });
        
        const serviceRows = Math.ceil(services.length / itemsPerRow);
        const servicesHeight = serviceRows * (serviceItemHeight + 2);
        yPos = startY + servicesHeight + 3;
      }
      
      // === SECCIÓN OBSERVACIONES (si existen) ===
      if (oilChange.observaciones && oilChange.observaciones.trim() !== '' && sanitizeText(oilChange.observaciones) !== 'No especificado') {
        // Calculamos espacio disponible para evitar crear una nueva página
        const remainingSpace = pageHeight - yPos - 50; // 50mm para área de firmas y pie de página
        
        pdf.setFillColor(90, 90, 90); // Gris oscuro
        drawRoundedRect(pdf, margin, yPos, contentWidth, 6, 1, 'F'); // Altura de título reducida
        
        pdf.setFontSize(10); // Tamaño reducido
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        addSafeTextToPDF(pdf, 'OBSERVACIONES', margin + 5, yPos + 4);
        
        yPos += 8; // Espacio reducido
        
        // Marco para las observaciones
        pdf.setFillColor(248, 249, 250); // Fondo gris muy claro
        
        // Ajustar altura dinámicamente según espacio disponible
        const obsHeight = Math.min(25, remainingSpace - 10); // Máximo 25mm pero no más que el espacio restante
        drawRoundedRect(pdf, margin, yPos, contentWidth, obsHeight, 1, 'F');
        
        // Texto de observaciones
        pdf.setFontSize(8); // Tamaño reducido
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.setFont('helvetica', 'normal');
        
        // Dividir texto largo en múltiples líneas (limitamos líneas según altura disponible)
        const splitText = pdf.splitTextToSize(sanitizeText(oilChange.observaciones), contentWidth - 10);
        const maxLines = Math.floor(obsHeight / 4); // Aproximadamente 4mm por línea
        const textToDisplay = splitText.slice(0, maxLines);
        
        // Imprimir texto con padding interno
        for (let i = 0; i < textToDisplay.length; i++) {
          addSafeTextToPDF(pdf, textToDisplay[i], margin + 5, yPos + 5 + (i * 4));
        }
        
        // Si hay más texto del que se muestra, indicarlo
        if (splitText.length > maxLines) {
          pdf.setFont('helvetica', 'italic');
          addSafeTextToPDF(pdf, '...(texto truncado)', margin + 5, yPos + 5 + (maxLines * 4) - 2);
        }
        
        yPos += obsHeight + 3; // Actualizamos la posición después de las observaciones
      }
      
      // === ÁREA PARA FIRMAS ===
      // Verificar espacio disponible para firmas y pie de página
      const remainingSpace = pageHeight - yPos;
      const requiredSpace = 60; // Espacio mínimo necesario para firmas y pie de página
      
      // Si no hay espacio suficiente, reducir elementos o compactarlos
      if (remainingSpace < requiredSpace) {
        // En lugar de añadir una página nueva, ajustamos la distribución para caber en una página
        yPos = pageHeight - requiredSpace;
      }
      
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(0.5);
      
      yPos += 15;
      // Línea para firma del operario
      pdf.line(margin + 20, yPos, margin + contentWidth / 2 - 20, yPos);
      pdf.setFontSize(8); // Tamaño reducido
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFont('helvetica', 'normal');
      const operarioText = "Firma del Operario";
      addSafeTextToPDF(pdf, operarioText, margin + (contentWidth / 4), yPos + 4, { align: 'center' });
      
      // Línea para firma del cliente
      pdf.line(margin + contentWidth / 2 + 20, yPos, margin + contentWidth - 20, yPos);
      const clienteText = "Firma del Cliente";
      addSafeTextToPDF(pdf, clienteText, margin + (3 * contentWidth / 4), yPos + 4, { align: 'center' });
      
      // === PIE DE PÁGINA ===
      // Calculamos posición para pie de página, asegurando que quede en la primera página
      yPos = pageHeight - 25;
      
      // Línea horizontal
      pdf.setLineWidth(0.75);
      pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      
      yPos += 6;
      
      // Texto del pie
      pdf.setFontSize(7); // Tamaño reducido
      pdf.setTextColor(textLight[0], textLight[1], textLight[2]);
      pdf.setFont('helvetica', 'normal');
      
      const footerText1 = "Este documento es un comprobante del servicio realizado y no tiene validez como factura.";
      addSafeTextToPDF(pdf, footerText1, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 4;
      
      const footerText2 = `Próximo cambio: a los ${kmProximo.toLocaleString()} km o el ${formatDate(oilChange.fechaProximoCambio)}, lo que ocurra primero.`;
      addSafeTextToPDF(pdf, footerText2, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 4;
      
      // Información adicional del lubricentro
      if (lubricentro) {
        const year = new Date().getFullYear();
        const copyrightText = `© ${year} ${sanitizeText(lubricentro.fantasyName)} - Todos los derechos reservados`;
        addSafeTextToPDF(pdf, copyrightText, pageWidth / 2, yPos, { align: 'center' });
      }
      
      // Barra inferior de color
      pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
      
      // Guardar PDF
      pdf.save(filename);
      
      return filename;
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  },
  
  /**
   * Exporta los datos de cambios de aceite a Excel
   * @param oilChanges - Lista de cambios de aceite
   * @param filename - Nombre del archivo a generar
   */
  exportToExcel: (oilChanges: OilChange[], filename: string = 'cambios-aceite'): void => {
    // Implementación para exportar a Excel (si se desea)
    console.log('Exportar a Excel no implementado aún');
  },
  
  /**
   * Genera un PDF a partir de un nodo HTML y lo descarga
   * Usando html2canvas para una mejor compatibilidad
   * @param node - Referencia al nodo HTML a convertir en PDF
   * @param filename - Nombre del archivo PDF a descargar
   * @returns Promise que se resuelve cuando se completa la generación del PDF
   */
  generatePDF: async (node: HTMLElement, filename: string): Promise<void> => {
    if (!node) {
      throw new Error('No se proporcionó un nodo HTML válido');
    }
    
    try {
      // Generar canvas del HTML con configuración optimizada
      const canvas = await html2canvas(node, {
        scale: 2, // Mayor escala para mejor calidad
        useCORS: true, // Para permitir imágenes externas
        logging: false, // Reducir logs de consola
        backgroundColor: '#FFFFFF', // Fondo blanco
        onclone: (document, element) => {
          // Si hay estilos específicos que quieras aplicar al clonar el elemento
          // Por ejemplo, para asegurar que todo el contenido sea visible
          element.style.height = 'auto';
          element.style.overflow = 'visible';
          return element;
        }
      });
      
      // Crear PDF con tamaño A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Configurar soporte para caracteres especiales
      try {
        pdf.setFont('helvetica', 'normal');
        // Remover setCharSet ya que no existe en esta versión de jsPDF
      } catch (charsetError) {
        console.warn('Error configurando fuente:', charsetError);
      }
      
      // Obtener dimensiones
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular proporciones
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Agregar imagen al PDF (el contenido renderizado)
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Manejar múltiples páginas si el contenido es muy largo
      if (imgHeight > pageHeight) {
        let remainingHeight = imgHeight;
        let position = 0;
        
        // Primera página ya está agregada, agregar las siguientes
        while (remainingHeight > pageHeight) {
          position -= pageHeight;
          remainingHeight -= pageHeight;
          
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        }
      }
      
      // Descargar PDF con nombre seguro
      const safeFilename = sanitizeText(filename).replace(/[^\w\s.-]/g, '') || 'documento.pdf';
      pdf.save(safeFilename);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }
};

export default enhancedPdfService;