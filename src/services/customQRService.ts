// src/services/customQRService.ts
/**
 * Servicio para generar códigos QR personalizados con texto incorporado
 * Utiliza Canvas HTML5 para crear imágenes personalizadas
 */

export interface QRCustomOptions {
  qrSize?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  textColor?: string;
  primaryText?: string;
  lubricentroName?: string;
  fontSize?: number;
  fontFamily?: string;
  qrMargin?: number;
}

class CustomQRService {
  /**
   * Genera un QR personalizado con texto incorporado usando Canvas
   */
  async generateCustomQRImage(
    domain: string, 
    options: QRCustomOptions = {}
  ): Promise<string> {
    const {
      qrSize = 180,
      canvasWidth = 250,
      canvasHeight = 280,
      backgroundColor = '#ffffff',
      textColor = '#333333',
      primaryText = 'Escanea y revisa tu Servicio',
      lubricentroName = '',
      fontSize = 12,
      fontFamily = 'Arial, sans-serif',
      qrMargin = 10
    } = options;

    try {
      // Crear canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No se pudo crear el contexto del canvas');
      }

      // Configurar tamaño del canvas
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fondo blanco
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Obtener la imagen del QR desde el servicio externo
      const qrURL = this.generateBasicQRURL(domain, qrSize);
      const qrImage = await this.loadImage(qrURL);

      // Calcular posición centrada para el QR
      const qrX = (canvasWidth - qrSize) / 2;
      const qrY = qrMargin;

      // Dibujar el QR
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Configurar texto
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Posición inicial del texto (debajo del QR)
      let textY = qrY + qrSize + 25;

      // Texto principal
      if (primaryText) {
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        
        // Dividir el texto en líneas si es muy largo
        const words = primaryText.split(' ');
        let line = '';
        const lines = [];
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          
          if (testWidth > canvasWidth - 20 && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Dibujar cada línea
        lines.forEach((textLine, index) => {
          ctx.fillText(textLine.trim(), canvasWidth / 2, textY + (index * 18));
        });
        
        textY += lines.length * 18 + 10;
      }

      // Nombre del lubricentro
      if (lubricentroName) {
        ctx.font = `${fontSize - 1}px ${fontFamily}`;
        ctx.fillStyle = '#666666';
        ctx.fillText(lubricentroName, canvasWidth / 2, textY);
        textY += 20;
      }

      // Línea decorativa
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, textY);
      ctx.lineTo(canvasWidth - 20, textY);
      ctx.stroke();
      textY += 15;

      // Información adicional
      ctx.font = `${fontSize - 2}px ${fontFamily}`;
      ctx.fillStyle = '#888888';
      ctx.fillText(`Dominio: ${domain.toUpperCase()}`, canvasWidth / 2, textY);

      // Convertir canvas a imagen
      return canvas.toDataURL('image/png', 0.95);
      
    } catch (error) {
      console.error('Error generando QR personalizado:', error);
      throw error;
    }
  }

  /**
   * Genera una etiqueta completa para impresión térmica
   */
  async generateThermalQRLabel(
    oilChange: any, 
    lubricentro: any,
    options: QRCustomOptions = {}
  ): Promise<string> {
    const customQRImage = await this.generateCustomQRImage(
      oilChange.dominioVehiculo,
      {
        ...options,
        primaryText: 'Escanea y revisa tu Servicio',
        lubricentroName: lubricentro?.fantasyName || 'Sistema HISMA',
        canvasWidth: 200,
        canvasHeight: 260,
        qrSize: 140
      }
    );

    const labelHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 9px;
            line-height: 1.3;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .label-container {
            width: 58mm;
            background: white;
            border: 1px solid #000;
            text-align: center;
            padding: 2mm;
          }
          
          .header {
            font-size: 8px;
            font-weight: bold;
            margin-bottom: 2mm;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
          }
          
          .qr-container {
            margin: 2mm 0;
            display: flex;
            justify-content: center;
          }
          
          .qr-image {
            max-width: 50mm;
            height: auto;
            border: 1px solid #ddd;
          }
          
          .service-info {
            font-size: 7px;
            margin-top: 2mm;
            text-align: left;
            line-height: 1.2;
          }
          
          .service-info strong {
            display: inline-block;
            width: 15mm;
          }
          
          .footer {
            font-size: 6px;
            margin-top: 2mm;
            border-top: 1px dashed #000;
            padding-top: 1mm;
            text-align: center;
          }
          
          @media print {
            body { 
              margin: 0;
              min-height: auto;
            }
            .label-container { 
              border: 2px solid #000;
              page-break-inside: avoid;
            }
            @page {
              size: 58mm auto;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="header">
            ${(lubricentro?.fantasyName || 'Sistema HISMA').substring(0, 25)}
          </div>
          
          <div class="qr-container">
            <img 
              src="${customQRImage}" 
              alt="QR Code Personalizado" 
              class="qr-image"
              onload="window.qrLoaded = true"
            />
          </div>
          
          <div class="service-info">
            <strong>Vehículo:</strong> ${oilChange.dominioVehiculo}<br>
            <strong>Marca:</strong> ${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo}<br>
            <strong>Servicio:</strong> ${new Date(oilChange.fechaServicio).toLocaleDateString('es-ES')}<br>
            <strong>Próximo:</strong> ${new Date(oilChange.fechaProximoCambio).toLocaleDateString('es-ES')}
          </div>
          
          <div class="footer">
            Cambio N° ${oilChange.nroCambio}<br>
            ${new Date().toLocaleDateString('es-ES')}
          </div>
        </div>
        
        <script>
          function checkQRLoaded() {
            if (window.qrLoaded) {
              setTimeout(() => window.print(), 500);
            } else {
              setTimeout(checkQRLoaded, 100);
            }
          }
          
          if (window.location.search.includes('autoprint=true')) {
            checkQRLoaded();
          }
        </script>
      </body>
      </html>
    `;

    return labelHTML;
  }

  /**
   * Descargar QR personalizado como imagen
   */
  async downloadCustomQRImage(
    domain: string, 
    options: QRCustomOptions = {},
    filename?: string
  ): Promise<void> {
    try {
      const customQRImage = await this.generateCustomQRImage(domain, options);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = customQRImage;
      link.download = filename || `qr-personalizado-${domain.toUpperCase()}.png`;
      
      // Simular click para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error descargando QR personalizado:', error);
      throw error;
    }
  }

  /**
   * Función auxiliar para cargar una imagen
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Para evitar problemas de CORS
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Generar URL básica del QR (usando el servicio actual)
   */
  private generateBasicQRURL(domain: string, size: number = 150): string {
    const baseURL = window.location.origin;
    const url = `${baseURL}/consulta-historial?dominio=${encodeURIComponent(domain.toUpperCase())}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=5`;
  }

  /**
   * Generar QR con logo del lubricentro (avanzado)
   */
  async generateQRWithLogo(
    domain: string,
    logoUrl: string,
    options: QRCustomOptions = {}
  ): Promise<string> {
    const {
      qrSize = 180,
      canvasWidth = 250,
      canvasHeight = 280,
      backgroundColor = '#ffffff'
    } = options;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No se pudo crear el contexto del canvas');
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fondo
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Cargar QR y logo
      const [qrImage, logoImage] = await Promise.all([
        this.loadImage(this.generateBasicQRURL(domain, qrSize)),
        this.loadImage(logoUrl)
      ]);

      // Dibujar QR
      const qrX = (canvasWidth - qrSize) / 2;
      const qrY = 20;
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Dibujar logo en el centro del QR (con fondo blanco)
      const logoSize = 40;
      const logoX = (canvasWidth - logoSize) / 2;
      const logoY = qrY + (qrSize - logoSize) / 2;
      
      // Fondo blanco para el logo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10);
      
      // Logo
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

      // Texto personalizado debajo
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Escanea y revisa tu Servicio', canvasWidth / 2, qrY + qrSize + 30);

      return canvas.toDataURL('image/png', 0.95);

    } catch (error) {
      console.error('Error generando QR con logo:', error);
      // Fallback a QR simple
      return this.generateCustomQRImage(domain, options);
    }
  }
}

export const customQRService = new CustomQRService();