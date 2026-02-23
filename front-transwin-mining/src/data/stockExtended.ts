// Extended stockData with matricule/sortie structure
import { stockData, consommationChauffeurs, consommationEngins } from "@/data/stockData";

export interface MatriculeEntry {
  date: string;
  code: string;          // code camion/engin ex: D183
  chauffeur: string;
  compteurKm: number;    // compteur fin de journée
  kilometrage: number;   // kilometrage début journée
  parcours: number;      // compteur - kilometrage
  litres: number;
  consommation: number;  // litres / (parcours + 0.01)
  activite: string;
  equipe: 1 | 2;
}

// Calcul parcours et consommation selon formule:
// parcours = compteur_km - kilometrage
// consommation = litres / (parcours + 0.01)
export const calculerParcours = (compteurKm: number, kilometrage: number): number => {
  return Math.max(0, compteurKm - kilometrage);
};

export const calculerConsommation = (litres: number, parcours: number): number => {
  return litres / (parcours + 0.01);
};

export { stockData, consommationChauffeurs, consommationEngins };
