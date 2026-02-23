// PARK_BG - Liste d'affectation BENGUERIR
// Données extraites du fichier PARK_BG_16_FEVRIER.xlsx

export interface TruckAssignment {
  equipe1: string;
  camion: string;
  equipe2: string;
  type: "camion" | "engin";
}

export const parkData: TruckAssignment[] = [
  // CAMIONS
  { equipe1: "GUARNAOUI TARIQ", camion: "D183", equipe2: "ELHADI EL MANSOURI", type: "camion" },
  { equipe1: "OUAQA MOHAMED", camion: "D184", equipe2: "ALAMI YASSINE", type: "camion" },
  { equipe1: "NOUINI HICHAM", camion: "D185", equipe2: "ALLAOUI AZIZ", type: "camion" },
  { equipe1: "KHALID SALMI", camion: "D186", equipe2: "EZ-ZANZOUN NOUREDDINE", type: "camion" },
  { equipe1: "AANTAR ABDERAZZAK", camion: "D187", equipe2: "RACHID HICHAM", type: "camion" },
  { equipe1: "CHAFIQ SAID", camion: "D188", equipe2: "DEBAR MOHAMED", type: "camion" },
  { equipe1: "MEZOUAR ABDELFATTAH", camion: "D202", equipe2: "LAACHIR LARBII", type: "camion" },
  { equipe1: "LARHRIB ABDELATIF", camion: "D203", equipe2: "TOUHAMI RAHAL", type: "camion" },
  { equipe1: "DANI OMAR", camion: "D204", equipe2: "RBIB RACHID", type: "camion" },
  { equipe1: "RAHILI MOHAMED", camion: "D205", equipe2: "LAYADI ABDELILAH", type: "camion" },
  { equipe1: "MBIRKAT JAOUAD", camion: "D206", equipe2: "OUKHDAD HMAD", type: "camion" },
  { equipe1: "BENTALEB OMAR", camion: "D207", equipe2: "AIT EL JADIDA HASSAN", type: "camion" },
  { equipe1: "MOUHSSINE RACHID", camion: "D208", equipe2: "EL MALEKY NOUREDDINE", type: "camion" },
  { equipe1: "KHALIL BELKHALIL", camion: "D209", equipe2: "LAMANE MY EL HOUSSINE", type: "camion" },
  { equipe1: "GHOUFIRI KHALID", camion: "D210", equipe2: "MAMLOUK NOURDDINE", type: "camion" },
  { equipe1: "EL BEKKKALI ACHRAF", camion: "D211", equipe2: "LAHMIDI SAID", type: "camion" },
  { equipe1: "GHALI ABDELILAH", camion: "D212", equipe2: "FELLAH AZOUZ", type: "camion" },
  { equipe1: "LAAJIJIL ABDELAHDI", camion: "D213", equipe2: "ERRAJI ZOUHAIR", type: "camion" },
  { equipe1: "MAZOUZ YOUSSEF", camion: "D214", equipe2: "ESSAHEB ABDELGHANI", type: "camion" },
  { equipe1: "BOUATHMANE REDOUANE", camion: "D216", equipe2: "MASROUR HASSAN", type: "camion" },
  { equipe1: "CHEHAB ABDELMAJID", camion: "D217", equipe2: "BADDI MHAMED", type: "camion" },
  { equipe1: "LAHMAD MOURAD", camion: "D218", equipe2: "EL AMRAOUI HICHAM", type: "camion" },
  { equipe1: "KABAB ABDELKARIM", camion: "D219", equipe2: "ELFEN ABDELHAK", type: "camion" },
  { equipe1: "RTAIL ABDELAZIZ", camion: "D253", equipe2: "SAID HAZIM", type: "camion" },
  { equipe1: "EL ABEDY YOUSSEF", camion: "D254", equipe2: "ISMAYL SALMI", type: "camion" },
  { equipe1: "OUARGO HASSAN", camion: "D255", equipe2: "SALAH SALMI", type: "camion" },
  { equipe1: "OURAHOU EL HOUCINE", camion: "T01", equipe2: "", type: "camion" },
  { equipe1: "DIGOUG REDOUANE", camion: "T02", equipe2: "", type: "camion" },
  { equipe1: "LIMOUNI ABDELGHANI", camion: "Arr D69", equipe2: "OU MAGHID MOHAMED", type: "camion" },
  // ENGINS
  { equipe1: "CHERKI YOUSSEF", camion: "350 E71", equipe2: "DAHA ELBOUKHARI", type: "engin" },
  { equipe1: "RADOUANI MUSTAPHA", camion: "480 E49", equipe2: "OUSMYNE ABDELKBIR", type: "engin" },
  { equipe1: "EL GHAZZAL ADIL", camion: "350-E64", equipe2: "ALLALI IBRAHIM", type: "engin" },
  { equipe1: "JABBAR SAID", camion: "336-E", equipe2: "EL HNIOUI MILOUD", type: "engin" },
  { equipe1: "RAFYK MUSTAPHA", camion: "CH 966 E48", equipe2: "BACHRA ABDELLAH", type: "engin" },
  { equipe1: "EL MANSSOUM HASSANE", camion: "CH 760 E22", equipe2: "FARSSI ADIL", type: "engin" },
  { equipe1: "STITI MOHAMED", camion: "NIVELEUSE E50", equipe2: "", type: "engin" },
  { equipe1: "SAID EL-ALLAAOUI", camion: "NIVELEUSE E12", equipe2: "TOUAHEMA ABDELJALIL", type: "engin" },
];

export const assignmentDate = "16/02/2026";
export const site = "BENGUERIR";
