// src/components/qr/QRCodeGeneratorNative.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
  QrCodeIcon, 
  PrinterIcon, 
  ArrowDownTrayIcon, 
  LinkIcon,
  CogIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui'; // ✅ Corregido: usar solo Button
import { qrServiceNative, QRConfiguration } from '../../services/qrServiceNative';
import { useAuth } from '../../context/AuthContext'; // ✅ Corregido: ruta correcta
import QRConfigurationModal from './QRConfigurationModal';

interface QRCodeGeneratorNativeProps {
  oilChange: any;
  lubricentro?: any; // ✅ Hacer opcional para evitar errores
  showPreview?: boolean;
}

const QRCodeGeneratorNative: React.FC<QRCodeGeneratorNativeProps> = ({
  oilChange,
  lubricentro,
  showPreview = true
}) => {
  const { userProfile } = useAuth(); // ✅ Corregido: usar userProfile
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<QRConfiguration | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Cargar configuración al montar el componente Y cuando cambie el lubricentro
  useEffect(() => {
    if (userProfile?.lubricentroId) {
      loadConfiguration();
    }
  }, [userProfile?.lubricentroId]); // ✅ Remover configLoaded para que siempre recargue

  const loadConfiguration = async () => {
    if (!userProfile?.lubricentroId) return;
    
    try {
      const config = await qrServiceNative.loadQRConfiguration(userProfile.lubricentroId);
      setCurrentConfig(config);
    
    } catch (err) {
      console.error('Error cargando configuración QR:', err);
      // Continuar con configuración por defecto
    }
  };

  if (!oilChange?.dominioVehiculo) {
    return null;
  }

  const qrURL = qrServiceNative.generateQRURL(oilChange.dominioVehiculo, 150);
  const consultationURL = `${window.location.origin}/consulta-historial?dominio=${oilChange.dominioVehiculo}`;

  const handlePrintThermalOptimized = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Usar impresión térmica optimizada
      await qrServiceNative.printOptimizedThermalLabel(oilChange, lubricentro, currentConfig || undefined);
      
    } catch (err: any) {
      console.error('Error imprimiendo etiqueta térmica:', err);
      setError(err.message || 'Error al imprimir etiqueta térmica');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Generar vista previa sin impresión automática
      const labelHTML = await qrServiceNative.generateThermalLabel(oilChange, lubricentro, currentConfig || undefined);
      
      const previewWindow = window.open('', '_blank', 'width=400,height=600');
      if (previewWindow) {
        previewWindow.document.write(labelHTML);
        previewWindow.document.close();
        previewWindow.focus();
      } else {
        throw new Error('No se pudo abrir la vista previa. Verifique que no esté bloqueada por el navegador.');
      }
      
    } catch (err: any) {
      console.error('Error en vista previa:', err);
      setError(err.message || 'Error al generar vista previa');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      await qrServiceNative.downloadAsPDF(oilChange, lubricentro, currentConfig || undefined);
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      setError(err.message || 'Error al generar PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    try {
      setLoading(true);
      setError(null);
      await qrServiceNative.downloadQRImage(
        oilChange.dominioVehiculo, 
        `qr-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`
      );
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

  const handleConfigSaved = (newConfig: QRConfiguration) => {
    setCurrentConfig(newConfig);


    setTimeout(() => {
      loadConfiguration();
    }, 500);
  };

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <QrCodeIcon className="h-5 w-5 mr-2 text-blue-600" />
          Código QR para Cliente
        </h3>
        
        {/* Botón de configuración (solo para admin) */}
        {userProfile?.role === 'admin' && (
          <Button
            size="sm"
            variant="outline"
            color="secondary" // ✅ Corregido: usar color válido
            onClick={() => setShowConfigModal(true)}
            icon={<CogIcon className="h-4 w-4" />}
            title="Configurar QR personalizado"
          >
            Configurar
          </Button>
        )}
      </div>

      {/* Mostrar configuración actual si está cargada */}
      {currentConfig && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <strong>Configuración:</strong> {currentConfig.headerText} • 
          Papel: {currentConfig.paperSize === 'thermal' ? 'Térmica' : 'A4'} • 
          QR: {currentConfig.qrSize}px
        </div>
      )}

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
        {/* Vista previa de la etiqueta */}
        <Button
          size="sm"
          color="secondary"
          variant="outline"
          onClick={handlePrintPreview}
          disabled={loading}
          icon={<EyeIcon className="h-4 w-4" />}
        >
          {loading ? 'Generando...' : 'Vista Previa'}
        </Button>

        {/* Imprimir etiqueta */}
        <Button
          size="sm"
          color="primary"
          onClick={handlePrintThermalOptimized}
          disabled={loading}
          icon={<PrinterIcon className="h-4 w-4" />}
        >
          {loading ? 'Preparando...' : 'Imprimir Térmica'}
        </Button>
        
        {/* Descargar solo QR */}
        <Button
          size="sm"
          color="secondary"
          variant="outline"
          onClick={handleDownloadQR}
          disabled={loading}
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Descargar Solo QR
        </Button>

        {/* Descargar etiqueta completa como PDF */}
        <Button
          size="sm"
          color="info"
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={loading}
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Descargar Etiqueta PDF
        </Button>

        {/* Probar consulta */}
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

      {/* Mostrar errores */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Información de destino */}
      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        <strong>URL destino:</strong><br />
        <span className="break-all text-blue-600">
          {consultationURL}
        </span>
      </div>

      {/* Modal de configuración */}
      <QRConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigSaved={handleConfigSaved}
      />
    </div>
  );
};

export default QRCodeGeneratorNative;