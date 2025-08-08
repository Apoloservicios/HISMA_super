// src/services/lubricentroService.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Lubricentro, LubricentroStatus } from '../types';

const COLLECTION_NAME = 'lubricentros';

// Convertir datos de Firestore a nuestro tipo Lubricentro
const convertFirestoreLubricentro = (doc: any): Lubricentro => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    trialEndDate: data.trialEndDate?.toDate(),
    subscriptionStartDate: data.subscriptionStartDate?.toDate(),
    subscriptionEndDate: data.subscriptionEndDate?.toDate(),
    contractEndDate: data.contractEndDate?.toDate(),
    billingCycleEndDate: data.billingCycleEndDate?.toDate(),
    lastPaymentDate: data.lastPaymentDate?.toDate(),
    nextPaymentDate: data.nextPaymentDate?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    paymentHistory: data.paymentHistory?.map((payment: any) => ({
      ...payment,
      date: payment.date?.toDate() || new Date()
    })) || []
  } as Lubricentro;
};

// Función para crear lubricentro - VERSIÓN SIMPLIFICADA Y CORREGIDA
export const createLubricentro = async (
  data: Omit<Lubricentro, 'id' | 'createdAt'>, 
  ownerId: string
): Promise<string> => {
  try {
    
    // Validar datos obligatorios
    if (!data.fantasyName?.trim()) throw new Error('Nombre del lubricentro es obligatorio');
    if (!data.responsable?.trim()) throw new Error('Responsable legal es obligatorio');
    if (!data.domicilio?.trim()) throw new Error('Domicilio es obligatorio');
    if (!data.cuit?.trim()) throw new Error('CUIT es obligatorio');
    if (!data.phone?.trim()) throw new Error('Teléfono es obligatorio');
    if (!data.email?.trim()) throw new Error('Email es obligatorio');
    if (!data.ticketPrefix?.trim()) throw new Error('Prefijo de ticket es obligatorio');
    if (!ownerId?.trim()) throw new Error('Owner ID es obligatorio');
    
    // Calcular fecha de fin del período de prueba (7 días)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    // Datos limpios y completos para Firestore
    const lubricentroData = {
      // Información básica
      fantasyName: String(data.fantasyName).trim(),
      responsable: String(data.responsable).trim(),
      domicilio: String(data.domicilio).trim(),
      cuit: String(data.cuit).trim().replace(/\D/g, ''), // Solo números
      phone: String(data.phone).trim(),
      email: String(data.email).trim().toLowerCase(),
      ticketPrefix: String(data.ticketPrefix).trim().toUpperCase(),
      
      // Owner y estado
      ownerId: String(ownerId).trim(),
      estado: 'trial' as LubricentroStatus,
      
      // Fechas
      trialEndDate: trialEndDate,
      createdAt: serverTimestamp(),
      
      // Configuración inicial
      location: data.location || {},
      servicesUsedThisMonth: 0,
      activeUserCount: 1,
      servicesUsedHistory: {},
      paymentHistory: [],
      autoRenewal: false
    };
    
    
    // Crear el documento
    const docRef = await addDoc(collection(db, COLLECTION_NAME), lubricentroData);
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error al crear lubricentro:', error);
    throw error;
  }
};

// Función para actualizar lubricentro
export const updateLubricentro = async (id: string, data: Partial<Lubricentro>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Crear objeto sin campos undefined
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    // Solo agregar campos que no sean undefined
    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });
    
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar el lubricentro:', error);
    throw error;
  }
};

// Función para actualizar el estado de un lubricentro
export const updateLubricentroStatus = async (id: string, estado: LubricentroStatus): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      estado,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al actualizar el estado del lubricentro:', error);
    throw error;
  }
};

// Función para obtener lubricentro por ID
export const getLubricentroById = async (id: string): Promise<Lubricentro> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertFirestoreLubricentro(docSnap);
    } else {
      throw new Error('No se encontró el lubricentro');
    }
  } catch (error) {
    console.error('Error al obtener el lubricentro:', error);
    throw error;
  }
};

// Función para obtener todos los lubricentros
export const getAllLubricentros = async (): Promise<Lubricentro[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    return querySnapshot.docs.map(doc => convertFirestoreLubricentro(doc));
  } catch (error) {
    console.error('Error al obtener lubricentros:', error);
    throw error;
  }
};

// Función para obtener lubricentros activos
export const getActiveLubricentros = async (): Promise<Lubricentro[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('estado', 'in', ['activo', 'trial'])
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => convertFirestoreLubricentro(doc));
  } catch (error) {
    console.error('Error al obtener lubricentros activos:', error);
    throw error;
  }
};

// Función para eliminar lubricentro
export const deleteLubricentro = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Obtener datos del lubricentro antes de eliminar para limpiar archivos
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Eliminar logo si existe
      if (data.logoUrl) {
        try {
          const logoRef = ref(storage, `lubricentros/${id}/logo`);
          await deleteObject(logoRef);
        } catch (storageError) {
          console.warn('Error al eliminar logo del storage:', storageError);
        }
      }
    }
    
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error al eliminar el lubricentro:', error);
    throw error;
  }
};

// Función para subir logo del lubricentro
export const uploadLubricentroLogo = async (
  lubricentroId: string, 
  file: File
): Promise<string> => {
  try {
    // Crear referencia al archivo en Storage
    const storageRef = ref(storage, `lubricentros/${lubricentroId}/logo`);
    
    // Subir archivo
    const snapshot = await uploadBytes(storageRef, file);
    
    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Actualizar documento del lubricentro con la URL del logo
    await updateLubricentro(lubricentroId, {
      logoUrl: downloadURL
    });
    
    return downloadURL;
  } catch (error) {
    console.error('Error al subir logo del lubricentro:', error);
    throw error;
  }
};

// Función para verificar y actualizar lubricentros con período de prueba vencido
export const checkForExpiredTrials = async (): Promise<Lubricentro[]> => {
  try {
    const now = new Date();
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('estado', '==', 'trial')
    );
    
    const querySnapshot = await getDocs(q);
    const expiredLubricentros: Lubricentro[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const trialEndDate = data.trialEndDate?.toDate();
      
      if (trialEndDate && trialEndDate < now) {
        const lubricentro = convertFirestoreLubricentro(docSnap);
        expiredLubricentros.push(lubricentro);
        
        // Actualizar el estado a inactivo
        await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
          estado: 'inactivo',
          updatedAt: serverTimestamp()
        });
      }
    }
    
    return expiredLubricentros;
  } catch (error) {
    console.error('Error al verificar lubricentros con periodo de prueba expirado:', error);
    throw error;
  }
};

// Función para extender período de prueba (solo para superadmin)
export const extendTrialPeriod = async (id: string, days: number): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('No se encontró el lubricentro');
    }
    
    const lubricentro = convertFirestoreLubricentro(docSnap);
    
    // Calcular nueva fecha de fin de prueba
    const currentTrialEnd = lubricentro.trialEndDate || new Date();
    const newTrialEnd = new Date(currentTrialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + days);
    
    // Actualizar estado y fecha de fin de prueba
    await updateDoc(docRef, {
      estado: 'trial',
      trialEndDate: newTrialEnd,
      // Reiniciar contador de servicios si se extiende el período
      servicesUsedThisMonth: 0,
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error al extender el período de prueba:', error);
    throw error;
  }
};

// Función para obtener estadísticas de uso durante el período de prueba
export const getTrialUsageStats = async (lubricentroId: string): Promise<{
  servicesUsed: number;
  servicesLimit: number;
  daysRemaining: number;
  canCreateServices: boolean;
}> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    
    if (lubricentro.estado !== 'trial') {
      throw new Error('El lubricentro no está en período de prueba');
    }
    
    const servicesLimit = 10; // Límite de servicios en período de prueba
    const servicesUsed = lubricentro.servicesUsedThisMonth || 0;
    
    // Calcular días restantes
    const now = new Date();
    const trialEnd = lubricentro.trialEndDate ? new Date(lubricentro.trialEndDate) : now;
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const canCreateServices = servicesUsed < servicesLimit && daysRemaining > 0;
    
    return {
      servicesUsed,
      servicesLimit,
      daysRemaining,
      canCreateServices
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de uso de prueba:', error);
    throw error;
  }
};

// Función para obtener lubricentros por estado
export const getLubricentrosByStatus = async (estado: LubricentroStatus): Promise<Lubricentro[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('estado', '==', estado),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => convertFirestoreLubricentro(doc));
  } catch (error) {
    console.error(`Error al obtener lubricentros con estado ${estado}:`, error);
    throw error;
  }
};

// Función para buscar lubricentros por nombre o CUIT
export const searchLubricentros = async (searchTerm: string): Promise<Lubricentro[]> => {
  try {
    const term = searchTerm.trim().toLowerCase();
    
    if (!term) {
      return [];
    }
    
    // Obtener todos los lubricentros y filtrar en el cliente
    // (Firestore no soporta búsqueda de texto completo nativa)
    const allLubricentros = await getAllLubricentros();
    
    return allLubricentros.filter(lub => 
      lub.fantasyName.toLowerCase().includes(term) ||
      lub.responsable.toLowerCase().includes(term) ||
      lub.cuit.includes(term) ||
      lub.email.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error('Error al buscar lubricentros:', error);
    throw error;
  }
};

/**
 * Obtener lubricentro por subscription ID de MercadoPago
 */
export const getLubricentroBySubscriptionId = async (subscriptionId: string): Promise<Lubricentro | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('subscriptionId', '==', subscriptionId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return convertFirestoreLubricentro(doc);
    
  } catch (error) {
    console.error('Error al obtener lubricentro por subscription ID:', error);
    throw error;
  }
};