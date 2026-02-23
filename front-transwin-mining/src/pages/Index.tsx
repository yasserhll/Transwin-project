// src/pages/Index.tsx
import { useState } from "react";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";
import AffectationPage from "@/pages/AffectationPage";
import StockPage from "@/pages/StockPage";
import RapportPage from "@/pages/RapportPage";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/UsersPage";
import { useAuthContext } from "@/context/AuthContext";

const AppContent = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {activeTab === "dashboard"   && <DashboardPage />}
        {activeTab === "affectation" && <AffectationPage />}
        {activeTab === "stock"       && <StockPage />}
        {activeTab === "rapport"     && <RapportPage />}
        {/* Onglet Comptes — admin seulement */}
        {activeTab === "comptes" && (
          isAdmin
            ? <UsersPage />
            : <div className="flex items-center justify-center py-20 text-muted-foreground">
                Accès réservé à l'administrateur.
              </div>
        )}
      </main>
    </div>
  );
};

const Index = () => (
  <AuthProvider>
    <ProtectedRoute>
      <AppContent />
    </ProtectedRoute>
  </AuthProvider>
);

export default Index;
