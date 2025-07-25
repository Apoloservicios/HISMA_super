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
import { OilChange, OilChangeStats,OilChangeStatus } from '../types';
import { incrementServiceCount } from './subscriptionService';
import { getLubricentroById, updateLubricentro } from './lubricentroService';


const COLLECTION_NAME = 'cambiosAceite';

// Convertir datos de Firestore a nuestro tipo OilChange
const convertFirestoreOilChange = (doc: any): OilChange => {
  const data = doc.data();
  
  return {
    id: doc.id,
    lubricentroId: data.lubricentroId,
    fecha: convertFirestoreDate(data.fecha),
    nroCambio: data.nroCambio,
    nombreCliente: data.nombreCliente,
    celular: data.celular,
    lubricentroNombre: data.lubricentroNombre,
    
    // ✅ NUEVOS CAMPOS DE ESTADO
    estado: data.estado || 'completo', // Por defecto completo para registros existentes
    fechaCreacion: convertFirestoreDate(data.fechaCreacion) || convertFirestoreDate(data.fecha),
    fechaCompletado: data.fechaCompletado ? convertFirestoreDate(data.fechaCompletado) : undefined,
    fechaEnviado: data.fechaEnviado ? convertFirestoreDate(data.fechaEnviado) : undefined,
    usuarioCreacion: data.usuarioCreacion || data.operatorId,
    usuarioCompletado: data.usuarioCompletado,
    usuarioEnviado: data.usuarioEnviado,
    notasCompletado: data.notasCompletado,
    notasEnviado: data.notasEnviado,
    
    // Datos del vehículo (existentes)
    dominioVehiculo: data.dominioVehiculo,
    marcaVehiculo: data.marcaVehiculo,
    modeloVehiculo: data.modeloVehiculo,
    tipoVehiculo: data.tipoVehiculo,
    añoVehiculo: data.añoVehiculo,
    kmActuales: data.kmActuales,
    kmProximo: data.kmProximo,
    perioricidad_servicio: data.perioricidad_servicio,
    fechaProximoCambio: convertFirestoreDate(data.fechaProximoCambio),
    
    // Datos del servicio (existentes)
    fechaServicio: convertFirestoreDate(data.fechaServicio),
    marcaAceite: data.marcaAceite || '',
    tipoAceite: data.tipoAceite || '',
    sae: data.sae || '',
    cantidadAceite: data.cantidadAceite || 0,
    
    // Filtros y extras (existentes)
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
    
    // Observaciones generales (existentes)
    observaciones: data.observaciones || '',
    
    // Datos del operario (existentes)
    nombreOperario: data.nombreOperario,
    operatorId: data.operatorId,
    
    // Metadata (existentes)
    createdAt: convertFirestoreDate(data.createdAt),
    updatedAt: data.updatedAt ? convertFirestoreDate(data.updatedAt) : undefined
  };
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
    // Verificar lubricentro
    const lubricentro = await getLubricentroById(data.lubricentroId);
    if (!lubricentro) {
      throw new Error('No se encontró el lubricentro');
    }

    // Generar número correlativo si no existe
    const nroCambio = data.nroCambio || await getNextOilChangeNumber(data.lubricentroId, lubricentro.ticketPrefix);
    
    // Calcular fechaProximoCambio si no viene definida
    let fechaProximoCambio = data.fechaProximoCambio;
    if (!fechaProximoCambio) {
      const fecha = ensureDateObject(data.fechaServicio);
      const mesesAgregar = data.perioricidad_servicio || 6;
      fechaProximoCambio = new Date(fecha);
      fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + mesesAgregar);
    }
    
    const baseData = {
      ...data,
      nroCambio,
      
      // ✅ CAMPOS DE ESTADO - Si no vienen definidos, crear como completo
      estado: data.estado || 'completo' as OilChangeStatus,
      fechaCreacion: data.fechaCreacion || new Date(),
      usuarioCreacion: data.usuarioCreacion || data.operatorId,
      
      // Si se está creando como completo, agregar fechas correspondientes
      fechaCompletado: (data.estado === 'completo' || !data.estado) ? new Date() : undefined,
      usuarioCompletado: (data.estado === 'completo' || !data.estado) ? data.operatorId : undefined,
      
      dominioVehiculo: data.dominioVehiculo.toUpperCase(),
      fecha: ensureDateObject(data.fecha),
      fechaServicio: ensureDateObject(data.fechaServicio),
      fechaProximoCambio: ensureDateObject(fechaProximoCambio), // ✅ USAR LA CALCULADA
      
      // Calcular kmProximo si no viene definido
      kmProximo: data.kmProximo || (data.kmActuales + (data.perioricidad_servicio || 6) * 1500),
      
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

// ✅ OBTENER CAMBIOS PENDIENTES (para la sección de pendientes)
export const getPendingOilChanges = async (lubricentroId: string): Promise<OilChange[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('estado', '==', 'pendiente'),
      orderBy('fechaCreacion', 'asc') // Ordenar por orden de creación (como turnos)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
  } catch (error) {
    console.error('Error al obtener cambios pendientes:', error);
    throw error;
  }
};

// ✅ CAMBIAR ESTADO DE UN CAMBIO DE ACEITE
export const updateOilChangeStatus = async (
  id: string, 
  newStatus: OilChangeStatus, 
  userId: string,
  notes?: string
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const now = new Date();
    
    const updateData: any = {
      estado: newStatus,
      updatedAt: serverTimestamp()
    };
    
    // Agregar campos específicos según el estado
    switch (newStatus) {
      case 'completo':
        updateData.fechaCompletado = now;
        updateData.usuarioCompletado = userId;
        if (notes) updateData.notasCompletado = notes;
        break;
        
      case 'enviado':
        updateData.fechaEnviado = now;
        updateData.usuarioEnviado = userId;
        if (notes) updateData.notasEnviado = notes;
        break;
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error al actualizar estado del cambio de aceite:', error);
    throw error;
  }
};

// ✅ CREAR CAMBIO PRECARGADO (PENDIENTE) - Versión simplificada para mostrador
    export const createPendingOilChange = async (data: {
      lubricentroId: string;
      nombreCliente: string;
      celular?: string;
      dominioVehiculo: string;
      marcaVehiculo: string;
      modeloVehiculo: string;
      tipoVehiculo: string;
      añoVehiculo?: number;
      kmActuales: number;
      observaciones?: string;
      usuarioCreacion: string;
      operatorName: string;
    }): Promise<string> => {
      try {
        // Obtener datos del lubricentro primero
        const lubricentroData = await getLubricentroById(data.lubricentroId);
        if (!lubricentroData) {
          throw new Error('No se encontró el lubricentro');
        }

        // ✅ CORREGIR: Agregar el segundo parámetro (prefix)
        const nroCambio = await getNextOilChangeNumber(data.lubricentroId, lubricentroData.ticketPrefix);
        
        const baseData = {
          ...data,
          nroCambio,
          estado: 'pendiente' as OilChangeStatus,
          fechaCreacion: new Date(),
          fecha: new Date(), // Fecha de registro
          fechaServicio: new Date(), // Se actualizará cuando se complete
          
          // Valores por defecto que se completarán después
          perioricidad_servicio: 6, // 6 meses por defecto
          kmProximo: data.kmActuales + 10000, // +10k km por defecto
          fechaProximoCambio: new Date(Date.now() + (6 * 30 * 24 * 60 * 60 * 1000)), // +6 meses
          
          // Datos del aceite - valores por defecto que se completarán
          marcaAceite: '',
          tipoAceite: '',
          sae: '',
          cantidadAceite: 0,
          
          // Servicios adicionales - todos false inicialmente
          filtroAceite: false,
          filtroAire: false,
          filtroHabitaculo: false,
          filtroCombustible: false,
          aditivo: false,
          refrigerante: false,
          diferencial: false,
          caja: false,
          engrase: false,
          
          // Operario
          nombreOperario: data.operatorName,
          operatorId: data.usuarioCreacion,
          
          // Timestamps
          createdAt: serverTimestamp()
        };
        
        const cleanedData = cleanDataForFirebase(baseData);
        const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedData);
        
        return docRef.id;
      } catch (error) {
        console.error('Error al crear cambio pendiente:', error);
        throw error;
      }
    };

// ✅ COMPLETAR CAMBIO DE ACEITE (pasar de pendiente a completo)
export const completeOilChange = async (
  id: string,
  completionData: {
    fechaServicio: Date;
    marcaAceite: string;
    tipoAceite: string;
    sae: string;
    cantidadAceite: number;
    perioricidad_servicio: number;
    
    // Servicios adicionales
    filtroAceite?: boolean;
    filtroAceiteNota?: string;
    filtroAire?: boolean;
    filtroAireNota?: string;
    filtroHabitaculo?: boolean;
    filtroHabitaculoNota?: string;
    filtroCombustible?: boolean;
    filtroCombustibleNota?: string;
    aditivo?: boolean;
    aditivoNota?: string;
    refrigerante?: boolean;
    refrigeranteNota?: string;
    diferencial?: boolean;
    diferencialNota?: string;
    caja?: boolean;
    cajaNota?: string;
    engrase?: boolean;
    engraseNota?: string;
    
    observaciones?: string;
    notasCompletado?: string;
    usuarioCompletado: string;
  }
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Calcular fecha próximo cambio
    const fechaProximoCambio = new Date(completionData.fechaServicio);
    fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + completionData.perioricidad_servicio);
    
    // Obtener datos actuales para calcular km próximo
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) {
      throw new Error('El cambio de aceite no existe');
    }
    
    const currentData = currentDoc.data();
    const kmProximo = currentData.kmActuales + (completionData.perioricidad_servicio * 1500); // Aproximado 1500km/mes
    
    const updateData = {
      ...completionData,
      estado: 'completo' as OilChangeStatus,
      fechaCompletado: new Date(),
      kmProximo,
      fechaProximoCambio,
      updatedAt: serverTimestamp()
    };
    
    const cleanedData = cleanDataForFirebase(updateData);
    await updateDoc(docRef, cleanedData);
  } catch (error) {
    console.error('Error al completar cambio de aceite:', error);
    throw error;
  }
};

// ✅ OBTENER CAMBIOS POR ESTADO
export const getOilChangesByStatus = async (
  lubricentroId: string,
  status: OilChangeStatus,
  limitCount: number = 50
): Promise<OilChange[]> => {
  try {
      const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      where('estado', '==', status),
      orderBy('fechaCreacion', 'desc'),
      limit(limitCount)  // ← MOVER esta línea DENTRO del query (línea 845 debe ir aquí)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
  } catch (error) {
    console.error(`Error al obtener cambios con estado ${status}:`, error);
    throw error;
  }
};

// ✅ ESTADÍSTICAS DE ESTADOS
export const getOilChangeStatsWithStatus = async (lubricentroId: string) => {
  try {
    const [pendientes, completos, enviados] = await Promise.all([
      getOilChangesByStatus(lubricentroId, 'pendiente', 1000),
      getOilChangesByStatus(lubricentroId, 'completo', 1000),
      getOilChangesByStatus(lubricentroId, 'enviado', 1000)
    ]);
    
    return {
      pendientes: pendientes.length,
      completos: completos.length,
      enviados: enviados.length,
      total: pendientes.length + completos.length + enviados.length
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de estados:', error);
    throw error;
  }
};
// Función para convertir fechas de Firestore
const convertFirestoreDate = (date: any): Date => {
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


// Agregar estas funciones al archivo src/services/oilChangeService.ts


/**
 * Obtener TODOS los cambios de aceite del sistema (solo para superadmin)
 * Esta función permite al superadmin ver servicios de todos los lubricentros
 */
export const getAllOilChangesForSuperAdmin = async (): Promise<OilChange[]> => {
  try {
    
    
    // Query sin filtro de lubricentroId para obtener TODOS los registros
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('fechaServicio', 'desc'),
      limit(1000) // Limitar a 1000 registros para evitar problemas de rendimiento
    );
    
    const querySnapshot = await getDocs(q);
    
    const allServices = querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
    
    
    
    return allServices;
  } catch (error) {
     console.error('❌ Error al obtener todos los servicios:', error);
    throw error;
  }
};

/**
 * Obtener servicios con información del lubricentro incluida
 * Útil para el dashboard del superadmin
 */
export const getOilChangesWithLubricentroInfo = async (limitCount?: number): Promise<Array<OilChange & { lubricentroName: string }>> => {
  try {
   
    
    const q = query(
      collection(db, 'cambiosAceite'),
      orderBy('fechaServicio', 'desc'),
      ...(limitCount ? [limit(limitCount)] : [])
    );
    
    const querySnapshot = await getDocs(q);
    const services = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OilChange));
    
    // Obtener información de todos los lubricentros únicos
    const uniqueLubricentroIds = [...new Set(services.map(s => s.lubricentroId))];
    
    const lubricentrosMap = new Map<string, string>();
    
    for (const lubricentroId of uniqueLubricentroIds) {
      try {
        const lubricentro = await getLubricentroById(lubricentroId);
        if (lubricentro) {
          lubricentrosMap.set(lubricentroId, lubricentro.fantasyName);
        }
      } catch (error) {
        console.warn(`No se pudo obtener información del lubricentro ${lubricentroId}`);
        lubricentrosMap.set(lubricentroId, 'Lubricentro no encontrado');
      }
    }
    
    // Combinar la información
    const servicesWithLubricentroInfo = services.map(service => ({
      ...service,
      lubricentroName: lubricentrosMap.get(service.lubricentroId) || 'No disponible'
    }));
    
   
    
    return servicesWithLubricentroInfo;
  } catch (error) {
    console.error('❌ Error al obtener servicios con información de lubricentro:', error);
    throw error;
  }
};

/**
 * Búsqueda avanzada de servicios para superadmin
 */
export const searchOilChangesForSuperAdmin = async (searchParams: {
  searchTerm?: string;
  lubricentroId?: string;
  estado?: OilChangeStatus;
  startDate?: Date;
  endDate?: Date;
  clientName?: string;
  vehicleDomain?: string;
}): Promise<OilChange[]> => {
  try {
    
    
    let q = query(collection(db, 'cambiosAceite'));
    
    // Filtro por lubricentro si se especifica
    if (searchParams.lubricentroId) {
      q = query(q, where('lubricentroId', '==', searchParams.lubricentroId));
    }
    
    // Filtro por estado si se especifica
    if (searchParams.estado) {
      q = query(q, where('estado', '==', searchParams.estado));
    }
    
    // Filtro por rango de fechas
    if (searchParams.startDate) {
      q = query(q, where('fechaServicio', '>=', Timestamp.fromDate(searchParams.startDate)));
    }
    
    if (searchParams.endDate) {
      q = query(q, where('fechaServicio', '<=', Timestamp.fromDate(searchParams.endDate)));
    }
    
    // Filtro por dominio del vehículo (búsqueda exacta)
    if (searchParams.vehicleDomain) {
      q = query(q, where('dominioVehiculo', '==', searchParams.vehicleDomain.toUpperCase()));
    }
    
    // Ordenar por fecha
    q = query(q, orderBy('fechaServicio', 'desc'));
    
    const querySnapshot = await getDocs(q);
    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OilChange));
    
    // Filtros adicionales que no se pueden hacer directamente en Firestore
    if (searchParams.searchTerm) {
      const searchLower = searchParams.searchTerm.toLowerCase();
      results = results.filter(service =>
        service.nombreCliente?.toLowerCase().includes(searchLower) ||
        service.dominioVehiculo?.toLowerCase().includes(searchLower) ||
        service.marcaVehiculo?.toLowerCase().includes(searchLower) ||
        service.modeloVehiculo?.toLowerCase().includes(searchLower) ||
        service.nroCambio?.toString().includes(searchLower)
      );
    }
    
    if (searchParams.clientName) {
      const clientNameLower = searchParams.clientName.toLowerCase();
      results = results.filter(service =>
        service.nombreCliente?.toLowerCase().includes(clientNameLower)
      );
    }
    
   
    
    return results;
  } catch (error) {
    console.error('❌ Error en búsqueda avanzada de servicios:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas globales para superadmin
 */
export const getGlobalOilChangeStats = async (): Promise<{
  totalServices: number;
  servicesThisMonth: number;
  servicesLastMonth: number;
  pendingServices: number;
  topLubricentros: Array<{ lubricentroId: string; lubricentroName: string; serviceCount: number }>;
  recentActivity: OilChange[];
}> => {
  try {

    
    // Obtener todos los servicios del último año para cálculos
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const q = query(
      collection(db, 'cambiosAceite'),
      where('fechaServicio', '>=', Timestamp.fromDate(oneYearAgo)),
      orderBy('fechaServicio', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const allServices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OilChange));
    
    // Calcular estadísticas
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const servicesThisMonth = allServices.filter(service => {
      const serviceDate = new Date(service.fechaServicio);
      return serviceDate >= currentMonthStart;
    }).length;
    
    const servicesLastMonth = allServices.filter(service => {
      const serviceDate = new Date(service.fechaServicio);
      return serviceDate >= lastMonthStart && serviceDate <= lastMonthEnd;
    }).length;
    
    const pendingServices = allServices.filter(service => service.estado === 'pendiente').length;
    
    // Top lubricentros por cantidad de servicios
    const lubricentroStats = new Map<string, number>();
    allServices.forEach(service => {
      const count = lubricentroStats.get(service.lubricentroId) || 0;
      lubricentroStats.set(service.lubricentroId, count + 1);
    });
    
    // Obtener nombres de lubricentros para el top
    const topLubricentroIds = Array.from(lubricentroStats.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);
    
    const topLubricentros = [];
    for (const lubricentroId of topLubricentroIds) {
      try {
        const lubricentro = await getLubricentroById(lubricentroId);
        topLubricentros.push({
          lubricentroId,
          lubricentroName: lubricentro?.fantasyName || 'No disponible',
          serviceCount: lubricentroStats.get(lubricentroId) || 0
        });
      } catch (error) {
        console.warn(`No se pudo obtener información del lubricentro ${lubricentroId}`);
        topLubricentros.push({
          lubricentroId,
          lubricentroName: 'Lubricentro no encontrado',
          serviceCount: lubricentroStats.get(lubricentroId) || 0
        });
      }
    }
    
    // Actividad reciente (últimos 10 servicios)
    const recentActivity = allServices.slice(0, 10);
    
    const stats = {
      totalServices: allServices.length,
      servicesThisMonth,
      servicesLastMonth,
      pendingServices,
      topLubricentros,
      recentActivity
    };
    

    
    return stats;
  } catch (error) {
    console.error('❌ Error al calcular estadísticas globales:', error);
    throw error;
  }
};

/**
 * Obtener servicios por rango de fechas para reportes
 */
export const getOilChangesByDateRange = async (
  startDate: Date,
  endDate: Date,
  lubricentroId?: string
): Promise<OilChange[]> => {
  try {
 
    
    let q = query(
      collection(db, 'cambiosAceite'),
      where('fechaServicio', '>=', Timestamp.fromDate(startDate)),
      where('fechaServicio', '<=', Timestamp.fromDate(endDate))
    );
    
    // Filtro opcional por lubricentro
    if (lubricentroId) {
      q = query(q, where('lubricentroId', '==', lubricentroId));
    }
    
    q = query(q, orderBy('fechaServicio', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OilChange));
    

    
    return results;
  } catch (error) {
    console.error('❌ Error al obtener servicios por rango de fechas:', error);
    throw error;
  }
};