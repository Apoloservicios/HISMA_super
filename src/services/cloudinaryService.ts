// src/services/cloudinaryService.ts
import axios from 'axios';

// Configuración de Cloudinary
const CLOUDINARY_UPLOAD_PRESET = 'hismafoto';
const CLOUDINARY_CLOUD_NAME = 'dcf4bewcl';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Configuración de optimización
const IMAGE_QUALITY = 0.8;
const MAX_LOGO_WIDTH = 300;
const MAX_LOGO_HEIGHT = 150;

/**
 * Convierte un archivo a base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Optimiza una imagen en base64 reduciendo su tamaño
 */
const optimizeBase64Image = (base64: string, maxWidth = MAX_LOGO_WIDTH, maxHeight = MAX_LOGO_HEIGHT): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.src = base64;
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo la proporción
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Crear un canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto 2D del canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Obtener el base64 optimizado
        const optimizedBase64 = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
        resolve(optimizedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen para optimización'));
      };
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Valida el tipo y tamaño del archivo
 */
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Validar tipo de archivo
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Por favor, seleccione una imagen válida' };
  }
  
  // Validar tamaño de archivo (5MB máximo)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'La imagen no debe exceder de 5MB' };
  }
  
  return { isValid: true };
};

/**
 * Servicio mejorado para interactuar con Cloudinary
 */
const cloudinaryService = {
  /**
   * Sube una imagen a Cloudinary con manejo de errores mejorado
   */
  uploadImage: async (file: File): Promise<{ url: string; base64: string }> => {
    // Validar archivo primero
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    try {
      // Convertir archivo a base64 para uso local
      const rawBase64 = await fileToBase64(file);
      
      // Optimizar el base64 para almacenamiento
      const optimizedBase64 = await optimizeBase64Image(rawBase64);
      
      // Crear FormData para enviar a Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      
      // Configurar timeout y otros parámetros de axios
      const axiosConfig = {
        timeout: 30000, // 30 segundos
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: false // Evitar problemas de CORS
      };
      
      // Realizar la petición a Cloudinary
      const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, axiosConfig);
      
      if (!response.data || !response.data.secure_url) {
        throw new Error('No se recibió una URL válida de Cloudinary');
      }
      
      return {
        url: response.data.secure_url,
        base64: optimizedBase64
      };
      
    } catch (error: any) {
      console.error('Error al subir imagen a Cloudinary:', error);
      
      // Proporcionar mensajes de error más específicos
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Error de conexión. Verifica tu conexión a internet y vuelve a intentar.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('La subida ha tardado demasiado. Por favor, intenta con una imagen más pequeña.');
      } else if (error.response?.status === 400) {
        throw new Error('Error en los datos de la imagen. Por favor, verifica que el archivo sea una imagen válida.');
      } else if (error.response?.status === 401) {
        throw new Error('Error de autenticación con el servicio de imágenes.');
      } else {
        throw new Error(error.message || 'Error inesperado al subir la imagen');
      }
    }
  },

  /**
   * Método alternativo usando base64 directo (fallback)
   */
  uploadImageBase64: async (file: File): Promise<{ url: string; base64: string }> => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      const rawBase64 = await fileToBase64(file);
      const optimizedBase64 = await optimizeBase64Image(rawBase64);
      
      // En lugar de subir a Cloudinary, usar solo base64 como fallback
      // Esto puede ser útil si hay problemas con la conexión a Cloudinary
      return {
        url: optimizedBase64, // Usar base64 como URL temporal
        base64: optimizedBase64
      };
      
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      throw error;
    }
  },

  /**
   * Extrae el ID público de una URL de Cloudinary
   */
  getPublicIdFromUrl: (url: string): string | null => {
    try {
      if (!url || typeof url !== 'string') return null;
      
      // Evitar procesar URLs base64
      if (url.startsWith('data:')) return null;
      
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      return lastPart.split('.')[0];
    } catch (error) {
      console.error('Error al extraer el ID público de la URL:', error);
      return null;
    }
  },

  /**
   * Valida si una URL es válida
   */
  isValidUrl: (url: string): boolean => {
    try {
      if (!url || typeof url !== 'string') return false;
      
      // Permitir URLs base64 y URLs HTTP/HTTPS
      return url.startsWith('data:') || 
             url.startsWith('http://') || 
             url.startsWith('https://');
    } catch {
      return false;
    }
  }
};

export default cloudinaryService;