// src/components/common/LogoUploader.tsx
import React, { useState, useRef, ChangeEvent ,useEffect} from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { Spinner } from '../ui';
import cloudinaryService from '../../services/cloudinaryService';



interface LogoUploaderProps {
  currentLogoUrl?: string;
  onLogoUploaded: (logoData: { url: string, base64: string }) => void;
  className?: string;
}


const LogoUploader: React.FC<LogoUploaderProps> = ({ 
  currentLogoUrl, 
  onLogoUploaded,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentLogoUrl);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manejar clic en el logo para abrir selector de archivo
  const handleLogoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  

// En LogoUploader.tsx
useEffect(() => {
  // Actualizar el estado de previsualización cuando cambien las props
  if (currentLogoUrl) {
    setPreviewUrl(currentLogoUrl);
  }
}, [currentLogoUrl]);

  // Manejar selección de archivo
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, seleccione una imagen válida');
      return;
    }
    
    // Validar tamaño de archivo (2MB máximo para logos)
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe exceder de 2MB');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Mostrar vista previa local
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Subir a Cloudinary
      const result = await cloudinaryService.uploadImage(file);
      
      // Notificar al componente padre con URL y base64
      onLogoUploaded({
        url: result.url,
        base64: result.base64
      });
      
    } catch (err) {
      console.error('Error al subir logo:', err);
      setError('Error al subir el logo. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        className="relative cursor-pointer group"
        onClick={handleLogoClick}
      >
        {/* Vista previa de logo o placeholder */}
        {previewUrl ? (
          <div className="w-64 h-32 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
            <img 
              src={`${previewUrl}?t=${new Date().getTime()}`} 
              alt="Logo del lubricentro" 
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '120px', maxWidth: '250px' }}
            />
          </div>
        ) : (
          <div className="w-64 h-32 rounded-md bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
            <div className="text-center p-4">
              <PhotoIcon className="h-10 w-10 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Subir logo</p>
            </div>
          </div>
        )}
        
        {/* Overlay de carga */}
        {loading && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-70 rounded-md flex items-center justify-center">
            <Spinner size="md" color="white" />
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
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      
      <p className="mt-2 text-sm text-gray-500">
        Haz clic para {previewUrl ? 'cambiar' : 'subir'} el logo del lubricentro
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Formatos recomendados: PNG o JPG. Tamaño máximo: 2MB.
      </p>
    </div>
  );
};

export default LogoUploader;