// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  setPersistence, 
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Partial<User>) => Promise<string>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para obtener el perfil de usuario desde Firestore
  const fetchUserProfile = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'usuarios', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userData: User = {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: data.lastLogin?.toDate() || null,
          updatedAt: data.updatedAt?.toDate(),
        } as User;
        
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener el perfil de usuario:', error);
      return null;
    }
  };

  // Función para refrescar el perfil del usuario
  const refreshUserProfile = async () => {
    if (currentUser) {
      try {
        // Recargar el usuario de Firebase Auth para obtener el estado actualizado
        await currentUser.reload();
        
        // Obtener el perfil actualizado de Firestore
        const profile = await fetchUserProfile(currentUser.uid);
        setUserProfile(profile);
        
        // Actualizar el currentUser en el estado
        setCurrentUser({ ...currentUser });
        
      } catch (error) {
        console.error('Error al refrescar perfil de usuario:', error);
      }
    }
  };

  // Observador de cambios en la autenticación
  useEffect(() => {
    // Configurar persistencia
    setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDocRef = doc(db, 'usuarios', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            // Obtener perfil del usuario
            const profile = await fetchUserProfile(user.uid);
            setUserProfile(profile);
            
          
            
            // Solo actualizar último login si el perfil existe
            if (profile) {
              await updateDoc(userDocRef, {
                lastLogin: serverTimestamp()
              });
            }
          } else {
            console.warn(`Usuario autenticado pero sin documento en Firestore: ${user.uid}`);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error al procesar usuario autenticado:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Función para iniciar sesión
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para registrar un nuevo usuario - VERSIÓN CORREGIDA
  const register = async (email: string, password: string, userData: Partial<User>): Promise<string> => {
    try {
      setLoading(true);
      
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Crear objeto del usuario sin timestamps complejos
      const newUser = {
        id: user.uid,
        nombre: userData.nombre || '',
        apellido: userData.apellido || '',
        email: user.email || '',
        role: userData.role || 'user',
        estado: userData.role === 'superadmin' ? 'activo' : userData.estado || 'pendiente',
        lubricentroId: userData.lubricentroId || null, // Puede ser null inicialmente
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };


      // 3. Crear documento en Firestore
      await setDoc(doc(db, 'usuarios', user.uid), newUser);
      
      // 4. Enviar email de verificación para dueños de lubricentro
      if (userData.role === 'admin') {
        try {
          await sendEmailVerification(user);
        } catch (emailError) {
          console.warn('Error al enviar email de verificación:', emailError);
          // No lanzar error para no interrumpir el registro
        }
      }
      
      // 5. Actualizar el estado local - crear perfil sin timestamps de servidor
      const createdUser = {
        ...newUser,
        createdAt: new Date(),
        lastLogin: new Date()
      } as User;
      
      setUserProfile(createdUser);
      
      return user.uid;
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para restablecer contraseña
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error al enviar correo de restablecimiento:', error);
      throw error;
    }
  };

  // Función para enviar email de verificación
  const sendVerificationEmail = async () => {
    try {
      if (currentUser) {
        await sendEmailVerification(currentUser);
      } else {
        throw new Error('No hay usuario autenticado');
      }
    } catch (error) {
      console.error('Error al enviar email de verificación:', error);
      throw error;
    }
  };

  // Función para actualizar el perfil de usuario
  const updateUserProfile = async (userData: Partial<User>) => {
    try {
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      await updateDoc(doc(db, 'usuarios', currentUser.uid), {
        ...userData,
        updatedAt: serverTimestamp()
      });
      
      // Actualizar el estado local
      if (userProfile) {
        const updatedProfile = {
          ...userProfile,
          ...userData
        };
        setUserProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile,
    sendVerificationEmail,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}