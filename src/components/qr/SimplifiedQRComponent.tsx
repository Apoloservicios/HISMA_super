// src/components/qr/SimplifiedQRComponent.tsx
import React, { useState, useEffect } from 'react';
import { customQRService } from '../../services/customQRService';
import { qrServiceNative } from '../../services/qrServiceNative';
import { Button } from '../ui';
import { 
  QrCodeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface SimplifiedQRComponentProps {
  oilChange: any;
  lubricentro: any;
  showPreview?: boolean;
}

const SimplifiedQRComponent: React.FC<SimplifiedQRComponentProps> = ({
  oilChange,
  lubricentro,
  showPreview = true
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Obtener configuración QR del lubricentro
  const getQRSettings = () => {
    const defaultSettings = {
      primaryText: 'Escanea y revisa tu Servicio',
      lubricentroName: lubricentro?.fantasyName || '',
      fontSize: 12,
      textColor: '#333333',
      backgroundColor: '#ffffff',
      qrSize: 180,
      canvasWidth: 250,
      canvasHeight: 280,
      fontFamily: 'Arial, sans-serif',
      qrMargin: 10
    };

    // Usar configuración guardada del lubricentro si existe
    const savedSettings = (lubricentro as any)?.qrSettings;
    if (savedSettings) {
      return {
        ...defaultSettings,
        ...savedSettings,
        lubricentroName: lubricentro?.fantasyName || defaultSettings.lubricentroName
      };
    }

    return defaultSettings;
  };

  // Generar vista previa al cargar
  useEffect(() => {
    if (oilChange?.dominioVehiculo && showPreview) {
      generatePreview();
    }
  }, [oilChange?.dominioVehiculo, lubricentro]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const qrSettings = getQRSettings();
      const imageUrl = await customQRService.generateCustomQRImage(
        oilChange.dominioVehiculo,
        qrSettings
      );

      setPreviewImage(imageUrl);
    } catch (err: any) {
      console.error('Error generando vista previa QR:', err);
      setError(err.message || 'Error al generar vista previa');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintLabel = async () => {
    try {
      setLoading(true);
      setError(null);

      const qrSettings = getQRSettings();
      await qrServiceNative.printThermalLabel(oilChange, lubricentro, {
        useCustomQR: true,
        customOptions: qrSettings
      });
    } catch (err: any) {
      console.error('Error imprimiendo etiqueta:', err);
      setError(err.message || 'Error al imprimir etiqueta');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    try {
      setLoading(true);
      setError(null);

      const qrSettings = getQRSettings();
      const filename = `qr-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`;
      
      await customQRService.downloadCustomQRImage(
        oilChange.dominioVehiculo,
        qrSettings,
        filename
      );
    } catch (err: any) {
      console.error('Error descargando QR:', err);
      setError(err.message || 'Error al descargar QR');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (previewImage) {
      // Abrir vista previa en una nueva ventana
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Vista Previa QR - ${oilChange.dominioVehiculo}</title>
              <style>
                body { 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                  margin: 0; 
                  background-color: #f5f5f5;
                  font-family: Arial, sans-serif;
                }
                .container {
                  text-align: center;
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .info {
                  margin-top: 15px;
                  color: #666;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Código QR - ${oilChange.dominioVehiculo}</h2>
                <img src="${previewImage}" alt="Código QR" />
                <div class="info">
                  <p><strong>Cambio N°:</strong> ${oilChange.nroCambio}</p>
                  <p><strong>Vehículo:</strong> ${oilChange.dominioVehiculo}</p>
                  <p><strong>Lubricentro:</strong> ${lubricentro?.fantasyName}</p>
                </div>
              </div>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  if (!oilChange?.dominioVehiculo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <QrCodeIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">No hay información de vehículo disponible</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <QrCodeIcon className="h-5 w-5 mr-2 text-blue-600" />
          Código QR para Cliente
        </h3>
        <div className="text-xs text-gray-500">
          Usando configuración del perfil
        </div>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Vista previa del QR */}
      {showPreview && (
        <div className="mb-4">
          <div className="flex justify-center">
            {loading ? (
              <div className="flex items-center justify-center w-48 h-48 bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : previewImage ? (
              <div className="text-center">
                <img 
                  src={previewImage} 
                  alt="Código QR" 
                  className="mx-auto border rounded-lg shadow-sm"
                  style={{ maxWidth: '200px' }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Vehículo: {oilChange.dominioVehiculo}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center w-48 h-48 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-500">Vista previa no disponible</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botones de acción principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          type="button"
          color="primary"
          size="sm"
          onClick={handlePrintLabel}
          disabled={loading}
          className="flex items-center justify-center"
        >
          <PrinterIcon className="h-4 w-4 mr-2" />
          Imprimir Etiqueta
        </Button>

        <Button
          type="button"
          color="secondary"
          size="sm"
          onClick={handleDownloadQR}
          disabled={loading}
          className="flex items-center justify-center"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Descargar QR
        </Button>

        <Button
          type="button"
          color="secondary"
          size="sm"
          onClick={handlePreview}
          disabled={loading || !previewImage}
          className="flex items-center justify-center"
        >
          <EyeIcon className="h-4 w-4 mr-2" />
          Vista Previa
        </Button>
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-xs font-medium text-blue-800">
              Configuración Personalizada
            </h4>
            <div className="mt-1 text-xs text-blue-700">
              <p>
                Este QR usa la configuración definida en tu perfil de lubricentro.
              </p>
              <p className="mt-1">
                Para cambiar el diseño, texto o colores, ve a Perfil → Configuración de QR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedQRComponent;