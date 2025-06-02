// src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert, Button, Spinner } from '../../components/ui';

// Iconos
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtener URL de redirección después del login (si existe)
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, complete todos los campos');
      return;
    }
    
    try {
      setError(null);
      setIsLoading(true);
      await login(email, password);
      navigate(from, { replace: true }); // Redirigir al Dashboard o ruta original
    } catch (err: any) {
      // Manejar diferentes errores de Firebase
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Credenciales incorrectas. Por favor, verifique su email y contraseña.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos fallidos. Intente más tarde o restablezca su contraseña.');
          break;
        default:
          setError('Error al iniciar sesión. Por favor, intente nuevamente.');
          console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 mb-6">
        Iniciar Sesión
      </h2>
      
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Recordarme
            </label>
          </div>

          <div className="text-sm">
            <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
              ¿Olvidó su contraseña?
            </Link>
          </div>
        </div>

        <div>
          <Button
            type="submit"
            color="primary"
            fullWidth
            size="lg"
            disabled={isLoading}
            className="relative"
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="sm" color="white" />
              </div>
            ) : null}
            <span className={isLoading ? 'opacity-0' : ''}>Iniciar Sesión</span>
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">¿No tiene una cuenta?</span>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/register"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white border-primary-500 hover:bg-primary-50"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;