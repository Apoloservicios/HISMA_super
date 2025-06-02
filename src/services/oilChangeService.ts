// src/services/oilChangeService.ts
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
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OilChange, OilChangeStats } from '../types';
import { incrementServiceCount } from './subscriptionService';
import { getLubricentroById, updateLubricentro } from './lubricentroService';

const COLLECTION_NAME = 'cambiosAceite';

// Convertir datos de Firestore a nuestro tipo OilChange
const convertFirestoreOilChange = (doc: any): OilChange => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha) || new Date(),
    fechaServicio: data.fechaServicio?.toDate ? data.fechaServicio.toDate() : new Date(data.fechaServicio) || new Date(),
    fechaProximoCambio: data.fechaProximoCambio?.toDate ? data.fechaProximoCambio.toDate() : new Date(data.fechaProximoCambio) || new Date(),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt) || new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined,
  } as OilChange;
};

// Función auxiliar para asegurar que una fecha sea un objeto Date
const ensureDateObject = (date: any): Date => {
  if (!date) return new Date();
  
  if (date instanceof Date) return date;
  
  if (typeof date === 'string') return new Date(date);
  
  if (date.toDate && typeof date.toDate === 'function') {
    try {
      return date.toDate();
    } catch (e) {
      console.warn('Error al convertir Timestamp a Date:', e);
      return new Date();
    }
  }
  
  // Si no se pudo determinar el formato, devolver una nueva fecha
  return new Date();
};

// Obtener cambio de aceite por ID
export const getOilChangeById = async (id: string): Promise<OilChange> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertFirestoreOilChange(docSnap);
    } else {
      throw new Error('No se encontró el cambio de aceite');
    }
  } catch (error) {
    console.error('Error al obtener el cambio de aceite:', error);
    throw error;
  }
};

// Obtener cambio de aceite por número
export const getOilChangeByNumber = async (lubricentroId: string, nroCambio: string): Promise<OilChange | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('nroCambio', '==', nroCambio)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return convertFirestoreOilChange(querySnapshot.docs[0]);
  } catch (error) {
    console.error('Error al obtener el cambio de aceite por número:', error);
    throw error;
  }
};

// Obtener cambios de aceite paginados por lubricentro
export const getOilChangesByLubricentro = async (
  lubricentroId: string,
  pageSize: number = 20,
  lastVisible?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  oilChanges: OilChange[],
  lastVisible: QueryDocumentSnapshot<DocumentData> | null
}> => {
  try {
    let q;
    
    if (lastVisible) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('lubricentroId', '==', lubricentroId),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(pageSize)
      );
    } else {
      q = query(
        collection(db, COLLECTION_NAME),
        where('lubricentroId', '==', lubricentroId),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    const oilChanges = querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
    
    const newLastVisible = querySnapshot.docs.length > 0 
      ? querySnapshot.docs[querySnapshot.docs.length - 1] 
      : null;
    
    return {
      oilChanges,
      lastVisible: newLastVisible
    };
  } catch (error) {
    console.error('Error al obtener los cambios de aceite:', error);
    throw error;
  }
};

// Búsqueda de cambios de aceite (versión mejorada, insensible a mayúsculas/minúsculas)
export const searchOilChanges = async (
  lubricentroId: string,
  searchType: 'cliente' | 'dominio',
  searchTerm: string,
  pageSize: number = 20
): Promise<OilChange[]> => {
  try {
    // Determine si busca por cliente o dominio
    const field = searchType === 'cliente' ? 'nombreCliente' : 'dominioVehiculo';
    const term = searchTerm.trim();
    
    // Si el campo de búsqueda está vacío, devolver una lista vacía
    if (!term) {
      return [];
    }
    
    // Consulta a Firestore
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      orderBy(field),
      limit(pageSize * 5) // Obtenemos más resultados para luego filtrar
    );
    
    const querySnapshot = await getDocs(q);
    
    // Convertir y filtrar resultados
    const oilChanges = querySnapshot.docs
      .map(doc => convertFirestoreOilChange(doc))
      .filter(oilChange => {
        const fieldValue = searchType === 'cliente' 
          ? oilChange.nombreCliente.toLowerCase() 
          : oilChange.dominioVehiculo.toLowerCase();
        
        return fieldValue.includes(term.toLowerCase());
      })
      .slice(0, pageSize); // Limitamos a la cantidad solicitada
    
    return oilChanges;
  } catch (error) {
    console.error('Error al buscar cambios de aceite:', error);
    throw error;
  }
};

// Obtener próximos cambios de aceite
export const getUpcomingOilChanges = async (
  lubricentroId: string,
  daysAhead: number = 30
): Promise<OilChange[]> => {
  try {
    // Calcular la fecha de inicio (hoy)
    const startDate = new Date();
    
    // Calcular la fecha límite (hoy + daysAhead)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('fechaProximoCambio', '>=', startDate),
      where('fechaProximoCambio', '<=', endDate),
      orderBy('fechaProximoCambio', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
  } catch (error) {
    console.error('Error al obtener los próximos cambios de aceite:', error);
    throw error;
  }
};

// Obtener cambios de aceite por vehículo (dominio)
export const getOilChangesByVehicle = async (dominioVehiculo: string): Promise<OilChange[]> => {
  try {
    // Convertir a mayúsculas para estandarizar
    const dominio = dominioVehiculo.toUpperCase();
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('dominioVehiculo', '==', dominio),
      orderBy('fecha', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
  } catch (error) {
    console.error('Error al obtener los cambios de aceite del vehículo:', error);
    throw error;
  }
};

// Crear cambio de aceite con validación de límites de prueba mejorada
export const createOilChange = async (data: Omit<OilChange, 'id' | 'createdAt'>): Promise<string> => {
  try {
    // Obtener información del lubricentro
    const lubricentro = await getLubricentroById(data.lubricentroId);
    
    if (!lubricentro) {
      throw new Error('No se encontró el lubricentro');
    }

    // Verificar estado del lubricentro
    if (lubricentro.estado === 'inactivo') {
      throw new Error('El lubricentro no tiene una suscripción activa. Contacte al administrador para activar su cuenta.');
    }

    // Verificar si el período de prueba ha expirado
    if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(lubricentro.trialEndDate);
      
      if (trialEnd < now) {
        throw new Error('El período de prueba ha expirado. Contacte al soporte para activar su suscripción.');
      }
    }

    // Verificar límites durante el período de prueba
    if (lubricentro.estado === 'trial') {
      const trialServiceLimit = 10; // Límite de servicios en período de prueba
      
      // Contar servicios del mes actual
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      
      if (currentServices >= trialServiceLimit) {
        throw new Error(`Has alcanzado el límite de ${trialServiceLimit} servicios durante el período de prueba. Contacta al soporte para activar tu suscripción y continuar registrando cambios de aceite.`);
      }
      
      // Actualizar contador de servicios usados
      await updateLubricentro(data.lubricentroId, {
        servicesUsedThisMonth: currentServices + 1,
        servicesUsedHistory: {
          ...(lubricentro.servicesUsedHistory || {}),
          [currentMonth]: ((lubricentro.servicesUsedHistory || {})[currentMonth] || 0) + 1
        }
      });
    } else {
      // Para lubricentros activos, verificar límites según plan de suscripción
      const canCreateService = await incrementServiceCount(data.lubricentroId);
      
      if (!canCreateService) {
        throw new Error('Has alcanzado el límite mensual de servicios según tu plan de suscripción. Contacta al administrador para actualizar tu plan.');
      }
    }
    
    // Asegurarse de que el dominio del vehículo esté en mayúsculas
    const dominioVehiculo = data.dominioVehiculo.toUpperCase();
    
    // Asegurar que fechaServicio sea un objeto Date
    const fechaServicio = ensureDateObject(data.fechaServicio);
    
    // Generar fecha del próximo cambio basado en la periodicidad
    const fechaProximoCambio = new Date(fechaServicio);
    fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + data.perioricidad_servicio);
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      dominioVehiculo,
      fechaServicio,
      fechaProximoCambio,
      fecha: new Date(),
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error al crear el cambio de aceite:', error);
    throw error;
  }
};

// Actualizar cambio de aceite
export const updateOilChange = async (id: string, data: Partial<OilChange>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Asegurarse de que si se actualiza el dominio, esté en mayúsculas
    const updateData: any = { ...data };
    
    if (data.dominioVehiculo) {
      updateData.dominioVehiculo = data.dominioVehiculo.toUpperCase();
    }
    
    // Convertir fechaServicio a Date si existe
    if (data.fechaServicio) {
      updateData.fechaServicio = ensureDateObject(data.fechaServicio);
    }
    
    // Si se actualiza la fecha del servicio o la periodicidad, recalcular la fecha del próximo cambio
    if (data.fechaServicio || data.perioricidad_servicio) {
      // Primero, obtener el documento actual
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('El cambio de aceite no existe');
      }
      
      const currentData = docSnap.data();
      
      // Determinar qué fecha de servicio usar
      let fechaServicioToUse;
      if (data.fechaServicio) {
        fechaServicioToUse = ensureDateObject(data.fechaServicio);
      } else {
        try {
          // Convertir fecha existente al formato adecuado
          if (currentData.fechaServicio && typeof currentData.fechaServicio.toDate === 'function') {
            fechaServicioToUse = currentData.fechaServicio.toDate();
          } else {
            fechaServicioToUse = new Date(currentData.fechaServicio);
          }
        } catch (e) {
          console.warn('Error al convertir fechaServicio existente:', e);
          fechaServicioToUse = new Date();
        }
      }
      
      const perioricidad = data.perioricidad_servicio !== undefined ? data.perioricidad_servicio : currentData.perioricidad_servicio;
      
      // Recalcular fecha del próximo cambio
      const fechaProximoCambio = new Date(fechaServicioToUse);
      fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + perioricidad);
      
      updateData.fechaProximoCambio = fechaProximoCambio;
    }
    
    // Nunca actualizar el ID, createdAt o lubricentroId directamente
    const { id: _, createdAt: __, lubricentroId: ___, ...cleanData } = updateData;
    
    await updateDoc(docRef, {
      ...cleanData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error al actualizar el cambio de aceite:', error);
    throw error;
  }
};

// Eliminar cambio de aceite
export const deleteOilChange = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error al eliminar el cambio de aceite:', error);
    throw error;
  }
};

// Generar el próximo número de cambio
export const getNextOilChangeNumber = async (lubricentroId: string, prefix: string): Promise<string> => {
  try {
    // Obtener el último cambio de aceite para este lubricentro
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('nroCambio', '>=', prefix),
      where('nroCambio', '<=', prefix + '\uf8ff'),
      orderBy('nroCambio', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Si no hay cambios previos, comenzar con 00001
      return `${prefix}-00001`;
    }
    
    const lastOilChange = querySnapshot.docs[0].data() as unknown as OilChange;
    const lastNumber = lastOilChange.nroCambio;
    
    // Extraer el número y aumentarlo en 1
    const numericPart = lastNumber.split('-')[1];
    const nextNumber = (parseInt(numericPart) + 1).toString().padStart(5, '0');
    
    return `${prefix}-${nextNumber}`;
  } catch (error) {
    console.error('Error al generar el próximo número de cambio:', error);
    throw error;
  }
};

// Obtener estadísticas de cambios de aceite
export const getOilChangesStats = async (lubricentroId: string): Promise<OilChangeStats> => {
  try {
    // Obtener estadísticas de todos los cambios
    const qTotal = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId)
    );
    const totalSnapshot = await getDocs(qTotal);
    const total = totalSnapshot.size;
    
    // Fechas para filtrar
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Obtener cambios de este mes
    const qThisMonth = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('fecha', '>=', firstDayThisMonth),
      where('fecha', '<=', lastDayThisMonth)
    );
    const thisMonthSnapshot = await getDocs(qThisMonth);
    const thisMonth = thisMonthSnapshot.size;
    
    // Obtener cambios del mes pasado
    const qLastMonth = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('fecha', '>=', firstDayLastMonth),
      where('fecha', '<=', lastDayLastMonth)
    );
    const lastMonthSnapshot = await getDocs(qLastMonth);
    const lastMonth = lastMonthSnapshot.size;
    
    // Obtener próximos cambios (próximos 30 días)
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    
    const qUpcoming = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('fechaProximoCambio', '>=', now),
      where('fechaProximoCambio', '<=', in30Days)
    );
    const upcomingSnapshot = await getDocs(qUpcoming);
    const upcoming30Days = upcomingSnapshot.size;
    
    return {
      total,
      thisMonth,
      lastMonth,
      upcoming30Days
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de cambios de aceite:', error);
    throw error;
  }
};

/**
 * Obtiene los cambios de aceite realizados por un operador específico
 * @param operatorId - ID del operador
 * @param lubricentroId - ID del lubricentro
 * @param startDate - Fecha de inicio del período
 * @param endDate - Fecha de fin del período
 * @returns Promise con un array de cambios de aceite
 */
export const getOilChangesByOperator = async (
  operatorId: string,
  lubricentroId: string,
  startDate: Date,
  endDate: Date
): Promise<OilChange[]> => {
  try {
    // Consultar cambios de aceite realizados por el operador en el período especificado
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('operatorId', '==', operatorId),
      where('fecha', '>=', startDate),
      where('fecha', '<=', endDate),
      orderBy('fecha', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
  } catch (error) {
    console.error('Error al obtener cambios de aceite por operador:', error);
    throw error;
  }
};