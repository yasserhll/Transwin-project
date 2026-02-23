// Données Gestion de Stock - Gasoil/Diesel BENGUERIR 2026
// Extraites du fichier Gestion_de_stock_BENGUERIR_2026.xlsx

export interface StockEntry {
  date: string;
  citerne1: number; // Citerne Beng 1
  citerne2: number; // Citerne Beng 2
  citerne81669: number; // Citerne 81669A55
  total?: number;
}

export const stockData: StockEntry[] = [
  { date: "27/12/2025", citerne1: 0, citerne2: 324, citerne81669: 88 },
  { date: "28/12/2025", citerne1: 0, citerne2: 0, citerne81669: 0 },
  { date: "29/12/2025", citerne1: 0, citerne2: 0, citerne81669: 3337 },
  { date: "30/12/2025", citerne1: 4256, citerne2: 3617, citerne81669: 3548 },
  { date: "31/12/2025", citerne1: 1187, citerne2: 5359, citerne81669: 3620 },
  { date: "01/01/2026", citerne1: 2228, citerne2: 6355, citerne81669: 3091 },
  { date: "02/01/2026", citerne1: 2134, citerne2: 4210, citerne81669: 3468 },
  { date: "03/01/2026", citerne1: 47, citerne2: 1980, citerne81669: 2225 },
  { date: "04/01/2026", citerne1: 0, citerne2: 0, citerne81669: 0 },
  { date: "05/01/2026", citerne1: 0, citerne2: 0, citerne81669: 750 },
  { date: "06/01/2026", citerne1: 0, citerne2: 43, citerne81669: 53 },
  { date: "07/01/2026", citerne1: 51, citerne2: 5272, citerne81669: 3551 },
  { date: "08/01/2026", citerne1: 3070, citerne2: 3581, citerne81669: 3253 },
  { date: "09/01/2026", citerne1: 7408, citerne2: 0, citerne81669: 3436 },
  { date: "10/01/2026", citerne1: 5730, citerne2: 3991, citerne81669: 3431 },
  { date: "11/01/2026", citerne1: 85, citerne2: 0, citerne81669: 2919 },
  { date: "12/01/2026", citerne1: 1508, citerne2: 6534, citerne81669: 3539 },
  { date: "13/01/2026", citerne1: 2341, citerne2: 5966, citerne81669: 4348 },
  { date: "14/01/2026", citerne1: 849, citerne2: 5200, citerne81669: 2564 },
  { date: "15/01/2026", citerne1: 1693, citerne2: 4220, citerne81669: 2067 },
  { date: "16/01/2026", citerne1: 4691, citerne2: 1380, citerne81669: 3843 },
  { date: "17/01/2026", citerne1: 128, citerne2: 2824, citerne81669: 66 },
  { date: "18/01/2026", citerne1: 0, citerne2: 0, citerne81669: 0 },
  { date: "19/01/2026", citerne1: 672, citerne2: 807, citerne81669: 0 },
  { date: "20/01/2026", citerne1: 1053, citerne2: 2532, citerne81669: 3119 },
  { date: "21/01/2026", citerne1: 5247, citerne2: 2091, citerne81669: 3930 },
  { date: "22/01/2026", citerne1: 6309, citerne2: 643, citerne81669: 1872 },
  { date: "23/01/2026", citerne1: 2444, citerne2: 0, citerne81669: 493 },
  { date: "24/01/2026", citerne1: 1394, citerne2: 0, citerne81669: 434 },
  { date: "25/01/2026", citerne1: 0, citerne2: 0, citerne81669: 0 },
  { date: "26/01/2026", citerne1: 4862, citerne2: 1637, citerne81669: 2965 },
  { date: "27/01/2026", citerne1: 815, citerne2: 6012, citerne81669: 3863 },
  { date: "28/01/2026", citerne1: 0, citerne2: 6545, citerne81669: 3025 },
  { date: "29/01/2026", citerne1: 2954, citerne2: 4079, citerne81669: 4187 },
  { date: "30/01/2026", citerne1: 2003, citerne2: 5225, citerne81669: 499 },
  { date: "31/01/2026", citerne1: 3905, citerne2: 641, citerne81669: 3951 },
  { date: "01/02/2026", citerne1: 0, citerne2: 0, citerne81669: 0 },
  { date: "02/02/2026", citerne1: 6041, citerne2: 1064, citerne81669: 1117 },
  { date: "03/02/2026", citerne1: 0, citerne2: 36, citerne81669: 0 },
  { date: "04/02/2026", citerne1: 4216, citerne2: 834, citerne81669: 1699 },
  { date: "05/02/2026", citerne1: 4025, citerne2: 2195, citerne81669: 1941 },
  { date: "06/02/2026", citerne1: 3894, citerne2: 1957, citerne81669: 1860 },
  { date: "07/02/2026", citerne1: 3122, citerne2: 2827, citerne81669: 2400 },
  { date: "08/02/2026", citerne1: 0, citerne2: 0, citerne81669: 0 },
  { date: "09/02/2026", citerne1: 2065, citerne2: 6872, citerne81669: 2619 },
  { date: "10/02/2026", citerne1: 3191, citerne2: 5873, citerne81669: 2178 },
  { date: "11/02/2026", citerne1: 1872, citerne2: 2957, citerne81669: 2045 },
  { date: "12/02/2026", citerne1: 1112, citerne2: 3487, citerne81669: 1572 },
  { date: "13/02/2026", citerne1: 4798, citerne2: 2281, citerne81669: 2205 },
  { date: "14/02/2026", citerne1: 4274, citerne2: 1414, citerne81669: 2471 },
  { date: "15/02/2026", citerne1: 0, citerne2: 0, citerne81669: 0 },
  { date: "16/02/2026", citerne1: 3899, citerne2: 3167, citerne81669: 1887 },
  { date: "17/02/2026", citerne1: 4278, citerne2: 2233, citerne81669: 2054 },
  { date: "18/02/2026", citerne1: 1986, citerne2: 6216, citerne81669: 3015 },
  { date: "19/02/2026", citerne1: 1281, citerne2: 4192, citerne81669: 2216 },
  { date: "20/02/2026", citerne1: 236, citerne2: 881, citerne81669: 0 },
].map(entry => ({
  ...entry,
  total: entry.citerne1 + entry.citerne2 + entry.citerne81669
}));

// Données de consommation journalière (CONSOMMATION JOURNALIERE) 
// basées sur l'image fournie pour le 19/02/2026
export interface ConsommationChauffeur {
  equipe1: string;
  equipe2: string;
  code: string;
  litres: number;
  pourcentage: number;
  activite: string;
}

export interface ConsommationEngin {
  equipe1: string;
  equipe2: string;
  engin: string;
  litres: number;
  pourcentage: number;
  heure: string;
  affectation: string;
}

export const consommationChauffeurs: ConsommationChauffeur[] = [
  { equipe1: "GUARNAOUI TARIQ", equipe2: "CHAROUITE YASSINE", code: "D183", litres: 225, pourcentage: 79.51, activite: "PHOSPHATE" },
  { equipe1: "DANI OMAR", equipe2: "RBIB RACHID", code: "D185", litres: 218, pourcentage: 90.46, activite: "PHOSPHATE" },
  { equipe1: "KHALID SALMI", equipe2: "ERRABHI YOUSSEF", code: "D216", litres: 155, pourcentage: 69.51, activite: "PHOSPHATE" },
  { equipe1: "HICHAM RACHID", equipe2: "ERRABHI AATMAN", code: "D213", litres: 178, pourcentage: 83.57, activite: "PHOSPHATE" },
  { equipe1: "CHAFIQ SAID", equipe2: "DEBAR MOHAMED", code: "D188", litres: 200, pourcentage: 72.20, activite: "STERILE" },
  { equipe1: "MEZOUAR ABDELFATTAH", equipe2: "LAACHIR LARBII", code: "D202", litres: 152, pourcentage: 63.07, activite: "PHOSPHATE" },
  { equipe1: "EDDIANI JAOUAD", equipe2: "RAHAL TOHAMI", code: "D204", litres: 156, pourcentage: 46.43, activite: "STERILE" },
  { equipe1: "RAHILI MOHAMED", equipe2: "LAYADI ABDELILAH", code: "D205", litres: 246, pourcentage: 71.10, activite: "PHOSPHATE/STERILE" },
  { equipe1: "BENTALEB OMAR", equipe2: "OUKHDAD HMAD", code: "D212", litres: 244, pourcentage: 85.31, activite: "STERILE" },
  { equipe1: "OUKHDAD", equipe2: "AIT EL JADIDA HASSAN", code: "D210", litres: 265, pourcentage: 77.49, activite: "PHOSPHATE/STERILE" },
  { equipe1: "EL MALEKY NOUREDDINE", equipe2: "MOUHSSINE RACHID", code: "D208", litres: 238, pourcentage: 75.32, activite: "PHOSPHATE/STERILE" },
  { equipe1: "EL FEN ABDELHAQ", equipe2: "LAMANE MY EL HOUSSINE", code: "D209", litres: 293, pourcentage: 89.33, activite: "STERILE" },
  { equipe1: "EL BEKKKALI ACHRAF", equipe2: "LAHMIDI SAID", code: "D211", litres: 189, pourcentage: 63.85, activite: "PHOSPHATE" },
  { equipe1: "MAZOUZ YOUSSEF", equipe2: "BOUDIMA MOHAMMED", code: "D214", litres: 258, pourcentage: 65.82, activite: "STERILE" },
  { equipe1: "KABAB ABDELKARIM", equipe2: "KHALOUQ ABDELOUAFI", code: "D219", litres: 255, pourcentage: 101.59, activite: "PHOSPHATE/STERILE" },
  { equipe1: "DIGOUG REDOUANE", equipe2: "ESSAHEB ABDELGHANI", code: "D255", litres: 222, pourcentage: 59.68, activite: "PHOSPHATE" },
];

export const consommationEngins: ConsommationEngin[] = [
  { equipe1: "GHAZAL ADIL", equipe2: "EL BOUKHARI DAHA", engin: "350 E71", litres: 483, pourcentage: 37.15, heure: "13H", affectation: "PHOSPHATE" },
  { equipe1: "ALLALI IBRAHIM", equipe2: "OUSMYNE ABDELKABIR", engin: "480 E49", litres: 470, pourcentage: 36.15, heure: "13H", affectation: "STERILE" },
  { equipe1: "CHERKI YOUSSEF", equipe2: "ALLALI IBRAHIM", engin: "336 E18", litres: 293, pourcentage: 24.42, heure: "12H", affectation: "STERILE/PHOSPHATE" },
  { equipe1: "RADOUANI MUSTAPHA", equipe2: "HENNIOUI MILOUD", engin: "350-E64", litres: 381, pourcentage: 38.10, heure: "10H", affectation: "STERILE" },
  { equipe1: "EL MANSSOUM HASSANE", equipe2: "FARSSI ADIL", engin: "CH 760 E22", litres: 195, pourcentage: 0, heure: "-", affectation: "DECHARGE/STERILE" },
  { equipe1: "RAFYK MUSTAPHA", equipe2: "BACHRA ABDELLAH", engin: "CH 966 E48", litres: 120, pourcentage: 10.00, heure: "12H", affectation: "DECHARGE/STERILE" },
  { equipe1: "", equipe2: "", engin: "CH 966 E48", litres: 119, pourcentage: 59.50, heure: "2H", affectation: "DECHARGE/STERILE" },
  { equipe1: "", equipe2: "TOUAHEMA ABDELJALIL", engin: "NIV E12", litres: 275, pourcentage: 8.87, heure: "31H", affectation: "PISTE/STERILE" },
  { equipe1: "STITI MOHAMED", equipe2: "", engin: "NIVELEUSE E50", litres: 123, pourcentage: 13.67, heure: "9H", affectation: "PISTE/STERILE" },
];

export const reportDate = "19/02/2026";
export const reportSite = "BENGUERIR";
