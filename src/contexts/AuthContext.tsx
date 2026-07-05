import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
  emailVerified: boolean;
  avatarUrl: string | null;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Starts logged-out on both server and client — there's no session info
  // available during SSR, so this matches the first client render and we
  // fetch the real state after mount (same pattern as the other contexts).
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao entrar.' };
      }
      setUser(data);
      return { success: true };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, error: 'Erro ao entrar. Tente novamente.' };
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao criar conta.' };
      }
      setUser(data);
      return { success: true };
    } catch (error) {
      console.error('Error registering:', error);
      return { success: false, error: 'Erro ao criar conta. Tente novamente.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
