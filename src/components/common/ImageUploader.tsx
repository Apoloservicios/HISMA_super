// src/components/common/ImageUploader.tsx
import React, { useState, useRef, ChangeEvent } from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import { Spinner } from '../ui';
import cloudinaryService from '../../services/cloudinaryService';

interface ImageUploaderProps {
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  className?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  currentImageUrl, 
  onImageUploaded,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manejar clic en el avatar para abrir selector de archivo
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Manejar selección de archivo
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, seleccione una imagen válida');
      return;
    }
    
    // Validar tamaño de archivo (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe exceder de 5MB');
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
      
      // Notificar al componente padre solo con la URL
      // Esto mantiene la compatibilidad con el código existente
      onImageUploaded(result.url);
      
    } catch (err) {
      console.error('Error al subir imagen:', err);
      setError('Error al subir la imagen. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        className="relative cursor-pointer group"
        onClick={handleAvatarClick}
      >
        {/* Vista previa de imagen o avatar por defecto */}
        {previewUrl ? (
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
            <img 
              src={previewUrl} 
              alt="Foto de perfil" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center">
            <UserIcon className="h-16 w-16 text-primary-600" />
          </div>
        )}
        
        {/* Overlay de carga */}
        {loading && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-70 rounded-full flex items-center justify-center">
            <Spinner size="md" color="white" />
          </div>
        )}
        
        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all">
          <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
            Cambiar foto
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
        Haz clic para seleccionar una imagen
      </p>
    </div>
  );
};

export default ImageUploader;