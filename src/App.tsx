// src/App.tsx - VERSIÓN CORREGIDA SIN 'owner'
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// Providers
import { AuthProvider } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages - Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import RegistroExitosoPage from './pages/auth/RegistroExitosoPage';
import RegistroPendientePage from './pages/auth/RegistroPendientePage';

// Pages - Public
import HomePage from './pages/public/HomePage';
import PublicHistoryPage from './pages/public/PublicHistoryPage';

// Pages - Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Pages - SuperAdmin
import PlanManagementPage from './pages/superadmin/PlanManagementPage';
import SuperAdminReportPage from './pages/admin/SuperAdminReportPage';
import SuperAdminServicesPage from './pages/superadmin/SuperAdminServicesPage';
import SuperAdminServiceDetailPage from './pages/superadmin/SuperAdminServiceDetailPage';
import ManualRenewalDashboard from './pages/superadmin/ManualRenewalDashboard';

// Pages - Oil Changes
import OilChangeListPage from './pages/oilchanges/OilChangeListPage';
import OilChangeFormPage from './pages/oilchanges/OilChangeFormPage';
import OilChangeDetailPage from './pages/oilchanges/OilChangeDetailPage';
import PendingOilChangesPage from './pages/oilchanges/PendingOilChangesPage';
import CompleteOilChangePage from './pages/oilchanges/CompleteOilChangePage';
import QuickOilChangeFormPage from './pages/oilchanges/QuickOilChangeFormPage';

// Pages - Users
import UserListPage from './pages/users/UserListPage';
import UserProfilePage from './pages/users/UserProfilePage';

// Pages - Reports
import ReportsPage from './pages/reports/ReportsPage';
import OperatorReportPage from './pages/reports/OperatorReportPage';
import VehicleReportPage from './pages/reports/VehicleReportPage';
import UpcomingServicesPage from './pages/services/UpcomingServicesPage';
import SupportPage from './pages/support/SupportPage';
import WarrantyReportsPage from './pages/reports/WarrantyReportsPage';

// Pages - Admin Lubricentros
import LubricentroDashboardPage from './pages/admin/LubricentroDashboardPage';
import LubricentroFormPage from './pages/admin/LubricentroFormPage';
import LubricentroDetailPage from './pages/admin/LubricentroDetailPage';
import LubricentroSubscriptionPage from './pages/admin/LubricentroSubscriptionPage';

// Pages - Garantías
import WarrantyDashboardPage from './pages/warranties/WarrantyDashboardPage';
import WarrantyFormPage from './pages/warranties/WarrantyFormPage';
import WarrantyDetailPage from './pages/warranties/WarrantyDetailPage';

// ✅ IMPORTACIONES DE GESTIÓN DE PAGOS
import  PaymentManagementPage  from './pages/admin/PaymentManagementPage';

// Pages - Payment Results
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentPendingPage from './pages/payment/PaymentPendingPage';
import PaymentFailurePage from './pages/payment/PaymentFailurePage';

// Components
import PrivateRoute from './components/common/PrivateRoute';

// ✅ NUEVO COMPONENTE - Panel de Gestión de Transferencias SuperAdmin
const SuperAdminPaymentManagerPage: React.FC = () => {
  const { SuperAdminPaymentManager } = require('./components/superadmin/SuperAdminPaymentManager');
  return (
    <div className="p-6">
      <SuperAdminPaymentManager />
    </div>
  );
};

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ==================== RUTAS PÚBLICAS ==================== */}
              <Route path="/" element={<HomePage />} />
              <Route path="/consulta-historial" element={<PublicHistoryPage />} />
              
              {/* Rutas de resultado de pagos */}
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/payment/failure" element={<PaymentFailurePage />} />
              <Route path="/payment/pending" element={<PaymentPendingPage />} />
              
              {/* ==================== RUTAS DE AUTENTICACIÓN ==================== */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>
              
              {/* Rutas de registro */}
              <Route path="/registro-exitoso" element={<RegistroExitosoPage />} />
              <Route path="/registro-pendiente" element={<RegistroPendientePage />} />
              
              {/* ==================== RUTAS PROTEGIDAS ==================== */}
              <Route element={<MainLayout />}>
                {/* ==================== DASHBOARD PRINCIPAL ==================== */}
                <Route 
                  path="/dashboard" 
                  element={
                    <PrivateRoute>
                      <DashboardPage />
                    </PrivateRoute>
                  } 
                />

                {/* ==================== GESTIÓN DE PAGOS ==================== */}
                {/* ✅ CORREGIDO: Solo 'admin' en lugar de 'owner' */}
                <Route 
                  path="/admin/pagos" 
                  element={
                    <PrivateRoute requiredRoles={['admin']}>
                      <PaymentManagementPage />
                    </PrivateRoute>
                  } 
                />

                {/* ✅ Gestión de Transferencias para SuperAdmin */}
                <Route 
                  path="/superadmin/pagos-transferencias" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <SuperAdminPaymentManagerPage />
                    </PrivateRoute>
                  } 
                />

                {/* ==================== RUTAS DE SUPERADMIN ==================== */}
                <Route 
                  path="/superadmin/planes" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <PlanManagementPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/superadmin/renovaciones" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <ManualRenewalDashboard />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/superadmin/reportes" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <SuperAdminReportPage />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/superadmin/servicios" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <SuperAdminServicesPage />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/superadmin/servicios/:serviceId" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <SuperAdminServiceDetailPage />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/superadmin/lubricentros/:lubricentroId/servicios/:serviceId/editar" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <OilChangeFormPage />
                    </PrivateRoute>
                  } 
                />

                {/* Gestión de lubricentros */}
                <Route 
                  path="/superadmin/lubricentros" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <LubricentroDashboardPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/superadmin/lubricentros/nuevo" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <LubricentroFormPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/superadmin/lubricentros/editar/:id" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <LubricentroFormPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/superadmin/lubricentros/:id" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <LubricentroDetailPage />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/superadmin/lubricentros/suscripcion/:id" 
                  element={
                    <PrivateRoute requiredRoles={['superadmin']}>
                      <LubricentroSubscriptionPage />
                    </PrivateRoute>
                  } 
                />

                {/* ==================== RUTAS DE CAMBIOS DE ACEITE ==================== */}
                <Route 
                  path="/cambios-aceite" 
                  element={
                    <PrivateRoute>
                      <OilChangeListPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/cambios-aceite/nuevo" 
                  element={
                    <PrivateRoute requiresActiveSubscription={true}>
                      <OilChangeFormPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/cambios-aceite/:id" 
                  element={
                    <PrivateRoute>
                      <OilChangeDetailPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/cambios-aceite/editar/:id" 
                  element={
                    <PrivateRoute requiresActiveSubscription={true}>
                      <OilChangeFormPage />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/cambios-aceite/pendientes" 
                  element={
                    <PrivateRoute>
                      <PendingOilChangesPage />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/cambios-aceite/completar/:id" 
                  element={
                    <PrivateRoute requiresActiveSubscription={true}>
                      <CompleteOilChangePage />
                    </PrivateRoute>
                  } 
                />

                <Route 
                  path="/cambios-aceite/precarga" 
                  element={
                    <PrivateRoute requiresActiveSubscription={true}>
                      <QuickOilChangeFormPage />
                    </PrivateRoute>
                  } 
                />

                {/* ==================== RUTAS DE GARANTÍAS ==================== */}
                <Route 
                  path="/garantias" 
                  element={
                    <PrivateRoute>
                      <WarrantyDashboardPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/garantias/nueva" 
                  element={
                    <PrivateRoute requiresActiveSubscription={true}>
                      <WarrantyFormPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/garantias/:id" 
                  element={
                    <PrivateRoute>
                      <WarrantyDetailPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/garantias/editar/:id" 
                  element={
                    <PrivateRoute requiresActiveSubscription={true}>
                      <WarrantyFormPage />
                    </PrivateRoute>
                  } 
                />
                
                {/* ==================== RUTAS DE USUARIOS ==================== */}
                <Route 
                  path="/usuarios" 
                  element={
                    <PrivateRoute requiredRoles={['admin', 'superadmin']}>
                      <UserListPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/perfil" 
                  element={
                    <PrivateRoute>
                      <UserProfilePage />
                    </PrivateRoute>
                  } 
                />
                
                {/* ==================== RUTAS DE REPORTES ==================== */}
                <Route 
                  path="/reportes" 
                  element={
                    <PrivateRoute requiredRoles={['admin', 'superadmin']}>
                      <ReportsPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/reportes/garantias"
                  element={
                    <PrivateRoute requiredRoles={['admin', 'superadmin']}>
                      <WarrantyReportsPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/reportes/operador/:id" 
                  element={
                    <PrivateRoute requiredRoles={['admin', 'superadmin']}>
                      <OperatorReportPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/reportes/vehiculo/:dominio" 
                  element={
                    <PrivateRoute requiredRoles={['admin', 'superadmin']}>
                      <VehicleReportPage />
                    </PrivateRoute>
                  } 
                />
                
                {/* ==================== RUTAS DE SERVICIOS Y SOPORTE ==================== */}
                <Route 
                  path="/proximos-servicios" 
                  element={
                    <PrivateRoute>
                      <UpcomingServicesPage />
                    </PrivateRoute>
                  } 
                />
                
                <Route 
                  path="/soporte" 
                  element={
                    <PrivateRoute>
                      <SupportPage />
                    </PrivateRoute>
                  } 
                />
              </Route>
              
              {/* ==================== REDIRECCIONES ==================== */}
              {/* Redirigir rutas desconocidas */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;