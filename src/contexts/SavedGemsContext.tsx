import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SavedGemsContextType {
  savedGems: string[];
  loading: boolean;
  saveGem: (gemId: string) => Promise<void>;
  unsaveGem: (gemId: string) => Promise<void>;
  isGemSaved: (gemId: string) => boolean;
}

const SavedGemsContext = createContext<SavedGemsContextType | undefined>(undefined);

export const useSavedGems = () => {
  const context = useContext(SavedGemsContext);
  if (!context) {
    throw new Error('useSavedGems must be used within a SavedGemsProvider');
  }
  return context;
};

interface SavedGemsProviderProps {
  children: ReactNode;
}

// Backed by /api/profile/saved (a per-account SQLite table) instead of pure
// client state — previously this context never persisted anything at all,
// so every saved gem vanished on refresh. Saving now requires being logged
// in, since there's nowhere to persist a bookmark for a logged-out visitor.
export const SavedGemsProvider: React.FC<SavedGemsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [savedGems, setSavedGems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSavedGems([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/profile/saved');
      if (res.ok) {
        const gems = await res.json();
        setSavedGems(gems.map((g: { id: string }) => g.id));
      }
    } catch (error) {
      console.error('Error loading saved gems:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveGem = async (gemId: string) => {
    if (!user) return;
    setSavedGems((prev) => (prev.includes(gemId) ? prev : [...prev, gemId]));
    try {
      const res = await fetch('/api/profile/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemId }),
      });
      if (!res.ok) {
        // Roll back the optimistic update if the server rejected it.
        setSavedGems((prev) => prev.filter((id) => id !== gemId));
      }
    } catch (error) {
      console.error('Error saving gem:', error);
      setSavedGems((prev) => prev.filter((id) => id !== gemId));
    }
  };

  const unsaveGem = async (gemId: string) => {
    if (!user) return;
    setSavedGems((prev) => prev.filter((id) => id !== gemId));
    try {
      const res = await fetch('/api/profile/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemId }),
      });
      if (!res.ok) {
        setSavedGems((prev) => (prev.includes(gemId) ? prev : [...prev, gemId]));
      }
    } catch (error) {
      console.error('Error unsaving gem:', error);
      setSavedGems((prev) => (prev.includes(gemId) ? prev : [...prev, gemId]));
    }
  };

  const isGemSaved = (gemId: string) => {
    return savedGems.includes(gemId);
  };

  return (
    <SavedGemsContext.Provider value={{ savedGems, loading, saveGem, unsaveGem, isGemSaved }}>
      {children}
    </SavedGemsContext.Provider>
  );
};
