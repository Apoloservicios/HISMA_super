// src/components/admin/CouponPaymentActivator.tsx - VERSIÓN CORREGIDA
import React, { useState } from 'react';
import { Card, CardBody, Button, Alert, Spinner } from '../ui';
import { CheckCircleIcon, XCircleIcon, GiftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { validateCouponCode } from '../../services/couponService';

interface CouponPaymentActivatorProps {
  lubricentroId: string;
  onSuccess?: () => void;
  lubricentroInfo?: any;
}

interface CouponValidationResult {
  valid: boolean;
  message: string;
  couponData?: {
    code: string;
    distributorId: string;
    distributorName: string;
    benefits: {
      membershipMonths: number;
      additionalServices?: string[];
      totalServicesContracted?: number; // ✅ NUEVO: Límite de servicios
      unlimitedServices?: boolean;       // ✅ NUEVO: Servicios ilimitados
    };
    expiresAt: Date;
  };
}

const CouponPaymentActivator: React.FC<CouponPaymentActivatorProps> = ({
  lubricentroId,
  onSuccess,
  lubricentroInfo
}) => {
  const [couponCode, setCouponCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<CouponValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validar el cupón
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Por favor ingresa un código de cupón');
      return;
    }

    setValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      // Validar el cupón usando el servicio
      const result = await validateCouponCode(couponCode.toUpperCase().trim());
      
      if (result.valid && result.couponData) {
        setValidationResult(result);
      } else {
        setError(result.message || 'El cupón no es válido');
      }
    } catch (err: any) {
      console.error('Error validando cupón:', err);
      setError('Error al validar el cupón. Por favor intenta nuevamente.');
    } finally {
      setValidating(false);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Activar la membresía con el cupón
  const handleActivateWithCoupon = async () => {
    if (!validationResult?.couponData) {
      setError('Por favor valida el cupón primero');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await runTransaction(db, async (transaction) => {
        // Obtener el cupón
        const couponRef = doc(db, 'coupons', couponCode.toUpperCase().trim());
        const couponDoc = await transaction.get(couponRef);
        
        if (!couponDoc.exists()) {
          throw new Error('El cupón no existe');
        }

        const couponData = couponDoc.data();
        
        // Verificar que el cupón esté activo
        if (couponData.status !== 'active') {
          throw new Error(`El cupón está ${couponData.status === 'used' ? 'usado' : 'expirado'}`);
        }

        // Calcular fecha de expiración de la membresía
        const now = new Date();
        const expirationDate = new Date();
        const monthsToAdd = validationResult.couponData?.benefits?.membershipMonths || 3;
        expirationDate.setMonth(expirationDate.getMonth() + monthsToAdd);

        // ✅ PREPARAR DATOS DE ACTUALIZACIÓN CORREGIDOS
        const lubricentroUpdate: any = {
          subscriptionStatus: 'active',
          estado: 'activo', // ✅ Estado activo
          subscriptionStartDate: serverTimestamp(),
          subscriptionEndDate: expirationDate,
          paymentMethod: 'coupon',
          lastPaymentDate: serverTimestamp(),
          
          // ✅ CORRECCIÓN: Información del patrocinador
          sponsorship: {
            distributorId: couponData.distributorId,
            distributorName: couponData.distributorName,
            activatedWith: couponCode.toUpperCase().trim(),
            activatedAt: serverTimestamp(),
            benefits: validationResult.couponData?.benefits || {},
            expiresAt: expirationDate,
            showBranding: true
          },
          
          // ✅ CORRECCIÓN: Configuración de branding
          brandingSettings: {
            showDistributorLogo: true,
            showDistributorMessage: true,
            position: 'footer'
          },
          
          updatedAt: serverTimestamp()
        };

        // ✅ NUEVA LÓGICA: Manejar límites de servicios según el cupón
        const couponBenefits = validationResult.couponData?.benefits;
        
        if (couponBenefits?.unlimitedServices === true) {
          // 🎯 SERVICIOS ILIMITADOS
          console.log('✅ Aplicando servicios ILIMITADOS');
          lubricentroUpdate.subscriptionPlan = 'unlimited';
          lubricentroUpdate.totalServicesContracted = null; // Sin límites
          lubricentroUpdate.servicesRemaining = null;       // Sin límites
          lubricentroUpdate.hasUnlimitedServices = true;
          lubricentroUpdate.servicesUsed = 0;               // Resetear contador
          lubricentroUpdate.servicesUsedThisMonth = 0;      // Resetear contador mensual
          
        } else if (couponBenefits?.totalServicesContracted && couponBenefits.totalServicesContracted > 0) {
          // 🎯 SERVICIOS LIMITADOS (CON CANTIDAD ESPECÍFICA)
          const contractedServices = couponBenefits.totalServicesContracted;
          console.log(`✅ Aplicando ${contractedServices} servicios contratados`);
          
          lubricentroUpdate.subscriptionPlan = `PLAN${contractedServices}`;
          lubricentroUpdate.totalServicesContracted = contractedServices;
          lubricentroUpdate.servicesRemaining = contractedServices;
          lubricentroUpdate.hasUnlimitedServices = false;
          lubricentroUpdate.servicesUsed = 0;               // Resetear contador
          lubricentroUpdate.servicesUsedThisMonth = 0;      // Resetear contador mensual
          
        } else {
          // 🎯 PLAN ESTÁNDAR (por defecto - servicios ilimitados durante membresía)
          console.log('✅ Aplicando plan estándar con servicios ilimitados');
          lubricentroUpdate.subscriptionPlan = 'standard';
          lubricentroUpdate.totalServicesContracted = null; // Sin límites durante membresía activa
          lubricentroUpdate.servicesRemaining = null;
          lubricentroUpdate.hasUnlimitedServices = true;    // Durante la membresía activa
          lubricentroUpdate.servicesUsed = 0;
          lubricentroUpdate.servicesUsedThisMonth = 0;
        }

        console.log('🔄 Datos de actualización:', lubricentroUpdate);

        // Actualizar el lubricentro
        const lubricentroRef = doc(db, 'lubricentros', lubricentroId);
        transaction.update(lubricentroRef, lubricentroUpdate);

        // ✅ Marcar el cupón como usado
        transaction.update(couponRef, {
          status: 'used',
          usedBy: {
            lubricentroId: lubricentroId,
            lubricentroName: lubricentroInfo?.fantasyName || 'N/A',
            usedAt: serverTimestamp(),
            activatedBy: lubricentroInfo?.email || 'N/A'
          },
          updatedAt: serverTimestamp()
        });

        // ✅ Actualizar estadísticas del distribuidor
        const distributorRef = doc(db, 'distributors', couponData.distributorId);
        const distributorDoc = await transaction.get(distributorRef);
        
        if (distributorDoc.exists()) {
          const currentStats = distributorDoc.data().stats || {};
          transaction.update(distributorRef, {
            'stats.totalCouponsUsed': (currentStats.totalCouponsUsed || 0) + 1,
            'stats.activeLubricentros': (currentStats.activeLubricentros || 0) + 1,
            updatedAt: serverTimestamp()
          });
        }

        // ✅ Crear registro de pago/activación
        const paymentRef = doc(collection(db, 'payments'));
        transaction.set(paymentRef, {
          lubricentroId: lubricentroId,
          amount: 0, // Sin costo para el lubricentro
          currency: 'ARS',
          method: 'coupon',
          status: 'completed',
          couponCode: couponCode.toUpperCase().trim(),
          distributorId: couponData.distributorId,
          distributorName: couponData.distributorName,
          membershipMonths: validationResult.couponData?.benefits?.membershipMonths || 3,
          appliedBenefits: {
            membershipMonths: validationResult.couponData?.benefits?.membershipMonths || 3,
            totalServicesContracted: couponBenefits?.totalServicesContracted,
            unlimitedServices: couponBenefits?.unlimitedServices,
            additionalServices: couponBenefits?.additionalServices || []
          },
          createdAt: serverTimestamp(),
          processedAt: serverTimestamp()
        });
      });

      setSuccess(true);
      
      // Llamar al callback de éxito
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }

    } catch (err: any) {
      console.error('Error activando con cupón:', err);
      setError(err.message || 'Error al activar la membresía con el cupón');
    } finally {
      setLoading(false);
    }
  };

  // Reset del formulario
  const handleReset = () => {
    setCouponCode('');
    setValidationResult(null);
    setError(null);
    setSuccess(false);
  };

  // ✅ PANTALLA DE ÉXITO MEJORADA
  if (success) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Membresía Activada con Éxito!
            </h3>
            
            {/* ✅ INFORMACIÓN DETALLADA DE LA ACTIVACIÓN */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm text-green-800">
                <p>
                  <strong>Duración:</strong> {validationResult?.couponData?.benefits?.membershipMonths || 0} meses
                </p>
                
                {validationResult?.couponData?.benefits?.unlimitedServices ? (
                  <p><strong>Servicios:</strong> ✅ Ilimitados durante la membresía</p>
                ) : validationResult?.couponData?.benefits?.totalServicesContracted ? (
                  <p><strong>Servicios contratados:</strong> {validationResult.couponData.benefits.totalServicesContracted}</p>
                ) : (
                  <p><strong>Servicios:</strong> ✅ Ilimitados durante la membresía</p>
                )}
                
                {validationResult?.couponData?.distributorName && (
                  <p><strong>Patrocinado por:</strong> {validationResult.couponData.distributorName}</p>
                )}
              </div>
            </div>
            
            <Button color="primary" onClick={handleReset}>
              Activar Otro Cupón
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <GiftIcon className="h-12 w-12 text-purple-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-gray-900">
              Activar con Cupón
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              ¿Tienes un cupón de tu distribuidor? Úsalo para activar tu membresía sin costo
            </p>
          </div>

          {/* Mensajes de error/éxito */}
          {error && (
            <Alert type="error" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Formulario de cupón */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código del Cupón
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Ej: SHELL-2025-TRI-ABC123"
                  className="flex-1 font-mono px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={validating || loading || !!validationResult}
                />
                {!validationResult ? (
                  <Button
                    color="primary"
                    onClick={handleValidateCoupon}
                    disabled={validating || !couponCode.trim()}
                  >
                    {validating ? (
                      <>
                        <Spinner size="sm" color="white" className="mr-2" />
                        Validando...
                      </>
                    ) : (
                      'Validar'
                    )}
                  </Button>
                ) : (
                  <Button
                    color="secondary"
                    variant="outline"
                    onClick={handleReset}
                  >
                    Cambiar
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Ingresa el código exactamente como te lo proporcionó tu distribuidor
              </p>
            </div>

            {/* ✅ RESULTADO DE VALIDACIÓN MEJORADO */}
            {validationResult && validationResult.valid && validationResult.couponData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-2">
                      ¡Cupón Válido!
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Distribuidor:</span> {validationResult.couponData.distributorName}
                      </p>
                      <p>
                        <span className="font-medium">Duración:</span> {validationResult.couponData.benefits.membershipMonths} meses
                      </p>
                      
                      {/* ✅ MOSTRAR INFORMACIÓN DE SERVICIOS */}
                      {validationResult.couponData.benefits.unlimitedServices ? (
                        <p>
                          <span className="font-medium">Servicios:</span> 
                          <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            ✅ Ilimitados
                          </span>
                        </p>
                      ) : validationResult.couponData.benefits.totalServicesContracted ? (
                        <p>
                          <span className="font-medium">Servicios contratados:</span> 
                          <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {validationResult.couponData.benefits.totalServicesContracted}
                          </span>
                        </p>
                      ) : (
                        <p>
                          <span className="font-medium">Servicios:</span> 
                          <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            ✅ Ilimitados durante membresía
                          </span>
                        </p>
                      )}
                      
                      {validationResult.couponData.benefits.additionalServices && 
                       validationResult.couponData.benefits.additionalServices.length > 0 && (
                        <p>
                          <span className="font-medium">Beneficios adicionales:</span>
                          <br />
                          {validationResult.couponData.benefits.additionalServices.map((service, idx) => (
                            <span key={idx} className="inline-block mt-1 mr-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                              • {service}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-green-200">
                  <Button
                    color="success"
                    className="w-full"
                    onClick={handleActivateWithCoupon}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" color="white" className="mr-2" />
                        Activando membresía...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Activar Membresía Ahora
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              ¿No tienes un cupón?
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                Contacta a tu distribuidor de lubricantes habitual
              </li>
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                Pregunta si tienen cupones disponibles para el sistema HISMA
              </li>
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                También puedes activar tu membresía con MercadoPago o transferencia
              </li>
            </ul>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default CouponPaymentActivator;