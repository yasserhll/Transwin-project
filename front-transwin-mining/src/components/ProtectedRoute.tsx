// src/components/ProtectedRoute.tsx
// Garde la route — redirige vers LoginPage si non connecté

import { useAuthContext } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import { Loader2, Pickaxe } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated, loading } = useAuthContext();

  // Vérification du token en cours
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
          <Pickaxe className="w-8 h-8 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Vérification de la session...</span>
        </div>
      </div>
    );
  }

  // Non connecté → afficher la page de login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Connecté → afficher l'app
  return <>{children}</>;
};

export default ProtectedRoute;
