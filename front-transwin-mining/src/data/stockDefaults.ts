// data/stockDefaults.ts
// Données par défaut pour chaque section Stock
// Extraites des fichiers Excel réels

import { CiterneEntry, SortieEntry, MatriculeEntry, GlobalEntry } from "./stockTypes";

// ─── Beng 1 ──────────────────────────────────────────────────
export const defaultBeng1: CiterneEntry[] = [
  { date: "30/12/2025", qteEntree: 0,     fournisseur: "", numBon: "14532", heure: "12:31", code: "74090",  immatriculation: "74090A55",          kilometrage: 182755, qteSortie: 58,  remarque: "", serieDepart: 3674185, serieFin: 3674243 },
  { date: "30/12/2025", qteEntree: 0,     fournisseur: "", numBon: "14533", heure: "15:09", code: "D185",   immatriculation: "85314A55",          kilometrage: 36308,  qteSortie: 225, remarque: "", serieDepart: 3674243, serieFin: 3674468 },
  { date: "30/12/2025", qteEntree: 0,     fournisseur: "", numBon: "14534", heure: "15:19", code: "D207",   immatriculation: "86474A55",          kilometrage: 23921,  qteSortie: 162, remarque: "", serieDepart: 3674468, serieFin: 3674630 },
  { date: "14/01/2026", qteEntree: 30000, fournisseur: "", numBon: "12905", heure: "15:15", code: "D217",   immatriculation: "86687A55",          kilometrage: 26971,  qteSortie: 193, remarque: "", serieDepart: 3704230, serieFin: 3704423 },
];

// ─── Beng 2 ──────────────────────────────────────────────────
export const defaultBeng2: CiterneEntry[] = [
  { date: "27/12/2025", qteEntree: 0, fournisseur: "", numBon: "4145", heure: "09:38", code: "E22",  immatriculation: "CHARGEUSE 760 GS",   kilometrage: 13796, qteSortie: 172, remarque: "", serieDepart: 3876268, serieFin: 3876440 },
  { date: "27/12/2025", qteEntree: 0, fournisseur: "", numBon: "4146", heure: "09:39", code: "E50",  immatriculation: "NIVELEUSE 190 SDLG", kilometrage: 4361,  qteSortie: 99,  remarque: "", serieDepart: 3876440, serieFin: 3876539 },
];

// ─── 81669A55 ─────────────────────────────────────────────────
export const default81669: CiterneEntry[] = [
  { date: "06/01/2026", qteEntree: 0, fournisseur: "", numBon: "1495", heure: "09:03", code: "75356", immatriculation: "75356A55", kilometrage: 170808, qteSortie: 53, remarque: "", serieDepart: 660636, serieFin: 660689 },
];

// ─── Sortie ───────────────────────────────────────────────────
export const defaultSortie: SortieEntry[] = [];

// ─── Matricule ────────────────────────────────────────────────
export const defaultMatricule: MatriculeEntry[] = [];

// ─── Global ───────────────────────────────────────────────────
export const defaultGlobal: GlobalEntry[] = [];
