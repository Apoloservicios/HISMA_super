// IMPLEMENTACIÓN SIN DEPENDENCIAS EXTERNAS
// src/services/qrServiceNative.ts

class QRServiceNative {
  private getPublicConsultationURL = (domain: string): string => {
    const baseURL = window.location.origin;
    return `${baseURL}/consulta-historial?dominio=${encodeURIComponent(domain.toUpperCase())}`;
  };

  // Usar un servicio externo gratuito para generar QR
  generateQRURL(domain: string, size: number = 150): string {
    const url = this.getPublicConsultationURL(domain);
    // Usar QR Server API (gratuito y confiable)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=10`;
  }

  // Generar SVG usando Google Charts API
  generateQRSVGURL(domain: string, size: number = 150): string {
    const url = this.getPublicConsultationURL(domain);
    return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8`;
  }

  // Generar etiqueta térmica sin dependencias
  async generateThermalLabel(oilChange: any, lubricentro: any): Promise<string> {
    const qrURL = this.generateQRURL(oilChange.dominioVehiculo, 120);
    
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
            font-family: 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.2;
            width: 58mm;
            margin: 0 auto;
            padding: 2mm;
            background: white;
          }
          
          .label-container {
            text-align: center;
            border: 2px solid #000;
            padding: 3mm;
          }
          
          .header {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 2mm;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
          }
          
          .vehicle-info {
            font-size: 14px;
            font-weight: bold;
            margin: 2mm 0;
            letter-spacing: 2px;
            background: #000;
            color: white;
            padding: 1mm;
          }
          
          .qr-container {
            margin: 3mm 0;
            display: flex;
            justify-content: center;
            border: 1px solid #ccc;
            padding: 2mm;
          }
          
          .qr-code {
            width: 30mm;
            height: 30mm;
            display: block;
          }
          
          .service-info {
            font-size: 8px;
            margin: 2mm 0;
            line-height: 1.4;
            text-align: left;
            border-top: 1px solid #000;
            padding-top: 1mm;
          }
          
          .instructions {
            font-size: 7px;
            margin: 2mm 0;
            text-align: center;
            font-style: italic;
            background: #f0f0f0;
            padding: 1mm;
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
              width: 58mm;
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
              src="${qrURL}" 
              alt="QR Code" 
              class="qr-code"
              onload="window.qrLoaded = true"
            />
          </div>
          
          <div class="service-info">
            <strong>Vehículo:</strong><br>
            ${oilChange.marcaVehiculo} ${oilChange.modeloVehiculo}<br>
            <strong>Servicio:</strong> ${new Date(oilChange.fechaServicio).toLocaleDateString('es-ES')}<br>
            <strong>Próximo:</strong> ${new Date(oilChange.fechaProximoCambio).toLocaleDateString('es-ES')}
          </div>
          
          <div class="instructions">
            📱 Escanee para ver historial completo<br>
            del vehículo en su celular
          </div>
          
          <div class="footer">
            Cambio N° ${oilChange.nroCambio}<br>
            ${new Date().toLocaleDateString('es-ES')}
          </div>
        </div>
        
        <script>
          // Esperar a que cargue la imagen QR antes de imprimir
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

  // Imprimir etiqueta térmica
  async printThermalLabel(oilChange: any, lubricentro: any): Promise<void> {
    const labelHTML = await this.generateThermalLabel(oilChange, lubricentro);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(labelHTML);
      printWindow.document.close();
      
      // Configurar para impresión automática
      printWindow.location.search = '?autoprint=true';
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // No cerrar automáticamente para permitir reimpresión
        }, 1000);
      };
    } else {
      throw new Error('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
    }
  }

  // Descargar QR como imagen
  async downloadQRImage(domain: string, filename?: string): Promise<void> {
    const qrURL = this.generateQRURL(domain, 200);
    
    try {
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
    } catch (error) {
      console.error('Error descargando QR:', error);
      // Fallback: abrir en nueva ventana
      window.open(qrURL, '_blank');
    }
  }
}

export const qrServiceNative = new QRServiceNative();

