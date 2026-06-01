'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'client' | 'agency' | 'admin';
  photo?: string;
  agencyId?: number;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = ((typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'))
    ? 'https://safe-trip-backend.vercel.app'
    : ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')))
      ? `http://${window.location.hostname}:5000`
      : (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'https://safe-trip-backend.vercel.app')));

  const refresh = async () => {
    try {
      // Pass token in headers if present as a fallback
      const token = typeof window !== 'undefined' ? localStorage.getItem('safetrip_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiBase}/api/auth/me`, {
        headers,
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.user) {
          if (data.token) {
            localStorage.setItem('safetrip_token', data.token);
          }
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching current user session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = (newUser: User, token?: string) => {
    if (token) {
      localStorage.setItem('safetrip_token', token);
    }
    setUser(newUser);
  };

  const logout = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('safetrip_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setUser(null);
      // Clean up localStorage for static indicators if any remaining
      localStorage.removeItem('safetrip_token');
      localStorage.removeItem('safetrip_logged_in');
      localStorage.removeItem('safetrip_user_role');
      localStorage.removeItem('safetrip_active_agency');
      localStorage.removeItem('safetrip_user_name');
      window.location.href = '/login';
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </UserContext.Provider>
  );
}
