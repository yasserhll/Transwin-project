// src/components/Header.tsx
import { Truck, BarChart3, FileText, Menu, X, LayoutDashboard, LogOut, User, Shield } from "lucide-react";
import { useState } from "react";
import { useAuthContext } from "@/context/AuthContext";

interface NavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Header = ({ activeTab, setActiveTab }: NavProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout]   = useState(false);
  const { user, logout } = useAuthContext();

  const isAdmin = user?.role === "admin";

  const navItems = [
    { id: "dashboard",   label: "Dashboard",         icon: LayoutDashboard },
    { id: "affectation", label: "Affectation",        icon: Truck },
    { id: "stock",       label: "Gestion Stock",      icon: BarChart3 },
    { id: "rapport",     label: "Rapport Journalier", icon: FileText },
    // Onglet Comptes — visible uniquement pour l'admin
    ...(isAdmin ? [{ id: "comptes", label: "Comptes", icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    if (!confirmLogout) { setConfirmLogout(true); return; }
    await logout();
  };

  return (
    <header className="gradient-header shadow-mining sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => setActiveTab("dashboard")} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-accent animate-pulse-glow">
              <Truck className="w-6 h-6 text-primary" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <h1 className="font-display text-xl font-bold text-primary-foreground tracking-wide leading-none">
                TRANSWIN
              </h1>
              <p className="text-xs text-primary-foreground/70 font-body uppercase tracking-widest leading-none mt-0.5">
                Mining — Benguerir
              </p>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body font-medium text-sm transition-all duration-200 ${
                  activeTab === id
                    ? "bg-accent text-accent-foreground shadow-accent"
                    : "text-primary-foreground/80 hover:bg-primary-light hover:text-primary-foreground"
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* User + Logout */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 rounded-lg">
                {isAdmin
                  ? <Shield className="w-3.5 h-3.5 text-accent" />
                  : <User className="w-3.5 h-3.5 text-primary-foreground/70" />}
                <span className="text-xs text-primary-foreground/80 font-medium">
                  {user.name}
                </span>
              </div>
            )}

            <button onClick={handleLogout} onBlur={() => setConfirmLogout(false)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                confirmLogout
                  ? "bg-red-500 text-white"
                  : "text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
              }`}>
              <LogOut className="w-3.5 h-3.5" />
              {confirmLogout ? "Confirmer ?" : "Déconnexion"}
            </button>

            <button className="md:hidden text-primary-foreground p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-3 space-y-1 animate-fade-in">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg font-body font-medium text-sm transition-all ${
                  activeTab === id
                    ? "bg-accent text-accent-foreground"
                    : "text-primary-foreground/80 hover:bg-primary-light"
                }`}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg font-body font-medium text-sm text-primary-foreground/80 hover:bg-red-500/20 transition-all">
              <LogOut className="w-4 h-4" />
              {confirmLogout ? "Confirmer ?" : "Déconnexion"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
