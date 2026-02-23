// Types pour les 6 sections de gestion de stock

// Beng 1, Beng 2, 81669A55 — même structure
export interface CiterneEntry {
  date: string;
  qteEntree: number;
  fournisseur: string;
  numBon: string;
  heure: string;
  code: string;
  immatriculation: string;
  kilometrage: number;
  qteSortie: number;
  remarque: string;
  serieDepart: number;
  serieFin: number;
}

// Sortie — résumé journalier par citerne
export interface SortieEntry {
  date: string;
  beng1: number;
  beng2: number;
  citerne81669: number;
}

// Matricule — registre des véhicules
export interface MatriculeEntry {
  code: string;
  matricule: string;
  type: string; // Camion, Citerne, Engin, etc.
}

// Global — vue combinée avec calculs
export interface GlobalEntry {
  date: string;
  heure: string;
  code: string;
  immatriculation: string;
  compteurKm: number;
  kilometrage: number;
  parcours: number;    // compteurKm - kilometrage
  litres: number;
  consommation: number; // litres / (parcours + 0.01)
  remarque: string;
  affectation: string; // Beng 1, Beng 2, 81669A55
}

// Calculs métier
export const calculerParcours = (compteurKm: number, kilometrage: number): number =>
  Math.max(0, compteurKm - kilometrage);

export const calculerConsommation = (litres: number, parcours: number): number =>
  parcours > 0 ? litres / (parcours + 0.01) : 0;

export const formatConsommation = (val: number): string => {
  if (val === 0) return "0.00%";
  return (val * 100).toFixed(2) + "%";
};
