// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// ============================================
// CONFIGURACIÓN DE FIREBASE CON VARIABLES DE ENTORNO
// ============================================

// Detectar si estamos usando Vite o Create React App
const getEnvVar = (key: string): string => {
  // Vite usa import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || '';
  }
  
  // Create React App usa process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  
  console.error(`Variable de entorno ${key} no encontrada`);
  return '';
};

// Configuración de Firebase
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || getEnvVar('REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || getEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || getEnvVar('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || getEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || getEnvVar('REACT_APP_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || getEnvVar('REACT_APP_FIREBASE_MEASUREMENT_ID')
};

// Validar configuración
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('❌ Configuración de Firebase incompleta. Campos faltantes:', missingFields);
    console.error('Verifica tu archivo .env.local');
    return false;
  }
  
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

// Log de inicialización (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Firebase inicializado correctamente');
  console.log('📋 Project ID:', firebaseConfig.projectId);
}