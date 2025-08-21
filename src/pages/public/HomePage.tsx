// src/pages/public/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import bg_h from '../../assets/img/bg_hisma.jpg';
import hismaLogo from '../../assets/img/hisma_logo_horizontal.png';

// ✅ IMPORTAR SERVICIOS PARA CARGAR SOLO PLANES PUBLICADOS
import { getActivePlans } from '../../services/planManagementService';
import { ManagedSubscriptionPlan } from '../../types/subscription';

// Iconos
import {
  ChevronRightIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ArrowRightIcon,
  ChartBarIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

const isPlanByServices = (plan: any) => {
  return plan.planType === 'service' || plan.planType === 'SERVICE';
};

const getDisplayPrice = (plan: any) => {
  if (isPlanByServices(plan)) {
    return {
      price: plan.servicePrice || 0,
      suffix: " (pago único)",
      description: `${plan.totalServices || 0} servicios • ${plan.validityMonths || 6} meses`
    };
  } else {
    return {
      price: plan.price.monthly,
      suffix: "/mes",
      description: plan.price.semiannual ? `$${plan.price.semiannual.toLocaleString('es-AR')}/semestre` : null
    };
  }
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [domain, setDomain] = useState('');
  
  // ✅ ESTADOS PARA PLANES DINÁMICOS
  const [plans, setPlans] = useState<ManagedSubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [errorLoadingPlans, setErrorLoadingPlans] = useState(false);

  // ✅ CARGAR SOLO PLANES PUBLICADOS AL MONTAR EL COMPONENTE
  useEffect(() => {
    const loadPublishedPlans = async () => {
      try {
        setLoadingPlans(true);
        setErrorLoadingPlans(false);
        
        // Cargar solo planes activos desde Firebase
        const activePlans = await getActivePlans();
        
        // ✅ FILTRAR PLANES PUBLICADOS (Compatible con ambas propiedades)
        const publishedPlans = activePlans.filter(plan => {
          const publishOnHomepage = (plan as any).publishOnHomepage;
          const isPublished = (plan as any).isPublished;
          
          // Retornar true si cualquiera es true
          return publishOnHomepage === true || isPublished === true;
        });
        
        // Ordenar planes por displayOrder y luego por precio
        const sortedPlans = publishedPlans.sort((a, b) => {
          // Primero por orden de visualización (si existe)
          const orderA = (a as any).displayOrder || 999;
          const orderB = (b as any).displayOrder || 999;
          
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          
          // Si tienen el mismo orden, ordenar por precio (considerando tipo de plan)
          const priceA = isPlanByServices(a) ? (a as any).servicePrice || 0 : a.price.monthly;
          const priceB = isPlanByServices(b) ? (b as any).servicePrice || 0 : b.price.monthly;
          
          return priceA - priceB;
        });
        
        setPlans(sortedPlans);
        
      } catch (error) {
        console.error('Error al cargar planes:', error);
        setErrorLoadingPlans(true);
        
        // ✅ PLANES DE FALLBACK CON publishOnHomepage = true
        setPlans([
          {
            id: 'starter',
            name: 'Starter',
            description: 'Pensado para el inicio, empezá a olvidarte de las tarjetas físicas, digitaliza tus datos.',
            planType: 'monthly' as any,
            price: { monthly: 13500, semiannual: 70000 },
            maxUsers: 2,
            maxMonthlyServices: 50,
            features: [
              'Reportes y estadísticas',
              'Sistema de notificaciones',
              'Usuarios de sistemas (2 usuarios)',
              'Soporte - mail y Whatsapp',
              'Acceso a app',
              'Límite de servicios mensuales (50)'
            ],
            isActive: true,
            isPublished: true,
            publishOnHomepage: true,
            displayOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            updatedBy: 'system',
            usageCount: 0,
            isDefault: true
          },
          {
            id: 'basic',
            name: 'Plus',
            description: 'Aumentá la capacidad de tu negocio con más usuarios y servicios mensuales.',
            planType: 'monthly' as any,
            price: { monthly: 19500, semiannual: 105000 },
            maxUsers: 4,
            maxMonthlyServices: 150,
            features: [
              'Reportes y estadísticas',
              'Sistema de notificaciones',
              'Usuarios de sistemas (4 usuarios)',
              'Soporte - mail y Whatsapp (prioritario)',
              'Acceso a app',
              'Límite de servicios mensuales (150)'
            ],
            recommended: true,
            isActive: true,
            isPublished: true,
            publishOnHomepage: true,
            displayOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            updatedBy: 'system',
            usageCount: 0,
            isDefault: true
          },
          {
            id: 'premium',
            name: 'Premium',
            description: 'Acceso completo a todas las funcionalidades sin limitaciones de servicios.',
            planType: 'monthly' as any,
            price: { monthly: 26500, semiannual: 145000 },
            maxUsers: 6,
            maxMonthlyServices: null,
            features: [
              'Reportes y estadísticas',
              'Sistema de notificaciones',
              'Usuarios de sistemas (6 usuarios)',
              'Soporte - mail, Whatsapp, Telefónico - Prioritario',
              'Acceso a app',
              'Sin límite de servicios mensuales'
            ],
            isActive: true,
            isPublished: true,
            publishOnHomepage: true,
            displayOrder: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            updatedBy: 'system',
            usageCount: 0,
            isDefault: true
          }
        ] as any);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPublishedPlans();
  }, []);

  // Manejar búsqueda rápida de dominio
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) return;

    // Redirigir a la página de consulta de historial con el dominio como parámetro
    navigate(`/consulta-historial?dominio=${domain.trim().toUpperCase()}`);
  };

  // ✅ FUNCIÓN PARA RENDERIZAR PLANES CON GRID INTELIGENTE
  const renderPlans = () => {
    if (loadingPlans) {
      return (
        <div className="flex justify-center items-center h-64 col-span-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Cargando planes...</span>
        </div>
      );
    }

    if (errorLoadingPlans && plans.length === 0) {
      return (
        <div className="col-span-full text-center py-8">
          <p className="text-gray-500">Error al cargar los planes. Por favor, intente más tarde.</p>
        </div>
      );
    }

    // ✅ Si no hay planes publicados, mostrar mensaje informativo
    if (plans.length === 0) {
      return (
        <div className="col-span-full text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="rounded-full h-16 w-16 bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Planes en preparación
            </h3>
            <p className="text-gray-600 mb-6">
              Estamos trabajando en nuestros planes de suscripción. 
              ¡Pronto tendrás opciones increíbles disponibles!
            </p>
            <a
              href="/register"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Registrate para estar al día
            </a>
          </div>
        </div>
      );
    }

    // Siempre mostrar plan de prueba gratuita primero
    const trialPlan = (
      <div key="trial" className="pricing-card relative border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white hover:shadow-lg transition-shadow duration-300">
        <div className="p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Prueba Gratuita</h3>
          <p className="mt-4 text-sm text-gray-500">
            Ideal para probar el sistema y verificar si cumple con sus necesidades.
          </p>
          <p className="mt-8">
            <span className="text-4xl font-extrabold text-gray-900">$0</span>
            <span className="text-base font-medium text-gray-500">/7 días</span>
          </p>
          <p className="text-sm text-gray-500 mt-2">Prueba completamente gratuita</p>
          <a
            href="/register"
            className="mt-8 block w-full bg-green-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-green-700 transition-colors"
          >
            Comenzar Ahora
          </a>
        </div>
        <div className="pt-6 pb-8 px-6">
          <h4 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
            Lo que incluye
          </h4>
          <ul role="list" className="mt-6 space-y-4">
            {[
              'Acceso completo por 7 días',
              'Hasta 3 usuarios',
              'Hasta 20 servicios',
              'Soporte por email',
              'Sin compromiso'
            ].map((feature) => (
              <li key={feature} className="flex space-x-3">
                <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                <span className="text-sm text-gray-500">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );

    // Renderizar planes dinámicos
    const planCards = plans.map((plan) => {
      const displayPrice = getDisplayPrice(plan);
      const isRecommended = plan.recommended;

      return (
        <div
          key={plan.id}
          className={`pricing-card relative border rounded-lg shadow-sm divide-y divide-gray-200 bg-white hover:shadow-lg transition-shadow duration-300 ${
            isRecommended 
              ? 'border-2 border-green-500 ring-2 ring-green-200' 
              : 'border-gray-200'
          }`}
          style={{ marginTop: isRecommended ? '1rem' : '0' }}
        >
          {isRecommended && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white shadow-lg">
                Recomendado
              </span>
            </div>
          )}
          
          <div className="p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{plan.name}</h3>
            <p className="mt-4 text-sm text-gray-500">
              {plan.description}
            </p>
            
            {/* ✅ PRICING DINÁMICO SEGÚN TIPO DE PLAN */}
            <div className="mt-8">
              <p className="mb-2">
                <span className="text-4xl font-extrabold text-gray-900">
                  ${displayPrice.price.toLocaleString('es-AR')}
                </span>
                <span className="text-base font-medium text-gray-500">{displayPrice.suffix}</span>
              </p>
              
              {/* ✅ DESCRIPCIÓN ADICIONAL */}
              {displayPrice.description && (
                <p className="text-sm text-gray-500">
                  {displayPrice.description}
                </p>
              )}
              
              {/* ✅ INFORMACIÓN ADICIONAL PARA PLANES POR SERVICIOS */}
              {isPlanByServices(plan) && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>💰 ${(displayPrice.price / (plan.totalServices || 1)).toFixed(2)} por servicio</p>
                  <p>⏰ Válido por {plan.validityMonths || 6} meses</p>
                  <p>👥 Hasta {plan.maxUsers} usuarios</p>
                </div>
              )}
              
              {/* ✅ INFORMACIÓN ADICIONAL PARA PLANES MENSUALES */}
              {!isPlanByServices(plan) && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>👥 Hasta {plan.maxUsers} usuarios</p>
                  <p>🔧 {plan.maxMonthlyServices === null ? 'Servicios ilimitados' : `${plan.maxMonthlyServices} servicios/mes`}</p>
                </div>
              )}
            </div>
            
            <a
              href="/register"
              className={`mt-8 block w-full border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center transition-colors ${
                isPlanByServices(plan) 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : isRecommended 
                    ? 'bg-primary-600 hover:bg-primary-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {isPlanByServices(plan) ? 'Comprar Ahora' : 'Elegir Plan'}
            </a>
          </div>
          
          <div className="pt-6 pb-8 px-6">
            <h4 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
              Lo que incluye
            </h4>
            <ul role="list" className="mt-6 space-y-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex space-x-3">
                  <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                  <span className="text-sm text-gray-500">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    });

    return [trialPlan, ...planCards];
  };

  return (
    <>
      <Helmet>
        <title>HISMA - Sistema de Gestión para Lubricentros</title>
        <meta name="description" content="Sistema completo de gestión para lubricentros. Controla cambios de aceite, clientes, inventario y más. Prueba gratuita por 7 días." />
        <meta name="keywords" content="lubricentro, cambio aceite, gestión, sistema, software, Argentina" />
        <meta property="og:title" content="HISMA - Sistema de Gestión para Lubricentros" />
        <meta property="og:description" content="Sistema completo de gestión para lubricentros en Argentina" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* ✅ ESTILOS CSS CORREGIDOS PARA GRID Y WHATSAPP */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* ===== ESTILOS GRID RESPONSIVE MEJORADOS ===== */
            .pricing-container {
              display: grid;
              gap: 1.5rem;
              justify-content: center;
              max-width: 1600px;
              margin: 0 auto;
              padding: 0 1rem;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            }
            
            /* Responsive específico para móviles */
            @media (max-width: 640px) {
              .pricing-container {
                grid-template-columns: 1fr;
                gap: 1rem;
                padding: 0 0.5rem;
              }
              
              .pricing-card {
                max-width: 100%;
              }
            }
            
            /* Tablet */
            @media (min-width: 641px) and (max-width: 1024px) {
              .pricing-container {
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.25rem;
              }
            }
            
            /* Desktop */
            @media (min-width: 1025px) {
              .pricing-container {
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 1.5rem;
              }
            }
            
            /* Limitar máximo de columnas según cantidad de elementos */
            @media (min-width: 1025px) {
              .pricing-container:has(.pricing-card:nth-child(4):last-child) {
                grid-template-columns: repeat(2, 1fr);
              }
              
              .pricing-container:has(.pricing-card:nth-child(5):last-child) {
                grid-template-columns: repeat(3, 1fr);
              }
              
              .pricing-container:has(.pricing-card:nth-child(6)) {
                grid-template-columns: repeat(3, 1fr);
              }
              
              .pricing-container:has(.pricing-card:nth-child(7)) {
                grid-template-columns: repeat(4, 1fr);
              }
            }
            
            /* ===== ESTILOS WHATSAPP BUTTON CORREGIDOS ===== */
            .whatsapp-button {
              position: fixed !important;
              bottom: 20px !important;
              right: 20px !important;
              z-index: 1000 !important;
              background-color: #25D366 !important;
              border-radius: 50px !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
              transition: all 0.3s ease !important;
              padding: 12px 16px !important;
              display: flex !important;
              align-items: center !important;
              text-decoration: none !important;
              min-width: 50px !important;
              min-height: 50px !important;
              max-width: 250px !important;
              color: white !important;
            }
            
            .whatsapp-button:hover {
              background-color: #128C7E !important;
              transform: translateY(-2px) !important;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
              text-decoration: none !important;
              color: white !important;
            }
            
            .whatsapp-icon {
              width: 24px !important;
              height: 24px !important;
              flex-shrink: 0 !important;
              color: white !important;
            }
            
            .whatsapp-text {
              color: white !important;
              font-weight: 500 !important;
              font-size: 14px !important;
              margin-left: 8px !important;
              opacity: 0 !important;
              max-width: 0 !important;
              overflow: hidden !important;
              transition: all 0.3s ease !important;
              white-space: nowrap !important;
            }
            
            .whatsapp-button:hover .whatsapp-text {
              opacity: 1 !important;
              max-width: 150px !important;
            }
            
            /* Responsive para WhatsApp en móvil */
            @media (max-width: 640px) {
              .whatsapp-button {
                bottom: 15px !important;
                right: 15px !important;
                padding: 10px 12px !important;
                min-width: 45px !important;
                min-height: 45px !important;
              }
              
              .whatsapp-icon {
                width: 20px !important;
                height: 20px !important;
              }
              
              .whatsapp-text {
                font-size: 12px !important;
              }
            }
          `
        }} />

        {/* Header */}
        <header className="relative">
          <div className="bg-primary-700 py-4">
            <nav className="relative max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6" aria-label="Global">
              <div className="flex items-center flex-1">
                <div className="flex items-center justify-between w-full md:w-auto">
                  <a href="/">
                    <img
                      className="h-8 w-auto sm:h-10"
                      src={hismaLogo}
                      alt="HISMA"
                    />
                  </a>
                </div>
              </div>
              <div className="hidden md:block md:ml-10 md:pr-4 md:space-x-8">
                <a href="#caracteristicas" className="font-medium text-white hover:text-blue-100">
                  Características
                </a>
                <a href="#planes" className="font-medium text-white hover:text-blue-100">
                  Planes
                </a>
                <a href="/consulta-historial" className="font-medium text-white hover:text-blue-100">
                  Consultar Historial
                </a>
                <a href="/login" className="font-medium text-primary-200 bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-md">
                  Iniciar Sesión
                </a>
              </div>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <main>
          <div 
            className="relative bg-primary-800 overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(rgba(6, 48, 18, 0.8), rgba(7, 187, 181, 0.8)), url(${bg_h})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
                <div className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                  <div className="sm:text-center lg:text-left">
                    <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                      <span className="block xl:inline">Sistema de Gestión</span>{' '}
                      <span className="block text-primary-200 xl:inline">para Lubricentros</span>
                    </h1>
                    <p className="mt-3 text-base text-gray-100 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                      Controla cambios de aceite, gestiona clientes, genera reportes y mejora la eficiencia de tu lubricentro con HISMA.
                    </p>
                    
                    {/* Búsqueda rápida de dominio */}
                    <div className="mt-8 sm:mt-10">
                      <form onSubmit={handleSearchSubmit} className="sm:max-w-xl sm:mx-auto lg:mx-0">
                        <div className="sm:flex">
                          <div className="min-w-0 flex-1">
                            <label htmlFor="domain" className="sr-only">
                              Dominio del vehículo
                            </label>
                            <input
                              id="domain"
                              type="text"
                              className="block w-full border border-transparent rounded-md px-5 py-3 text-base text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:border-transparent focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
                              placeholder="Ingrese dominio del vehículo (ej: ABC123)"
                              value={domain}
                              onChange={(e) => setDomain(e.target.value.toUpperCase())}
                            />
                          </div>
                          <div className="mt-4 sm:mt-0 sm:ml-3">
                            <button
                              type="submit"
                              className="block w-full rounded-md border border-transparent px-5 py-3 bg-yellow-500 text-base font-medium text-gray-900 shadow hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600 sm:px-10"
                            >
                              <MagnifyingGlassIcon className="h-5 w-5 inline-block mr-2" />
                              Buscar Historial
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                      <div className="rounded-md shadow">
                        <a
                          href="/register"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                        >
                          Comenzar Prueba Gratuita
                        </a>
                      </div>
                      <div className="mt-3 sm:mt-0 sm:ml-3">
                        <a
                          href="/login"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
                        >
                          Iniciar Sesión
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Características */}
          <div id="caracteristicas" className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="lg:text-center">
                <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Características</h2>
                <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Todo lo que necesitas para gestionar tu lubricentro
                </p>
                <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                  HISMA te ofrece herramientas completas para optimizar la gestión de tu negocio.
                </p>
              </div>

              <div className="mt-10">
                <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                  <div className="relative">
                    <dt>
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                        <DocumentTextIcon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Control de Cambios de Aceite</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">
                      Registra y gestiona todos los cambios de aceite con información detallada del cliente y vehículo.
                    </dd>
                  </div>

                  <div className="relative">
                    <dt>
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                        <UserIcon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Gestión de Clientes</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">
                      Mantén un registro completo de tus clientes y su historial de servicios.
                    </dd>
                  </div>

                  <div className="relative">
                    <dt>
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                        <ClockIcon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Recordatorios Automáticos</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">
                      Sistema inteligente de notificaciones para próximos cambios de aceite.
                    </dd>
                  </div>

                  <div className="relative">
                    <dt>
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                        <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Reportes y Estadísticas</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">
                      Análisis detallados del rendimiento de tu negocio con reportes personalizables.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Planes de Suscripción */}
          <div id="planes" className="bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="sm:text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  Planes de Suscripción
                </h2>
                <p className="mt-4 text-xl text-gray-600">
                  Elige el plan que mejor se adapte a las necesidades de tu lubricentro
                </p>
              </div>

              {/* ✅ GRID CONTAINER CORREGIDO */}
              <div className="mt-12 pricing-container">
                {renderPlans()}
              </div>
            </div>
          </div>

          {/* Preguntas Frecuentes */}
          <div className="py-12 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  Preguntas Frecuentes
                </h2>
                <p className="mt-4 text-xl text-gray-600">
                  Resolvé tus dudas sobre Hisma
                </p>
              </div>

              <div className="mt-12 space-y-8">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    ¿Necesito conocimientos técnicos para usar Hisma?
                  </h3>
                  <p className="text-gray-600">
                    Para nada. Hisma está diseñado para ser súper fácil de usar. Si sabés usar WhatsApp, vas a poder usar Hisma sin problemas.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    ¿Los precios están en pesos argentinos?
                  </h3>
                  <p className="text-gray-600">
                    Sí, todos nuestros precios están en pesos argentinos. No hay costos ocultos ni sorpresas. Podés pagar con transferencia bancaria o MercadoPago.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    ¿Qué pasa si no me gusta el sistema?
                  </h3>
                  <p className="text-gray-600">
                    Tenés 7 días de prueba gratuita para probar todas las funciones. Si no te convence, simplemente no renovás y listo. Sin compromisos.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    ¿Tienen soporte técnico en Argentina?
                  </h3>
                  <p className="text-gray-600">
                    ¡Por supuesto! Nuestro equipo de soporte está en Argentina y te podés comunicar por WhatsApp, email o teléfono en horario comercial.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="bg-primary-700">
            <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                <span className="block">¿Listo para digitalizar tu lubricentro?</span>
              </h2>
              <p className="mt-4 text-lg leading-6 text-primary-200">
                Únete a cientos de lubricentros que ya confían en HISMA para gestionar su negocio.
              </p>
              <a
                href="/register"
                className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 sm:w-auto"
              >
                Comenzar Ahora
                <ChevronRightIcon className="ml-2 -mr-1 h-5 w-5" />
              </a>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
            <div className="xl:grid xl:grid-cols-3 xl:gap-8">
              <div className="space-y-8 xl:col-span-1">
                <img
                  className="h-10"
                  src={hismaLogo}
                  alt="HISMA"
                />
                <p className="text-gray-300 text-base">
                  Sistema completo de gestión para lubricentros en Argentina.
                </p>
                <div className="flex space-x-6">
                  <a href="#" className="text-gray-400 hover:text-gray-300">
                    <span className="sr-only">Facebook</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">
                      Producto
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      <li>
                        <a href="#caracteristicas" className="text-base text-gray-300 hover:text-white">
                          Características
                        </a>
                      </li>
                      <li>
                        <a href="#planes" className="text-base text-gray-300 hover:text-white">
                          Planes
                        </a>
                      </li>
                      <li>
                        <a href="/consulta-historial" className="text-base text-gray-300 hover:text-white">
                          Consultar Historial
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-12 md:mt-0">
                    <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">
                      Soporte
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      <li>
                        <span className="text-base text-gray-300">
                          📍 San Rafael, Mendoza - Argentina
                        </span>
                      </li>
                      <li>
                        <a href="tel:+5492604515854" className="text-base text-gray-300 hover:text-white">
                          📞 +54 260 451-5854
                        </a>
                      </li>
                      <li>
                        <a href="mailto:info@hisma.com.ar" className="text-base text-gray-300 hover:text-white">
                          ✉️ info@hisma.com.ar
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="md:grid md:grid-cols-1 md:gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">
                      Acceso
                    </h3>
                    <ul role="list" className="mt-4 space-y-4">
                      <li>
                        <a href="/login" className="text-base text-gray-300 hover:text-white">
                          Iniciar Sesión
                        </a>
                      </li>
                      <li>
                        <a href="/register" className="text-base text-gray-300 hover:text-white">
                          Registrarse
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 border-t border-gray-700 pt-8">
              <p className="text-base text-gray-400 xl:text-center">
                © 2025 Hisma - Sistema de Gestión de cambios de aceite para Lubricentros. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </footer>

        {/* ✅ BOTÓN DE WHATSAPP CORREGIDO */}
        <a
          href={`https://wa.me/5492604515854?text=Hola%20equipo%20de%20Hisma,%20quiero%20más%20información%20sobre%20el%20sistema%20para%20lubricentros`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-button"
          aria-label="Contactar por WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="whatsapp-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="whatsapp-text">¡Consultanos!</span>
        </a>
      </div>
    </>
  );
};

export default HomePage;