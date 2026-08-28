import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    loading: true,
    autenticado: false,
    usuario: null,
    isGilog: false,
  });

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/status`, {
        credentials: 'include',
      });
      const data = await res.json();

      setAuth({
        loading: false,
        autenticado: !!data.autenticado,
        usuario: data.usuario || null,
        isGilog: !!data.isGilog,
      });

      return !!data.autenticado;
    } catch (err) {
      console.error('Erro ao verificar autenticação:', err);
      setAuth({ loading: false, autenticado: false, usuario: null, isGilog: false });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      setAuth({ loading: false, autenticado: false, usuario: null, isGilog: false });
      // Força um reload completo: descarta todo o estado JS em memória
      // e impede que o bfcache guarde uma versão "autenticada" desta página.
      window.location.replace('/');
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    function handlePageShow(event) {
      // event.persisted = true significa que a página foi restaurada do bfcache,
      // não recarregada normalmente. Nesse caso, o React não re-executa nada,
      // então precisamos forçar a revalidação manualmente.
      if (event.persisted) {
        checkAuthStatus();
      }
    }

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider value={{ ...auth, logout, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>');
  }
  return context;
}