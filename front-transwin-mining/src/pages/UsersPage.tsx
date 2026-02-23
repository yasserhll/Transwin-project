// src/pages/UsersPage.tsx
// Gestion des comptes — accessible admin seulement

import { useState, useEffect } from "react";
import { users } from "@/lib/api";
import type { UserRecord } from "@/lib/api";
import {
  Plus, Pencil, Trash2, X, Shield, User,
  ToggleLeft, ToggleRight, Loader2, KeyRound,
} from "lucide-react";

// ── Formulaire vide ───────────────────────────────────────────
const emptyForm = { name: "", email: "", password: "", role: "user" as "admin"|"user", is_active: true };

const UsersPage = () => {
  const [data,       setData]       = useState<UserRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<{ open: boolean; user?: UserRecord }>({ open: false });
  const [form,       setForm]       = useState({ ...emptyForm });
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Chargement ────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true);
      const list = await users.getAll();
      setData(list);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Ouvrir modal ──────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...emptyForm });
    setModal({ open: true });
    setError(null);
  };

  const openEdit = (u: UserRecord) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role, is_active: u.is_active });
    setModal({ open: true, user: u });
    setError(null);
  };

  // ── Sauvegarder ───────────────────────────────────────────────
  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (modal.user) {
        // Modification — ne pas envoyer password vide
        const payload: Record<string, unknown> = {
          name: form.name, email: form.email,
          role: form.role, is_active: form.is_active,
        };
        if (form.password.trim()) payload.password = form.password;
        const updated = await users.update(modal.user.id, payload);
        setData(prev => prev.map(u => u.id === updated.id ? updated : u));
      } else {
        // Création
        if (!form.password.trim()) { setError("Le mot de passe est requis."); setSaving(false); return; }
        const created = await users.add({ ...form });
        setData(prev => [...prev, created]);
      }
      setModal({ open: false });
    } catch (e) {
      const msg = String(e);
      if (msg.includes("email")) setError("Cet email est déjà utilisé.");
      else setError("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  // ── Supprimer ─────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await users.remove(id);
      setData(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      alert("Impossible de supprimer : " + String(e));
    } finally {
      setConfirmDel(null);
    }
  };

  // ── Toggle actif/inactif rapide ───────────────────────────────
  const toggleActive = async (u: UserRecord) => {
    if (u.email === "admintranswin@gmail.com") return;
    const updated = await users.update(u.id, { is_active: !u.is_active });
    setData(prev => prev.map(d => d.id === updated.id ? updated : d));
  };

  // ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-mining flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-5 h-5" /> Gestion des Comptes
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{data.length} compte(s) enregistré(s)</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Nouveau compte
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary/5 border-b border-border">
                {["Nom", "Email", "Rôle", "Statut", "Créé le", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-primary uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((u, i) => (
                <tr key={u.id} className={`border-b border-border/60 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>

                  {/* Nom */}
                  <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${u.role === "admin" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    {u.name}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.email}</td>

                  {/* Rôle */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === "admin"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {u.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {u.role === "admin" ? "Administrateur" : "Utilisateur"}
                    </span>
                  </td>

                  {/* Statut toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.email === "admintranswin@gmail.com"}
                      className="flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={u.is_active ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                    >
                      {u.is_active
                        ? <ToggleRight className="w-5 h-5 text-mining-success" />
                        : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                      <span className={`text-xs font-medium ${u.is_active ? "text-mining-success" : "text-muted-foreground"}`}>
                        {u.is_active ? "Actif" : "Inactif"}
                      </span>
                    </button>
                  </td>

                  {/* Date création */}
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Modifier">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {u.email !== "admintranswin@gmail.com" && (
                        <button onClick={() => setConfirmDel(u.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Ajouter / Modifier ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card rounded-2xl shadow-mining w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-primary uppercase">
                {modal.user ? "Modifier le compte" : "Nouveau compte"}
              </h3>
              <button onClick={() => setModal({ open: false })}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nom complet</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Saisir le nom" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
                <input type="email" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Saisir l'email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  {modal.user ? "Nouveau mot de passe (laisser vide = inchangé)" : "Mot de passe"}
                </label>
                <input type="password" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={modal.user ? "Laisser vide pour ne pas changer" : "Saisir le mot de passe"}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>

              {/* Rôle */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Rôle</label>
                <select className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as "admin"|"user" }))}
                  disabled={modal.user?.email === "admintranswin@gmail.com"}>
                  <option value="user">Utilisateur (accès lecture seule sur comptes)</option>
                  <option value="admin">Administrateur (accès complet)</option>
                </select>
              </div>

              {/* Statut */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Compte actif</label>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  disabled={modal.user?.email === "admintranswin@gmail.com"}
                  className="disabled:opacity-50">
                  {form.is_active
                    ? <ToggleRight className="w-8 h-8 text-mining-success" />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                </button>
                <span className={`text-xs font-medium ${form.is_active ? "text-mining-success" : "text-muted-foreground"}`}>
                  {form.is_active ? "Actif" : "Inactif"}
                </span>
              </div>

              {/* Erreur */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ open: false })} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
                Annuler
              </button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {modal.user ? "Enregistrer" : "Créer le compte"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmer suppression ── */}
      {confirmDel !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-mining p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg font-bold text-red-500">Confirmer la suppression</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Supprimer le compte <strong>{data.find(u => u.id === confirmDel)?.name}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm">Annuler</button>
              <button onClick={() => handleDelete(confirmDel)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
