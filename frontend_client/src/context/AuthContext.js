import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
});

/**
 * PUBLIC_INTERFACE
 * useAuth exposes user session and auth actions.
 */
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AuthProvider maintains the user session and hydrates from storage.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // PUBLIC_INTERFACE
  async function login(email, password) {
    const u = await authService.login(email, password);
    setUser(u);
    return u;
  }

  // PUBLIC_INTERFACE
  async function signup(email, password) {
    const u = await authService.signup(email, password);
    setUser(u);
    return u;
  }

  // PUBLIC_INTERFACE
  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
