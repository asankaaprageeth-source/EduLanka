import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);
const ADMIN_EMAIL = 'asankaaprageeth@gmail.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');
    if (stored && token) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    const isAdmin = email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    let res;
    if (isAdmin) {
      try { res = await API.post('/admin/login', { email, password }); }
      catch { res = await API.post('/auth/login', { email, password, role }); }
    } else {
      res = await API.post('/auth/login', { email, password, role });
    }
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.data));
    setUser(res.data.data);
    return res.data.data;
  };

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); };
  const updateUser = (patch) => { const merged = { ...user, ...patch }; localStorage.setItem('user', JSON.stringify(merged)); setUser(merged); };

  return <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
