// src/hooks/useAuth.ts
// Hook d'authentification — gère login/logout/état utilisateur

import { useState, useEffect, useCallback } from "react";
import { auth, tokenStorage } from "@/lib/api";
import type { AuthUser } from "@/lib/api";

export function useAuth() {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Vérifier si un token existe déjà au chargement
  useEffect(() => {
    const checkSession = async () => {
      if (!tokenStorage.exists()) {
        setLoading(false);
        return;
      }
      try {
        const me = await auth.me();
        setUser(me);
      } catch {
        // Token invalide → nettoyer
        tokenStorage.clear();
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const u = await auth.login(email, password);
      setUser(u);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Extraire le message Laravel proprement
      try {
        const parsed = JSON.parse(msg.replace(/.*→ \d+: /, ""));
        const firstError = Object.values(parsed?.errors ?? {})[0];
        setError(Array.isArray(firstError) ? firstError[0] as string : parsed?.message ?? "Erreur de connexion");
      } catch {
        setError("Email ou mot de passe incorrect.");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
