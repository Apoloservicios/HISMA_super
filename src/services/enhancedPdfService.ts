// src/services/enhancedPdfService.ts - Versión con colores personalizables
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { OilChange, Lubricentro } from '../types';
import { 
  sanitizeText, 
  formatDate as safeFormatDate, 
  addSafeTextToPDF 
} from './reportService/utils';

// Colores por defecto si el lubricentro no tiene personalizados
const DEFAULT_COLORS = {
  primary: '#2E7D32',    // Verde
  secondary: '#1B5E20',  // Verde oscuro  
  accent: '#FBC02D',     // Amarillo
  text: '#212121',       // Gris oscuro
  textLight: '#757575',  // Gris claro
  background: '#FFFFFF'  // Blanco
};

/**
 * Convierte un color hex a RGB array para jsPDF
 */
const hexToRgb = (hex: string): [number, number, number] => {
  // Remover # si está presente
  const cleanHex = hex.replace('#', '');
  
  // Convertir hex a RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return [r, g, b];
};

/**
 * Obtiene los colores personalizados del lubricentro o usa los por defecto
 */
const getCustomColors = (lubricentro: Lubricentro | null | string) => {
  // Si lubricentro es string, usar colores por defecto
  if (typeof lubricentro === 'string' || !lubricentro) {
    return {
      primary: hexToRgb(DEFAULT_COLORS.primary),
      secondary: hexToRgb(DEFAULT_COLORS.secondary),
      accent: hexToRgb(DEFAULT_COLORS.accent),
      text: hexToRgb(DEFAULT_COLORS.text),
      textLight: hexToRgb(DEFAULT_COLORS.textLight)
    };
  }

  // Usar colores personalizados del lubricentro o fallback a defecto
  const primaryColor = (lubricentro as any).primaryColor || DEFAULT_COLORS.primary;
  const secondaryColor = (lubricentro as any).secondaryColor || DEFAULT_COLORS.secondary;  
  const accentColor = (lubricentro as any).accentColor || DEFAULT_COLORS.accent;
  const textColor = (lubricentro as any).textColor || DEFAULT_COLORS.text;
  const backgroundColor = (lubricentro as any).backgroundColor || DEFAULT_COLORS.background;
  const useTransparentBackground = (lubricentro as any).useTransparentBackground || false;

  return {
    primary: hexToRgb(primaryColor),
    secondary: hexToRgb(secondaryColor),
    accent: hexToRgb(accentColor),
    text: hexToRgb(textColor),
    textLight: hexToRgb(DEFAULT_COLORS.textLight),
    background: hexToRgb(backgroundColor),
    useTransparentBackground
  };
};

/**
 * Función auxiliar para crear rectángulos redondeados de forma segura
 */
const drawRoundedRect = (pdf: any, x: number, y: number, width: number, height: number, radius: number, style: string) => {
  try {
    if (typeof pdf.roundedRect === 'function') {
      pdf.roundedRect(x, y, width, height, radius, radius, style);
      return;
    }
  } catch (error) {
    console.warn('Error creando rectángulo redondeado:', error);
  }
  pdf.rect(x, y, width, height, style);
};

/**
 * Función helper para formatear fecha
 */
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

/**
 * Función para obtener días restantes
 */
const getDaysRemaining = (futureDate: any): number => {
  try {
    const future = futureDate instanceof Date ? futureDate : new Date(futureDate);
    const today = new Date();
    const diffTime = future.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    return 0;
  }
};

/**
 * Función para cargar imagen desde URL o base64 y convertirla a formato compatible con jsPDF
 */
const loadImageForPDF = async (imageSource: string): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      // Si ya es base64, devolverlo directamente
      if (imageSource.startsWith('data:image/')) {
        resolve(imageSource);
        return;
      }

      // Si es URL, convertir a base64
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } catch (canvasError) {
          console.warn('Error procesando imagen con canvas:', canvasError);
          resolve(null);
        }
      };
      
      img.onerror = function() {
        console.warn('Error cargando imagen desde URL:', imageSource);
        resolve(null);
      };
      
      img.src = imageSource;
      
    } catch (error) {
      console.warn('Error en loadImageForPDF:', error);
      resolve(null);
    }
  });
};

/**
 * Servicio mejorado para PDFs con colores personalizables
 */
const enhancedPdfService = {
  /**
   * Genera mensaje para WhatsApp
   */
  generateWhatsAppMessage: (oilChange: OilChange, lubricentro: Lubricentro | null | string) => {
    const cleanData = {
      nombreCliente: sanitizeText(oilChange.nombreCliente),
      dominioVehiculo: sanitizeText(oilChange.dominioVehiculo),
      marcaVehiculo: sanitizeText(oilChange.marcaVehiculo),
      modeloVehiculo: sanitizeText(oilChange.modeloVehiculo),
      tipoAceite: sanitizeText(oilChange.tipoAceite),
      marcaAceite: sanitizeText(oilChange.marcaAceite),
      fechaServicio: formatDate(oilChange.fechaServicio),
      fechaProximoCambio: formatDate(oilChange.fechaProximoCambio),
      kmProximo: oilChange.kmProximo || 0,
    };

    const lubricentroName = typeof lubricentro === 'string' 
      ? lubricentro 
      : lubricentro ? sanitizeText(lubricentro.fantasyName) : 'Lubricentro';
    
    const message = `
🔧 *${lubricentroName}*
────────────────────

✅ *CAMBIO DE ACEITE REALIZADO*

👤 *Cliente:* ${cleanData.nombreCliente}
🚗 *Vehículo:* ${cleanData.marcaVehiculo} ${cleanData.modeloVehiculo}
🏷️ *Dominio:* ${cleanData.dominioVehiculo}
📅 *Fecha:* ${cleanData.fechaServicio}

🛢️ *Aceite usado:* ${cleanData.marcaAceite} ${cleanData.tipoAceite}

${oilChange.filtroAceite || oilChange.filtroAire || oilChange.filtroHabitaculo || oilChange.filtroCombustible ? 
'🔄 *Filtros cambiados:*' : ''}
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
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
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
   * Genera un PDF con jsPDF usando colores personalizados del lubricentro
   */
  generateDirectPDF: async (oilChange: OilChange, lubricentro: Lubricentro | null): Promise<string> => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      const filename = `cambio-aceite-${sanitizeText(oilChange.nroCambio)}.pdf`;
      
      // Dimensiones de la página
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Obtener colores personalizados del lubricentro
      const colors = getCustomColors(lubricentro);
      
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      
      // Configurar fondo del PDF si no es transparente
      if (!colors.useTransparentBackground && colors.background) {
        pdf.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      }
      
      let yPos = margin;
      
      // === ENCABEZADO CON LOGO Y COLORES PERSONALIZADOS ===
      if (lubricentro && typeof lubricentro !== 'string') {
        // Fondo con color primario del lubricentro
        pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.rect(0, 0, pageWidth, 50, 'F');
        
        // Intentar cargar el logo
        let logoImage = null;
        const logoSource = lubricentro.logoBase64 || lubricentro.logoUrl;
        
        if (logoSource) {
          try {
            logoImage = await loadImageForPDF(logoSource);
          } catch (logoError) {
            console.warn('Error cargando logo para PDF:', logoError);
          }
        }
        
        // Si tenemos logo, crear layout con logo + texto
        if (logoImage) {
          try {
            // Logo en la parte izquierda
            const logoWidth = 40;
            const logoHeight = 25;
            const logoX = margin;
            const logoY = 12;
            
            pdf.addImage(logoImage, 'PNG', logoX, logoY, logoWidth, logoHeight);
            
            // Información del lubricentro a la derecha del logo
            const textX = logoX + logoWidth + 10;
            
            pdf.setFontSize(18);
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            addSafeTextToPDF(pdf, sanitizeText(lubricentro.fantasyName || ''), textX, 20);
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            addSafeTextToPDF(pdf, sanitizeText(lubricentro.domicilio || ''), textX, 28);
            
            if (lubricentro.phone) {
              addSafeTextToPDF(pdf, `Tel: ${sanitizeText(lubricentro.phone)}`, textX, 35);
            }
            
            if (lubricentro.email) {
              addSafeTextToPDF(pdf, sanitizeText(lubricentro.email), textX, 42);
            }
            
          } catch (imageError) {
            console.warn('Error agregando imagen al PDF:', imageError);
            // Fallback: solo texto centrado
            enhancedPdfService.addHeaderTextOnly(pdf, lubricentro, pageWidth, colors);
          }
        } else {
          // Fallback: solo texto centrado
          enhancedPdfService.addHeaderTextOnly(pdf, lubricentro, pageWidth, colors);
        }
        
        yPos = 60;
      }
      
      // Línea separadora con color primario
      pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // === TÍTULO DEL DOCUMENTO ===
      pdf.setFontSize(16);
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'COMPROBANTE DE CAMBIO DE ACEITE', margin, yPos);
      
      // Número de cambio con color primario
      pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      drawRoundedRect(pdf, pageWidth - margin - 50, yPos - 8, 50, 12, 2, 'FD');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      const numeroText = `N° ${sanitizeText(oilChange.nroCambio)}`;
      addSafeTextToPDF(pdf, numeroText, pageWidth - margin - 25, yPos - 1, { align: 'center' });
      
      yPos += 15;
      
      // === INFORMACIÓN DEL DOMINIO CON COLOR ACCENT ===
      pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      drawRoundedRect(pdf, margin, yPos, contentWidth, 12, 2, 'F');
      
      pdf.setFontSize(14);
      pdf.setTextColor(33, 33, 33); // Texto oscuro sobre fondo claro
      pdf.setFont('helvetica', 'bold');
      const dominioText = `DOMINIO: ${sanitizeText(oilChange.dominioVehiculo)}`;
      addSafeTextToPDF(pdf, dominioText, margin + (contentWidth / 2), yPos + 8, { align: 'center' });
      
      yPos += 20;
      
      // === DATOS DEL CLIENTE Y VEHÍCULO ===
      const columnWidth = (contentWidth - 20) / 2;
      const clientStartY = yPos + 5;
      
      // Sección Cliente con color primario
      pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      drawRoundedRect(pdf, margin, yPos, columnWidth, 8, 1, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'DATOS DEL CLIENTE', margin + 5, yPos + 5.5);
      yPos += 12;
      
      // Contenido datos del cliente
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Cliente:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.nombreCliente), margin + 35, yPos);
      yPos += 7;
      
      if (oilChange.celular) {
        pdf.setFont('helvetica', 'bold');
        addSafeTextToPDF(pdf, 'Teléfono:', margin + 2, yPos);
        pdf.setFont('helvetica', 'normal');
        addSafeTextToPDF(pdf, sanitizeText(oilChange.celular), margin + 35, yPos);
        yPos += 7;
      }
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Fecha:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, formatDate(oilChange.fechaServicio), margin + 35, yPos);
      yPos += 7;
      
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'Operario:', margin + 2, yPos);
      pdf.setFont('helvetica', 'normal');
      addSafeTextToPDF(pdf, sanitizeText(oilChange.nombreOperario), margin + 35, yPos);
      
      // Restaurar posición para la segunda columna
      yPos = clientStartY;
      
      // Sección Vehículo con color secundario
      pdf.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      drawRoundedRect(pdf, margin + columnWidth + 10, yPos, columnWidth, 8, 1, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'DATOS DEL VEHÍCULO', margin + columnWidth + 15, yPos + 5.5);
      yPos += 12;
      
      // Contenido datos del vehículo
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
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
      
      // Ajustar posición para siguiente sección
      yPos = Math.max(clientStartY + 35, yPos + 15);
      
      // === DETALLES DEL SERVICIO CON COLOR ACCENT ===
      pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      drawRoundedRect(pdf, margin, yPos, contentWidth, 8, 1, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(33, 33, 33);
      pdf.setFont('helvetica', 'bold');
      addSafeTextToPDF(pdf, 'DETALLES DEL SERVICIO', margin + 5, yPos + 5.5);
      yPos += 12;
      
      // Información del aceite
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
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
      
      // Próximo servicio en la segunda columna
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
      
      yPos += 15;
      
      // === FILTROS CAMBIADOS CON COLOR SECUNDARIO ===
      const filtros = [];
      if (oilChange.filtroAceite) filtros.push('Filtro de aceite');
      if (oilChange.filtroAire) filtros.push('Filtro de aire');
      if (oilChange.filtroHabitaculo) filtros.push('Filtro de habitáculo');
      if (oilChange.filtroCombustible) filtros.push('Filtro de combustible');
      
      if (filtros.length > 0) {
        pdf.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        drawRoundedRect(pdf, margin, yPos, contentWidth, 8, 1, 'F');
        
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        addSafeTextToPDF(pdf, 'FILTROS CAMBIADOS', margin + 5, yPos + 5.5);
        yPos += 12;
        
        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        filtros.forEach((filtro, index) => {
          addSafeTextToPDF(pdf, `• ${filtro}`, margin + 5, yPos);
          yPos += 6;
        });
        
        yPos += 5;
      }
      
      // === OBSERVACIONES ===
      if (oilChange.observaciones && oilChange.observaciones.trim()) {
        pdf.setFillColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        drawRoundedRect(pdf, margin, yPos, contentWidth, 8, 1, 'F');
        
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        addSafeTextToPDF(pdf, 'OBSERVACIONES', margin + 5, yPos + 5.5);
        yPos += 12;
        
        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const observaciones = sanitizeText(oilChange.observaciones);
        
        // Dividir texto largo en líneas
        const maxLineLength = 80;
        const lines = [];
        let currentLine = '';
        const words = observaciones.split(' ');
        
        words.forEach(word => {
          if ((currentLine + word).length <= maxLineLength) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);
        
        lines.forEach(line => {
          addSafeTextToPDF(pdf, line, margin + 5, yPos);
          yPos += 5;
        });
        
        yPos += 5;
      }
      
      // === PIE DE PÁGINA ===
      yPos = Math.max(yPos + 10, pageHeight - 40);
      
      pdf.setFontSize(8);
      pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      pdf.setFont('helvetica', 'normal');
      
      const lubricentroName = typeof lubricentro === 'string' 
        ? lubricentro 
        : lubricentro ? sanitizeText(lubricentro.fantasyName || '') : 'nuestros servicios';
      
      const footerText1 = `Gracias por confiar en ${lubricentroName}.`;
      addSafeTextToPDF(pdf, footerText1, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 4;
      
      const footerText2 = `Próximo cambio: a los ${kmProximo.toLocaleString()} km o el ${formatDate(oilChange.fechaProximoCambio)}, lo que ocurra primero.`;
      addSafeTextToPDF(pdf, footerText2, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 4;
      
      if (lubricentro && typeof lubricentro !== 'string') {
        const year = new Date().getFullYear();
        const copyrightText = `© ${year} ${sanitizeText(lubricentro.fantasyName || '')} - Todos los derechos reservados`;
        addSafeTextToPDF(pdf, copyrightText, pageWidth / 2, yPos, { align: 'center' });
      }
      
      // Barra inferior con color primario
      pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
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
   * Función helper para agregar solo texto al encabezado (fallback cuando no hay logo)
   */
  addHeaderTextOnly: (pdf: any, lubricentro: Lubricentro, pageWidth: number, colors: any) => {
    if (!lubricentro) return;
    
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    addSafeTextToPDF(pdf, sanitizeText(lubricentro.fantasyName || ''), pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    addSafeTextToPDF(pdf, sanitizeText(lubricentro.domicilio || ''), pageWidth / 2, 28, { align: 'center' });
    
    if (lubricentro.phone) {
      addSafeTextToPDF(pdf, `Tel: ${sanitizeText(lubricentro.phone)}`, pageWidth / 2, 35, { align: 'center' });
    }
    
    if (lubricentro.email) {
      addSafeTextToPDF(pdf, sanitizeText(lubricentro.email), pageWidth / 2, 42, { align: 'center' });
    }
  },

  /**
   * Genera un PDF a partir de un nodo HTML y lo descarga
   */
  generatePDF: async (node: HTMLElement, filename: string): Promise<void> => {
    if (!node) {
      throw new Error('No se proporcionó un nodo HTML válido');
    }
    
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        allowTaint: true,
        onclone: (document, element) => {
          element.style.height = 'auto';
          element.style.overflow = 'visible';
          return element;
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      try {
        pdf.setFont('helvetica', 'normal');
      } catch (charsetError) {
        console.warn('Error configurando fuente:', charsetError);
      }
      
      const imgData = canvas.toDataURL('image/png');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10;
      
      // Agregar primera página
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      
      // Agregar páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }
      
      // Guardar PDF
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error al generar PDF desde HTML:', error);
      throw error;
    }
  },

  /**
   * Exporta los datos de cambios de aceite a Excel
   */
  exportToExcel: (oilChanges: OilChange[], filename: string = 'cambios-aceite'): void => {
    console.log('Exportar a Excel no implementado aún');
  }
};

export default enhancedPdfService;