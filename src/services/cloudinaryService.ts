// src/services/cloudinaryService.ts
import axios from 'axios';

const CLOUDINARY_UPLOAD_PRESET = 'hismafoto'; // El preset que mencionaste
const CLOUDINARY_CLOUD_NAME = 'dcf4bewcl';     // El nombre que proporcionaste
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Convierte un archivo a base64
 * @param file Archivo a convertir
 * @returns Promise con el string base64
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
 * @param base64 String base64 de la imagen
 * @param maxWidth Ancho máximo
 * @param maxHeight Alto máximo
 * @returns Promise con el string base64 optimizado
 */
const optimizeBase64Image = (base64: string, maxWidth = 300, maxHeight = 150): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.src = base64;
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo la proporción
        let width = img.width;
        let height = img.height;
        
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
        
        // Dibujar la imagen redimensionada
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // Obtener el base64 optimizado con menor calidad para JPEG
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(optimizedBase64);
        } else {
          reject(new Error('No se pudo obtener el contexto 2D del canvas'));
        }
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
 * Servicio para interactuar con Cloudinary
 */
const cloudinaryService = {
  /**
   * Sube una imagen a Cloudinary y devuelve tanto la URL como la representación en base64
   * @param file - Archivo de imagen a subir
   * @returns Promise con la URL y el base64 de la imagen subida
   */
  uploadImage: async (file: File): Promise<{ url: string, base64: string }> => {
    try {
      // Convertir primero el archivo a base64 para uso local
      const rawBase64 = await fileToBase64(file);
      
      // Optimizar el base64 para almacenamiento
      const optimizedBase64 = await optimizeBase64Image(rawBase64);
      
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      
      // Realizar la petición a Cloudinary
      const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Verificar respuesta y retornar la URL y base64 de la imagen
      if (response.data && response.data.secure_url) {
        return {
          url: response.data.secure_url,
          base64: optimizedBase64
        };
      } else {
        throw new Error('No se recibió una URL válida de Cloudinary');
      }
    } catch (error) {
      console.error('Error al subir imagen a Cloudinary:', error);
      throw error;
    }
  },
  
  /**
   * Elimina una imagen de Cloudinary (opcional, requiere autenticación)
   * @param publicId - ID público de la imagen en Cloudinary
   * @returns Promise que se resuelve cuando se completa la eliminación
   */
  deleteImage: async (publicId: string): Promise<void> => {
    // Esta función requeriría credenciales de API completas de Cloudinary
    // Para implementarla, necesitarías API Key y API Secret
    // Por ahora dejamos una implementación básica que indica cómo se haría
    console.warn('La eliminación de imágenes requiere credenciales completas de Cloudinary');
    return Promise.resolve();
  },
  
  /**
   * Extrae el ID público de una URL de Cloudinary
   * @param url - URL de Cloudinary
   * @returns ID público extraído de la URL
   */
  getPublicIdFromUrl: (url: string): string | null => {
    // Las URLs de Cloudinary suelen tener el formato:
    // https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/public_id.ext
    try {
      const urlParts = url.split('/');
      // Obtener la última parte y quitar la extensión
      const lastPart = urlParts[urlParts.length - 1];
      return lastPart.split('.')[0];
    } catch (error) {
      console.error('Error al extraer el ID público de la URL:', error);
      return null;
    }
  }
};

export default cloudinaryService;