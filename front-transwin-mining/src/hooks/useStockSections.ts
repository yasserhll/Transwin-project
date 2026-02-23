// src/hooks/useStockSections.ts
// Version connectée au backend Laravel
// Contient buildGlobalData pour compatibilité avec RapportPage.tsx

import { useState, useEffect, useMemo, useCallback } from "react";
import { citernes, sorties, matricules } from "@/lib/api";
import type { CiterneEntryAPI, SortieEntryAPI, MatriculeEntryAPI } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// Noms des sources
// ─────────────────────────────────────────────────────────────
export const SOURCE_BENG1 = "Beng 1";
export const SOURCE_BENG2 = "Beng 2";
export const SOURCE_81669 = "81669A55";

// ─────────────────────────────────────────────────────────────
// Types internes (camelCase) — format attendu par les composants
// ─────────────────────────────────────────────────────────────
export interface CiterneEntry {
  _id?: number;
  date: string;
  heure: string;
  qteEntree: number;
  fournisseur: string;
  numBon: string;
  code: string;
  immatriculation: string;
  kilometrage: number;
  qteSortie: number;
  remarque: string;
  serieDepart: number;
  serieFin: number;
}

export interface GlobalEntry {
  _sourceAff?: string;
  _sourceIdx?: number;
  date: string;
  heure: string;
  code: string;
  immatriculation: string;
  compteurKm: number;
  kilometrage: number;
  parcours: number;
  litres: number;
  consommation: number;
  remarque: string;
  affectation: string;
}

// ─────────────────────────────────────────────────────────────
// Conversion API ↔ interne
// ─────────────────────────────────────────────────────────────
function apiToCiterne(e: CiterneEntryAPI): CiterneEntry {
  return {
    _id:             e.id,
    date:            e.date            ?? "",
    heure:           e.heure           ?? "",
    qteEntree:       e.qte_entree      ?? 0,
    fournisseur:     e.fournisseur     ?? "",
    numBon:          e.num_bon         ?? "",
    code:            e.code            ?? "",
    immatriculation: e.immatriculation ?? "",
    kilometrage:     e.kilometrage     ?? 0,
    qteSortie:       e.qte_sortie      ?? 0,
    remarque:        e.remarque        ?? "",
    serieDepart:     e.serie_depart    ?? 0,
    serieFin:        e.serie_fin       ?? 0,
  };
}

function citerneToApi(e: CiterneEntry, source: CiterneEntryAPI["source"]): Omit<CiterneEntryAPI, "id"> {
  return {
    source,
    date:            e.date,
    heure:           e.heure,
    qte_entree:      e.qteEntree,
    fournisseur:     e.fournisseur,
    num_bon:         e.numBon,
    code:            e.code,
    immatriculation: e.immatriculation,
    kilometrage:     e.kilometrage,
    qte_sortie:      e.qteSortie,
    remarque:        e.remarque,
    serie_depart:    e.serieDepart,
    serie_fin:       e.serieFin,
  };
}

// ─────────────────────────────────────────────────────────────
// buildGlobalData — EXPORTÉ pour RapportPage.tsx
//
// Calcule la consommation depuis les 3 citernes.
// Règle validée sur Excel :
//   Gros camions benne (D ≥ 183) → litres / parcours        (L/km)
//   Tout le reste                 → litres / parcours / 100  (L/100km)
// ─────────────────────────────────────────────────────────────
function calcConsommation(code: string, litres: number, parcours: number): number {
  if (parcours <= 0) return 0;
  const m = code.match(/^D(\d+)/i);
  if (m && parseInt(m[1], 10) >= 183) return litres / parcours;
  return litres / parcours / 100;
}

function sortKey(date: string, heure: string): number {
  try {
    const [d, m, y] = date.split("/");
    const [h = "0", mn = "0"] = (heure || "00:00").split(":");
    return new Date(+y, +m - 1, +d, +h, +mn).getTime();
  } catch { return 0; }
}

export function buildGlobalData(
  beng1: CiterneEntry[],
  beng2: CiterneEntry[],
  c81669: CiterneEntry[]
): (GlobalEntry & { _sourceAff: string; _sourceIdx: number })[] {

  const all: { entry: CiterneEntry; aff: string; srcIdx: number }[] = [];
  beng1.forEach( (e, i) => { if (e.code) all.push({ entry: e, aff: SOURCE_BENG1,  srcIdx: i }); });
  beng2.forEach( (e, i) => { if (e.code) all.push({ entry: e, aff: SOURCE_BENG2,  srcIdx: i }); });
  c81669.forEach((e, i) => { if (e.code) all.push({ entry: e, aff: SOURCE_81669,  srcIdx: i }); });

  all.sort((a, b) => sortKey(a.entry.date, a.entry.heure) - sortKey(b.entry.date, b.entry.heure));

  const prevKm: Record<string, number> = {};

  return all.map(({ entry, aff, srcIdx }) => {
    const code = String(entry.code ?? "");
    const compteurKm = entry.kilometrage > 0 ? entry.kilometrage : undefined;
    const kmPrec = prevKm[code];

    let parcours = 0;
    if (compteurKm !== undefined && kmPrec !== undefined && compteurKm >= kmPrec) {
      parcours = compteurKm - kmPrec;
    }

    const litres = entry.qteSortie;
    const consommation = calcConsommation(code, litres, parcours);

    if (compteurKm !== undefined) prevKm[code] = compteurKm;

    return {
      _sourceAff:      aff,
      _sourceIdx:      srcIdx,
      date:            entry.date,
      heure:           entry.heure,
      code,
      immatriculation: entry.immatriculation,
      compteurKm:      compteurKm ?? 0,
      kilometrage:     kmPrec ?? 0,
      parcours,
      litres,
      consommation,
      remarque:        entry.remarque,
      affectation:     aff,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Factory générique Citerne — connectée à l'API Laravel
// ─────────────────────────────────────────────────────────────
function useCiterneSection(source: CiterneEntryAPI["source"]) {
  const [rawData, setRawData] = useState<CiterneEntryAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await citernes.getAll(source);
      setRawData(items);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => { load(); }, [load]);

  // data en format interne (camelCase) — compatible avec tous les composants
  const data = useMemo(() => rawData.map(apiToCiterne), [rawData]);

  const add = async (item: CiterneEntry) => {
    const created = await citernes.add(citerneToApi(item, source));
    setRawData(prev => [...prev, created]);
  };

  const update = async (index: number, item: CiterneEntry) => {
    const id = rawData[index]?.id;
    if (!id) return;
    const updated = await citernes.update(id, citerneToApi(item, source));
    setRawData(prev => prev.map((d, i) => i === index ? updated : d));
  };

  const remove = async (index: number) => {
    const id = rawData[index]?.id;
    if (!id) return;
    await citernes.remove(id);
    setRawData(prev => prev.filter((_, i) => i !== index));
  };

  const importData = async (items: CiterneEntry[]) => {
    await citernes.import(source, items.map(i => citerneToApi(i, source)));
    await load();
  };

  const reset = async () => {
    await citernes.reset(source);
    setRawData([]);
  };

  return {
    data,       // CiterneEntry[] format interne
    rawData,    // CiterneEntryAPI[] format API (avec id)
    loading, error,
    add, update, remove, importData, reset,
    reload: load,
  };
}

// ─────────────────────────────────────────────────────────────
// Exports Citernes
// ─────────────────────────────────────────────────────────────
export function useBeng1Data()  { return useCiterneSection("beng1");  }
export function useBeng2Data()  { return useCiterneSection("beng2");  }
export function use81669Data()  { return useCiterneSection("81669");  }

// ─────────────────────────────────────────────────────────────
// useSortieData
// ─────────────────────────────────────────────────────────────
export interface SortieEntry {
  _id?: number;
  date: string;
  heure: string;
  code: string;
  immatriculation: string;
  litres: number;
  chauffeur: string;
  remarque: string;
}

export function useSortieData() {
  const [rawData, setRawData] = useState<SortieEntryAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const items = await sorties.getAll();
      setRawData(items);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const data = useMemo<SortieEntry[]>(() => rawData.map(e => ({
    _id:             e.id,
    date:            e.date            ?? "",
    heure:           e.heure           ?? "",
    code:            e.code            ?? "",
    immatriculation: e.immatriculation ?? "",
    litres:          e.litres          ?? 0,
    chauffeur:       e.chauffeur       ?? "",
    remarque:        e.remarque        ?? "",
  })), [rawData]);

  const add = async (item: SortieEntry) => {
    const created = await sorties.add({
      date: item.date, heure: item.heure, code: item.code,
      immatriculation: item.immatriculation, litres: item.litres,
      chauffeur: item.chauffeur, remarque: item.remarque,
    });
    setRawData(prev => [...prev, created]);
  };

  const update = async (index: number, item: SortieEntry) => {
    const id = rawData[index]?.id;
    if (!id) return;
    const updated = await sorties.update(id, {
      date: item.date, heure: item.heure, code: item.code,
      immatriculation: item.immatriculation, litres: item.litres,
      chauffeur: item.chauffeur, remarque: item.remarque,
    });
    setRawData(prev => prev.map((d, i) => i === index ? updated : d));
  };

  const remove = async (index: number) => {
    const id = rawData[index]?.id;
    if (!id) return;
    await sorties.remove(id);
    setRawData(prev => prev.filter((_, i) => i !== index));
  };

  const importData = async (items: SortieEntry[]) => {
    await sorties.import(items.map(i => ({
      date: i.date, heure: i.heure, code: i.code,
      immatriculation: i.immatriculation, litres: i.litres,
      chauffeur: i.chauffeur, remarque: i.remarque,
    })));
    await load();
  };

  const reset = async () => {
    await sorties.reset();
    setRawData([]);
  };

  return { data, loading, error, add, update, remove, importData, reset, reload: load };
}

// ─────────────────────────────────────────────────────────────
// useMatriculeData
// ─────────────────────────────────────────────────────────────
export interface MatriculeEntry {
  _id?: number;
  code: string;
  matricule: string;
  type: string;
}

export function useMatriculeData() {
  const [rawData, setRawData] = useState<MatriculeEntryAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const items = await matricules.getAll();
      setRawData(items);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const data = useMemo<MatriculeEntry[]>(() => rawData.map(e => ({
    _id: e.id, code: e.code, matricule: e.matricule ?? "", type: e.type ?? "",
  })), [rawData]);

  const add = async (item: MatriculeEntry) => {
    const created = await matricules.add({ code: item.code, matricule: item.matricule, type: item.type });
    setRawData(prev => [...prev, created]);
  };

  const update = async (index: number, item: MatriculeEntry) => {
    const id = rawData[index]?.id;
    if (!id) return;
    const updated = await matricules.update(id, { code: item.code, matricule: item.matricule, type: item.type });
    setRawData(prev => prev.map((d, i) => i === index ? updated : d));
  };

  const remove = async (index: number) => {
    const id = rawData[index]?.id;
    if (!id) return;
    await matricules.remove(id);
    setRawData(prev => prev.filter((_, i) => i !== index));
  };

  const importData = async (items: MatriculeEntry[]) => {
    await matricules.import(items.map(i => ({ code: i.code, matricule: i.matricule, type: i.type })));
    await load();
  };

  const reset = async () => { await load(); };

  return { data, loading, error, add, update, remove, importData, reset, reload: load };
}

// ─────────────────────────────────────────────────────────────
// useGlobalSync — synchronisation bidirectionnelle
// (gardé pour compatibilité avec GlobalSection)
// ─────────────────────────────────────────────────────────────
export function useGlobalSync(
  beng1:  ReturnType<typeof useBeng1Data>,
  beng2:  ReturnType<typeof useBeng2Data>,
  c81669: ReturnType<typeof use81669Data>
) {
  const globalData = useMemo(
    () => buildGlobalData(beng1.data, beng2.data, c81669.data),
    [beng1.data, beng2.data, c81669.data]
  );

  const resolveSource = (gIdx: number) => {
    const g = globalData[gIdx] as GlobalEntry & { _sourceAff: string; _sourceIdx: number };
    if (!g) return null;
    if (g._sourceAff === SOURCE_BENG1)  return { hook: beng1,  idx: g._sourceIdx };
    if (g._sourceAff === SOURCE_BENG2)  return { hook: beng2,  idx: g._sourceIdx };
    if (g._sourceAff === SOURCE_81669)  return { hook: c81669, idx: g._sourceIdx };
    return null;
  };

  const addToSource = (affectation: string, citerne: CiterneEntry) => {
    if (affectation === SOURCE_BENG1)      beng1.add(citerne);
    else if (affectation === SOURCE_BENG2) beng2.add(citerne);
    else if (affectation === SOURCE_81669) c81669.add(citerne);
  };

  const update = (globalIdx: number, updatedGlobal: GlobalEntry) => {
    const src = resolveSource(globalIdx);
    if (!src) return;
    const original = src.hook.data[src.idx];
    if (!original) return;
    const updatedCiterne: CiterneEntry = {
      ...original,
      date:            updatedGlobal.date,
      heure:           updatedGlobal.heure,
      code:            updatedGlobal.code,
      immatriculation: updatedGlobal.immatriculation,
      kilometrage:     updatedGlobal.compteurKm ?? original.kilometrage,
      qteSortie:       updatedGlobal.litres,
      remarque:        updatedGlobal.remarque,
    };
    const oldAff = (globalData[globalIdx] as any)._sourceAff;
    const newAff = updatedGlobal.affectation;
    if (newAff && newAff !== oldAff) {
      src.hook.remove(src.idx);
      addToSource(newAff, updatedCiterne);
    } else {
      src.hook.update(src.idx, updatedCiterne);
    }
  };

  const remove = (globalIdx: number) => {
    const src = resolveSource(globalIdx);
    if (!src) return;
    src.hook.remove(src.idx);
  };

  const add = (newGlobal: GlobalEntry) => {
    const aff = newGlobal.affectation || SOURCE_BENG1;
    const citerne: CiterneEntry = {
      date: newGlobal.date, qteEntree: 0, fournisseur: "", numBon: "",
      heure: newGlobal.heure, code: newGlobal.code,
      immatriculation: newGlobal.immatriculation,
      kilometrage: newGlobal.compteurKm ?? 0,
      qteSortie: newGlobal.litres,
      remarque: newGlobal.remarque,
      serieDepart: 0, serieFin: 0,
    };
    addToSource(aff, citerne);
  };

  const reset = () => { beng1.reset(); beng2.reset(); c81669.reset(); };

  return {
    data: globalData as GlobalEntry[],
    add, update, remove, reset,
    loading: beng1.loading || beng2.loading || c81669.loading,
    error: beng1.error || beng2.error || c81669.error,
  };
}
