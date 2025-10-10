// src/vite-env.d.ts
/// <reference types="vite/client" />

/**
 * Definición de tipos para las variables de entorno de Vite
 * Este archivo le dice a TypeScript qué variables existen
 */

interface ImportMetaEnv {
  // Firebase
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string
  
  // Cloudinary
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
  
  // React App (compatibilidad)
  readonly REACT_APP_FIREBASE_API_KEY: string
  readonly REACT_APP_FIREBASE_AUTH_DOMAIN: string
  readonly REACT_APP_FIREBASE_PROJECT_ID: string
  readonly REACT_APP_FIREBASE_STORAGE_BUCKET: string
  readonly REACT_APP_FIREBASE_MESSAGING_SENDER_ID: string
  readonly REACT_APP_FIREBASE_APP_ID: string
  
  readonly REACT_APP_MERCADOPAGO_PUBLIC_KEY: string
  readonly REACT_APP_BASE_URL: string
  readonly REACT_APP_BACKEND_URL: string
  
  readonly REACT_APP_MERCADOPAGO_SUCCESS_URL: string
  readonly REACT_APP_MERCADOPAGO_FAILURE_URL: string
  readonly REACT_APP_MERCADOPAGO_PENDING_URL: string
  readonly REACT_APP_MERCADOPAGO_NOTIFICATION_URL: string
  
  readonly REACT_APP_APP_VERSION: string
  readonly REACT_APP_ENVIRONMENT: string
  readonly REACT_APP_SIMULATE_PAYMENTS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}