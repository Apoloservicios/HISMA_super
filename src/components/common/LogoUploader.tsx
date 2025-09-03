// src/components/common/LogoUploader.tsx
import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { PhotoIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Spinner } from '../ui';
import cloudinaryService from '../../services/cloudinaryService';

interface LogoUploaderProps {
  currentLogoUrl?: string;
  onLogoUploaded: (logoData: { url: string, base64: string }) => void;
  className?: string;
  fallbackToBase64?: boolean; // Nueva prop para permitir fallback
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ 
  currentLogoUrl, 
  onLogoUploaded,
  className = '',
  fallbackToBase64 = true
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentLogoUrl);
  const [uploadMethod, setUploadMethod] = useState<'cloudinary' | 'base64'>('cloudinary');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (currentLogoUrl && cloudinaryService.isValidUrl(currentLogoUrl)) {
      setPreviewUrl(currentLogoUrl);
    }
  }, [currentLogoUrl]);
  
  const handleLogoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Crear vista previa local inmediatamente
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPreviewUrl(result);
        }
      };
      reader.readAsDataURL(file);
      
      let result;
      
      // Intentar subir a Cloudinary primero
      if (uploadMethod === 'cloudinary') {
        try {
          result = await cloudinaryService.uploadImage(file);
          console.log('Logo subido exitosamente a Cloudinary:', result.url);
          
        } catch (cloudinaryError: any) {
          console.warn('Error al subir a Cloudinary:', cloudinaryError.message);
          
          if (fallbackToBase64) {
            console.log('Intentando método de respaldo (base64)...');
            setUploadMethod('base64');
            result = await cloudinaryService.uploadImageBase64(file);
          } else {
            throw cloudinaryError;
          }
        }
      } else {
        // Usar directamente el método base64
        result = await cloudinaryService.uploadImageBase64(file);
      }
      
      if (result) {
        onLogoUploaded({
          url: result.url,
          base64: result.base64
        });
        
        // Mostrar mensaje informativo si se usó fallback
        if (uploadMethod === 'base64') {
          console.info('Logo guardado localmente. Se recomienda verificar la configuración de Cloudinary.');
        }
      }
      
    } catch (err: any) {
      console.error('Error al procesar logo:', err);
      setError(err.message || 'Error al procesar el logo. Por favor, intente nuevamente.');
      
      // Restaurar vista previa anterior si hay error
      if (currentLogoUrl && cloudinaryService.isValidUrl(currentLogoUrl)) {
        setPreviewUrl(currentLogoUrl);
      } else {
        setPreviewUrl(undefined);
      }
      
    } finally {
      setLoading(false);
    }
  };
  
  const renderPreview = () => {
    if (!previewUrl) return null;
    
    const imageUrl = cloudinaryService.isValidUrl(previewUrl) ? previewUrl : previewUrl;
    
    return (
      <img 
        src={imageUrl}
        alt="Logo del lubricentro" 
        className="max-w-full max-h-full object-contain"
        style={{ maxHeight: '120px', maxWidth: '250px' }}
        onError={(e) => {
          console.warn('Error al cargar imagen de vista previa');
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    );
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Indicador de método de subida */}
      {uploadMethod === 'base64' && (
        <div className="mb-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-md">
          <div className="flex items-center text-sm text-yellow-800">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            Modo offline - Logo guardado localmente
          </div>
        </div>
      )}
      
      <div 
        className="relative cursor-pointer group"
        onClick={handleLogoClick}
      >
        {/* Vista previa de logo o placeholder */}
        {previewUrl ? (
          <div className="w-64 h-32 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border">
            {renderPreview()}
          </div>
        ) : (
          <div className="w-64 h-32 rounded-md bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
            <div className="text-center p-4">
              <PhotoIcon className="h-10 w-10 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Subir logo</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG - Max 5MB</p>
            </div>
          </div>
        )}
        
        {/* Overlay de carga */}
        {loading && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-70 rounded-md flex items-center justify-center">
            <div className="text-center">
              <Spinner size="md" color="white" />
              <p className="text-white text-xs mt-2">
                {uploadMethod === 'cloudinary' ? 'Subiendo...' : 'Procesando...'}
              </p>
            </div>
          </div>
        )}
        
        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-md flex items-center justify-center transition-all">
          <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
            {previewUrl ? 'Cambiar logo' : 'Subir logo'}
          </span>
        </div>
      </div>
      
      {/* Input oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Mensaje de error */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
          {fallbackToBase64 && uploadMethod === 'cloudinary' && (
            <button
              onClick={() => setUploadMethod('base64')}
              className="text-sm text-red-700 underline mt-1 hover:text-red-800"
            >
              Intentar método alternativo
            </button>
          )}
        </div>
      )}
      
      {/* Información */}
      <div className="mt-2 text-center">
        <p className="text-sm text-gray-500">
          Haz clic para {previewUrl ? 'cambiar' : 'subir'} el logo del lubricentro
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Formatos: PNG, JPG • Tamaño máximo: 5MB
        </p>
        
        {/* Botón para cambiar método de subida */}
        {fallbackToBase64 && (
          <button
            onClick={() => setUploadMethod(uploadMethod === 'cloudinary' ? 'base64' : 'cloudinary')}
            className="text-xs text-blue-600 hover:text-blue-700 underline mt-1"
            type="button"
          >
            {uploadMethod === 'cloudinary' ? 'Usar modo offline' : 'Usar subida en línea'}
          </button>
        )}
      </div>
    </div>
  );
};

export default LogoUploader;