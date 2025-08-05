// src/services/superAdminService.ts
import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  increment,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lubricentro } from '../types';

/**
 * Servicio especializado para operaciones de superadmin
 * Incluye funciones para edición masiva y gestión avanzada
 */

/**
 * Actualizar múltiples campos de un lubricentro de forma segura
 */
export const updateLubricentroFields = async (
  lubricentroId: string, 
  updates: Partial<Lubricentro>
): Promise<void> => {
  try {
  
    
    const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
    
    // Preparar datos para actualización
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Convertir fechas a objetos Date si son strings
    const dateFields = [
      'subscriptionStartDate',
      'subscriptionEndDate', 
      'billingCycleEndDate',
      'trialEndDate',
      'contractEndDate',
      'lastPaymentDate',
      'nextPaymentDate'
    ];
    
    dateFields.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        updateData[field] = new Date(updateData[field]);
      }
    });
    
    await updateDoc(lubricentroRef, updateData);
    
    console.log('✅ SuperAdmin: Lubricentro actualizado exitosamente');
  } catch (error) {
    console.error('❌ SuperAdmin: Error al actualizar lubricentro:', error);
    throw error;
  }
};

/**
 * Resetear contadores de servicios de un lubricentro
 */
export const resetServiceCounters = async (
  lubricentroId: string,
  newTotalServices?: number
): Promise<void> => {
  try {
    console.log(`🔄 SuperAdmin: Reseteando contadores para ${lubricentroId}`);
    
    const updateData: any = {
      servicesUsed: 0,
      servicesUsedThisMonth: 0,
      updatedAt: serverTimestamp()
    };
    
    if (newTotalServices !== undefined) {
      updateData.totalServicesContracted = newTotalServices;
      updateData.servicesRemaining = newTotalServices;
    }
    
    const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
    await updateDoc(lubricentroRef, updateData);
    
    console.log('✅ SuperAdmin: Contadores reseteados');
  } catch (error) {
    console.error('❌ SuperAdmin: Error al resetear contadores:', error);
    throw error;
  }
};

/**
 * Extender suscripción de un lubricentro
 */
export const extendSubscription = async (
  lubricentroId: string,
  extensionMonths: number,
  updatePaymentStatus: boolean = true
): Promise<void> => {
  try {
    console.log(`📅 SuperAdmin: Extendiendo suscripción ${extensionMonths} meses para ${lubricentroId}`);
    
    const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
    
    // Calcular nueva fecha de vencimiento
    const now = new Date();
    const newEndDate = new Date(now);
    newEndDate.setMonth(newEndDate.getMonth() + extensionMonths);
    
    const updateData: any = {
      subscriptionEndDate: newEndDate,
      billingCycleEndDate: newEndDate,
      contractEndDate: newEndDate,
      updatedAt: serverTimestamp()
    };
    
    if (updatePaymentStatus) {
      updateData.paymentStatus = 'paid';
      updateData.lastPaymentDate = now;
      
      // Agregar entrada al historial de pagos
      updateData.paymentHistory = [
        {
          amount: 0, // Será configurado manualmente
          date: now,
          method: 'superadmin_extension',
          reference: `superadmin_extension_${Date.now()}`
        }
      ];
    }
    
    await updateDoc(lubricentroRef, updateData);
    
    console.log('✅ SuperAdmin: Suscripción extendida exitosamente');
  } catch (error) {
    console.error('❌ SuperAdmin: Error al extender suscripción:', error);
    throw error;
  }
};

/**
 * Cambiar plan de suscripción y ajustar servicios
 */
export const changeLubricentroPlan = async (
  lubricentroId: string,
  newPlan: string,
  newTotalServices: number,
  resetCounters: boolean = false
): Promise<void> => {
  try {
    console.log(`📋 SuperAdmin: Cambiando plan para ${lubricentroId} a ${newPlan}`);
    
    const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
    
    const updateData: any = {
      subscriptionPlan: newPlan,
      totalServicesContracted: newTotalServices,
      updatedAt: serverTimestamp()
    };
    
    if (resetCounters) {
      updateData.servicesUsed = 0;
      updateData.servicesUsedThisMonth = 0;
      updateData.servicesRemaining = newTotalServices;
    } else {
      // Calcular servicios restantes basado en los usados actuales
      // Necesitarías obtener los datos actuales primero
    }
    
    await updateDoc(lubricentroRef, updateData);
    
    console.log('✅ SuperAdmin: Plan cambiado exitosamente');
  } catch (error) {
    console.error('❌ SuperAdmin: Error al cambiar plan:', error);
    throw error;
  }
};

/**
 * Activar/Desactivar lubricentro de forma masiva
 */
export const toggleLubricentroStatus = async (
  lubricentroId: string,
  newStatus: 'activo' | 'inactivo' | 'trial'
): Promise<void> => {
  try {
    console.log(`🔄 SuperAdmin: Cambiando estado de ${lubricentroId} a ${newStatus}`);
    
    const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
    
    const updateData: any = {
      estado: newStatus,
      updatedAt: serverTimestamp()
    };
    
    // Si se activa un lubricentro inactivo, actualizar fechas si es necesario
    if (newStatus === 'activo') {
      const now = new Date();
      updateData.paymentStatus = 'paid';
      updateData.lastPaymentDate = now;
    }
    
    await updateDoc(lubricentroRef, updateData);
    
    console.log('✅ SuperAdmin: Estado cambiado exitosamente');
  } catch (error) {
    console.error('❌ SuperAdmin: Error al cambiar estado:', error);
    throw error;
  }
};

/**
 * Operación masiva: Actualizar múltiples lubricentros a la vez
 */
export const bulkUpdateLubricentros = async (
  updates: Array<{ id: string; data: Partial<Lubricentro> }>
): Promise<void> => {
  try {
    console.log(`🔧 SuperAdmin: Actualizacion masiva de ${updates.length} lubricentros`);
    
    const batch = writeBatch(db);
    
    updates.forEach(({ id, data }) => {
      const lubricentroRef = doc(db, 'lubricentros', id);
      batch.update(lubricentroRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
    console.log('✅ SuperAdmin: Actualización masiva completada');
  } catch (error) {
    console.error('❌ SuperAdmin: Error en actualización masiva:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas avanzadas para el superadmin
 */
export const getSuperAdminStats = async () => {
  try {
    console.log('📊 SuperAdmin: Obteniendo estadísticas avanzadas...');
    
    // Obtener todos los lubricentros
    const lubricentrosSnapshot = await getDocs(collection(db, 'lubricentros'));
    const lubricentros = lubricentrosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lubricentro[];
    
    // Calcular estadísticas
    const stats = {
      totalLubricentros: lubricentros.length,
      activos: lubricentros.filter(l => l.estado === 'activo').length,
      inactivos: lubricentros.filter(l => l.estado === 'inactivo').length,
      enTrial: lubricentros.filter(l => l.estado === 'trial').length,
      
      // Estadísticas de servicios
      totalServiciosContratados: lubricentros.reduce((sum, l) => sum + (l.totalServicesContracted || 0), 0),
      totalServiciosUsados: lubricentros.reduce((sum, l) => sum + (l.servicesUsed || 0), 0),
      serviciosUsadosEsteMes: lubricentros.reduce((sum, l) => sum + (l.servicesUsedThisMonth || 0), 0),
      
      // Estadísticas de pagos
      pagosAlDia: lubricentros.filter(l => l.paymentStatus === 'paid').length,
      pagosPendientes: lubricentros.filter(l => l.paymentStatus === 'pending').length,
      pagosVencidos: lubricentros.filter(l => l.paymentStatus === 'overdue').length,
      
      // Próximos a vencer (7 días)
      proximosAVencer: lubricentros.filter(l => {
        if (!l.subscriptionEndDate) return false;
        const endDate = new Date(l.subscriptionEndDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0;
      }).length,
      
      // Distribución por planes
      distribucionPlanes: lubricentros.reduce((acc, l) => {
        const plan = l.subscriptionPlan || 'Sin Plan';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    console.log('✅ SuperAdmin: Estadísticas calculadas:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ SuperAdmin: Error al obtener estadísticas:', error);
    throw error;
  }
};

/**
 * Función para validar y corregir datos inconsistentes
 */
export const validateAndFixLubricentroData = async (lubricentroId: string): Promise<{
  fixed: boolean;
  issues: string[];
  corrections: string[];
}> => {
  try {
    console.log(`🔍 SuperAdmin: Validando datos de ${lubricentroId}`);
    
    const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
    const lubricentroSnap = await getDoc(lubricentroRef);
    
    if (!lubricentroSnap.exists()) {
      throw new Error('Lubricentro no encontrado');
    }
    
    const data = lubricentroSnap.data() as Lubricentro;
    const issues: string[] = [];
    const corrections: string[] = [];
    const fixes: any = {};
    
    // Validar servicios
    const totalContracted = data.totalServicesContracted || 0;
    const used = data.servicesUsed || 0;
    const remaining = data.servicesRemaining || 0;
    
    if (used + remaining !== totalContracted) {
      issues.push('Inconsistencia en contadores de servicios');
      fixes.servicesRemaining = totalContracted - used;
      corrections.push(`Servicios restantes corregidos: ${fixes.servicesRemaining}`);
    }
    
    // Validar estado vs fechas
    if (data.estado === 'trial' && data.subscriptionEndDate) {
      const now = new Date();
      const endDate = new Date(data.subscriptionEndDate);
      if (endDate < now) {
        issues.push('Período de prueba vencido pero estado aún es trial');
        fixes.estado = 'inactivo';
        corrections.push('Estado cambiado a inactivo por trial vencido');
      }
    }
    
    // Aplicar correcciones si hay
    if (Object.keys(fixes).length > 0) {
      fixes.updatedAt = serverTimestamp();
      await updateDoc(lubricentroRef, fixes);
      corrections.push('Datos corregidos en Firebase');
    }
    
    console.log('✅ SuperAdmin: Validación completada', { issues, corrections });
    
    return {
      fixed: Object.keys(fixes).length > 0,
      issues,
      corrections
    };
    
  } catch (error) {
    console.error('❌ SuperAdmin: Error en validación:', error);
    throw error;
  }
};

export default {
  updateLubricentroFields,
  resetServiceCounters,
  extendSubscription,
  changeLubricentroPlan,
  toggleLubricentroStatus,
  bulkUpdateLubricentros,
  getSuperAdminStats,
  validateAndFixLubricentroData
};