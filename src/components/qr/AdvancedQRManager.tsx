// src/components/qr/AdvancedQRManager.tsx - VERSIÓN COMPLETA CORREGIDA
import React, { useState, useEffect } from 'react';
import { qrServiceNative } from '../../services/qrServiceNative';
import { customQRService, QRCustomOptions } from '../../services/customQRService';
import { Button } from '../ui';
import { 
  QrCodeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  EyeIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  PaintBrushIcon 
} from '@heroicons/react/24/outline';

interface AdvancedQRManagerProps {
  oilChange: any;
  lubricentro: any;
  showPreview?: boolean;
  defaultMode?: 'simple' | 'custom';
}

type QRMode = 'simple' | 'custom';

const AdvancedQRManager: React.FC<AdvancedQRManagerProps> = ({
  oilChange,
  lubricentro,
  showPreview = true,
  defaultMode = 'custom'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState<QRMode>(defaultMode);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ✅ CONFIGURACIÓN INICIAL CORREGIDA (sin lubricentroName fijo)
  const [customOptions, setCustomOptions] = useState<QRCustomOptions>({
    primaryText: 'Escanea y revisa tu Servicio',
    lubricentroName: '', // Se actualizará dinámicamente
    fontSize: 12,
    textColor: '#333333',
    backgroundColor: '#ffffff',
    qrSize: 180,
    canvasWidth: 250,
    canvasHeight: 280,
    fontFamily: 'Arial, sans-serif',
    qrMargin: 10
  });

  // Presets de personalización
  const presets = {
    default: {
      primaryText: 'Escanea y revisa tu Servicio',
      fontSize: 12,
      textColor: '#333333',
      backgroundColor: '#ffffff',
    },
    branded: {
      primaryText: `Servicio Premium`,
      fontSize: 10,
      textColor: '#1f2937',
      backgroundColor: '#f8fafc',
    },
    minimal: {
      primaryText: 'Tu historial de servicios',
      fontSize: 11,
      textColor: '#6b7280',
      backgroundColor: '#ffffff',
    },
    bold: {
      primaryText: '¡CONSULTA TU HISTORIAL AQUÍ!',
      fontSize: 13,
      textColor: '#dc2626',
      backgroundColor: '#fef2f2',
    }
  };

 

  // ✅ FUNCIÓN PARA GUARDAR CONFIGURACIONES CON PERSISTENCIA
  const saveCustomOptions = (newOptions: QRCustomOptions) => {
    setCustomOptions(newOptions);
    
    // Guardar en localStorage (sin el lubricentroName para evitar conflictos)
    const optionsToSave = { ...newOptions };
    delete optionsToSave.lubricentroName;
    
    localStorage.setItem(
      `qr-options-${lubricentro?.id || 'default'}`, 
      JSON.stringify(optionsToSave)
    );
  };

  // ✅ ACTUALIZAR NOMBRE DEL LUBRICENTRO CUANDO CAMBIA
  useEffect(() => {
    if (lubricentro?.fantasyName) {
      setCustomOptions(prev => ({
        ...prev,
        lubricentroName: lubricentro.fantasyName
      }));
    }
  }, [lubricentro?.fantasyName]);

  // ✅ CARGAR CONFIGURACIONES GUARDADAS DEL LOCALSTORAGE
  useEffect(() => {
    const savedOptions = localStorage.getItem(`qr-options-${lubricentro?.id || 'default'}`);
    if (savedOptions) {
      try {
        const parsed = JSON.parse(savedOptions);
        setCustomOptions(prev => ({
          ...prev,
          ...parsed,
          lubricentroName: lubricentro?.fantasyName || prev.lubricentroName
        }));
      } catch (error) {
        console.warn('Error cargando configuraciones QR:', error);
      }
    }
  }, [lubricentro?.id, lubricentro?.fantasyName]);

  // ✅ GENERAR PREVIEW CUANDO CAMBIAN LOS DATOS
  useEffect(() => {
    if (oilChange?.dominioVehiculo && showPreview) {
      generatePreview();
    }
  }, [oilChange?.dominioVehiculo, qrMode, customOptions]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      let imageUrl: string;

      if (qrMode === 'custom') {
        imageUrl = await customQRService.generateCustomQRImage(
          oilChange.dominioVehiculo,
          {
            ...customOptions,
            lubricentroName: lubricentro?.fantasyName || 'Sistema HISMA'
          }
        );
      } else {
        imageUrl = qrServiceNative.generateQRURL(oilChange.dominioVehiculo, 180);
      }

      setPreviewImage(imageUrl);
    } catch (err: any) {
      console.error('Error generando preview:', err);
      setError(err.message || 'Error al generar vista previa');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintThermalLabel = async () => {
    try {
      setLoading(true);
      setError(null);

      await qrServiceNative.printThermalLabel(oilChange, lubricentro, {
        useCustomQR: qrMode === 'custom',
        customOptions: qrMode === 'custom' ? customOptions : {},
        autoPrint: true
      });
    } catch (err: any) {
      console.error('Error imprimiendo etiqueta:', err);
      setError(err.message || 'Error al imprimir etiqueta');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewLabel = async () => {
    try {
      setLoading(true);
      setError(null);

      await qrServiceNative.previewThermalLabel(
        oilChange, 
        lubricentro, 
        qrMode === 'custom' ? customOptions : {}
      );
    } catch (err: any) {
      console.error('Error mostrando vista previa:', err);
      setError(err.message || 'Error al mostrar vista previa');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    try {
      setLoading(true);
      setError(null);

      const filename = `qr-${qrMode}-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`;

      await qrServiceNative.downloadQRImage(oilChange.dominioVehiculo, {
        filename,
        useCustom: qrMode === 'custom',
        customOptions: qrMode === 'custom' ? customOptions : {}
      });
    } catch (err: any) {
      console.error('Error descargando QR:', err);
      setError(err.message || 'Error al descargar QR');
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
        customOptions
      );

      const link = document.createElement('a');
      link.href = qrWithLogo;
      link.download = `qr-logo-${oilChange.dominioVehiculo}-${oilChange.nroCambio}.png`;
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

  // ✅ APLICAR PRESET CON PERSISTENCIA
  const applyPreset = (presetName: keyof typeof presets) => {
    const presetOptions = {
      ...customOptions,
      ...presets[presetName],
      lubricentroName: lubricentro?.fantasyName || customOptions.lubricentroName
    };
    saveCustomOptions(presetOptions);
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
      {/* Header con selector de modo */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <QrCodeIcon className="h-5 w-5 mr-2 text-blue-600" />
          Generador de Códigos QR
        </h3>
        
        <div className="flex space-x-1">
          <button
            onClick={() => setQrMode('simple')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              qrMode === 'simple' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setQrMode('custom')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              qrMode === 'custom' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Personalizado
          </button>
        </div>
      </div>

      {/* Panel de opciones para QR personalizado */}
      {qrMode === 'custom' && (
        <>
          <div className="mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              icon={<Cog6ToothIcon className="h-4 w-4" />}
            >
              {showAdvancedOptions ? 'Ocultar' : 'Mostrar'} Opciones
            </Button>
          </div>

          {showAdvancedOptions && (
            <div className="mb-4 p-3 bg-gray-50 rounded border">
              {/* Presets rápidos */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Estilos predefinidos:
                </label>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(presets).map((presetName) => (
                    <button
                      key={presetName}
                      onClick={() => applyPreset(presetName as keyof typeof presets)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      {presetName === 'default' ? 'Por defecto' : 
                       presetName === 'branded' ? 'Premium' :
                       presetName === 'minimal' ? 'Minimalista' : 'Destacado'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opciones detalladas */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-600 mb-1">Texto principal:</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded text-xs"
                    value={customOptions.primaryText || ''}
                    onChange={(e) => saveCustomOptions({...customOptions, primaryText: e.target.value})}
                    placeholder="Escanea y revisa tu Servicio"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-600 mb-1">Tamaño fuente:</label>
                  <input
                    type="range"
                    className="w-full"
                    min="8"
                    max="18"
                    value={customOptions.fontSize || 12}
                    onChange={(e) => saveCustomOptions({...customOptions, fontSize: Number(e.target.value)})}
                  />
                  <span className="text-xs text-gray-500">{customOptions.fontSize}px</span>
                </div>
                
                <div>
                  <label className="block text-gray-600 mb-1">Color texto:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      className="w-8 h-8 border border-gray-300 rounded"
                      value={customOptions.textColor || '#333333'}
                      onChange={(e) => saveCustomOptions({...customOptions, textColor: e.target.value})}
                    />
                    <input
                      type="text"
                      className="flex-1 p-1 border border-gray-300 rounded text-xs"
                      value={customOptions.textColor || '#333333'}
                      onChange={(e) => saveCustomOptions({...customOptions, textColor: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-600 mb-1">Color fondo:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      className="w-8 h-8 border border-gray-300 rounded"
                      value={customOptions.backgroundColor || '#ffffff'}
                      onChange={(e) => saveCustomOptions({...customOptions, backgroundColor: e.target.value})}
                    />
                    <input
                      type="text"
                      className="flex-1 p-1 border border-gray-300 rounded text-xs"
                      value={customOptions.backgroundColor || '#ffffff'}
                      onChange={(e) => saveCustomOptions({...customOptions, backgroundColor: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Tamaño QR:</label>
                  <input
                    type="range"
                    className="w-full"
                    min="120"
                    max="250"
                    value={customOptions.qrSize || 180}
                    onChange={(e) => saveCustomOptions({...customOptions, qrSize: Number(e.target.value)})}
                  />
                  <span className="text-xs text-gray-500">{customOptions.qrSize}px</span>
                </div>

                <div>
                  <label className="block text-gray-600 mb-1">Fuente:</label>
                  <select
                    className="w-full p-1 border border-gray-300 rounded text-xs"
                    value={customOptions.fontFamily || 'Arial, sans-serif'}
                    onChange={(e) => saveCustomOptions({...customOptions, fontFamily: e.target.value})}
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="Georgia, serif">Georgia</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-800 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Vista previa */}
      {showPreview && (
        <div className="text-center mb-4">
          <div className="bg-gray-50 p-3 rounded border">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Generando vista previa...</span>
              </div>
            ) : previewImage ? (
              <div>
                <img 
                  src={previewImage} 
                  alt={`QR Code ${qrMode} para ${oilChange.dominioVehiculo}`}
                  className="mx-auto border border-gray-200 rounded bg-white shadow-sm"
                  style={{ 
                    maxWidth: qrMode === 'custom' ? '200px' : '150px', 
                    height: 'auto' 
                  }}
                />
                <div className="mt-2 text-xs text-gray-600">
                  <span className={`inline-block px-2 py-1 rounded text-white ${
                    qrMode === 'custom' ? 'bg-blue-600' : 'bg-gray-600'
                  }`}>
                    {qrMode === 'custom' ? 'QR Personalizado' : 'QR Simple'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center bg-white rounded border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <QrCodeIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Vista previa no disponible</span>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-600 mt-2">
            {qrMode === 'custom' 
              ? 'QR personalizado con texto integrado' 
              : 'QR simple para consulta de historial'
            }
          </p>
        </div>
      )}

      {/* Información del vehículo */}
      <div className="mb-4 p-2 bg-blue-50 rounded text-xs">
        <div className="flex justify-between items-center">
          <div>
            <strong>Vehículo:</strong> {oilChange.dominioVehiculo}
          </div>
          <div>
            <strong>Cambio N°:</strong> {oilChange.nroCambio}
          </div>
        </div>
        <div className="mt-1 text-gray-600">
          <strong>Lubricentro:</strong> {lubricentro?.fantasyName || 'No especificado'}
        </div>
        <div className="mt-1 text-gray-600">
          URL de consulta: {`${window.location.origin}/consulta-historial?dominio=${oilChange.dominioVehiculo}`}
        </div>
      </div>

      {/* Botones de acción principales */}
      <div className="grid grid-cols-2 gap-2 mb-3">
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
          onClick={handlePreviewLabel}
          disabled={loading}
          icon={<EyeIcon className="h-4 w-4" />}
        >
          Vista Previa
        </Button>
      </div>

      {/* Botones de descarga */}
      <div className="grid grid-cols-1 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadQR}
          disabled={loading}
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Descargar QR {qrMode === 'custom' ? 'Personalizado' : 'Simple'}
        </Button>

        {/* Botón de descarga con logo (solo para modo personalizado) */}
        {qrMode === 'custom' && (lubricentro?.logoUrl || lubricentro?.logoBase64) && (
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

        {/* Botón para probar consulta */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(`${window.location.origin}/consulta-historial?dominio=${oilChange.dominioVehiculo}`, '_blank')}
          icon={<QrCodeIcon className="h-4 w-4" />}
        >
          Probar Consulta Pública
        </Button>
      </div>

      {/* Información adicional */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-medium text-gray-700 hover:text-blue-600">
            Información técnica
          </summary>
          <div className="mt-2 space-y-1">
            <div><strong>Tipo de QR:</strong> {qrMode === 'custom' ? 'Personalizado con Canvas' : 'Generado por API externa'}</div>
            <div><strong>Resolución:</strong> {qrMode === 'custom' ? `${customOptions.canvasWidth}x${customOptions.canvasHeight}px` : '200x200px'}</div>
            <div><strong>Formato:</strong> PNG con transparencia</div>
            <div><strong>Dominio:</strong> {oilChange.dominioVehiculo}</div>
            <div><strong>Lubricentro:</strong> {lubricentro?.fantasyName || 'No especificado'}</div>
            {qrMode === 'custom' && (
              <>
                <div><strong>Texto:</strong> "{customOptions.primaryText}"</div>
                <div><strong>Fuente:</strong> {customOptions.fontFamily}, {customOptions.fontSize}px</div>
                <div><strong>Colores:</strong> Texto: {customOptions.textColor}, Fondo: {customOptions.backgroundColor}</div>
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

export default AdvancedQRManager;