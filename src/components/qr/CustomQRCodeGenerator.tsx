// src/components/qr/CustomQRCodeGenerator.tsx
import React, { useState, useEffect } from 'react';
import { customQRService, QRCustomOptions } from '../../services/customQRService';
import { Button } from '../ui';
import { 
  QrCodeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

interface CustomQRCodeGeneratorProps {
  oilChange: any;
  lubricentro: any;
  showPreview?: boolean;
}

const CustomQRCodeGenerator: React.FC<CustomQRCodeGeneratorProps> = ({
  oilChange,
  lubricentro,
  showPreview = true
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customQRImage, setCustomQRImage] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  
  // Opciones personalizables
  const [qrOptions, setQrOptions] = useState<QRCustomOptions>({
    primaryText: 'Escanea y revisa tu Servicio',
    lubricentroName: lubricentro?.fantasyName || '',
    fontSize: 12,
    textColor: '#333333',
    backgroundColor: '#ffffff',
    qrSize: 180,
    canvasWidth: 250,
    canvasHeight: 280
  });

  // Generar QR personalizado al montar el componente
  useEffect(() => {
    if (oilChange?.dominioVehiculo) {
      generateCustomQR();
    }
  }, [oilChange?.dominioVehiculo, qrOptions]);

  const generateCustomQR = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const customImage = await customQRService.generateCustomQRImage(
        oilChange.dominioVehiculo,
        {
          ...qrOptions,
          lubricentroName: lubricentro?.fantasyName || 'Sistema HISMA'
        }
      );
      
      setCustomQRImage(customImage);
    } catch (err: any) {
      console.error('Error generando QR personalizado:', err);
      setError(err.message || 'Error al generar QR personalizado');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintThermalLabel = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const labelHTML = await customQRService.generateThermalQRLabel(
        oilChange, 
        lubricentro,
        qrOptions
      );
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(labelHTML);
        printWindow.document.close();
        printWindow.location.search = '?autoprint=true';
      } else {
        throw new Error('No se pudo abrir la ventana de impresión');
      }
    } catch (err: any) {
      console.error('Error imprimiendo etiqueta:', err);
      setError(err.message || 'Error al imprimir etiqueta');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCustomQR = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await customQRService.downloadCustomQRImage(
        oilChange.dominioVehiculo,
        qrOptions,
        `qr-personalizado-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`
      );
    } catch (err: any) {
      console.error('Error descargando QR personalizado:', err);
      setError(err.message || 'Error al descargar QR personalizado');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadWithLogo = async () => {
    if (!lubricentro?.logoUrl && !lubricentro?.logoBase64) {
      setError('No hay logo disponible para el lubricentro');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const logoUrl = lubricentro.logoBase64 || lubricentro.logoUrl;
      const qrWithLogo = await customQRService.generateQRWithLogo(
        oilChange.dominioVehiculo,
        logoUrl,
        qrOptions
      );
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = qrWithLogo;
      link.download = `qr-con-logo-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err: any) {
      console.error('Error generando QR con logo:', err);
      setError(err.message || 'Error al generar QR con logo');
    } finally {
      setLoading(false);
    }
  };

  if (!oilChange?.dominioVehiculo) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <QrCodeIcon className="h-5 w-5 mr-2 text-blue-600" />
          Código QR Personalizado
        </h3>
        
        <Button
          size="sm"
         variant="outline"
          onClick={() => setShowOptions(!showOptions)}
          icon={<Cog6ToothIcon className="h-4 w-4" />}
        >
          Opciones
        </Button>
      </div>

      {/* Panel de opciones personalizables */}
      {showOptions && (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Personalizar QR</h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-gray-600 mb-1">Texto principal:</label>
              <input
                type="text"
                className="w-full p-1 border border-gray-300 rounded text-xs"
                value={qrOptions.primaryText || ''}
                onChange={(e) => setQrOptions(prev => ({...prev, primaryText: e.target.value}))}
                placeholder="Escanea y revisa tu Servicio"
              />
            </div>
            
            <div>
              <label className="block text-gray-600 mb-1">Tamaño fuente:</label>
              <input
                type="number"
                className="w-full p-1 border border-gray-300 rounded text-xs"
                value={qrOptions.fontSize || 12}
                onChange={(e) => setQrOptions(prev => ({...prev, fontSize: Number(e.target.value)}))}
                min="8"
                max="18"
              />
            </div>
            
            <div>
              <label className="block text-gray-600 mb-1">Color texto:</label>
              <input
                type="color"
                className="w-full h-6 border border-gray-300 rounded"
                value={qrOptions.textColor || '#333333'}
                onChange={(e) => setQrOptions(prev => ({...prev, textColor: e.target.value}))}
              />
            </div>
            
            <div>
              <label className="block text-gray-600 mb-1">Color fondo:</label>
              <input
                type="color"
                className="w-full h-6 border border-gray-300 rounded"
                value={qrOptions.backgroundColor || '#ffffff'}
                onChange={(e) => setQrOptions(prev => ({...prev, backgroundColor: e.target.value}))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Vista previa */}
      {showPreview && (
        <div className="text-center mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Generando QR...</span>
            </div>
          ) : customQRImage ? (
            <img 
              src={customQRImage} 
              alt={`QR Code personalizado para ${oilChange.dominioVehiculo}`}
              className="mx-auto border border-gray-200 rounded bg-white"
              style={{ maxWidth: '200px', height: 'auto' }}
            />
          ) : (
            <div className="h-32 flex items-center justify-center bg-gray-50 rounded">
              <span className="text-sm text-gray-500">QR no disponible</span>
            </div>
          )}
          
          <p className="text-xs text-gray-600 mt-2">
            QR personalizado con texto integrado
          </p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-col space-y-2">
        <Button
          size="sm"
          color="primary"
          onClick={handlePrintThermalLabel}
          disabled={loading}
          icon={<PrinterIcon className="h-4 w-4" />}
        >
          {loading ? 'Imprimiendo...' : 'Imprimir Etiqueta'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadCustomQR}
          disabled={loading}
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Descargar QR Personalizado
        </Button>

        {(lubricentro?.logoUrl || lubricentro?.logoBase64) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadWithLogo}
            disabled={loading}
            icon={<PhotoIcon className="h-4 w-4" />}
          >
            Descargar con Logo
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(`${window.location.origin}/consulta-historial?dominio=${oilChange.dominioVehiculo}`, '_blank')}
          icon={<QrCodeIcon className="h-4 w-4" />}
        >
          Probar Consulta
        </Button>
      </div>
    </div>
  );
};

export default CustomQRCodeGenerator;