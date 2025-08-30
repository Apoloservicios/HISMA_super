// src/services/qrServiceNative.ts - Versión actualizada con funciones personalizadas
import { customQRService, QRCustomOptions } from './customQRService';

class QRServiceNative {
  private getPublicConsultationURL = (domain: string): string => {
    const baseURL = window.location.origin;
    return `${baseURL}/consulta-historial?dominio=${encodeURIComponent(domain.toUpperCase())}`;
  };

  // Mantener compatibilidad con el método original
  generateQRURL(domain: string, size: number = 150): string {
    const url = this.getPublicConsultationURL(domain);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=10`;
  }

  // NUEVA FUNCIÓN: Generar QR personalizado como alternativa
  async generateCustomQRURL(
    domain: string, 
    options: QRCustomOptions & { asDataURL?: boolean } = {}
  ): Promise<string> {
    const { asDataURL = true, ...qrOptions } = options;
    
    if (asDataURL) {
      // Retornar imagen personalizada como data URL
      return await customQRService.generateCustomQRImage(domain, qrOptions);
    } else {
      // Retornar URL del servicio externo (compatibilidad)
      return this.generateQRURL(domain, qrOptions.qrSize || 150);
    }
  }

  // Generar SVG usando Google Charts API (mantener original)
  generateQRSVGURL(domain: string, size: number = 150): string {
    const url = this.getPublicConsultationURL(domain);
    return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8`;
  }

  // VERSIÓN MEJORADA de generateThermalLabel con opciones personalizables
  async generateThermalLabel(
    oilChange: any, 
    lubricentro: any, 
    customOptions: QRCustomOptions = {}
  ): Promise<string> {
    // Decidir si usar QR personalizado o simple basado en las opciones
    const useCustomQR = customOptions.primaryText || customOptions.lubricentroName;
    
    let qrImageSrc: string;
    
    if (useCustomQR) {
      // Usar QR personalizado
      qrImageSrc = await customQRService.generateCustomQRImage(
        oilChange.dominioVehiculo,
        {
          canvasWidth: 150,
          canvasHeight: 180,
          qrSize: 120,
          primaryText: 'Escanea y revisa tu Servicio',
          lubricentroName: lubricentro?.fantasyName || '',
          fontSize: 8,
          ...customOptions
        }
      );
    } else {
      // Usar QR simple original
      qrImageSrc = this.generateQRURL(oilChange.dominioVehiculo, 120);
    }

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
            border: 2px solid #000;
            text-align: center;
            padding: 2mm;
          }
          
          .header {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 2mm;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
            text-transform: uppercase;
          }
          
          .vehicle-info {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2mm;
            padding: 1mm;
            background: #f0f0f0;
            border: 1px solid #ccc;
          }
          
          .qr-container {
            margin: 3mm 0;
            display: flex;
            justify-content: center;
          }
          
          .qr-code {
            max-width: ${useCustomQR ? '45mm' : '40mm'};
            height: auto;
            border: 1px solid #ddd;
          }
          
          .service-info {
            font-size: 7px;
            margin-top: 2mm;
            text-align: left;
            line-height: 1.4;
            border: 1px solid #ddd;
            padding: 1mm;
            background: #fafafa;
          }
          
          .service-info strong {
            display: inline-block;
            width: 18mm;
            color: #333;
          }
          
          .instructions {
            font-size: 6px;
            margin: 2mm 0;
            text-align: center;
            font-style: italic;
            color: #666;
            border: 1px dashed #999;
            padding: 1mm;
          }
          
          .footer {
            font-size: 6px;
            margin-top: 2mm;
            border-top: 2px solid #000;
            padding-top: 1mm;
            text-align: center;
            font-weight: bold;
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
          
          <div class="vehicle-info">
            ${oilChange.dominioVehiculo}
          </div>
          
          <div class="qr-container">
            <img 
              src="${qrImageSrc}" 
              alt="QR Code" 
              class="qr-code"
              onload="window.qrLoaded = true"
              onerror="console.error('Error cargando QR')"
            />
          </div>
          
          <div class="service-info">
            <strong>Vehículo:</strong><br>
            ${oilChange.marcaVehiculo || ''} ${oilChange.modeloVehiculo || ''}<br>
            <strong>Servicio:</strong> ${new Date(oilChange.fechaServicio).toLocaleDateString('es-ES')}<br>
            <strong>Próximo:</strong> ${new Date(oilChange.fechaProximoCambio).toLocaleDateString('es-ES')}<br>
            <strong>KM Actual:</strong> ${(oilChange.kmActuales || 0).toLocaleString()}<br>
            <strong>Próx. KM:</strong> ${(oilChange.kmProximo || 0).toLocaleString()}
          </div>
          
          ${!useCustomQR ? `
          <div class="instructions">
            📱 Escanee para ver historial completo<br>
            del vehículo en su celular
          </div>
          ` : ''}
          
          <div class="footer">
            Cambio N° ${oilChange.nroCambio}<br>
            ${new Date().toLocaleDateString('es-ES')} - ${new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}
          </div>
        </div>
        
        <script>
          window.qrLoaded = false;
          
          function checkQRLoaded() {
            if (window.qrLoaded) {
              setTimeout(() => {
                window.print();
              }, 500);
            } else {
              setTimeout(checkQRLoaded, 100);
            }
          }
          
          // Auto-print si se solicita
          if (window.location.search.includes('autoprint=true')) {
            checkQRLoaded();
          }
          
          // Backup: imprimir después de 3 segundos si no se carga el QR
          setTimeout(() => {
            if (!window.qrLoaded) {
              console.warn('QR no cargado, imprimiendo de todas formas');
              window.print();
            }
          }, 3000);
        </script>
      </body>
      </html>
    `;

    return labelHTML;
  }

  // NUEVA FUNCIÓN: Generar múltiples etiquetas en una sola página
  async generateBatchThermalLabels(
    oilChanges: any[], 
    lubricentro: any,
    customOptions: QRCustomOptions = {}
  ): Promise<string> {
    const labelsPerRow = 2; // Ajustable según el ancho de tu impresora
    
    let batchHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial', sans-serif; 
            background: white;
            padding: 5mm;
          }
          .batch-container {
            display: grid;
            grid-template-columns: repeat(${labelsPerRow}, 1fr);
            gap: 5mm;
            width: 100%;
          }
          .label-item {
            width: 58mm;
            border: 1px solid #000;
            padding: 2mm;
            text-align: center;
            font-size: 8px;
            page-break-inside: avoid;
          }
          @media print {
            body { margin: 0; padding: 2mm; }
            @page { size: A4; margin: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="batch-container">
    `;

    // Generar cada etiqueta
    for (const oilChange of oilChanges) {
      const qrImageSrc = await customQRService.generateCustomQRImage(
        oilChange.dominioVehiculo,
        {
          canvasWidth: 120,
          canvasHeight: 150,
          qrSize: 100,
          fontSize: 6,
          primaryText: 'Escanea tu Servicio',
          lubricentroName: lubricentro?.fantasyName || '',
          ...customOptions
        }
      );

      batchHTML += `
        <div class="label-item">
          <div style="font-weight: bold; font-size: 7px; margin-bottom: 1mm;">
            ${lubricentro?.fantasyName?.substring(0, 20) || 'HISMA'}
          </div>
          <div style="font-weight: bold; margin-bottom: 2mm;">
            ${oilChange.dominioVehiculo}
          </div>
          <img src="${qrImageSrc}" style="width: 35mm; height: auto; margin-bottom: 1mm;" alt="QR ${oilChange.dominioVehiculo}">
          <div style="font-size: 6px; text-align: left;">
            <strong>Servicio:</strong> ${new Date(oilChange.fechaServicio).toLocaleDateString('es-ES')}<br>
            <strong>Cambio N°:</strong> ${oilChange.nroCambio}
          </div>
        </div>
      `;
    }

    batchHTML += `
        </div>
        <script>
          setTimeout(() => window.print(), 1000);
        </script>
      </body>
      </html>
    `;

    return batchHTML;
  }

  // Método original actualizado con nuevas opciones
  async printThermalLabel(
    oilChange: any, 
    lubricentro: any, 
    options: { 
      useCustomQR?: boolean, 
      customOptions?: QRCustomOptions,
      autoPrint?: boolean 
    } = {}
  ): Promise<void> {
    const { useCustomQR = false, customOptions = {}, autoPrint = true } = options;
    
    const finalOptions = useCustomQR ? customOptions : {};
    const labelHTML = await this.generateThermalLabel(oilChange, lubricentro, finalOptions);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(labelHTML);
      printWindow.document.close();
      
      if (autoPrint) {
        printWindow.location.search = '?autoprint=true';
      }
      
      printWindow.onload = () => {
        if (autoPrint) {
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        }
      };
    } else {
      throw new Error('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
    }
  }

  // NUEVA FUNCIÓN: Imprimir etiquetas en lote
  async printBatchLabels(
    oilChanges: any[], 
    lubricentro: any, 
    customOptions: QRCustomOptions = {}
  ): Promise<void> {
    const batchHTML = await this.generateBatchThermalLabels(oilChanges, lubricentro, customOptions);
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(batchHTML);
      printWindow.document.close();
    } else {
      throw new Error('No se pudo abrir la ventana de impresión en lote');
    }
  }

  // Método original de descarga con opciones mejoradas
  async downloadQRImage(
    domain: string, 
    options: { 
      filename?: string, 
      useCustom?: boolean, 
      customOptions?: QRCustomOptions 
    } = {}
  ): Promise<void> {
    const { filename, useCustom = false, customOptions = {} } = options;
    
    try {
      if (useCustom) {
        // Usar servicio personalizado
        await customQRService.downloadCustomQRImage(
          domain,
          customOptions,
          filename || `qr-personalizado-${domain.toUpperCase()}.png`
        );
      } else {
        // Método original
        const qrURL = this.generateQRURL(domain, 200);
        const response = await fetch(qrURL);
        const blob = await response.blob();
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.download = filename || `qr-${domain.toUpperCase()}.png`;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error descargando QR:', error);
      // Fallback: abrir en nueva ventana
      const fallbackURL = this.generateQRURL(domain, 200);
      window.open(fallbackURL, '_blank');
    }
  }

  // NUEVA FUNCIÓN: Preview de etiqueta térmica
  async previewThermalLabel(
    oilChange: any, 
    lubricentro: any, 
    customOptions: QRCustomOptions = {}
  ): Promise<string> {
    const labelHTML = await this.generateThermalLabel(oilChange, lubricentro, customOptions);
    
    const previewWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
    if (previewWindow) {
      previewWindow.document.write(labelHTML.replace('?autoprint=true', ''));
      previewWindow.document.close();
      previewWindow.document.title = `Vista Previa - ${oilChange.dominioVehiculo}`;
    }
    
    return labelHTML;
  }
}

export const qrServiceNative = new QRServiceNative();