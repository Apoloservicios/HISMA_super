// src/services/oilChangeService.ts - CORRECCIÓN FINAL PARA ERRORES FIREBASE
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
  
  return new Date();
};

// ✅ NUEVA FUNCIÓN: Limpiar datos para Firebase (eliminar undefined y null)
const cleanDataForFirebase = (data: any): any => {
  const cleanData: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Solo incluir valores que no sean undefined o null
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && value instanceof Date) {
        // Mantener fechas como están
        cleanData[key] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Limpiar objetos anidados recursivamente
        const cleanedNested = cleanDataForFirebase(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleanData[key] = cleanedNested;
        }
      } else {
        // Incluir valores primitivos válidos
        cleanData[key] = value;
      }
    }
  }
  
  return cleanData;
};

// Validar datos para duplicación
const validateDataForCloning = (data: Partial<OilChange>): string[] => {
  const errors: string[] = [];
  
  if (!data.kmActuales || data.kmActuales <= 0) {
    errors.push('El kilometraje actual es obligatorio y debe ser mayor a 0');
  }
  
  if (!data.fechaServicio || data.fechaServicio > new Date()) {
    errors.push('La fecha de servicio no puede ser futura');
  }
  
  if (!data.nombreCliente?.trim()) {
    errors.push('El nombre del cliente es obligatorio');
  }
  
  if (!data.dominioVehiculo?.trim()) {
    errors.push('El dominio del vehículo es obligatorio');
  }
  
  if (!data.marcaAceite?.trim() || !data.tipoAceite?.trim() || !data.sae?.trim()) {
    errors.push('Los datos del aceite son obligatorios');
  }
  
  return errors;
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

// Búsqueda de cambios de aceite
export const searchOilChanges = async (
  lubricentroId: string,
  searchType: 'cliente' | 'dominio',
  searchTerm: string,
  pageSize: number = 20
): Promise<OilChange[]> => {
  try {
    const field = searchType === 'cliente' ? 'nombreCliente' : 'dominioVehiculo';
    const term = searchTerm.trim();
    
    if (!term) {
      return [];
    }
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      orderBy(field),
      limit(pageSize * 5)
    );
    
    const querySnapshot = await getDocs(q);
    
    const oilChanges = querySnapshot.docs
      .map(doc => convertFirestoreOilChange(doc))
      .filter(oilChange => {
        const fieldValue = searchType === 'cliente' 
          ? oilChange.nombreCliente.toLowerCase() 
          : oilChange.dominioVehiculo.toLowerCase();
        
        return fieldValue.includes(term.toLowerCase());
      })
      .slice(0, pageSize);
    
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
    const startDate = new Date();
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

// Obtener cambios de aceite por vehículo
export const getOilChangesByVehicle = async (dominioVehiculo: string): Promise<OilChange[]> => {
  try {
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

// ✅ FUNCIÓN CORREGIDA: Crear cambio de aceite sin errores de Firebase
export const createOilChange = async (data: Omit<OilChange, 'id' | 'createdAt'>): Promise<string> => {
  try {
    
    // Validar si es duplicación
    const isDuplication = data.nroCambio && data.nroCambio.includes('-');
    if (isDuplication) {
      const validationErrors = validateDataForCloning(data);
      if (validationErrors.length > 0) {
        throw new Error(`Errores de validación: ${validationErrors.join(', ')}`);
      }
    }
    
    // Verificar lubricentro
    const lubricentro = await getLubricentroById(data.lubricentroId);
    if (!lubricentro) {
      throw new Error('No se encontró el lubricentro');
    }

    // Verificar estado del lubricentro
    if (lubricentro.estado === 'inactivo') {
      throw new Error('El lubricentro no tiene una suscripción activa.');
    }

    // Verificar período de prueba
    if (lubricentro.estado === 'trial' && lubricentro.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(lubricentro.trialEndDate);
      
      if (trialEnd < now) {
        throw new Error('El período de prueba ha expirado.');
      }
    }

    // Verificar límites de prueba
    if (lubricentro.estado === 'trial') {
      const trialServiceLimit = 10;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentServices = lubricentro.servicesUsedThisMonth || 0;
      
      if (currentServices >= trialServiceLimit) {
        throw new Error(`Has alcanzado el límite de ${trialServiceLimit} servicios durante el período de prueba.`);
      }
      
      // Actualizar contador
      await updateLubricentro(data.lubricentroId, {
        servicesUsedThisMonth: currentServices + 1,
        servicesUsedHistory: {
          ...(lubricentro.servicesUsedHistory || {}),
          [currentMonth]: ((lubricentro.servicesUsedHistory || {})[currentMonth] || 0) + 1
        }
      });
    } else {
      // Para lubricentros activos
      const canCreateService = await incrementServiceCount(data.lubricentroId);
      if (!canCreateService) {
        throw new Error('Has alcanzado el límite mensual de servicios.');
      }
    }
    
    // ✅ CORRECCIÓN CRÍTICA: Preparar datos limpios para Firebase
    const dominioVehiculo = data.dominioVehiculo.toUpperCase();
    const fechaServicio = ensureDateObject(data.fechaServicio);
    const fechaProximoCambio = new Date(fechaServicio);
    fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + data.perioricidad_servicio);
    
    // Calcular kmProximo si es inválido
    let kmProximo = data.kmProximo;
    if (!kmProximo || kmProximo <= data.kmActuales) {
      kmProximo = data.kmActuales + 10000;
    }
    
    // ✅ PREPARAR DATOS SEGUROS PARA FIREBASE
    const baseData = {
      lubricentroId: data.lubricentroId,
      lubricentroNombre: data.lubricentroNombre || '',
      fecha: new Date(),
      fechaServicio: fechaServicio,
      nroCambio: data.nroCambio,
      nombreCliente: data.nombreCliente,
      celular: data.celular || '',
      
      // Datos del vehículo
      dominioVehiculo: dominioVehiculo,
      marcaVehiculo: data.marcaVehiculo,
      modeloVehiculo: data.modeloVehiculo,
      tipoVehiculo: data.tipoVehiculo,
      añoVehiculo: data.añoVehiculo || null,
      kmActuales: data.kmActuales,
      kmProximo: kmProximo,
      perioricidad_servicio: data.perioricidad_servicio,
      fechaProximoCambio: fechaProximoCambio,
      
      // Datos del aceite
      marcaAceite: data.marcaAceite,
      tipoAceite: data.tipoAceite,
      sae: data.sae,
      cantidadAceite: data.cantidadAceite,
      
      // Filtros y servicios (usar false como default para booleanos)
      filtroAceite: data.filtroAceite || false,
      filtroAceiteNota: data.filtroAceiteNota || '',
      filtroAire: data.filtroAire || false,
      filtroAireNota: data.filtroAireNota || '',
      filtroHabitaculo: data.filtroHabitaculo || false,
      filtroHabitaculoNota: data.filtroHabitaculoNota || '',
      filtroCombustible: data.filtroCombustible || false,
      filtroCombustibleNota: data.filtroCombustibleNota || '',
      aditivo: data.aditivo || false,
      aditivoNota: data.aditivoNota || '',
      refrigerante: data.refrigerante || false,
      refrigeranteNota: data.refrigeranteNota || '',
      diferencial: data.diferencial || false,
      diferencialNota: data.diferencialNota || '',
      caja: data.caja || false,
      cajaNota: data.cajaNota || '',
      engrase: data.engrase || false,
      engraseNota: data.engraseNota || '',
      
      // Observaciones y operario
      observaciones: data.observaciones || '',
      nombreOperario: data.nombreOperario,
      operatorId: data.operatorId,
      
      // Timestamp
      createdAt: serverTimestamp()
    };
    
    // ✅ LIMPIAR DATOS ANTES DE ENVIAR A FIREBASE
    const cleanedData = cleanDataForFirebase(baseData);
    
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedData);
    
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al crear el cambio de aceite:', error);
    throw error;
  }
};

// Actualizar cambio de aceite
export const updateOilChange = async (id: string, data: Partial<OilChange>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const updateData: any = { ...data };
    
    if (data.dominioVehiculo) {
      updateData.dominioVehiculo = data.dominioVehiculo.toUpperCase();
    }
    
    if (data.fechaServicio) {
      updateData.fechaServicio = ensureDateObject(data.fechaServicio);
    }
    
    // Recalcular fechaProximoCambio si es necesario
    if (data.fechaServicio || data.perioricidad_servicio) {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('El cambio de aceite no existe');
      }
      
      const currentData = docSnap.data();
      
      let fechaServicioToUse;
      if (data.fechaServicio) {
        fechaServicioToUse = ensureDateObject(data.fechaServicio);
      } else {
        try {
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
      
      const fechaProximoCambio = new Date(fechaServicioToUse);
      fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + perioricidad);
      
      updateData.fechaProximoCambio = fechaProximoCambio;
    }
    
    // Limpiar datos no permitidos
    const { id: _, createdAt: __, lubricentroId: ___, ...cleanData } = updateData;
    
    // ✅ LIMPIAR DATOS ANTES DE ACTUALIZAR
    const finalData = cleanDataForFirebase({
      ...cleanData,
      updatedAt: serverTimestamp()
    });
    
    await updateDoc(docRef, finalData);
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

// Generar próximo número de cambio
export const getNextOilChangeNumber = async (lubricentroId: string, prefix: string): Promise<string> => {
  try {
    
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
      const newNumber = `${prefix}-00001`;
      return newNumber;
    }
    
    const lastOilChange = querySnapshot.docs[0].data() as unknown as OilChange;
    const lastNumber = lastOilChange.nroCambio;
    
    
    const parts = lastNumber.split('-');
    if (parts.length !== 2) {
      console.warn(`⚠️ Formato inesperado: ${lastNumber}`);
      return `${prefix}-00001`;
    }
    
    const numericPart = parts[1];
    const nextNumber = (parseInt(numericPart) + 1).toString().padStart(5, '0');
    const newNumber = `${prefix}-${nextNumber}`;
    
    return newNumber;
  } catch (error) {
    console.error('❌ Error al generar número:', error);
    const timestamp = Date.now().toString().slice(-5);
    const fallbackNumber = `${prefix}-${timestamp}`;
    return fallbackNumber;
  }
};

// Obtener estadísticas
export const getOilChangesStats = async (lubricentroId: string): Promise<OilChangeStats> => {
  try {
    const qTotal = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId)
    );
    const totalSnapshot = await getDocs(qTotal);
    const total = totalSnapshot.size;
    
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const qThisMonth = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('fecha', '>=', firstDayThisMonth),
      where('fecha', '<=', lastDayThisMonth)
    );
    const thisMonthSnapshot = await getDocs(qThisMonth);
    const thisMonth = thisMonthSnapshot.size;
    
    const qLastMonth = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('fecha', '>=', firstDayLastMonth),
      where('fecha', '<=', lastDayLastMonth)
    );
    const lastMonthSnapshot = await getDocs(qLastMonth);
    const lastMonth = lastMonthSnapshot.size;
    
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
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};

// Obtener cambios por operador
export const getOilChangesByOperator = async (
  operatorId: string,
  lubricentroId: string,
  startDate: Date,
  endDate: Date
): Promise<OilChange[]> => {
  try {
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
    console.error('Error al obtener cambios por operador:', error);
    throw error;
  }
};