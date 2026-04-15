import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

const API = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(setUser)
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email, senha) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    tokenRef.current = data.token;
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async ({ nome_organizacao, slug, nome, email, senha }) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_organizacao, slug, nome, email, senha })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('token', data.token);
    tokenRef.current = data.token;
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    tokenRef.current = null;
    setToken(null);
    setUser(null);
  }, []);

  const api = useCallback(async (url, options = {}) => {
    const currentToken = tokenRef.current;
    const res = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${currentToken}`,
        ...options.headers
      },
      body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined
    });
    if (!res.ok) {
      let errorMsg = `Erro ${res.status}`;
      try {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        }
      } catch {}
      throw new Error(errorMsg);
    }
    if (options.raw) return res;
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066cc] mx-auto"></div>
        <p className="text-sm text-gray-500 mt-3">Carregando...</p>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, api, isSuperAdmin: user?.perfil === 'super_admin', isAdmin: user?.perfil === 'admin' || user?.perfil === 'super_admin', isAdvogado: user?.perfil === 'advogado' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
