// src/components/ui/ApiStatus.tsx
// Composants réutilisables pour afficher loading/error des appels API

import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Spinner de chargement
// ─────────────────────────────────────────────────────────────
export function LoadingSpinner({ message = "Chargement..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bannière d'erreur avec bouton retry
// ─────────────────────────────────────────────────────────────
export function ErrorBanner({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-mining-danger/10 border border-mining-danger/30 rounded-xl text-mining-danger">
      <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Erreur de connexion au serveur</p>
        <p className="text-xs mt-1 opacity-80 break-words">{error}</p>
        <p className="text-xs mt-1 opacity-60">
          Vérifiez que Laravel tourne sur <code className="font-mono">http://127.0.0.1:8000</code>
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-mining-danger text-white rounded-lg text-xs font-semibold hover:opacity-90 flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Réessayer
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Wrapper combiné — à utiliser dans chaque section
// Usage :
//   <ApiStatusWrapper loading={loading} error={error} onRetry={reload}>
//     <MonComposant ... />
//   </ApiStatusWrapper>
// ─────────────────────────────────────────────────────────────
export function ApiStatusWrapper({
  loading,
  error,
  onRetry,
  children,
  loadingMessage,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
}) {
  if (loading) return <LoadingSpinner message={loadingMessage} />;
  if (error)   return <ErrorBanner error={error} onRetry={onRetry} />;
  return <>{children}</>;
}
