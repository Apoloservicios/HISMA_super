// src/services/enhancedPdfService.ts
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { OilChange, Lubricentro } from '../types';

// Logo predeterminado en base64 (un simple logo genérico)
const defaultLogoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4wEFBisYW4LrGwAAA9tJREFUeNrt3U9IVFEUx/HvGzVNRfwDpRZZ2SLSQoJolWVEm6y/tHARQZtolWULaVEbdREYLXPRHyjbSJsiFxH9wQiMMrLFgJlZUYtpXLeF5Ixv5r1535s/d+Y9zwcG4XLHd849575774wHIiIiIiIiIiIiIiIiIlIUdUAnMAKMA9+BFDADpIGfwCQwDAwA14HdgK92WVWB9BQQgU1rgTtA1YID6XA4nDZgNAcglq93wINygPENjs42bVkAERGRUgujPMbSCBwH9gC1QBXwCxgDngH9wOfQOueHH3V11K9YQcXixRQl/wW/5PGZpxz+P7+Bc8CzvEYF8NyKAWAAOAt4QDtwN49ebtOHnMboLLwfBV+heobfNbF9xhCwwtOA9OTxgZc8DVaeoXnU5wfv6zDww4MQ8jJPojVuP9RVQM+IxqS+v8DDEBJGrGZWbAe6C7TGDQM1Hobw1JGkBTiRh3WuHejIMj99JFkTcbA3eRWwFbgfwxo3CJx2/I59gG8zQBdwLPj8SXuHBccDOoN9xw1bXtgYkAlP9DzwBJgKJt7pYJcq22QxiNnfpCJa54DXOXz2jxhHxzGbOUUkXuX4fTMOQZxXOPnZb1M4bjPzHIJoVDj52Qsctt8pCMdF9UrEHPLMlheuQGx0CKLLcY3qtVnCUccgHgfnEXH13PJ35sJkEu/DRLzaphnYTf3GZo4tMPcTAz/B58i6Io5o1QJ7g+3YDXaPT38M6xtW77B62czhVk09hptdqRwOFuO+dnqLbSMzX/E04LHl0fPBPshvW57a3KizHnN9pI/SuCbfXcJxxIDNhTozPwJ8KaHTyoklODqgSDcyQyk9jHAUOJZXQhAyHIyOVxZf/ztwkpnTMSd9xhLMkx9+iRyRXo1JZqbUFcvFwKVyeegsxvOi8OZn/y0VBhGRwkd5jKURaAH2YR591mL+Yl4K+IA5fX6GedRmXiOj3L+Sqi3YLIbHxY/FvJPkcAHXuE9Al7ZfREQkPwdxdlx4FXP9eQrzsNwHx7VpHNsOkiGP7Ss7vGCh8YJU2vbXbdhXdnh8eTqXBsIvPRyLwWYTCO+K+GG4a4tMZl5rI4Aw3PXMQZCZl3JERCR2QE4CExFUGbfeaLG3BDaNYb7c7YZNr0GYd4cAbQqkTYGIiIj+6CrWyMv1yF6kU6hDyMqIPq8ioj0k02HkKObVqOkCb7+mMc9XjAbvDonFHuK6hzhmTgF4WdpnWcN8ey6TJ0HMKYBeQPcQERERERERERERERERERERl/wBsSpUZnbkoYYAAAAASUVORK5CYII=';

// Función para asegurar que una fecha sea un objeto Date
const ensureDateObject = (date: any): Date => {
  if (!date) return new Date();
  
  if (date instanceof Date) return date;
  
  if (typeof date === 'string') return new Date(date);
  
  if (date.toDate && typeof date.toDate === 'function') {
    try {
      return date.toDate();
    } catch (e) {
      console.warn('Error al convertir Timestamp a Date:', e);
      return new Date();
    }
  }
  
  return new Date();
};

// Función para formatear fechas en español
const formatDate = (date: any): string => {
  const dateObj = ensureDateObject(date);
  return dateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Calcular días restantes hasta próximo cambio
const getDaysRemaining = (date: any): number => {
  const today = new Date();
  const targetDate = ensureDateObject(date);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Función personalizada para crear rectángulos redondeados
const drawRoundedRect = (
  pdf: any, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  radius: number, 
  style: string
): void => {
  const cornerRadius = Math.min(radius, height / 2, width / 2);
  
  if (style === 'F' || style === 'FD') {
    pdf.rect(x, y, width, height, style);
    return;
  }
  
  // Si la biblioteca jsPDF tiene soporte nativo para roundedRect, usarlo
  if (typeof pdf.roundedRect === 'function') {
    pdf.roundedRect(x, y, width, height, radius, radius, style);
    return;
  }
  
  // Implementación alternativa simple (no redondeada)
  pdf.rect(x, y, width, height, style);
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
    // Crear un mensaje más atractivo con emojis y mejor formato
    const message = `
🔧 *${lubricentroName}* 🔧
────────────────────
*CAMBIO DE ACEITE N°: ${oilChange.nroCambio}*
────────────────────

🚗 *Vehículo:* ${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo}
🔢 *Dominio:* ${oilChange.dominioVehiculo}
👤 *Cliente:* ${oilChange.nombreCliente}
📅 *Fecha:* ${formatDate(oilChange.fecha)}
📊 *Kilometraje:* ${oilChange.kmActuales.toLocaleString()} km

🛢️ *Aceite utilizado:*
${oilChange.marcaAceite} ${oilChange.tipoAceite} ${oilChange.sae}
Cantidad: ${oilChange.cantidadAceite} litros

${oilChange.filtroAceite || oilChange.filtroAire || oilChange.filtroHabitaculo || oilChange.filtroCombustible ? '🔄 *Filtros cambiados:*' : ''}
${oilChange.filtroAceite ? '✅ Filtro de aceite' : ''}
${oilChange.filtroAire ? '✅ Filtro de aire' : ''}
${oilChange.filtroHabitaculo ? '✅ Filtro de habitáculo' : ''}
${oilChange.filtroCombustible ? '✅ Filtro de combustible' : ''}

📌 *PRÓXIMO CAMBIO:*
📆 ${formatDate(oilChange.fechaProximoCambio)} o
🛣️ ${oilChange.kmProximo.toLocaleString()} km
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
      const phoneNumber = oilChange.celular.replace(/\D/g, '');
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
    // Crear nuevo documento PDF con orientación portrait
    const pdf = new jsPDF('p', 'mm', 'a4');
    const filename = `cambio-aceite-${oilChange.nroCambio}.pdf`;
    
    // Dimensiones de la página A4
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Márgenes
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Colores utilizados en el documento
    // Verde primario, funciona bien para los títulos y acentos
    const primaryColor = [46, 125, 50]; // #2E7D32
    const secondaryColor = [27, 94, 32]; // #1B5E20 - Un poco más oscuro
    const accentColor = [251, 192, 45]; // #FBC02D - Amarillo para advertencias
    const textColor = [33, 33, 33]; // #212121 - Casi negro para texto principal
    const textLight = [117, 117, 117]; // #757575 - Gris para texto secundario
    
    // === CONFIGURACIÓN INICIAL ===
    // Configurar fuente
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    // Posición inicial en Y
    let yPos = margin;
    
    // === ENCABEZADO ===
    // Barra de color superior
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, pageWidth, 12, 'F');
    
    yPos += 20; // Espacio después de la barra de color
    
    // Información del lubricentro
    // Logo del lubricentro (si existe)
    if (lubricentro?.logoBase64) {
      try {
        pdf.addImage(lubricentro.logoBase64, 'JPEG', margin, yPos - 15, 40, 20);
      } catch (error) {
        console.error('Error al añadir logo del lubricentro (base64):', error);
      }
    } else if (lubricentro?.logoUrl) {
      try {
        pdf.addImage(lubricentro.logoUrl, 'JPEG', margin, yPos - 15, 40, 20);
      } catch (error) {
        console.error('Error al añadir logo del lubricentro (URL):', error);
        // Si falla, podríamos intentar con un logo predeterminado
        try {
          pdf.addImage(defaultLogoBase64, 'JPEG', margin, yPos - 15, 40, 20);
        } catch (e) {
          console.error('Error al añadir logo predeterminado:', e);
        }
      }
    }
    // Título del documento
    pdf.setFontSize(18);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setFont('helvetica', 'bold');
    const lubricentroNombre = lubricentro?.fantasyName || oilChange.lubricentroNombre || 'Lubricentro';
    pdf.text(lubricentroNombre, pageWidth - margin - pdf.getTextWidth(lubricentroNombre), yPos - 8);
    
    // Información del lubricentro
    pdf.setFontSize(9);
    pdf.setTextColor(textLight[0], textLight[1], textLight[2]);
    pdf.setFont('helvetica', 'normal');
    
    if (lubricentro?.domicilio) {
      pdf.text(lubricentro.domicilio, pageWidth - margin - pdf.getTextWidth(lubricentro.domicilio), yPos - 3);
    }
    
    if (lubricentro?.phone) {
      pdf.text(`Tel: ${lubricentro.phone}`, pageWidth - margin - pdf.getTextWidth(`Tel: ${lubricentro.phone}`), yPos + 2);
    }
    
    if (lubricentro?.email) {
      pdf.text(lubricentro.email, pageWidth - margin - pdf.getTextWidth(lubricentro.email), yPos + 7);
    }
    
    // Línea horizontal debajo del encabezado
    pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setLineWidth(0.5);
    yPos += 10;
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    // === DATOS DEL COMPROBANTE ===
    // Título e identificador del comprobante
    pdf.setFontSize(16);
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.text("COMPROBANTE DE CAMBIO DE ACEITE", margin, yPos);
    
    // Número de cambio en un rectángulo
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    drawRoundedRect(pdf, pageWidth - margin - 50, yPos - 8, 50, 12, 2, 'FD');
    
    pdf.setTextColor(255, 255, 255); // Texto blanco
    pdf.setFontSize(12);
    pdf.text(`N° ${oilChange.nroCambio}`, pageWidth - margin - 25 - (pdf.getTextWidth(`N° ${oilChange.nroCambio}`) / 2), yPos - 1);
    
    yPos += 15;
    
    // Fecha de emisión y próximo cambio
    pdf.setFontSize(10);
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFont('helvetica', 'normal');
    
    // Dominio en formato destacado
    pdf.setFillColor(245, 245, 245); // Fondo gris claro
    drawRoundedRect(pdf, margin, yPos - 8, contentWidth, 14, 2, 'F');
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const dominioText = `DOMINIO: ${oilChange.dominioVehiculo}`;
    pdf.text(dominioText, margin + (contentWidth / 2) - (pdf.getTextWidth(dominioText) / 2), yPos);
    
    yPos += 15;
    
    // === SECCIÓN CLIENTE Y VEHÍCULO ===
    // Crear una estructura de columnas dobles
    const columnWidth = contentWidth / 2 - 5; // -5 para espacio entre columnas
    
    // Sección Cliente
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    drawRoundedRect(pdf, margin, yPos, columnWidth, 8, 1, 'F');
    
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text("DATOS DEL CLIENTE", margin + 5, yPos + 5.5);
    
    yPos += 10;
    const clientStartY = yPos;
    yPos += 3;
    // Contenido de datos del cliente
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Cliente:", margin + 2, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(oilChange.nombreCliente, margin + 35, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Teléfono:", margin + 2, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(oilChange.celular || "No registrado", margin + 35, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Fecha servicio:", margin + 2, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDate(oilChange.fechaServicio), margin + 35, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Operario:", margin + 2, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(oilChange.nombreOperario, margin + 35, yPos);
    
    // Ajustar la posición Y para la siguiente sección
    yPos = clientStartY;
    
    // Sección Vehículo
    pdf.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    drawRoundedRect(pdf, margin + columnWidth + 10, yPos - 10, columnWidth, 8, 1, 'F');
    
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text("DATOS DEL VEHÍCULO", margin + columnWidth + 15, yPos - 4.5);
        yPos += 3;
    
    // Contenido de datos del vehículo
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Marca:", margin + columnWidth + 12, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(oilChange.marcaVehiculo, margin + columnWidth + 45, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Modelo:", margin + columnWidth + 12, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(oilChange.modeloVehiculo, margin + columnWidth + 45, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Tipo:", margin + columnWidth + 12, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(oilChange.tipoVehiculo, margin + columnWidth + 45, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Año:", margin + columnWidth + 12, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(oilChange.añoVehiculo?.toString() || "No especificado", margin + columnWidth + 45, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Kilometraje:", margin + columnWidth + 12, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${oilChange.kmActuales.toLocaleString()} km`, margin + columnWidth + 45, yPos);
    
    // Ajustar la posición Y para la siguiente sección
    // Tomamos el máximo entre ambas columnas para asegurar que no se superpongan
    yPos = Math.max(clientStartY + 31, yPos + 10);
    
    // === SECCIÓN ACEITE Y PRÓXIMO SERVICIO ===
    pdf.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    drawRoundedRect(pdf, margin, yPos, contentWidth, 8, 1, 'F');
    
    pdf.setFontSize(11);
    pdf.setTextColor(33, 33, 33); // Texto oscuro sobre fondo amarillo
    pdf.setFont('helvetica', 'bold');
    pdf.text("DETALLES DEL SERVICIO", margin + 5, yPos + 5.5);
    yPos += 12;
    
    // Primera columna - Aceite
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Aceite:", margin + 2, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${oilChange.marcaAceite} ${oilChange.tipoAceite} ${oilChange.sae}`, margin + 35, yPos);
    
    yPos += 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Cantidad:", margin + 2, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${oilChange.cantidadAceite} litros`, margin + 35, yPos);
    
    // Segunda columna - Próximo servicio
    const nextServiceY = yPos - 7;
    pdf.setFont('helvetica', 'bold');
    pdf.text("Próx. cambio km:", margin + columnWidth + 12, nextServiceY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${oilChange.kmProximo.toLocaleString()} km`, margin + columnWidth + 60, nextServiceY);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text("Próx. cambio fecha:", margin + columnWidth + 12, nextServiceY + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDate(oilChange.fechaProximoCambio), margin + columnWidth + 60, nextServiceY + 7);
    
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
      pdf.text(alertText, margin + (contentWidth / 2) - (pdf.getTextWidth(alertText) / 2), yPos + 6.5);
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
        alertText = `¡ATENCIÓN! Cambio programado en ${daysRemaining} días`;
      }
      
      pdf.text(alertText, margin + (contentWidth / 2) - (pdf.getTextWidth(alertText) / 2), yPos + 6.5);
      yPos += 15;
    } else {
      yPos += 5; // Si no hay alerta, solo agregar un pequeño espacio
    }
    
    // === SECCIÓN FILTROS Y SERVICIOS ===
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    drawRoundedRect(pdf, margin, yPos, contentWidth, 8, 1, 'F');
    
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text("FILTROS Y SERVICIOS ADICIONALES", margin + 5, yPos + 5.5);
    yPos += 10;
    
    // Crear grid para servicios (3 columnas)
    const serviceItemWidth = contentWidth / 3 - 6;
    // Reducimos altura de elementos para ahorrar espacio
    const serviceItemHeight = 12; 
    const itemsPerRow = 3;
    let currentColumn = 0;
    let startY = yPos;
    
    // Lista de servicios a mostrar
    const services = [
      { name: 'Filtro de Aceite', done: oilChange.filtroAceite, note: oilChange.filtroAceiteNota },
      { name: 'Filtro de Aire', done: oilChange.filtroAire, note: oilChange.filtroAireNota },
      { name: 'Filtro de Habitáculo', done: oilChange.filtroHabitaculo, note: oilChange.filtroHabitaculoNota },
      { name: 'Filtro de Combustible', done: oilChange.filtroCombustible, note: oilChange.filtroCombustibleNota },
      { name: 'Aditivo', done: oilChange.aditivo, note: oilChange.aditivoNota },
      { name: 'Refrigerante', done: oilChange.refrigerante, note: oilChange.refrigeranteNota },
      { name: 'Diferencial', done: oilChange.diferencial, note: oilChange.diferencialNota },
      { name: 'Caja', done: oilChange.caja, note: oilChange.cajaNota },
      { name: 'Engrase', done: oilChange.engrase, note: oilChange.engraseNota }
    ];
    
    // Dibujar cada servicio
    services.forEach((service, index) => {
      const col = currentColumn % itemsPerRow;
      const row = Math.floor(currentColumn / itemsPerRow);
      
      const itemX = margin + (col * (serviceItemWidth + 6));
      const itemY = startY + (row * (serviceItemHeight + 2)); // Reducimos el espacio entre filas
      
      // Fondo del elemento de servicio
      const bgColorDone = service.done ? [237, 247, 237] : [253, 237, 237]; // Verde claro si se hizo, rojo claro si no
      const borderColorDone = service.done ? [76, 175, 80] : [244, 67, 54]; // Borde verde o rojo
      
      pdf.setFillColor(bgColorDone[0], bgColorDone[1], bgColorDone[2]);
      pdf.setDrawColor(borderColorDone[0], borderColorDone[1], borderColorDone[2]);
      drawRoundedRect(pdf, itemX, itemY, serviceItemWidth, serviceItemHeight, 1, 'FD');
      
      // Mostrar check o X
      pdf.setFontSize(10); // Tamaño reducido
      const textColorStatus = service.done ? [46, 125, 50] : [211, 47, 47]; // Verde o rojo
      pdf.setTextColor(textColorStatus[0], textColorStatus[1], textColorStatus[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(service.done ? '✓' : '✗', itemX + 4, itemY + 5);
      
      // Nombre del servicio
      pdf.setFontSize(8); // Tamaño reducido
      pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(service.name, itemX + 10, itemY + 5);
      
      // Nota (si existe) - Simplificamos para ahorrar espacio
      if (service.done && service.note) {
        pdf.setFontSize(7); // Tamaño reducido
        pdf.setTextColor(textLight[0], textLight[1], textLight[2]);
        pdf.setFont('helvetica', 'normal');
        
        // Limitar longitud de la nota si es muy larga
        let note = service.note;
        if (note && note.length > 25) {
          note = note.substring(0, 22) + '...';
        }
        
        if (note) {
          pdf.text(note, itemX + 10, itemY + 10);
        }
      }
      
      currentColumn++;
    });
    
    // Ajustar la posición Y para la siguiente sección
    // Calculamos cuántas filas ocupan los servicios y ajustamos la posición Y
    const serviceRows = Math.ceil(services.length / itemsPerRow);
    const servicesHeight = serviceRows * (serviceItemHeight + 2); // Espacio reducido entre filas
    yPos = startY + servicesHeight + 3; // Margen reducido después de servicios
    
    // === SECCIÓN OBSERVACIONES (si existen) ===
    let hasObservations = false;
    
    if (oilChange.observaciones && oilChange.observaciones.trim() !== '') {
      hasObservations = true;
      
      // Calculamos espacio disponible para evitar crear una nueva página
      const remainingSpace = pageHeight - yPos - 50; // 50mm para área de firmas y pie de página
      
      pdf.setFillColor(90, 90, 90); // Gris oscuro
      drawRoundedRect(pdf, margin, yPos, contentWidth, 6, 1, 'F'); // Altura de título reducida
      
      pdf.setFontSize(10); // Tamaño reducido
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text("OBSERVACIONES", margin + 5, yPos + 4);
      
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
      const splitText = pdf.splitTextToSize(oilChange.observaciones, contentWidth - 10);
      const maxLines = Math.floor(obsHeight / 4); // Aproximadamente 4mm por línea
      const textToDisplay = splitText.slice(0, maxLines);
      
      // Imprimir texto con padding interno
      for (let i = 0; i < textToDisplay.length; i++) {
        pdf.text(textToDisplay[i], margin + 5, yPos + 5 + (i * 4));
      }
      
      // Si hay más texto del que se muestra, indicarlo
      if (splitText.length > maxLines) {
        pdf.setFont('helvetica', 'italic');
        pdf.text("...(texto truncado)", margin + 5, yPos + 5 + (maxLines * 4) - 2);
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
    
    yPos+=15;
    // Línea para firma del operario
    pdf.line(margin + 20, yPos, margin + contentWidth / 2 - 20, yPos);
    pdf.setFontSize(8); // Tamaño reducido
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFont('helvetica', 'normal');
    const operarioText = "Firma del Operario";
    pdf.text(operarioText, margin + (contentWidth / 4) - (pdf.getTextWidth(operarioText) / 2), yPos + 4);
    
    // Línea para firma del cliente
    pdf.line(margin + contentWidth / 2 + 20, yPos, margin + contentWidth - 20, yPos);
    const clienteText = "Firma del Cliente";
    pdf.text(clienteText, margin + (3 * contentWidth / 4) - (pdf.getTextWidth(clienteText) / 2), yPos + 4);
    
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
    pdf.text(footerText1, pageWidth / 2 - (pdf.getTextWidth(footerText1) / 2), yPos);
    
    yPos += 4;
    
    const footerText2 = `Próximo cambio: a los ${oilChange.kmProximo.toLocaleString()} km o el ${formatDate(oilChange.fechaProximoCambio)}, lo que ocurra primero.`;
    pdf.text(footerText2, pageWidth / 2 - (pdf.getTextWidth(footerText2) / 2), yPos);
    
    yPos += 4;
    
    // Información adicional del lubricentro
    if (lubricentro) {
      const year = new Date().getFullYear();
      const copyrightText = `© ${year} ${lubricentro.fantasyName} - Todos los derechos reservados`;
      pdf.text(copyrightText, pageWidth / 2 - (pdf.getTextWidth(copyrightText) / 2), yPos);
    }
    
    // Barra inferior de color
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    
    // Guardar PDF
    pdf.save(filename);
    
    return filename;
  },
  
  /**
   * Exporta los datos de cambios de aceite a Excel
   * @param oilChanges - Lista de cambios de aceite
   * @param filename - Nombre del archivo a generar
   */
  exportToExcel: (oilChanges: OilChange[], filename: string = 'cambios-aceite'): void => {
    // Implementación para exportar a Excel (si se desea)
    console.log("Función exportToExcel no implementada");
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
      
      // Descargar PDF
      pdf.save(filename);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }
};

export default enhancedPdfService;