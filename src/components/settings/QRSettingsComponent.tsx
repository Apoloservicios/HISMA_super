// src/components/settings/QRSettingsComponent.tsx - VERSIÓN FINAL SIN ERRORES
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button } from '../ui';
import { Spinner } from '../ui';
import { updateLubricentro } from '../../services/lubricentroService';
import { Lubricentro } from '../../types';

// Definir interfaz local para QR Settings
interface QRSettings {
  primaryText: string;
  lubricentroName: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  qrSize: number;
  canvasWidth: number;
  canvasHeight: number;
  fontFamily: string;
  qrMargin: number;
}

interface QRSettingsComponentProps {
  lubricentro: Lubricentro;
  onSettingsUpdated: (updatedLubricentro: Lubricentro) => void;
}

// Presets predefinidos para QR
const QR_PRESETS = {
  default: {
    primaryText: 'Escanea y revisa tu Servicio',
    fontSize: 12,
    textColor: '#333333',
    backgroundColor: '#ffffff',
    qrSize: 180,
  },
  branded: {
    primaryText: 'Servicio Premium',
    fontSize: 10,
    textColor: '#1f2937',
    backgroundColor: '#f8fafc',
    qrSize: 180,
  },
  minimal: {
    primaryText: 'Tu historial de servicios',
    fontSize: 11,
    textColor: '#6b7280',
    backgroundColor: '#ffffff',
    qrSize: 160,
  },
  bold: {
    primaryText: '¡CONSULTA TU HISTORIAL AQUÍ!',
    fontSize: 13,
    textColor: '#dc2626',
    backgroundColor: '#fef2f2',
    qrSize: 200,
  }
};

const QRSettingsComponent: React.FC<QRSettingsComponentProps> = ({ 
  lubricentro, 
  onSettingsUpdated 
}) => {
  const [qrSettings, setQrSettings] = useState<QRSettings>({
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
  });

  const [showTechnicalInfo, setShowTechnicalInfo] = useState(false);
  const [enablePublicConsult, setEnablePublicConsult] = useState(true);
  const [showLubricentroName, setShowLubricentroName] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Cargar configuración guardada
  useEffect(() => {
    const savedQRSettings = (lubricentro as any).qrSettings;
    if (savedQRSettings) {
      setQrSettings({
        ...qrSettings,
        ...savedQRSettings,
        lubricentroName: lubricentro?.fantasyName || ''
      });
    }

    // Cargar otras configuraciones
    setShowTechnicalInfo((lubricentro as any).qrShowTechnicalInfo || false);
    setEnablePublicConsult((lubricentro as any).qrEnablePublicConsult !== false);
    setShowLubricentroName((lubricentro as any).qrShowLubricentroName !== false);
  }, [lubricentro]);

  // Aplicar preset
  const applyPreset = (presetName: keyof typeof QR_PRESETS) => {
    const preset = QR_PRESETS[presetName];
    setQrSettings({
      ...qrSettings,
      ...preset,
      lubricentroName: lubricentro?.fantasyName || ''
    });
  };

  // Guardar configuración - SOLUCIÓN DEFINITIVA
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // USAR PARTIAL UPDATE DIRECTO
      const updateFields: Record<string, any> = {
        qrSettings: qrSettings,
        qrShowTechnicalInfo: showTechnicalInfo,
        qrEnablePublicConsult: enablePublicConsult,
        qrShowLubricentroName: showLubricentroName
      };

      await updateLubricentro(lubricentro.id, updateFields);
      
      // Actualizar el lubricentro en el componente padre
      const updatedLubricentro = { 
        ...lubricentro, 
        ...updateFields
      } as Lubricentro;
      
      onSettingsUpdated(updatedLubricentro);
      
      console.log('Configuración QR guardada correctamente');
      
    } catch (error) {
      console.error('Error guardando configuración QR:', error);
    } finally {
      setSaving(false);
    }
  };

  // Generar vista previa (simplificada)
  const generatePreview = async () => {
    setPreviewImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
  };

  return (
    <Card className="mb-6">
      <CardHeader 
        title="Configuración de Códigos QR" 
        subtitle="Personaliza cómo se generan los códigos QR para tus cambios de aceite"
      />
      <CardBody>
        <div className="space-y-6">
          
          {/* Presets rápidos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Estilos Predefinidos
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(QR_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as keyof typeof QR_PRESETS)}
                  className="p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="text-xs font-medium capitalize text-gray-900">
                    {key === 'default' ? 'Por Defecto' : 
                     key === 'branded' ? 'Corporativo' :
                     key === 'minimal' ? 'Minimalista' : 'Destacado'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {preset.primaryText}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuración de texto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto Principal
              </label>
              <input
                type="text"
                value={qrSettings.primaryText}
                onChange={(e) => setQrSettings({
                  ...qrSettings,
                  primaryText: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Texto que aparece en el QR"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamaño de Fuente
              </label>
              <select
                value={qrSettings.fontSize}
                onChange={(e) => setQrSettings({
                  ...qrSettings,
                  fontSize: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>Pequeño (10px)</option>
                <option value={11}>Normal (11px)</option>
                <option value={12}>Mediano (12px)</option>
                <option value={13}>Grande (13px)</option>
                <option value={14}>Extra Grande (14px)</option>
              </select>
            </div>
          </div>

          {/* Colores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color del Texto
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={qrSettings.textColor}
                  onChange={(e) => setQrSettings({
                    ...qrSettings,
                    textColor: e.target.value
                  })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={qrSettings.textColor}
                  onChange={(e) => setQrSettings({
                    ...qrSettings,
                    textColor: e.target.value
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color de Fondo
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={qrSettings.backgroundColor}
                  onChange={(e) => setQrSettings({
                    ...qrSettings,
                    backgroundColor: e.target.value
                  })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={qrSettings.backgroundColor}
                  onChange={(e) => setQrSettings({
                    ...qrSettings,
                    backgroundColor: e.target.value
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamaño del QR
              </label>
              <select
                value={qrSettings.qrSize}
                onChange={(e) => setQrSettings({
                  ...qrSettings,
                  qrSize: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={160}>Pequeño (160px)</option>
                <option value={180}>Mediano (180px)</option>
                <option value={200}>Grande (200px)</option>
                <option value={220}>Extra Grande (220px)</option>
              </select>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Opciones Adicionales</h4>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showLubricentroName}
                  onChange={(e) => setShowLubricentroName(e.target.checked)}
                  className="mr-3 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Mostrar nombre del lubricentro en el QR
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enablePublicConsult}
                  onChange={(e) => setEnablePublicConsult(e.target.checked)}
                  className="mr-3 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Habilitar consulta pública del historial
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showTechnicalInfo}
                  onChange={(e) => setShowTechnicalInfo(e.target.checked)}
                  className="mr-3 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Incluir información técnica en la consulta
                </span>
              </label>
            </div>
          </div>

          {/* Vista previa */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Vista Previa</h4>
              <Button
                type="button"
                color="secondary"
                size="sm"
                onClick={generatePreview}
              >
                Generar Vista Previa
              </Button>
            </div>
            
            {previewImage && (
              <div className="flex justify-center">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4"
                  style={{ backgroundColor: qrSettings.backgroundColor }}
                >
                  <img 
                    src={previewImage} 
                    alt="Vista previa del QR" 
                    className="mx-auto"
                    width={qrSettings.qrSize}
                    height={qrSettings.qrSize}
                  />
                  <div 
                    className="text-center mt-2"
                    style={{ 
                      color: qrSettings.textColor,
                      fontSize: `${qrSettings.fontSize || 12}px`
                    }}
                  >
                    {qrSettings.primaryText}
                  </div>
                  {showLubricentroName && (
                    <div 
                      className="text-center mt-1 font-semibold"
                      style={{ 
                        color: qrSettings.textColor,
                        fontSize: `${(qrSettings.fontSize || 12) + 1}px`
                      }}
                    >
                      {lubricentro?.fantasyName || 'Nombre del Lubricentro'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              color="secondary"
              onClick={() => {
                // Resetear a valores por defecto
                setQrSettings({
                  ...qrSettings,
                  ...QR_PRESETS.default,
                  lubricentroName: lubricentro?.fantasyName || ''
                });
              }}
            >
              Restaurar por Defecto
            </Button>
            
            <Button
              type="button"
              color="primary"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default QRSettingsComponent;