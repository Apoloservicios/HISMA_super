// src/services/qrServiceNative.ts - VERSIÓN CORREGIDA
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase'; // ✅ Corregido: usar lib/firebase

// Interfaz para configuración de QR - Compatible con sistema existente
export interface QRConfiguration {
  lubricentroId: string;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
  includeDate: boolean;
  includeCompanyName: boolean;
  paperSize: 'thermal' | 'A4';
  qrSize: number;
  fontSize: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  colors: {
    background: string;
    text: string;
    border: string;
  };
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ COMPATIBILIDAD con sistema existente
  useCustomQR?: boolean;
  customOptions?: QRCustomOptions;
  autoPrint?: boolean;
}

// ✅ COMPATIBILIDAD: Interfaz del sistema existente
export interface QRCustomOptions {
  headerText?: string;
  footerText?: string;
  includeDate?: boolean;
  includeCompanyName?: boolean;
  paperSize?: 'thermal' | 'A4';
  qrSize?: number;
  fontSize?: number;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  colors?: {
    background: string;
    text: string;
    border: string;
  };
  instructions?: string;
}

class QRServiceNative {
  private defaultConfig: Omit<QRConfiguration, 'lubricentroId' | 'createdAt' | 'updatedAt'> = {
    includeDate: true,
    includeCompanyName: true,
    paperSize: 'thermal',
    qrSize: 120,
    fontSize: 10,
    margins: {
      top: 10,
      bottom: 10,
      left: 5,
      right: 5
    },
    colors: {
      background: '#ffffff',
      text: '#000000',
      border: '#333333'
    },
    headerText: 'Historial de Mantenimiento',
    footerText: 'Escanee para consultar historial',
    instructions: '📱 Escanee para ver historial completo del vehículo en su celular'
  };

  private getPublicConsultationURL = (domain: string): string => {
    const baseURL = window.location.origin;
    return `${baseURL}/consulta-historial?dominio=${encodeURIComponent(domain.toUpperCase())}`;
  };

  // Usar servicio externo para generar QR
  generateQRURL(domain: string, size: number = 150): string {
    const url = this.getPublicConsultationURL(domain);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png&margin=10`;
  }

  // 🔥 NUEVA: Guardar configuración en Firebase
  async saveQRConfiguration(lubricentroId: string, config: Partial<QRConfiguration>): Promise<void> {
    try {
      const configRef = doc(db, 'qr_configurations', lubricentroId);
      const configData: QRConfiguration = {
        ...this.defaultConfig,
        ...config,
        lubricentroId,
        updatedAt: new Date(),
        createdAt: config.createdAt || new Date()
      };
      
      await setDoc(configRef, configData, { merge: true });
 
    } catch (error) {
      console.error('❌ Error guardando configuración QR:', error);
      throw new Error('No se pudo guardar la configuración');
    }
  }

  // 🔥 NUEVA: Cargar configuración desde Firebase
  async loadQRConfiguration(lubricentroId: string): Promise<QRConfiguration> {
    try {
      const configRef = doc(db, 'qr_configurations', lubricentroId);
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        const data = configDoc.data() as QRConfiguration;
       
        return data;
      } else {
        console.log('⚠️ No existe configuración, usando valores por defecto');
        return {
          ...this.defaultConfig,
          lubricentroId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    } catch (error) {
      console.error('❌ Error cargando configuración QR:', error);
      return {
        ...this.defaultConfig,
        lubricentroId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  // 🔥 MEJORADA: Generar etiqueta térmica con configuración personalizada
  async generateThermalLabel(oilChange: any, lubricentro: any, customConfig?: Partial<QRConfiguration>): Promise<string> {
    // Cargar configuración desde Firebase si no se proporciona una personalizada
    let config = customConfig;
    if (!config && lubricentro?.id) {
      config = await this.loadQRConfiguration(lubricentro.id);
    }
    
    // ✅ COMPATIBILIDAD: Manejar customOptions del sistema existente
    if (config?.customOptions) {
      config = { ...config, ...config.customOptions };
    }
    
    // Usar configuración por defecto si no hay personalizada
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const qrURL = this.generateQRURL(oilChange.dominioVehiculo, finalConfig.qrSize);
    
    const labelHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Etiqueta QR - ${oilChange.dominioVehiculo}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            
            .no-print {
              display: none !important;
            }
            
            .print-container {
              width: 100%;
              height: auto;
              page-break-inside: avoid;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: ${finalConfig.fontSize}px;
            line-height: 1.2;
            color: ${finalConfig.colors.text};
            background-color: ${finalConfig.colors.background};
            padding: ${finalConfig.margins.top}mm ${finalConfig.margins.right}mm ${finalConfig.margins.bottom}mm ${finalConfig.margins.left}mm;
            width: ${finalConfig.paperSize === 'thermal' ? '58mm' : '210mm'};
            max-width: ${finalConfig.paperSize === 'thermal' ? '58mm' : '210mm'};
            
            /* ✅ OPTIMIZACIÓN PARA IMPRESORAS TÉRMICAS */
            ${finalConfig.paperSize === 'thermal' ? `
              /* Configuración específica para térmica */
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0 !important;
              
              /* Evitar saltos de página */
              page-break-inside: avoid;
              break-inside: avoid;
              
              /* Configuración de página térmica */
              @page {
                size: 58mm auto;
                margin: 0;
                padding: 0;
              }
            ` : `
              /* ✅ CONFIGURACIÓN MEJORADA PARA A4 */
              @page {
                size: A4;
                margin: 15mm;
              }
              
              /* Centrar contenido en A4 */
              display: flex;
              justify-content: center;
              align-items: flex-start;
              min-height: 100vh;
              padding: 20mm;
            `}
          }
          
          .print-container {
            text-align: center;
            border: 1px solid ${finalConfig.colors.border};
            padding: 5mm;
            background: white;
            
            /* ✅ CONFIGURACIÓN PARA TÉRMICA */
            ${finalConfig.paperSize === 'thermal' ? `
              /* Ancho fijo para térmica */
              width: 48mm;
              max-width: 48mm;
              margin: 0 auto;
              
              /* Sin bordes en térmica para ahorrar espacio */
              border: none;
              padding: 2mm;
              
              /* Texto más compacto */
              font-size: ${Math.max(8, finalConfig.fontSize - 1)}px;
            ` : `
              /* ✅ CONFIGURACIÓN MEJORADA PARA A4 */
              width: 80mm;
              max-width: 80mm;
              margin: 20mm auto;
              border: 2px solid ${finalConfig.colors.border};
              border-radius: 8px;
              padding: 10mm;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              
              /* Fuente más grande para A4 */
              font-size: ${finalConfig.fontSize + 2}px;
            `}
          }
          
          .header {
            font-weight: bold;
            margin-bottom: 3mm;
            font-size: ${finalConfig.fontSize + 2}px;
            text-transform: uppercase;
            border-bottom: 1px solid ${finalConfig.colors.border};
            padding-bottom: 2mm;
          }
          
          .company-name {
            font-size: ${finalConfig.fontSize + 1}px;
            margin-bottom: 2mm;
            font-weight: bold;
          }
          
          .qr-container {
            margin: 3mm 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .qr-image {
            max-width: ${finalConfig.qrSize}px;
            height: auto;
            border: 1px solid ${finalConfig.colors.border};
            padding: 2mm;
            background: white;
            
            /* ✅ OPTIMIZACIÓN QR PARA TÉRMICA */
            ${finalConfig.paperSize === 'thermal' ? `
              /* QR más pequeño en térmica pero legible */
              max-width: ${Math.min(finalConfig.qrSize, 100)}px;
              border: none;
              padding: 1mm;
              
              /* Mejorar contraste para impresoras térmicas */
              filter: contrast(1.2);
            ` : ''}
          }
          
          .vehicle-info {
            margin: 3mm 0;
            font-size: ${finalConfig.fontSize + 1}px;
            font-weight: bold;
          }
          
          .instructions {
            font-size: ${finalConfig.fontSize - 1}px;
            margin: 2mm 0;
            line-height: 1.3;
            white-space: pre-line;
          }
          
          .footer {
            margin-top: 3mm;
            font-size: ${finalConfig.fontSize - 1}px;
            border-top: 1px solid ${finalConfig.colors.border};
            padding-top: 2mm;
          }

          .loading-placeholder {
            width: ${finalConfig.qrSize}px;
            height: ${finalConfig.qrSize}px;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 12px;
            margin: 0 auto;
          }

          /* Botones para vista previa (no se imprimen) */
          .preview-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }

          .btn {
            margin: 2px;
            padding: 8px 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
          }

          .btn:hover {
            background: #0056b3;
          }

          .btn-print {
            background: #28a745;
          }

          .btn-print:hover {
            background: #1e7e34;
          }
        </style>
      </head>
      <body>
        <div class="preview-controls no-print">
          <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir</button>
          <button class="btn" onclick="window.close()">❌ Cerrar</button>
        </div>

        <div class="print-container">
          ${finalConfig.headerText ? `<div class="header">${finalConfig.headerText}</div>` : ''}
          
          ${finalConfig.includeCompanyName && lubricentro?.fantasyName ? 
            `<div class="company-name">${lubricentro.fantasyName}</div>` : ''}
          
          <div class="vehicle-info">
            Vehículo: ${oilChange.dominioVehiculo.toUpperCase()}
          </div>
          
          <div class="qr-container">
            <div id="qr-placeholder" class="loading-placeholder">
              Cargando QR...
            </div>
            <img 
              id="qr-image"
              src="${qrURL}" 
              alt="QR Code"
              class="qr-image"
              style="display: none;"
              onload="handleQRLoad()"
              onerror="handleQRError()"
            />
          </div>
          
          ${finalConfig.instructions ? 
            `<div class="instructions">${finalConfig.instructions}</div>` : ''}
          
          <div class="footer">
            ${finalConfig.footerText || 'Escanee para consultar historial'}<br>
            ${finalConfig.includeDate ? `Cambio N° ${oilChange.nroCambio} - ${new Date().toLocaleDateString('es-ES')}` : `Cambio N° ${oilChange.nroCambio}`}
          </div>
        </div>
        
        <script>
          let qrLoaded = false;
          
          function handleQRLoad() {
            console.log('✅ QR cargado exitosamente');
            document.getElementById('qr-placeholder').style.display = 'none';
            document.getElementById('qr-image').style.display = 'block';
            qrLoaded = true;
            
            // Auto-imprimir si se especifica en la URL o configuración
            if (window.location.search.includes('autoprint=true') || ${customConfig?.autoPrint || false}) {
              setTimeout(() => {
                window.print();
              }, 500);
            }
          }
          
          function handleQRError() {
            console.error('❌ Error cargando QR');
            const placeholder = document.getElementById('qr-placeholder');
            placeholder.innerHTML = '❌ Error cargando QR';
            placeholder.style.color = 'red';
          }
          
          // Timeout de respaldo por si la imagen no carga
          setTimeout(() => {
            if (!qrLoaded) {
              console.warn('⚠️ QR no cargó en 5 segundos, mostrando mensaje de error');
              handleQRError();
            }
          }, 5000);
        </script>
      </body>
      </html>
    `;

    return labelHTML;
  }

  // 🔥 NUEVA: Vista previa sin impresión (para compatibilidad)
  async previewThermalLabel(oilChange: any, lubricentro: any, customConfig?: Partial<QRConfiguration>): Promise<void> {
    try {
      const labelHTML = await this.generateThermalLabel(oilChange, lubricentro, customConfig);
      
      const previewWindow = window.open('', '_blank', 'width=400,height=600');
      
      if (!previewWindow) {
        throw new Error('No se pudo abrir la ventana de vista previa. Verifique que no esté bloqueada por el navegador.');
      }

      previewWindow.document.write(labelHTML);
      previewWindow.document.close();
      previewWindow.focus();


      
    } catch (error) {
      console.error('❌ Error generando vista previa:', error);
      throw error;
    }
  }

  // 🔥 NUEVA: Impresión en lote (para compatibilidad)
  async printBatchLabels(oilChanges: any[], lubricentro: any, customConfig?: Partial<QRConfiguration>): Promise<void> {
    try {
      for (const oilChange of oilChanges) {
        await this.printThermalLabel(oilChange, lubricentro, customConfig);
        // Pequeña pausa entre impresiones para evitar sobrecargar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ Error imprimiendo etiquetas en lote:', error);
      throw error;
    }
  }

  // 🔥 MEJORADA: Imprimir etiqueta térmica con manejo de errores
  async printThermalLabel(oilChange: any, lubricentro: any, customConfig?: Partial<QRConfiguration>): Promise<void> {
    try {
      const labelHTML = await this.generateThermalLabel(oilChange, lubricentro, customConfig);
      
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      
      if (!printWindow) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
      }

      printWindow.document.write(labelHTML);
      printWindow.document.close();
      
      // Esperar a que cargue completamente antes de mostrar
      printWindow.onload = () => {
  
      };


      
    } catch (error) {
      console.error('❌ Error generando etiqueta:', error);
      throw error;
    }
  }

  // 🔥 NUEVA: Imprimir etiqueta optimizada para impresoras térmicas
  async printOptimizedThermalLabel(oilChange: any, lubricentro: any, customConfig?: Partial<QRConfiguration>): Promise<void> {
    try {
      // Cargar configuración con optimizaciones térmicas
      const config = customConfig || (lubricentro?.id ? await this.loadQRConfiguration(lubricentro.id) : null);
      
      // Aplicar optimizaciones para térmica
      const thermalOptimizedConfig = {
        ...this.defaultConfig,
        ...config,
        // ✅ OPTIMIZACIONES ESPECÍFICAS
        paperSize: 'thermal' as const,
        qrSize: Math.min(config?.qrSize || 120, 100), // QR más pequeño
        fontSize: Math.max(8, (config?.fontSize || 10) - 1), // Fuente ligeramente más pequeña
        margins: {
          top: 2,
          bottom: 2, 
          left: 2,
          right: 2
        },
        // Configuración térmica optimizada
        autoPrint: config?.autoPrint || false
      };

      const labelHTML = await this.generateThermalLabel(oilChange, lubricentro, thermalOptimizedConfig);
      
      const printWindow = window.open('', '_blank', 'width=220,height=400');
      
      if (!printWindow) {
        throw new Error('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
      }

      printWindow.document.write(labelHTML);
      printWindow.document.close();
      
      // ✅ CONFIGURACIÓN ESPECÍFICA PARA IMPRESORAS TÉRMICAS
      printWindow.onload = () => {
        setTimeout(() => {
          // Instrucciones para el usuario
          console.log(`
🖨️ CONFIGURACIÓN RECOMENDADA PARA IMPRESORA TÉRMICA:
- Ancho de papel: 58mm
- Tipo: Térmico directo  
- Velocidad: Media
- Densidad: Alta
- Corte automático: Activado
          `);
          
          // Auto-imprimir si está configurado
          if (thermalOptimizedConfig.autoPrint) {
            printWindow.print();
          }
        }, 1000);
      };

 
      
    } catch (error) {
      console.error('❌ Error generando etiqueta térmica optimizada:', error);
      throw error;
    }
  }

  // 🔥 COMPATIBILIDAD: Descargar QR con opciones del sistema existente
  async downloadQRImage(domain: string, options?: string | { filename?: string; useCustom?: boolean; customOptions?: QRCustomOptions; }): Promise<void> {
    let filename: string;
    let customOptions: QRCustomOptions | undefined;
    
    // ✅ COMPATIBILIDAD: Manejar tanto string como object
    if (typeof options === 'string') {
      filename = options;
    } else if (options && typeof options === 'object') {
      filename = options.filename || `qr-${domain.toUpperCase()}.png`;
      customOptions = options.customOptions;
    } else {
      filename = `qr-${domain.toUpperCase()}.png`;
    }
    
    // Usar tamaño personalizado si está en las opciones
    const qrSize = customOptions?.qrSize || 300;
    const qrURL = this.generateQRURL(domain, qrSize);
    
    try {
      const response = await fetch(qrURL);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      

      
    } catch (error) {
      console.error('❌ Error descargando QR:', error);
      // Fallback: abrir en nueva ventana
      const fallbackWindow = window.open(qrURL, '_blank');
      if (fallbackWindow) {
  
      } else {
        throw new Error('No se pudo descargar el QR y falló el método de respaldo');
      }
    }
  }

  // 🔥 NUEVA: Generar y descargar como PDF (simulado)
  async downloadAsPDF(oilChange: any, lubricentro: any, customConfig?: Partial<QRConfiguration>): Promise<void> {
    try {
      // Generar HTML optimizado para PDF
      const config = customConfig || (lubricentro?.id ? await this.loadQRConfiguration(lubricentro.id) : null);
      const finalConfig = { ...this.defaultConfig, ...config, paperSize: 'A4' as const };
      
      const labelHTML = await this.generateThermalLabel(oilChange, lubricentro, finalConfig);
      
      const pdfWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!pdfWindow) {
        throw new Error('No se pudo abrir ventana para PDF');
      }

      pdfWindow.document.write(labelHTML);
      pdfWindow.document.close();
      
      pdfWindow.onload = () => {
        setTimeout(() => {
          
          
          // Auto-abrir diálogo de impresión
          pdfWindow.print();
        }, 1000);
      };
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      throw error;
    }
  }
}

export const qrServiceNative = new QRServiceNative();

// ✅ Los tipos ya están declarados arriba como interfaces, no necesitamos re-exportar