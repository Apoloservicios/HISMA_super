// functions/src/subscription.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar la app de Firebase si aún no está inicializada
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function programada para ejecutarse diariamente y verificar
 * el estado de las suscripciones y los períodos de prueba
 */
exports.checkSubscriptionStatus = functions.pubsub
  .schedule('0 0 * * *') // Ejecutar todos los días a medianoche
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const batch = db.batch();
      
      // 1. Verificar períodos de prueba expirados
      const trialQuery = await db.collection('lubricentros')
        .where('estado', '==', 'trial')
        .where('trialEndDate', '<', now)
        .get();
      
     
      trialQuery.forEach(doc => {
        batch.update(doc.ref, { 
          estado: 'inactivo',
          updatedAt: now
        });
      });
      
      // 2. Verificar suscripciones expiradas
      const subscriptionQuery = await db.collection('lubricentros')
        .where('estado', '==', 'activo')
        .where('subscriptionEndDate', '<', now)
        .get();
      
      
      subscriptionQuery.forEach(doc => {
        const data = doc.data();
        
        // Si tiene renovación automática, marcar como pendiente de pago
        if (data.autoRenewal) {
          batch.update(doc.ref, {
            paymentStatus: 'pending',
            updatedAt: now
          });
        } else {
          // Sin renovación automática, desactivar
          batch.update(doc.ref, {
            estado: 'inactivo',
            updatedAt: now
          });
        }
      });
      
      // 3. Verificar ciclos de facturación vencidos
      const billingQuery = await db.collection('lubricentros')
        .where('estado', '==', 'activo')
        .where('billingCycleEndDate', '<', now)
        .get();
      
      
      billingQuery.forEach(doc => {
        const data = doc.data();
        
        // Calcular nueva fecha de fin de ciclo
        const newBillingEnd = new Date();
        const cycleMonths = data.subscriptionRenewalType === 'monthly' ? 1 : 6;
        newBillingEnd.setMonth(newBillingEnd.getMonth() + cycleMonths);
        
        batch.update(doc.ref, {
          billingCycleEndDate: admin.firestore.Timestamp.fromDate(newBillingEnd),
          nextPaymentDate: admin.firestore.Timestamp.fromDate(newBillingEnd),
          paymentStatus: 'pending',
          updatedAt: now
        });
      });
      
      // Ejecutar todas las actualizaciones en lote
      await batch.commit();
      
      
      return null;
    } catch (error) {
      console.error('Error al verificar suscripciones:', error);
      return null;
    }
  });

/**
 * Cloud Function programada para ejecutarse el primer día de cada mes
 * y reiniciar los contadores de servicios mensuales
 */
exports.resetMonthlyServiceCounters = functions.pubsub
  .schedule('0 0 1 * *') // Ejecutar a medianoche el día 1 de cada mes
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      const batch = db.batch();
      
      // Obtener todos los lubricentros
      const lubricentrosRef = db.collection('lubricentros');
      const snapshot = await lubricentrosRef.get();
      
      
      // Reiniciar contador para cada uno
      snapshot.forEach(doc => {
        batch.update(doc.ref, { 
          servicesUsedThisMonth: 0 
        });
      });
      
      await batch.commit();
      return null;
    } catch (error) {
      console.error('Error al reiniciar contadores de servicios:', error);
      return null;
    }
  });

/**
 * Cloud Function para notificar a los lubricentros con pagos próximos
 * Se puede integrar con un sistema de notificaciones por email o SMS
 */
exports.sendPaymentReminders = functions.pubsub
  .schedule('0 9 * * *') // Ejecutar todos los días a las 9 AM
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Fecha límite: 7 días en el futuro
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 7);
      const reminderTimestamp = admin.firestore.Timestamp.fromDate(reminderDate);
      
      // Buscar lubricentros con pagos próximos
      const query = await db.collection('lubricentros')
        .where('nextPaymentDate', '>', now)
        .where('nextPaymentDate', '<=', reminderTimestamp)
        .get();
      
      
      // Aquí se implementaría la lógica para enviar notificaciones
      // por email, SMS, o guardar en una colección de notificaciones
      
      // Ejemplo simplificado: Guardar notificaciones en Firestore
      const notificationsBatch = db.batch();
      
      query.forEach(doc => {
        const lubricentro = doc.data();
        const notificationRef = db.collection('notifications').doc();
        
        notificationsBatch.set(notificationRef, {
          lubricentroId: doc.id,
          lubricentroName: lubricentro.fantasyName,
          type: 'payment_reminder',
          message: `Su próximo pago vence el ${new Date(lubricentro.nextPaymentDate.toDate()).toLocaleDateString()}. Por favor, realice el pago para mantener su suscripción activa.`,
          status: 'pending',
          createdAt: now
        });
      });
      
      await notificationsBatch.commit();
      
      return null;
    } catch (error) {
      console.error('Error al enviar recordatorios de pago:', error);
      return null;
    }
  });