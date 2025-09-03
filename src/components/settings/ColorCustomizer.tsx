// src/components/settings/ColorCustomizer.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button } from '../ui';
import { Spinner } from '../ui';
import { updateLubricentro } from '../../services/lubricentroService';
import { Lubricentro } from '../../types';

interface ColorCustomizerProps {
  lubricentro: Lubricentro;
  onColorsUpdated: (updatedLubricentro: Lubricentro) => void;
}

// Colores predefinidos populares para lubricentros
const PRESET_COLORS = {
  primary: [
    '#2E7D32', // Verde clásico
    '#1565C0', // Azul profesional
    '#D32F2F', // Rojo corporativo
    '#F57C00', // Naranja energético
    '#7B1FA2', // Púrpura moderno
    '#424242', // Gris elegante
    '#00695C', // Verde agua
    '#FF6F00'  // Ámbar vibrante
  ],
  secondary: [
    '#1B5E20', // Verde oscuro
    '#0D47A1', // Azul oscuro
    '#B71C1C', // Rojo oscuro
    '#E65100', // Naranja oscuro
    '#4A148C', // Púrpura oscuro
    '#212121', // Negro
    '#004D40', // Verde agua oscuro
    '#FF8F00'  // Ámbar oscuro
  ],
  accent: [
    '#FBC02D', // Amarillo dorado
    '#FFB300', // Ámbar
    '#FF5722', // Rojo naranja
    '#8BC34A', // Verde lima
    '#00BCD4', // Cian
    '#9C27B0', // Magenta
    '#607D8B', // Azul gris
    '#795548'  // Marrón
  ],
  text: [
    '#212121', // Negro suave
    '#424242', // Gris oscuro
    '#616161', // Gris medio
    '#FFFFFF', // Blanco
    '#1A1A1A', // Negro profundo
    '#333333', // Gris carbón
    '#4A4A4A', // Gris piedra
    '#F5F5F5'  // Gris muy claro
  ],
  background: [
    '#FFFFFF', // Blanco
    '#F8F9FA', // Gris muy claro
    '#E3F2FD', // Azul muy claro
    '#E8F5E8', // Verde muy claro
    '#FFF3E0', // Naranja muy claro
    '#F3E5F5', // Púrpura muy claro
    '#FFF8E1', // Amarillo muy claro
    '#ECEFF1'  // Azul gris claro
  ]
};

const ColorCustomizer: React.FC<ColorCustomizerProps> = ({ 
  lubricentro, 
  onColorsUpdated 
}) => {
  const [colors, setColors] = useState({
    primaryColor: (lubricentro as any).primaryColor || '#2E7D32',
    secondaryColor: (lubricentro as any).secondaryColor || '#1B5E20',
    accentColor: (lubricentro as any).accentColor || '#FBC02D',
    textColor: (lubricentro as any).textColor || '#212121',
    backgroundColor: (lubricentro as any).backgroundColor || '#FFFFFF',
    useTransparentBackground: (lubricentro as any).useTransparentBackground || false
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setColors({
      primaryColor: (lubricentro as any).primaryColor || '#2E7D32',
      secondaryColor: (lubricentro as any).secondaryColor || '#1B5E20',
      accentColor: (lubricentro as any).accentColor || '#FBC02D',
      textColor: (lubricentro as any).textColor || '#212121',
      backgroundColor: (lubricentro as any).backgroundColor || '#FFFFFF',
      useTransparentBackground: (lubricentro as any).useTransparentBackground || false
    });
  }, [lubricentro]);

  const handleColorChange = (colorType: string, value: string | boolean) => {
    setColors(prev => ({
      ...prev,
      [colorType]: value
    }));
  };

  const handlePresetClick = (colorType: string, color: string) => {
    handleColorChange(colorType, color);
  };

  const handleSaveColors = async () => {
    try {
      setSaving(true);
      
      // Usar any para evitar errores de TypeScript temporalmente
      await updateLubricentro(lubricentro.id, {
        primaryColor: colors.primaryColor,
        secondaryColor: colors.secondaryColor,
        accentColor: colors.accentColor,
        textColor: colors.textColor,
        backgroundColor: colors.backgroundColor,
        useTransparentBackground: colors.useTransparentBackground
      } as any);

      // Actualizar el objeto lubricentro local
      const updatedLubricentro = {
        ...lubricentro,
        primaryColor: colors.primaryColor,
        secondaryColor: colors.secondaryColor,
        accentColor: colors.accentColor,
        textColor: colors.textColor,
        backgroundColor: colors.backgroundColor,
        useTransparentBackground: colors.useTransparentBackground
      } as any;

      onColorsUpdated(updatedLubricentro);
      
    } catch (error) {
      console.error('Error al guardar colores:', error);
      alert('Error al guardar los colores. Por favor, intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setColors({
      primaryColor: '#2E7D32',
      secondaryColor: '#1B5E20',
      accentColor: '#FBC02D',
      textColor: '#212121',
      backgroundColor: '#FFFFFF',
      useTransparentBackground: false
    });
  };

  const ColorPreview = ({ color, label }: { color: string; label: string }) => (
    <div className="text-center">
      <div 
        className="w-16 h-16 rounded-lg border-2 border-gray-300 mx-auto mb-2"
        style={{ backgroundColor: color }}
      />
      <p className="text-sm text-gray-600 font-medium">{label}</p>
      <p className="text-xs text-gray-400">{color.toUpperCase()}</p>
    </div>
  );

  const ColorPicker = ({ 
    label, 
    colorType, 
    currentColor, 
    presets 
  }: { 
    label: string; 
    colorType: string; 
    currentColor: string; 
    presets: string[]; 
  }) => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {/* Color input */}
      <div className="flex items-center space-x-3">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => handleColorChange(colorType, e.target.value)}
          className="w-16 h-10 p-1 border rounded cursor-pointer"
        />
        <input
          type="text"
          value={currentColor}
          onChange={(e) => handleColorChange(colorType, e.target.value)}
          placeholder="#FFFFFF"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Preset colors */}
      <div className="grid grid-cols-8 gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
              currentColor === color ? 'border-gray-800 ring-2 ring-blue-500' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => handlePresetClick(colorType, color)}
            title={color}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader
        title="Personalización de Colores"
        subtitle="Configura los colores que aparecerán en tus PDFs y documentos"
      />
      <CardBody>
        <div className="space-y-8">
          {/* Vista previa de colores */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vista Previa</h3>
            <div className="grid grid-cols-5 gap-4 mb-4">
              <ColorPreview color={colors.primaryColor} label="Primario" />
              <ColorPreview color={colors.secondaryColor} label="Secundario" />
              <ColorPreview color={colors.accentColor} label="Acento" />
              <ColorPreview color={colors.textColor} label="Texto" />
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-lg border-2 border-gray-300 mx-auto mb-2 relative"
                  style={{ 
                    backgroundColor: colors.useTransparentBackground ? 'transparent' : colors.backgroundColor,
                    backgroundImage: colors.useTransparentBackground ? 
                      'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                    backgroundSize: colors.useTransparentBackground ? '20px 20px' : 'auto',
                    backgroundPosition: colors.useTransparentBackground ? '0 0, 0 10px, 10px -10px, -10px 0px' : 'auto'
                  }}
                >
                  {colors.useTransparentBackground && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-600 font-semibold">SIN</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 font-medium">Fondo</p>
                <p className="text-xs text-gray-400">
                  {colors.useTransparentBackground ? 'TRANSPARENTE' : colors.backgroundColor.toUpperCase()}
                </p>
              </div>
            </div>
            
            {/* Simulación de encabezado de PDF */}
            <div 
              className="border rounded-lg p-4 shadow-sm"
              style={{ 
                backgroundColor: colors.useTransparentBackground ? 'transparent' : colors.backgroundColor,
                backgroundImage: colors.useTransparentBackground ? 
                  'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)' : 'none',
                backgroundSize: colors.useTransparentBackground ? '20px 20px' : 'auto',
                backgroundPosition: colors.useTransparentBackground ? '0 0, 0 10px, 10px -10px, -10px 0px' : 'auto'
              }}
            >
              <div 
                className="p-4 text-white rounded-t-lg mb-3"
                style={{ backgroundColor: colors.primaryColor }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold">{lubricentro.fantasyName}</h2>
                    <p className="text-sm opacity-90">{lubricentro.domicilio}</p>
                  </div>
                  <div className="text-right">
                    <div 
                      className="px-3 py-1 rounded text-xs font-bold"
                      style={{ 
                        backgroundColor: colors.accentColor, 
                        color: colors.textColor
                      }}
                    >
                      N° 00123
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className="p-3 text-white rounded"
                  style={{ backgroundColor: colors.primaryColor }}
                >
                  <h3 className="text-sm font-bold mb-1">DATOS DEL CLIENTE</h3>
                  <p 
                    className="text-xs"
                    style={{ color: colors.textColor, backgroundColor: colors.useTransparentBackground ? 'rgba(255,255,255,0.9)' : colors.backgroundColor, padding: '2px 4px', borderRadius: '2px' }}
                  >
                    Juan Pérez
                  </p>
                </div>
                <div 
                  className="p-3 text-white rounded"
                  style={{ backgroundColor: colors.secondaryColor }}
                >
                  <h3 className="text-sm font-bold mb-1">DATOS DEL VEHÍCULO</h3>
                  <p 
                    className="text-xs"
                    style={{ color: colors.textColor, backgroundColor: colors.useTransparentBackground ? 'rgba(255,255,255,0.9)' : colors.backgroundColor, padding: '2px 4px', borderRadius: '2px' }}
                  >
                    Toyota Corolla
                  </p>
                </div>
              </div>
              
              <div 
                className="mt-3 p-2 rounded text-center text-sm font-medium"
                style={{ 
                  backgroundColor: colors.accentColor, 
                  color: colors.textColor
                }}
              >
                COMPROBANTE DE CAMBIO DE ACEITE
              </div>
              
              <div 
                className="mt-3 p-2 text-sm"
                style={{ color: colors.textColor }}
              >
                Este es un ejemplo de cómo se verá el texto normal en el documento PDF con los colores seleccionados.
              </div>
            </div>
          </div>

          {/* Selectores de color */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <ColorPicker
              label="Color Primario"
              colorType="primaryColor"
              currentColor={colors.primaryColor}
              presets={PRESET_COLORS.primary}
            />
            
            <ColorPicker
              label="Color Secundario"
              colorType="secondaryColor"
              currentColor={colors.secondaryColor}
              presets={PRESET_COLORS.secondary}
            />
            
            <ColorPicker
              label="Color de Acento"
              colorType="accentColor"
              currentColor={colors.accentColor}
              presets={PRESET_COLORS.accent}
            />
            
            <ColorPicker
              label="Color de Texto"
              colorType="textColor"
              currentColor={colors.textColor}
              presets={PRESET_COLORS.text}
            />
            
            {/* Control de fondo */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Color de Fondo
              </label>
              
              {/* Checkbox para fondo transparente */}
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="transparentBg"
                  checked={colors.useTransparentBackground}
                  onChange={(e) => handleColorChange('useTransparentBackground', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="transparentBg" className="text-sm text-gray-700">
                  Usar fondo transparente
                </label>
              </div>
              
              {!colors.useTransparentBackground && (
                <>
                  {/* Color input para fondo */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={colors.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 p-1 border rounded cursor-pointer"
                      disabled={colors.useTransparentBackground}
                    />
                    <input
                      type="text"
                      value={colors.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={colors.useTransparentBackground}
                    />
                  </div>

                  {/* Preset colors para fondo */}
                  <div className="grid grid-cols-8 gap-2">
                    {PRESET_COLORS.background.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                          colors.backgroundColor === color ? 'border-gray-800 ring-2 ring-blue-500' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorChange('backgroundColor', color)}
                        title={color}
                        disabled={colors.useTransparentBackground}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {colors.useTransparentBackground && (
                <div className="text-sm text-gray-500 italic">
                  El fondo será transparente en el PDF final
                </div>
              )}
            </div>
          </div>

          {/* Información de uso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">¿Cómo se usan estos colores?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Color Primario:</strong> Encabezados, títulos y elementos principales del PDF</li>
              <li><strong>Color Secundario:</strong> Secciones de datos, subtítulos y elementos de apoyo</li>
              <li><strong>Color de Acento:</strong> Números de comprobante, destacados y elementos decorativos</li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={saving}
            >
              Restaurar Valores por Defecto
            </Button>
            
            <Button
              onClick={handleSaveColors}
              disabled={saving}
              color="primary"
            >
              {saving ? (
                <>
                  <Spinner size="sm" color="white" className="mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar Colores'
              )}
            </Button>
          </div>

          {/* Consejos adicionales */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Consejos para elegir colores</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Mantén suficiente contraste entre los colores para garantizar la legibilidad</li>
              <li>• Los colores oscuros funcionan mejor para texto sobre fondos claros</li>
              <li>• Considera la identidad visual de tu lubricentro al elegir los colores</li>
              <li>• Puedes usar herramientas online para generar paletas de colores armoniosas</li>
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default ColorCustomizer;