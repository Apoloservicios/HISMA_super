// src/components/qr/QRConfigurationModal.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  XMarkIcon, 
  PhotoIcon,
  SwatchIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Button, Modal } from '../ui'; // ✅ Corregido: Input no tiene prop name
import { qrServiceNative, QRConfiguration } from '../../services/qrServiceNative';
import { useAuth } from '../../context/AuthContext'; // ✅ Corregido: ruta correcta

interface QRConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: QRConfiguration) => void;
}

const QRConfigurationModal: React.FC<QRConfigurationModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const { userProfile } = useAuth(); // ✅ Corregido: usar userProfile en lugar de user/lubricentro
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de configuración
  const [config, setConfig] = useState<Partial<QRConfiguration>>({
    headerText: 'Historial de Mantenimiento',
    footerText: 'Escanee para consultar historial',
    instructions: '📱 Escanee para ver historial completo del vehículo en su celular',
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
    }
  });

  // Cargar configuración existente al abrir
  useEffect(() => {
    if (isOpen && userProfile?.lubricentroId) {
      loadConfiguration();
    }
  }, [isOpen, userProfile?.lubricentroId]);

  const loadConfiguration = async () => {
    if (!userProfile?.lubricentroId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const existingConfig = await qrServiceNative.loadQRConfiguration(userProfile.lubricentroId);
      setConfig(existingConfig);
      
    } catch (err) {
      console.error('Error cargando configuración:', err);
      setError('No se pudo cargar la configuración existente');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userProfile?.lubricentroId) {
      setError('No se puede guardar: lubricentro no identificado');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await qrServiceNative.saveQRConfiguration(userProfile.lubricentroId, config);
      
      // Recargar la configuración actualizada
      const savedConfig = await qrServiceNative.loadQRConfiguration(userProfile.lubricentroId);
      
      onConfigSaved(savedConfig);
      onClose();
      
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError('No se pudo guardar la configuración. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof QRConfiguration, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent: keyof QRConfiguration, field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }));
  };

  const handleReset = () => {
    setConfig({
      headerText: 'Historial de Mantenimiento',
      footerText: 'Escanee para consultar historial',
      instructions: '📱 Escanee para ver historial completo del vehículo en su celular',
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
      }
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración de Códigos QR"
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando configuración...</span>
          </div>
        ) : (
          <>
            {/* Textos Personalizados */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-3">
                <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Textos Personalizados</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto del Encabezado
                  </label>
                  <input
                    type="text"
                    value={config.headerText || ''}
                    onChange={(e) => handleInputChange('headerText', e.target.value)}
                    placeholder="Ej: Historial de Mantenimiento"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto del Pie
                  </label>
                  <input
                    type="text"
                    value={config.footerText || ''}
                    onChange={(e) => handleInputChange('footerText', e.target.value)}
                    placeholder="Ej: Escanee para consultar historial"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instrucciones
                  </label>
                  <textarea
                    rows={3}
                    value={config.instructions || ''}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Instrucciones para el cliente..."
                  />
                </div>
              </div>
            </div>

            {/* Opciones de Diseño */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-3">
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Opciones de Diseño</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño del Papel
                  </label>
                  <select
                    value={config.paperSize || 'thermal'}
                    onChange={(e) => handleInputChange('paperSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="thermal">Térmica (58mm)</option>
                    <option value="A4">A4 (210mm)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño del QR (px)
                  </label>
                  <input
                    type="number"
                    min="80"
                    max="200"
                    value={config.qrSize || 120}
                    onChange={(e) => handleInputChange('qrSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño de Fuente (px)
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="16"
                    value={config.fontSize || 10}
                    onChange={(e) => handleInputChange('fontSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Colores */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-3">
                <SwatchIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Colores</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fondo
                  </label>
                  <input
                    type="color"
                    value={config.colors?.background || '#ffffff'}
                    onChange={(e) => handleNestedChange('colors', 'background', e.target.value)}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto
                  </label>
                  <input
                    type="color"
                    value={config.colors?.text || '#000000'}
                    onChange={(e) => handleNestedChange('colors', 'text', e.target.value)}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bordes
                  </label>
                  <input
                    type="color"
                    value={config.colors?.border || '#333333'}
                    onChange={(e) => handleNestedChange('colors', 'border', e.target.value)}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Márgenes */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Márgenes (mm)</h3>
              
              <div className="grid grid-cols-4 gap-2">
                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                  <div key={side}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {side === 'top' ? 'Arriba' : 
                       side === 'right' ? 'Derecha' : 
                       side === 'bottom' ? 'Abajo' : 'Izquierda'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={config.margins?.[side] || 5}
                      onChange={(e) => handleNestedChange('margins', side, parseInt(e.target.value))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones adicionales */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Opciones Adicionales</h3>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includeDate || false}
                    onChange={(e) => handleInputChange('includeDate', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Incluir fecha en la etiqueta</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includeCompanyName || false}
                    onChange={(e) => handleInputChange('includeCompanyName', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Incluir nombre del lubricentro</span>
                </label>
              </div>
            </div>

            {/* Vista previa */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Vista Previa</h3>
              <div className="text-center text-xs text-gray-600">
                <div 
                  className="inline-block p-3 border rounded"
                  style={{ 
                    backgroundColor: config.colors?.background,
                    color: config.colors?.text,
                    borderColor: config.colors?.border,
                    fontSize: `${config.fontSize}px`
                  }}
                >
                  {config.headerText && <div className="font-bold mb-1">{config.headerText}</div>}
                  {config.includeCompanyName && userProfile?.lubricentroId && (
                    <div className="mb-1">Mi Lubricentro</div>
                  )}
                  <div className="mb-1">Vehículo: ABC123</div>
                  <div 
                    className="bg-white border mx-auto mb-1"
                    style={{ 
                      width: `${(config.qrSize || 120) / 3}px`, 
                      height: `${(config.qrSize || 120) / 3}px`,
                      borderColor: config.colors?.border
                    }}
                  >
                    <div className="text-xs text-gray-400 leading-none pt-2">QR</div>
                  </div>
                  {config.instructions && (
                    <div className="mb-1 whitespace-pre-line">{config.instructions}</div>
                  )}
                  <div>{config.footerText}</div>
                  {config.includeDate && <div>Cambio N° 123 - {new Date().toLocaleDateString('es-ES')}</div>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Botones de acción */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            color="secondary"
            onClick={handleReset}
            disabled={loading || saving}
          >
            Restaurar Valores por Defecto
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={loading || saving}
              color="primary"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default QRConfigurationModal;