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
  DocumentData,
  writeBatch
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


export const getOilChangesByLubricentro = async (
  lubricentroId: string,
  pageSize: number = 20,
  lastVisible?: QueryDocumentSnapshot<DocumentData>,
  sortBy: 'nroCambio' | 'fechaServicio' | 'createdAt' = 'nroCambio',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{
  oilChanges: OilChange[],
  lastVisible: QueryDocumentSnapshot<DocumentData> | null
}> => {
  try {
    let q;
    
    // Para ordenamiento por número de cambio, usamos createdAt como campo base
    // y luego ordenamos en el cliente
    const orderField = sortBy === 'nroCambio' ? 'createdAt' : 
                      sortBy === 'fechaServicio' ? 'fechaServicio' : 'createdAt';
    
    if (lastVisible) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('lubricentroId', '==', lubricentroId),
        orderBy(orderField, 'desc'), // Siempre desc para mantener consistencia con paginación
        startAfter(lastVisible),
        limit(pageSize)
      );
    } else {
      q = query(
        collection(db, COLLECTION_NAME),
        where('lubricentroId', '==', lubricentroId),
        orderBy(orderField, 'desc'), // Siempre desc para mantener consistencia con paginación
        limit(pageSize)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    let oilChanges = querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
    
    // Ordenamiento adicional en cliente si es necesario
    if (sortBy === 'nroCambio') {
      oilChanges = oilChanges.sort((a, b) => {
        // Extraer número del formato "AP-00005"
        const getNumber = (nroCambio: string) => {
          const parts = nroCambio.split('-');
          return parts.length === 2 ? parseInt(parts[1]) : 0;
        };
        
        const numA = getNumber(a.nroCambio);
        const numB = getNumber(b.nroCambio);
        
        return sortOrder === 'desc' ? numB - numA : numA - numB;
      });
    }
    
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
// ✅ NUEVA FUNCIÓN: Búsqueda en múltiples campos
// Agregar esta función al archivo src/services/oilChangeService.ts

// Búsqueda avanzada de cambios de aceite (múltiples campos)
export const searchOilChangesMultiField = async (
  lubricentroId: string,
  searchTerm: string,
  pageSize: number = 50
): Promise<OilChange[]> => {
  try {
    const term = searchTerm.trim();
    
    if (!term) {
      return [];
    }

       
    // Obtener TODOS los cambios del lubricentro (sin filtros)
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId),
      orderBy('fechaServicio', 'desc'),
      limit(pageSize * 2) // Obtener más para filtrar localmente
    );
    
    const querySnapshot = await getDocs(q);
    const allChanges = querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
    
    // Filtrar localmente por múltiples campos
    const searchLower = term.toLowerCase();
    const searchUpper = term.toUpperCase();
    
    const results = allChanges.filter(change => {
      // Búsqueda por nombre cliente
      const matchesCliente = change.nombreCliente?.toLowerCase().includes(searchLower);
      
      // Búsqueda por dominio (exacta y parcial)
      const matchesDominioExacto = change.dominioVehiculo === searchUpper;
      const matchesDominioParcial = change.dominioVehiculo?.toLowerCase().includes(searchLower);
      
      // Búsqueda por otros campos
      const matchesMarca = change.marcaVehiculo?.toLowerCase().includes(searchLower);
      const matchesModelo = change.modeloVehiculo?.toLowerCase().includes(searchLower);
      const matchesNroCambio = change.nroCambio?.toLowerCase().includes(searchLower);
      
      return matchesCliente || matchesDominioExacto || matchesDominioParcial || 
             matchesMarca || matchesModelo || matchesNroCambio;
    }).slice(0, pageSize);
    
   
    
    return results;
  } catch (error) {
    console.error('Error en búsqueda multi-campo:', error);
    throw error;
  }
};
// Obtener cambios de aceite por vehículo
// Versión de respaldo simple (sin orderBy para evitar problemas de índices)
export const getOilChangesByVehicle = async (dominioVehiculo: string): Promise<OilChange[]> => {
  try {
    const dominio = dominioVehiculo.toUpperCase();
    
    // Consulta simple sin orderBy
    const q = query(
      collection(db, COLLECTION_NAME),
      where('dominioVehiculo', '==', dominio)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Convertir documentos a objetos OilChange
    const results = querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
    
    // ✅ OBTENER INFORMACIÓN DE LUBRICENTROS
    const lubricentroIds = [...new Set(results.map(result => result.lubricentroId))];
    const lubricentrosMap = new Map();
    
    // Obtener información de todos los lubricentros involucrados
    for (const lubricentroId of lubricentroIds) {
      try {
        const lubricentro = await getLubricentroById(lubricentroId);
        lubricentrosMap.set(lubricentroId, lubricentro);
      } catch (error) {
        console.warn(`No se pudo obtener información del lubricentro ${lubricentroId}`);
        lubricentrosMap.set(lubricentroId, { fantasyName: 'Lubricentro' });
      }
    }
    
    // ✅ AGREGAR NOMBRE DEL LUBRICENTRO A CADA RESULTADO
    const resultsWithLubricentro = results.map(result => ({
      ...result,
      fantasyName: lubricentrosMap.get(result.lubricentroId)?.fantasyName || 'Lubricentro',
      lubricentroNombre: lubricentrosMap.get(result.lubricentroId)?.fantasyName || 'Lubricentro'
    }));
    
    // Ordenar manualmente por fecha de servicio (más reciente primero)
    resultsWithLubricentro.sort((a, b) => {
      const dateA = new Date(a.fechaServicio);
      const dateB = new Date(b.fechaServicio);
      return dateB.getTime() - dateA.getTime();
    });
    
    return resultsWithLubricentro;
  } catch (error) {
    console.error('Error al obtener los cambios de aceite del vehículo:', error);
    throw error;
  }
};

// ✅ CORRECCIÓN 4: Función para verificar servicios disponibles
export const canCreateService = async (lubricentroId: string): Promise<{
  canCreate: boolean;
  remaining: number;
  reason?: string;
}> => {
  try {
    const lubricentro = await getLubricentroById(lubricentroId);
    if (!lubricentro) {
      return { canCreate: false, remaining: 0, reason: 'Lubricentro no encontrado' };
    }

    // Verificar estado del lubricentro
    if (lubricentro.estado === 'inactivo') {
      return { canCreate: false, remaining: 0, reason: 'La cuenta está inactiva' };
    }

    // Para lubricentros en trial
    if (lubricentro.estado === 'trial') {
      const trialLimit = 10;
      const usedServices = lubricentro.servicesUsedThisMonth || 0;
      const remaining = Math.max(0, trialLimit - usedServices);
      
      return {
        canCreate: remaining > 0,
        remaining,
        reason: remaining === 0 ? 'Se agotaron los servicios del período de prueba' : undefined
      };
    }

    // Para planes por servicios
    if (lubricentro.totalServicesContracted && lubricentro.totalServicesContracted > 0) {
      const remaining = lubricentro.servicesRemaining || 0;
      
      return {
        canCreate: remaining > 0,
        remaining,
        reason: remaining === 0 ? 'Se agotaron los servicios contratados' : undefined
      };
    }

    // Para planes mensuales ilimitados
    return { canCreate: true, remaining: -1 }; // -1 indica ilimitado
    
  } catch (error) {
    console.error('Error al verificar servicios disponibles:', error);
    return { canCreate: false, remaining: 0, reason: 'Error al verificar disponibilidad' };
  }
};

// ✅ FUNCIÓN CORREGIDA: Crear cambio de aceite Y actualizar contadores del lubricentro
export const createOilChange = async (data: OilChange): Promise<string> => {
  try {
 
    
    // Generar número de cambio si no existe
    if (!data.nroCambio) {
      const lubricentroData = await getLubricentroById(data.lubricentroId);
      if (lubricentroData?.ticketPrefix) {
        data.nroCambio = await getNextOilChangeNumber(data.lubricentroId, lubricentroData.ticketPrefix);
      }
    }
    
    // Preparar datos base
    const baseData = {
      ...data,
      fechaCreacion: data.fechaCreacion || new Date(),
      createdAt: serverTimestamp()
    };
    
    const cleanedData = cleanDataForFirebase(baseData);
    
    // 1. CREAR EL SERVICIO
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedData);
  
    
    // 2. ACTUALIZAR CONTADORES DEL LUBRICENTRO (SOLO SI ES COMPLETO)
    if (baseData.estado === 'completo') {
      try {
      
        
        // Obtener datos actuales del lubricentro
        const currentLubricentro = await getLubricentroById(data.lubricentroId);
        if (currentLubricentro) {
          
          // Calcular nuevos valores
          const currentServicesUsed = currentLubricentro.servicesUsed || 0;
          const currentServicesRemaining = currentLubricentro.servicesRemaining || 0;
          const currentServicesUsedThisMonth = currentLubricentro.servicesUsedThisMonth || 0;
          
          const newServicesUsed = currentServicesUsed + 1;
          const newServicesRemaining = Math.max(0, currentServicesRemaining - 1);
          const newServicesUsedThisMonth = currentServicesUsedThisMonth + 1;
          
          // Preparar datos de actualización
          const updateData: any = {
            servicesUsed: newServicesUsed,
            servicesUsedThisMonth: newServicesUsedThisMonth,
            updatedAt: new Date()
          };
          
          // Solo actualizar servicesRemaining si el lubricentro tiene plan por servicios
          if (currentLubricentro.totalServicesContracted && currentLubricentro.totalServicesContracted > 0) {
            updateData.servicesRemaining = newServicesRemaining;
         
          }
          
          // Actualizar el lubricentro
          await updateLubricentro(data.lubricentroId, updateData);
          
          
        }
        
      } catch (updateError) {
        console.error('⚠️ Error al actualizar contadores del lubricentro:', updateError);
        // No hacer throw aquí para no afectar la creación del servicio
        // El servicio se creó correctamente, solo falló la actualización de contadores
      }
    } else {
      
    }
    
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

    const nroCambio = await getNextOilChangeNumber(data.lubricentroId, lubricentroData.ticketPrefix);
    
    const baseData = {
      ...data,
      nroCambio,
      estado: 'pendiente' as OilChangeStatus,
      fechaCreacion: new Date(),
      fecha: new Date(),
      fechaServicio: new Date(),
      
      // Valores por defecto
      perioricidad_servicio: 6,
      kmProximo: data.kmActuales + 10000,
      fechaProximoCambio: new Date(Date.now() + (6 * 30 * 24 * 60 * 60 * 1000)),
      
      // Datos del aceite - vacíos para completar después
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
    
    // 1. CREAR EL SERVICIO
    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanedData);
  
    
    // 2. ✅ NUEVO: ACTUALIZAR CONTADORES INMEDIATAMENTE PARA SERVICIOS PRECARGADOS
    try {
      
      
      // Obtener datos actuales del lubricentro
      const currentLubricentro = await getLubricentroById(data.lubricentroId);
      if (currentLubricentro) {
        
        // Calcular nuevos valores
        const currentServicesUsed = currentLubricentro.servicesUsed || 0;
        const currentServicesRemaining = currentLubricentro.servicesRemaining || 0;
        const currentServicesUsedThisMonth = currentLubricentro.servicesUsedThisMonth || 0;
        
        const newServicesUsed = currentServicesUsed + 1;
        const newServicesRemaining = Math.max(0, currentServicesRemaining - 1);
        const newServicesUsedThisMonth = currentServicesUsedThisMonth + 1;
        
        // Preparar datos de actualización
        const updateData: any = {
          servicesUsed: newServicesUsed,
          servicesUsedThisMonth: newServicesUsedThisMonth,
          updatedAt: new Date()
        };
        
        // Solo actualizar servicesRemaining si el lubricentro tiene plan por servicios
        if (currentLubricentro.totalServicesContracted && currentLubricentro.totalServicesContracted > 0) {
          updateData.servicesRemaining = newServicesRemaining;
          
        }
        
        // Actualizar el lubricentro
        await updateLubricentro(data.lubricentroId, updateData);
        
       
      }
      
    } catch (updateError) {
      console.error('⚠️ Error al actualizar contadores del lubricentro:', updateError);
      // Si hay error en actualización de contadores, no fallar la creación del servicio
      console.warn('El servicio precargado se creó pero no se pudieron actualizar los contadores');
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error al crear cambio pendiente:', error);
    throw error;
  }
};

// ✅ COMPLETAR CAMBIO DE ACEITE (pasar de pendiente a completo)
// ✅ FUNCIÓN CORREGIDA: Completar cambio de aceite con actualización de contadores
export const completeOilChange = async (
  id: string,
  completionData: {
    fechaServicio: Date;
    marcaAceite: string;
    tipoAceite: string;
    sae: string;
    cantidadAceite: number;
    perioricidad_servicio: number;
    // ... otros campos de completionData
  },
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // ✅ OBTENER EL SERVICIO ACTUAL PARA VERIFICAR SU ESTADO
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) {
      throw new Error('No se encontró el servicio');
    }
    
    const currentService = currentDoc.data();
    const wasAlreadyCompleted = currentService.estado === 'completo';
    const wasPending = currentService.estado === 'pendiente';
    
    // Calcular fechaProximoCambio
    const fechaProximoCambio = new Date(completionData.fechaServicio);
    fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + completionData.perioricidad_servicio);
    
    // Calcular kmProximo
    const kmProximo = (currentService.kmActuales || 0) + 10000;
    
    const updateData = {
      ...completionData,
      estado: 'completo' as OilChangeStatus,
      fechaCompletado: new Date(),
      usuarioCompletado: userId,
      fechaProximoCambio,
      kmProximo,
      updatedAt: serverTimestamp()
    };
    
    // Actualizar el documento
    await updateDoc(docRef, updateData);
    
    // ✅ SOLO ACTUALIZAR CONTADORES SI EL SERVICIO NO ESTABA YA COMPLETO
    // Y NO ERA UN SERVICIO PENDIENTE (porque los pendientes ya actualizaron contadores)
    if (!wasAlreadyCompleted && !wasPending) {

      
      try {
        // Obtener datos actuales del lubricentro
        const currentLubricentro = await getLubricentroById(currentService.lubricentroId);
        if (currentLubricentro) {
          
          // Calcular nuevos valores
          const currentServicesUsed = currentLubricentro.servicesUsed || 0;
          const currentServicesRemaining = currentLubricentro.servicesRemaining || 0;
          const currentServicesUsedThisMonth = currentLubricentro.servicesUsedThisMonth || 0;
          
          const newServicesUsed = currentServicesUsed + 1;
          const newServicesRemaining = Math.max(0, currentServicesRemaining - 1);
          const newServicesUsedThisMonth = currentServicesUsedThisMonth + 1;
          
          // Preparar datos de actualización
          const lubricentroUpdateData: any = {
            servicesUsed: newServicesUsed,
            servicesUsedThisMonth: newServicesUsedThisMonth,
            updatedAt: new Date()
          };
          
          // Solo actualizar servicesRemaining si el lubricentro tiene plan por servicios
          if (currentLubricentro.totalServicesContracted && currentLubricentro.totalServicesContracted > 0) {
            lubricentroUpdateData.servicesRemaining = newServicesRemaining;
      ;
          }
          
          // Actualizar el lubricentro
          await updateLubricentro(currentService.lubricentroId, lubricentroUpdateData);
          
    
        }
        
      } catch (updateError) {
        console.error('⚠️ Error al actualizar contadores del lubricentro:', updateError);
        console.warn('El servicio se completó pero no se pudieron actualizar los contadores');
      }
    } else if (wasPending) {
    
    } else {
    
    }
    
  } catch (error) {
    console.error('❌ Error al completar cambio de aceite:', error);
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

// También agrega esta función al final del archivo para corregir datos inconsistentes
export const fixCreatedAtFields = async (lubricentroId: string) => {
  try {

    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId)
    );
    
    const snapshot = await getDocs(q);
    
    let fixedCount = 0;
    
    // Procesar documentos uno por uno para evitar problemas con batch
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Si createdAt tiene formato inconsistente o no existe
      if (!data.createdAt || (typeof data.createdAt === 'object' && data.createdAt.methodName)) {
        // Usar fechaServicio como createdAt si no hay otro valor válido
        const fallbackDate = data.fechaServicio || data.fecha || new Date();
        
        await updateDoc(docSnap.ref, {
          createdAt: fallbackDate,
          updatedAt: serverTimestamp()
        });
        
        fixedCount++;
      }
    }
    

    return fixedCount;
  } catch (error) {
    console.error('❌ Error al corregir campos createdAt:', error);
    throw error;
  }
};

export const fixCreatedAtFieldsForAll = async (lubricentroId: string): Promise<number> => {
  try {
  
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('lubricentroId', '==', lubricentroId)
    );
    
    const snapshot = await getDocs(q);
    let fixedCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Verificar si createdAt tiene el formato problemático
      if (data.createdAt && 
          typeof data.createdAt === 'object' && 
          data.createdAt._methodName === 'serverTimestamp') {
        
        // Usar fechaServicio como createdAt
        const fallbackDate = data.fechaServicio?.toDate() || 
                            data.fecha?.toDate() || 
                            new Date();
        
        await updateDoc(docSnap.ref, {
          createdAt: fallbackDate,
          updatedAt: new Date()
        });
        
        
        fixedCount++;
      }
    }
    

    return fixedCount;
  } catch (error) {
    console.error('❌ Error al corregir campos createdAt:', error);
    throw error;
  }
};

export const markAsNotified = async (
  oilChangeId: string, 
  userId: string,
  notes?: string
): Promise<void> => {
  try {
    const oilChangeRef = doc(db, 'oilChanges', oilChangeId);
    
    await updateDoc(oilChangeRef, {
      notificado: true,
      fechaNotificacion: new Date(),
      usuarioNotificacion: userId,
      notasNotificacion: notes || '',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error al marcar como notificado:', error);
    throw error;
  }
};

// Función para búsqueda global (sin filtro por lubricentroId)
export const globalSearchOilChanges = async (
  searchTerm: string,
  currentLubricentroId: string,
  pageSize: number = 50
): Promise<Array<OilChange & { lubricentroName: string }>> => {
  try {
    const term = searchTerm.trim();
    
    if (!term) {
      return [];
    }

    
    
    // Consulta GLOBAL (sin filtro de lubricentroId)
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('fechaServicio', 'desc'),
      limit(pageSize * 3) // Más resultados para filtrar
    );
    
    const querySnapshot = await getDocs(q);
    const allChanges = querySnapshot.docs.map(doc => convertFirestoreOilChange(doc));
    
    // Filtrar localmente y excluir el lubricentro actual
    const searchLower = term.toLowerCase();
    const searchUpper = term.toUpperCase();
    
    const results = allChanges.filter(change => {
      // Excluir cambios del propio lubricentro
      if (change.lubricentroId === currentLubricentroId) {
        return false;
      }
      
      // Filtros de búsqueda
      const matchesCliente = change.nombreCliente?.toLowerCase().includes(searchLower);
      const matchesDominioExacto = change.dominioVehiculo === searchUpper;
      const matchesDominioParcial = change.dominioVehiculo?.toLowerCase().includes(searchLower);
      const matchesMarca = change.marcaVehiculo?.toLowerCase().includes(searchLower);
      const matchesModelo = change.modeloVehiculo?.toLowerCase().includes(searchLower);
      const matchesNroCambio = change.nroCambio?.toLowerCase().includes(searchLower);
      
      return matchesCliente || matchesDominioExacto || matchesDominioParcial || 
             matchesMarca || matchesModelo || matchesNroCambio;
    }).slice(0, pageSize);
    
    // Obtener información de los lubricentros
    const uniqueLubricentroIds = [...new Set(results.map(r => r.lubricentroId))];
    const lubricentrosMap = new Map<string, string>();
    
    for (const lubricentroId of uniqueLubricentroIds) {
      try {
        const lubricentro = await getLubricentroById(lubricentroId);
        lubricentrosMap.set(lubricentroId, lubricentro?.fantasyName || 'Lubricentro no disponible');
      } catch (error) {
        lubricentrosMap.set(lubricentroId, 'Lubricentro no encontrado');
      }
    }
    
    // Agregar nombres de lubricentros
    const resultsWithLubricentroInfo = results.map(change => ({
      ...change,
      lubricentroName: lubricentrosMap.get(change.lubricentroId) || 'No disponible'
    }));
    

    
    return resultsWithLubricentroInfo;
  } catch (error) {
    console.error('❌ Error en búsqueda global:', error);
    throw error;
  }
};

// Función para duplicar un cambio de aceite a otro lubricentro
export const duplicateOilChangeToLubricentro = async (
  originalOilChange: OilChange,
  targetLubricentroId: string,
  newOperario: string
): Promise<string> => {
  try {
    console.log('🔄 Duplicando servicio:', originalOilChange.id);
    
    // Obtener datos del lubricentro destino
    const targetLubricentro = await getLubricentroById(targetLubricentroId);
    if (!targetLubricentro) {
      throw new Error('Lubricentro destino no encontrado');
    }
    
    // Generar nuevo número de cambio para el lubricentro destino
       const newNroCambio = await getNextOilChangeNumber(
          targetLubricentroId, 
          targetLubricentro.ticketPrefix || 'SRV'
        );
    
    // Crear el nuevo objeto con los datos del lubricentro destino
    const duplicatedOilChange = {
      // Datos del vehículo y cliente (se mantienen)
      nombreCliente: originalOilChange.nombreCliente,
      celular: originalOilChange.celular,
      marcaVehiculo: originalOilChange.marcaVehiculo,
      modeloVehiculo: originalOilChange.modeloVehiculo,
      dominioVehiculo: originalOilChange.dominioVehiculo,
      tipoVehiculo: originalOilChange.tipoVehiculo,
      añoVehiculo: originalOilChange.añoVehiculo,
      
      // Datos del servicio (se mantienen)
      kmActuales: originalOilChange.kmActuales,
      marcaAceite: originalOilChange.marcaAceite,
      tipoAceite: originalOilChange.tipoAceite,
      sae: originalOilChange.sae,
      cantidadAceite: originalOilChange.cantidadAceite,
      filtroAceite: originalOilChange.filtroAceite,
      filtroAire: originalOilChange.filtroAire,
      filtroHabitaculo: originalOilChange.filtroHabitaculo,
      filtroCombustible: originalOilChange.filtroCombustible,
      observaciones: originalOilChange.observaciones || 'Servicio duplicado desde otro lubricentro',
      
      // Datos del próximo cambio (se mantienen)
    
      perioricidad_servicio: originalOilChange.perioricidad_servicio || 6,
      kmProximo: originalOilChange.kmProximo,
      fechaProximoCambio: originalOilChange.fechaProximoCambio,
      
      // DATOS NUEVOS del lubricentro destino
      lubricentroId: targetLubricentroId,
      nroCambio: newNroCambio,
      nombreOperario: newOperario,
      lubricentroNombre: targetLubricentro.fantasyName,
      
      // Fechas nuevas
      fecha: new Date(),
      fechaServicio: new Date(),
      fechaCreacion: new Date(),
      fechaCompletado: new Date(),
      
      // Estado
      estado: 'completo' as OilChangeStatus,
      
      // Metadatos
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      duplicatedFrom: originalOilChange.id, // Referencia al original
      duplicatedFromLubricentro: originalOilChange.lubricentroId
    };
    
    // Crear el nuevo documento
    const docRef = await addDoc(collection(db, COLLECTION_NAME), duplicatedOilChange);
    

    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error al duplicar servicio:', error);
    throw error;
  }
};

/**
 * Eliminar un cambio de aceite definitivamente
 * SOLO para superadmin - elimina el registro completamente de Firebase
 */
export const deleteOilChange = async (oilChangeId: string): Promise<void> => {
  try {
    console.log(`🗑️ Eliminando servicio: ${oilChangeId}`);
    
    // Obtener el documento antes de eliminar para actualizar contadores si es necesario
    const docRef = doc(db, COLLECTION_NAME, oilChangeId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('El servicio no existe');
    }
    
    const oilChangeData = docSnap.data();
    const lubricentroId = oilChangeData.lubricentroId;
    
    // Eliminar el documento
    await deleteDoc(docRef);
    
    // Actualizar contadores del lubricentro si es necesario
    if (lubricentroId) {
      const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
      const lubricentroSnap = await getDoc(lubricentroRef);
      
      if (lubricentroSnap.exists()) {
        const lubricentroData = lubricentroSnap.data();
        
        // Actualizar el contador de servicios usados si el servicio estaba completo
        if (oilChangeData.estado === 'completo' || oilChangeData.estado === 'enviado') {
          const updates: any = {
            updatedAt: serverTimestamp()
          };
          
          // Decrementar servicios usados
          if (lubricentroData.servicesUsed > 0) {
            updates.servicesUsed = lubricentroData.servicesUsed - 1;
            updates.servicesRemaining = (lubricentroData.servicesRemaining || 0) + 1;
          }
          
          // Decrementar servicios usados este mes si corresponde
          const serviceDate = oilChangeData.fechaServicio instanceof Date 
            ? oilChangeData.fechaServicio 
            : oilChangeData.fechaServicio?.toDate?.() 
            ? oilChangeData.fechaServicio.toDate()
            : new Date();
            
          const currentMonth = new Date().getMonth();
          const serviceMonth = serviceDate.getMonth();
          
          if (currentMonth === serviceMonth && lubricentroData.servicesUsedThisMonth > 0) {
            updates.servicesUsedThisMonth = lubricentroData.servicesUsedThisMonth - 1;
          }
          
          await updateDoc(lubricentroRef, updates);
        }
      }
    }
    
    console.log(`✅ Servicio ${oilChangeId} eliminado correctamente`);
  } catch (error) {
    console.error('❌ Error al eliminar servicio:', error);
    throw error;
  }
};

/**
 * Eliminar múltiples cambios de aceite
 * Versión batch para eliminar varios servicios de manera eficiente
 */
export const deleteBatchOilChanges = async (oilChangeIds: string[]): Promise<void> => {
  try {
    console.log(`🗑️ Eliminando ${oilChangeIds.length} servicios...`);
    
    const batch = writeBatch(db);
    
    for (const id of oilChangeIds) {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.delete(docRef);
    }
    
    await batch.commit();
    
    console.log(`✅ ${oilChangeIds.length} servicios eliminados correctamente`);
  } catch (error) {
    console.error('❌ Error al eliminar servicios en batch:', error);
    throw error;
  }
};