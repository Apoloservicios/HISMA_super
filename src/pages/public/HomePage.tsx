// src/pages/public/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import bg_h from '../../assets/img/bg_hisma.jpg';
import hismaLogo from '../../assets/img/hisma_logo_horizontal.png';

// ✅ IMPORTAR SERVICIOS PARA CARGAR PLANES
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

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [domain, setDomain] = useState('');
  
  // ✅ ESTADOS PARA PLANES DINÁMICOS
  const [plans, setPlans] = useState<ManagedSubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [errorLoadingPlans, setErrorLoadingPlans] = useState(false);

  // ✅ CARGAR PLANES AL MONTAR EL COMPONENTE
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        setErrorLoadingPlans(false);
        
        // Cargar solo planes activos desde Firebase
        const activePlans = await getActivePlans();
        
        // Ordenar planes por precio (de menor a mayor)
        const sortedPlans = activePlans.sort((a, b) => a.price.monthly - b.price.monthly);
        
        setPlans(sortedPlans);
      } catch (error) {
        console.error('Error al cargar planes:', error);
        setErrorLoadingPlans(true);
        
        // ✅ PLANES DE FALLBACK si falla la carga
        setPlans([
          {
            id: 'starter',
            name: 'Starter',
            description: 'Pensado para el inicio, empezá a olvidarte de las tarjetas físicas, digitaliza tus datos.',
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
            price: { monthly: 26500, semiannual: 145000 },
            maxUsers: 6,
            maxMonthlyServices: null, // null = ilimitado
            features: [
              'Reportes y estadísticas',
              'Sistema de notificaciones',
              'Usuarios de sistemas (6 usuarios)',
              'Soporte - mail, Whatsapp, Telefónico - Prioritario',
              'Acceso a app',
              'Sin límite de servicios mensuales'
            ],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            updatedBy: 'system',
            usageCount: 0,
            isDefault: true
          }
        ] as ManagedSubscriptionPlan[]);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
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
        <div className="col-span-full flex justify-center items-center h-64">
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

    // ✅ DETERMINAR CLASE CSS GRID SEGÚN CANTIDAD DE PLANES
    const getGridClass = () => {
      const planCount = plans.length;
      if (planCount <= 3) return 'pricing-grid-standard';
      if (planCount === 4) return 'pricing-grid-4';
      if (planCount === 5) return 'pricing-grid-5';
      return 'pricing-grid-many';
    };

    // Siempre mostrar plan de prueba gratuita primero
    const trialPlan = (
      <div key="trial" className="pricing-card border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 bg-white">
        <div className="p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Prueba Gratuita</h3>
          <p className="mt-4 text-sm text-gray-500">
            Ideal para probar el sistema y verificar si cumple con sus necesidades.
          </p>
          <p className="mt-8">
            <span className="text-4xl font-extrabold text-gray-900">$0</span>
            <span className="text-base font-medium text-gray-500">/mes</span>
          </p>
          <a
            href="/register"
            className="mt-8 block w-full bg-primary-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-primary-700 transition-colors"
          >
            Comenzar prueba gratuita
          </a>
        </div>
        <div className="px-6 pt-6 pb-8">
          <h4 className="text-sm font-medium text-gray-900">Incluye:</h4>
          <ul className="mt-6 space-y-4">
            <li className="flex space-x-3">
              <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
              <span className="text-sm text-gray-500">7 días de prueba</span>
            </li>
            <li className="flex space-x-3">
              <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
              <span className="text-sm text-gray-500">Funcionalidades básicas</span>
            </li>
            <li className="flex space-x-3">
              <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
              <span className="text-sm text-gray-500">Soporte por email</span>
            </li>
          </ul>
        </div>
      </div>
    );

    // Renderizar planes dinámicos desde Firebase
    const dynamicPlans = plans.map((plan, index) => {
      const isRecommended = plan.recommended || plan.id === 'basic';
      
      return (
        <div 
          key={plan.id} 
          className={`pricing-card border rounded-lg shadow-sm divide-y divide-gray-200 bg-white relative ${
            isRecommended ? 'border-2 border-primary-500 transform scale-105 z-10' : 'border-gray-200'
          }`}
        >
          {isRecommended && (
            <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-600 text-white">
              Recomendado
            </span>
          )}
          
          <div className="p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{plan.name}</h3>
            <p className="mt-4 text-sm text-gray-500">
              {plan.description}
            </p>
            <p className="mt-8">
              <span className="text-4xl font-extrabold text-gray-900">
                ${plan.price.monthly.toLocaleString('es-AR')}
              </span>
              <span className="text-base font-medium text-gray-500">/mes</span>
            </p>
            <a
              href="/register"
              className="mt-8 block w-full bg-primary-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-primary-700 transition-colors"
            >
              Elegir {plan.name}
            </a>
          </div>
          
          <div className="px-6 pt-6 pb-8">
            <h4 className="text-sm font-medium text-gray-900">Incluye:</h4>
            <ul className="mt-6 space-y-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex space-x-3">
                  <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                  <span className="text-sm text-gray-500">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    });

    return (
      <div className={getGridClass()}>
        {trialPlan}
        {dynamicPlans}
      </div>
    );
  };

  // ✅ STRUCTURED DATA PARA SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Hisma - Sistema de Gestión para Lubricentros",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "url": "https://hisma.com.ar",
    "description": "Sistema para lubricentros que permite administrar los cambios de aceite de forma digital. Gestiona tu lubricentro en la nube.",
    "offers": {
      "@type": "AggregateOffer",
      "priceRange": "$13500-$26500",
      "priceCurrency": "ARS",
      "priceSpecification": plans.map(plan => ({
        "@type": "UnitPriceSpecification",
        "price": plan.price.monthly.toString(),
        "priceCurrency": "ARS",
        "name": plan.name,
        "description": plan.description,
        "billingPeriod": "P1M"
      }))
    },
    "featureList": [
      "Gestión digital de cambios de aceite",
      "Historial completo de vehículos", 
      "Recordatorios automáticos",
      "Reportes y estadísticas",
      "Sistema de notificaciones",
      "Soporte técnico especializado"
    ],
    "applicationSubCategory": "Automotive Management Software",
    "targetProduct": {
      "@type": "Product",
      "name": "Software de Gestión para Lubricentros",
      "category": "Business Software"
    }
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Hisma",
    "url": "https://hisma.com.ar",
    "logo": "https://hisma.com.ar/hisma_logo_horizontal.png",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "AR",
      "addressRegion": "Mendoza",
      "addressLocality": "San Rafael"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+54 260 451-5854",
      "contactType": "customer service",
      "availableLanguage": "Spanish"
    },
    "sameAs": [
      "https://wa.me/5492604515854"
    ]
  };

  return (
    <>
      {/* ✅ SEO OPTIMIZADO PARA ARGENTINA */}
      <Helmet>
        {/* Meta tags básicos optimizados */}
        <title>Hisma - Sistema de Gestión para Lubricentros | Software en la Nube Argentina</title>
        <meta name="description" content="Sistema para lubricentros que permite administrar cambios de aceite de forma digital. Gestiona tu lubricentro en la nube con Hisma. Prueba gratis 7 días." />
        
        {/* Keywords específicas Argentina */}
        <meta name="keywords" content="sistema gestión lubricentros, software cambio aceite, plataforma web lubricentros, gestión digital talleres, sistema online Argentina, software lubricentros mendoza" />
        
        {/* Meta tags específicos SaaS */}
        <meta name="product:category" content="SaaS Software" />
        <meta name="product:price_range" content="$13500-$26500 ARS" />
        <meta name="product:free_trial" content="true" />
        <meta name="product:target_market" content="Lubricentros Argentina" />
        
        {/* Localización Argentina */}
        <meta name="geo.region" content="AR" />
        <meta name="geo.country" content="Argentina" />
        <meta name="geo.placename" content="San Rafael, Mendoza" />
        <meta name="language" content="es-AR" />
        
        {/* Hreflang para Argentina */}
        <link rel="alternate" hrefLang="es-AR" href="https://hisma.com.ar/" />
        <link rel="alternate" hrefLang="x-default" href="https://hisma.com.ar/" />
        
        {/* Open Graph optimizado */}
        <meta property="og:title" content="Hisma - Sistema de Gestión para Lubricentros Argentina" />
        <meta property="og:description" content="Administra los cambios de aceite de tu lubricentro de forma digital. Sistema completo para gestionar clientes, servicios y recordatorios. Prueba gratis." />
        <meta property="og:image" content="https://hisma.com.ar/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Hisma - Sistema de Gestión para Lubricentros Argentina" />
        <meta property="og:url" content="https://hisma.com.ar" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Hisma" />
        <meta property="og:locale" content="es_AR" />
        
        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hisma - Sistema de Gestión para Lubricentros Argentina" />
        <meta name="twitter:description" content="Administra los cambios de aceite de tu lubricentro de forma digital. Prueba gratis 7 días." />
        <meta name="twitter:image" content="https://hisma.com.ar/og-image.png" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(organizationData)}
        </script>
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://hisma.com.ar/" />
      </Helmet>

      <div className="bg-white">
        {/* ✅ CSS GRID RESPONSIVO INCLUIDO */}
        <style dangerouslySetInnerHTML={{
          __html: `
          /* Grid responsivo para pricing cards */
          .pricing-grid-standard {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: clamp(1rem, 4vw, 2rem);
            justify-content: center;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .pricing-grid-4 {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: clamp(1rem, 3vw, 1.5rem);
            justify-content: center;
            max-width: 1400px;
            margin: 0 auto;
          }
          
          .pricing-grid-5 {
            display: grid;
            grid-template-columns: repeat(10, 1fr);
            gap: 1.5rem;
            max-width: 1400px;
            margin: 0 auto;
          }
          
          .pricing-grid-5 .pricing-card {
            grid-column: span 2;
          }
          
          /* Patrón 3-2 para 5 elementos */
          .pricing-grid-5 .pricing-card:nth-child(1) { grid-column-start: 1; }
          .pricing-grid-5 .pricing-card:nth-child(2) { grid-column-start: 3; }
          .pricing-grid-5 .pricing-card:nth-child(3) { grid-column-start: 5; }
          .pricing-grid-5 .pricing-card:nth-child(4) { grid-column-start: 2; }
          .pricing-grid-5 .pricing-card:nth-child(5) { grid-column-start: 4; }
          
          .pricing-grid-many {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: clamp(1rem, 2.5vw, 1.5rem);
            justify-content: center;
            max-width: 1600px;
            margin: 0 auto;
          }
          
          /* Responsive breakpoints */
          @media (max-width: 640px) {
            .pricing-grid-standard,
            .pricing-grid-4,
            .pricing-grid-5,
            .pricing-grid-many {
              grid-template-columns: 1fr;
              max-width: 400px;
            }
            
            .pricing-grid-5 .pricing-card {
              grid-column: span 1;
            }
          }
          
          @media (min-width: 641px) and (max-width: 768px) {
            .pricing-grid-5 {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .pricing-grid-5 .pricing-card {
              grid-column: span 1;
            }
          }
          
          /* Container queries para diseño más intrínseco */
          @container (max-width: 600px) {
            .pricing-container {
              grid-template-columns: 1fr;
            }
          }
          
          @container (min-width: 900px) {
            .pricing-container {
              grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
                  <img
                    src={hismaLogo}
                    alt="HISMA - Sistema de Gestión para Lubricentros Argentina"
                    className="h-10 max-w-[150px] object-contain"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/consulta-historial" className="text-base font-medium text-white hover:text-gray-300">
                  Consultar Historial
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50"
                >
                  Iniciar Sesión
                </a>
              </div>
            </nav>
          </div>
        </header>

        {/* Hero section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              className="w-full h-full object-cover"
              src={bg_h}
              alt="Persona en un taller cambiando el aceite a un vehículo"
            />
            <div className="absolute inset-0 bg-gray-800 mix-blend-multiply" />
          </div>
          <div className="relative max-w-7xl mx-auto py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8">
            <h1 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block text-white">Sistema de Gestión para Lubricentros</span>
              <span className="block text-primary-200">Simple y Digital</span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-center text-xl text-white sm:max-w-3xl">
              Digitalizá tu lubricentro con nuestro sistema en la nube. 
              Administrá cambios de aceite, seguí el historial de vehículos y mantené informados a tus clientes.
            </p>

            {/* Búsqueda rápida */}
            <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
              <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <TruckIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value.toUpperCase())}
                      className="block w-full pl-10 pr-3 py-3 border border-transparent text-base leading-5 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
                      placeholder="Ingresá el dominio (patente)"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!domain.trim()}
                    className={`px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                      domain.trim()
                        ? 'bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600'
                        : 'bg-primary-300 cursor-not-allowed'
                    }`}
                  >
                    Consultar Historial
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ✅ SECCIÓN DE PLANES DINÁMICOS CON GRID RESPONSIVO */}
        <div className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Planes</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Elegí el plan que mejor se adapte a tu lubricentro
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
                Ofrecemos diferentes opciones para todo tipo de lubricentros, desde pequeños hasta grandes operaciones.
                Precios en pesos argentinos, sin sorpresas.
              </p>
              
              {/* ✅ INDICADOR DE ACTUALIZACIÓN AUTOMÁTICA */}
              {!loadingPlans && !errorLoadingPlans && (
                <p className="mt-2 text-sm text-gray-400">
                  ✨ Precios actualizados automáticamente desde nuestro sistema
                </p>
              )}
            </div>

            {/* ✅ GRID DINÁMICO DE PLANES CON CSS RESPONSIVO */}
            <div className="mt-10 sm:mt-16">
              {renderPlans()}
            </div>
          </div>
        </div>

       

        {/* ✅ TESTIMONIOS LOCALES */}
        <div className="bg-primary-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Lo que dicen nuestros clientes
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Lubricentros de toda Argentina ya están digitalizando su gestión
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "Antes llevaba todo en papel y siempre perdía algún comprobante. 
                  Con Hisma tengo todo digitalizado y mis clientes pueden ver su historial online."
                </p>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Carlos Mendoza</p>
                  <p className="text-gray-500">Lubricentro San Martin - Mendoza</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "El sistema me ayuda a recordar cuándo mis clientes necesitan el próximo cambio. 
                  Mejoré mucho la atención y aumenté las ventas."
                </p>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">María González</p>
                  <p className="text-gray-500">Taller Norte - Buenos Aires</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "Súper fácil de usar y el soporte técnico responde al toque por WhatsApp. 
                  Lo recomiendo a todos los colegas del rubro."
                </p>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Roberto Silva</p>
                  <p className="text-gray-500">Quick Oil - Córdoba</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ FAQ ARGENTINO */}
        <div className="bg-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Preguntas Frecuentes
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Resolvé tus dudas sobre Hisma
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ¿Necesito conocimientos técnicos para usar Hisma?
                </h3>
                <p className="text-gray-600">
                  Para nada. Hisma está diseñado para ser súper fácil de usar. 
                  Si sabés usar WhatsApp, vas a poder usar Hisma sin problemas.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ¿Los precios están en pesos argentinos?
                </h3>
                <p className="text-gray-600">
                  Sí, todos nuestros precios están en pesos argentinos. No hay costos ocultos ni sorpresas. 
                  Podés pagar con transferencia bancaria o MercadoPago.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ¿Qué pasa si no me gusta el sistema?
                </h3>
                <p className="text-gray-600">
                  Tenés 7 días de prueba gratuita para probar todas las funciones. 
                  Si no te convence, simplemente no renovás y listo. Sin compromisos.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ¿Tienen soporte técnico en Argentina?
                </h3>
                <p className="text-gray-600">
                  ¡Por supuesto! Nuestro equipo de soporte está en Argentina y te podés comunicar 
                  por WhatsApp, email o teléfono en horario comercial.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ CTA ARGENTINO */}
        <div className="bg-primary-700">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="block">¿Listo para digitalizar tu lubricentro?</span>
              <span className="block text-primary-200">Empezá hoy mismo con la prueba gratuita.</span>
            </h2>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <a
                  href="/register"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 transition-colors"
                >
                  Empezar Ahora Gratis
                </a>
              </div>
              <div className="ml-3 inline-flex rounded-md shadow">
                <a
                  href="/consulta-historial"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  Ver Demo
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white">
          <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
            <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
              <div className="px-5 py-2">
                <a href="/" className="text-base text-gray-500 hover:text-gray-900">
                  Inicio
                </a>
              </div>
              <div className="px-5 py-2">
                <a href="/login" className="text-base text-gray-500 hover:text-gray-900">
                  Iniciar Sesión
                </a>
              </div>
              <div className="px-5 py-2">
                <a href="/register" className="text-base text-gray-500 hover:text-gray-900">
                  Registrarse
                </a>
              </div>
              <div className="px-5 py-2">
                <a href="/consulta-historial" className="text-base text-gray-500 hover:text-gray-900">
                  Consultar Historial
                </a>
              </div>
            </nav>
            
            {/* ✅ INFORMACIÓN DE CONTACTO ARGENTINA */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-2">
                📍 San Rafael, Mendoza - Argentina
              </p>
              <p className="text-sm text-gray-600 mb-4">
                📞 +54 260 451-5854 | ✉️ contacto@hisma.com.ar
              </p>
            </div>
            
            <p className="mt-4 text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} Hisma - Sistema de Gestión para Lubricentros. Todos los derechos reservados.
            </p>
          </div>
        </footer>

        {/* ✅ BOTÓN DE WHATSAPP ARGENTINO */}
        <div className="fixed bottom-5 right-5 z-50">
          <a
            href={`https://wa.me/5492604515854?text=Hola%20equipo%20de%20Hisma,%20quiero%20más%20información%20sobre%20el%20sistema%20para%20lubricentros`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg p-3 flex items-center group transition-all duration-300"
            aria-label="Contactar por WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="ml-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              ¡Consultanos!
            </span>
          </a>
        </div>
      </div>
    </>
  );
};

export default HomePage;      