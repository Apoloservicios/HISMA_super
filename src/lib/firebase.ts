// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// ============================================
// CONFIGURACIÓN DE FIREBASE CON VARIABLES DE ENTORNO
// ============================================

// Función helper para obtener variables de entorno
const getEnvVar = (viteKey: string, reactKey: string): string => {
  // Intenta con Vite primero
  if (import.meta.env && import.meta.env[viteKey]) {
    return import.meta.env[viteKey];
  }
  
  // Fallback a REACT_APP
  if (import.meta.env && import.meta.env[reactKey]) {
    return import.meta.env[reactKey];
  }
  
  console.error(`❌ Variable de entorno no encontrada: ${viteKey} / ${reactKey}`);
  return '';
};

// Configuración de Firebase
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', 'REACT_APP_FIREBASE_MEASUREMENT_ID') || undefined
};

// Validar configuración antes de inicializar
const validateConfig = (): boolean => {
  const requiredFields: (keyof typeof firebaseConfig)[] = [
    'apiKey', 
    'authDomain', 
    'projectId', 
    'storageBucket', 
    'appId'
  ];
  
  const missingFields = requiredFields.filter(
    field => !firebaseConfig[field]
  );
  
  if (missingFields.length > 0) {
    console.error('❌ Configuración de Firebase incompleta');
    console.error('📋 Campos faltantes:', missingFields);
    console.error('💡 Verifica tu archivo .env.local en la raíz del proyecto');
    return false;
  }
  
  console.log('✅ Configuración de Firebase validada');
  return true;
};

// Validar antes de inicializar
if (!validateConfig()) {
  throw new Error('Configuración de Firebase inválida. Verifica las variables de entorno.');
}

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Tipos útiles de Firebase
export type Timestamp = import('firebase/firestore').Timestamp;
export type DocumentReference = import('firebase/firestore').DocumentReference;
export type CollectionReference = import('firebase/firestore').CollectionReference;

// Log de inicialización en desarrollo
if (import.meta.env.DEV) {
  console.log('🔥 Firebase inicializado');
  console.log('📋 Project ID:', firebaseConfig.projectId);
}