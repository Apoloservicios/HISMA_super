// src/components/qr/QRCodeGeneratorNative.tsx
import React, { useState } from 'react';
import { qrServiceNative } from '../../services/qrServiceNative';
import { Button } from '../ui';
import { 
  QrCodeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  LinkIcon 
} from '@heroicons/react/24/outline';

interface QRCodeGeneratorNativeProps {
  oilChange: any;
  lubricentro: any;
  showPreview?: boolean;
}

const QRCodeGeneratorNative: React.FC<QRCodeGeneratorNativeProps> = ({
  oilChange,
  lubricentro,
  showPreview = true
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!oilChange?.dominioVehiculo) {
    return null;
  }

  const qrURL = qrServiceNative.generateQRURL(oilChange.dominioVehiculo, 150);
  const consultationURL = `${window.location.origin}/consulta-historial?dominio=${oilChange.dominioVehiculo}`;

  const handlePrintLabel = async () => {
    try {
      setLoading(true);
      setError(null);
      await qrServiceNative.printThermalLabel(oilChange, lubricentro);
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
    // ✅ LÍNEA CORREGIDA:
    await qrServiceNative.downloadQRImage(oilChange.dominioVehiculo, {
      filename: `qr-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`,
      useCustom: false,
      customOptions: {}
    });
  } catch (err: any) {
    console.error('Error descargando QR:', err);
    setError(err.message || 'Error al descargar código QR');
  } finally {
    setLoading(false);
  }
};

  const handleOpenConsultation = () => {
    window.open(consultationURL, '_blank');
  };

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <QrCodeIcon className="h-5 w-5 mr-2 text-blue-600" />
          Código QR para Cliente
        </h3>
      </div>

      {showPreview && (
        <div className="text-center mb-4">
          <img 
            src={qrURL} 
            alt={`QR Code para ${oilChange.dominioVehiculo}`}
            className="mx-auto border border-gray-200 rounded bg-white p-2"
            style={{ width: '120px', height: '120px' }}
            onError={(e) => {
              console.error('Error cargando QR:', e);
              setError('Error al cargar código QR');
            }}
          />
          
          <p className="text-xs text-gray-600 mt-2">
            Permite al cliente consultar su historial completo
          </p>
        </div>
      )}

      <div className="flex flex-col space-y-2">
        <Button
          size="sm"
          color="primary"
          onClick={handlePrintLabel}
          disabled={loading}
          icon={<PrinterIcon className="h-4 w-4" />}
        >
          {loading ? 'Preparando...' : 'Imprimir Etiqueta Térmica'}
        </Button>
        
        <Button
          size="sm"
          color="secondary"
          variant="outline"
          onClick={handleDownloadQR}
          disabled={loading}
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Descargar QR
        </Button>

        <Button
          size="sm"
          color="secondary"
          variant="outline"
          onClick={handleOpenConsultation}
          icon={<LinkIcon className="h-4 w-4" />}
        >
          Probar Consulta
        </Button>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        <strong>URL destino:</strong><br />
        <span className="break-all text-blue-600">
          {consultationURL}
        </span>
      </div>
    </div>
  );
};

export default QRCodeGeneratorNative;