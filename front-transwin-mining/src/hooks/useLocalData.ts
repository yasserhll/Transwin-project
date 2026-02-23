// src/hooks/useLocalData.ts
// Version connectée au backend Laravel
// Remplace l'ancien useLocalData basé sur localStorage

import { useState, useEffect, useCallback } from "react";
import { affectations, rapports } from "@/lib/api";
import type {
  AffectationAPI,
  RapportDateAPI,
  RapportChauffeurAPI,
  RapportEnginAPI,
} from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// useAffectationData
// ─────────────────────────────────────────────────────────────
export function useAffectationData() {
  const [data, setData]       = useState<AffectationAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await affectations.getAll();
      setData(items);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (item: Omit<AffectationAPI, "id">) => {
    const created = await affectations.add(item);
    setData(prev => [...prev, created]);
  };

  const update = async (index: number, item: Omit<AffectationAPI, "id">) => {
    const id = data[index]?.id;
    if (!id) return;
    const updated = await affectations.update(id, item);
    setData(prev => prev.map((d, i) => i === index ? updated : d));
  };

  const remove = async (index: number) => {
    const id = data[index]?.id;
    if (!id) return;
    await affectations.remove(id);
    setData(prev => prev.filter((_, i) => i !== index));
  };

  const importData = async (items: Omit<AffectationAPI, "id">[]) => {
    await affectations.import(items);
    await load();
  };

  const reset = async () => {
    await load(); // recharge depuis le serveur
  };

  return {
    data, loading, error,
    add, update, remove, importData, reset,
    reload: load,
  };
}

// ─────────────────────────────────────────────────────────────
// useRapportData
// ─────────────────────────────────────────────────────────────
export function useRapportData() {
  const [allDates, setAllDates]     = useState<RapportDateAPI[]>([]);
  const [currentId, setCurrentId]   = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // ── Chargement initial ──────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await rapports.getAll();
      setAllDates(items);
      // Sélectionner la première date disponible
      if (items.length > 0 && currentId === null) {
        setCurrentId(items[0].id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => { load(); }, []); // une seule fois au montage

  // ── Date courante ────────────────────────────────────────────
  const currentDateObj = allDates.find(d => d.id === currentId) ?? null;
  const dates          = allDates.map(d => d.date);
  const currentDate    = currentDateObj?.date ?? "";
  const chauffeurs     = currentDateObj?.chauffeurs ?? [];
  const engins         = currentDateObj?.engins     ?? [];

  const setCurrentDate = (date: string) => {
    const found = allDates.find(d => d.date === date);
    if (found) setCurrentId(found.id);
  };

  // ── Gestion des dates ────────────────────────────────────────
  const addDate = async (date: string) => {
    const existing = allDates.find(d => d.date === date);
    if (existing) { setCurrentId(existing.id); return; }
    const created = await rapports.createDate(date);
    setAllDates(prev => [...prev, created].sort((a, b) => {
      const parse = (s: string) => {
        const [d, m, y] = s.split("/");
        return new Date(+y, +m - 1, +d).getTime();
      };
      return parse(a.date) - parse(b.date);
    }));
    setCurrentId(created.id);
  };

  const removeDate = async (date: string) => {
    const found = allDates.find(d => d.date === date);
    if (!found || allDates.length <= 1) return;
    await rapports.removeDate(found.id);
    const newDates = allDates.filter(d => d.id !== found.id);
    setAllDates(newDates);
    setCurrentId(newDates[0]?.id ?? null);
  };

  // ── Helper : mettre à jour la date courante dans le state ────
  const updateCurrentDate = (updater: (d: RapportDateAPI) => RapportDateAPI) => {
    setAllDates(prev => prev.map(d => d.id === currentId ? updater(d) : d));
  };

  // ── Chauffeurs ───────────────────────────────────────────────
  const addChauffeur = async (item: Omit<RapportChauffeurAPI, "id" | "rapport_date_id">) => {
    if (!currentId) return;
    const created = await rapports.addChauffeur(currentId, item);
    updateCurrentDate(d => ({ ...d, chauffeurs: [...d.chauffeurs, created] }));
  };

  const updateChauffeur = async (index: number, item: Omit<RapportChauffeurAPI, "id" | "rapport_date_id">) => {
    const id = chauffeurs[index]?.id;
    if (!id) return;
    const updated = await rapports.updateChauffeur(id, item);
    updateCurrentDate(d => ({
      ...d,
      chauffeurs: d.chauffeurs.map((c, i) => i === index ? updated : c),
    }));
  };

  const removeChauffeur = async (index: number) => {
    const id = chauffeurs[index]?.id;
    if (!id) return;
    await rapports.removeChauffeur(id);
    updateCurrentDate(d => ({
      ...d,
      chauffeurs: d.chauffeurs.filter((_, i) => i !== index),
    }));
  };

  const importChauffeurs = async (items: Omit<RapportChauffeurAPI, "id" | "rapport_date_id">[]) => {
    if (!currentId) return;
    await rapports.importChauffeurs(currentId, items);
    await load();
  };

  // ── Engins ───────────────────────────────────────────────────
  const addEngin = async (item: Omit<RapportEnginAPI, "id" | "rapport_date_id">) => {
    if (!currentId) return;
    const created = await rapports.addEngin(currentId, item);
    updateCurrentDate(d => ({ ...d, engins: [...d.engins, created] }));
  };

  const updateEngin = async (index: number, item: Omit<RapportEnginAPI, "id" | "rapport_date_id">) => {
    const id = engins[index]?.id;
    if (!id) return;
    const updated = await rapports.updateEngin(id, item);
    updateCurrentDate(d => ({
      ...d,
      engins: d.engins.map((e, i) => i === index ? updated : e),
    }));
  };

  const removeEngin = async (index: number) => {
    const id = engins[index]?.id;
    if (!id) return;
    await rapports.removeEngin(id);
    updateCurrentDate(d => ({
      ...d,
      engins: d.engins.filter((_, i) => i !== index),
    }));
  };

  const importEngins = async (items: Omit<RapportEnginAPI, "id" | "rapport_date_id">[]) => {
    if (!currentId) return;
    await rapports.importEngins(currentId, items);
    await load();
  };

  // ── Reset date courante ──────────────────────────────────────
  const reset = async () => { await load(); };

  return {
    // Navigation
    dates, currentDate, setCurrentDate, addDate, removeDate,
    // Données
    chauffeurs, engins,
    // Loading / Error
    loading, error,
    // Actions chauffeurs
    addChauffeur, updateChauffeur, removeChauffeur, importChauffeurs,
    // Actions engins
    addEngin, updateEngin, removeEngin, importEngins,
    // Reset
    reset, reload: load,
  };
}
