// lib/excelUtils.ts
//
// FIX CRITIQUE — parseAffectationExcel
// ─────────────────────────────────────────────────────────────
// BUG RACINE : Le fichier Affectation.xlsx a son !ref (dimension de feuille)
// défini en C1:O45 (les données commencent à la colonne C, pas A).
//
// Comportement de XLSX.js sheet_to_json({header:1}) avec !ref="C1:O45" :
//   Les lignes sont retournées RECADRÉES depuis la colonne C.
//   row[0] = ColC (vide)
//   row[1] = ColD = Équipe 1   ← equipe1
//   row[2] = ColE = Code véhicule ← camion/code
//   row[3] = ColF = Équipe 2   ← equipe2
//
// L'ancien code supposait row[3]=ColD, row[4]=ColE, row[5]=ColF
// → lisait des colonnes vides/inexistantes → 0 entrées parsées !
//
// SOLUTION : détecter dynamiquement l'offset de colonnes en cherchant
// la ligne qui contient un code véhicule connu (D\d+, E\d+, T\d+…)
// puis déduire les indices exacts de equipe1, code, equipe2.
// Cette approche est robuste à tout changement de structure future.

import * as XLSX from "xlsx";
import { TruckAssignment } from "@/data/parkData";
import { ConsommationChauffeur, ConsommationEngin } from "@/data/stockData";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const readWorkbook = (file: File): Promise<XLSX.WorkBook> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        resolve(XLSX.read(data, { type: "array", cellDates: true }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsArrayBuffer(file);
  });

const toStr = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v).trim();

const toNum = (v: unknown): number => Math.max(0, Number(v) || 0);

// ─────────────────────────────────────────────────────────────
// isVehicleCode — reconnaît un code véhicule valide
// Camions  : D183, D184 … D255, T01, T02, Arr D69
// Engins   : 350 E71, 480 E49, 350-E64, 336-E,
//            CH 966 E48, CH 760 E22, NIVELEUSE E50, NIVELEUSE E12
// ─────────────────────────────────────────────────────────────
const isVehicleCode = (s: string): boolean => {
  const u = s.toUpperCase();
  return (
    /^D\d+/.test(u) ||               // Camions benne D183-D255
    /^T\d+/.test(u) ||               // Tombereau T01, T02
    /^ARR/.test(u) ||                // Arr D69
    /\bE\d+\b/.test(u) ||            // E22, E49, E50, E71…
    /[-\s]E\d*/.test(u) ||           // 350-E64, 480 E49, CH 760 E22
    u.endsWith("-E") ||              // 336-E
    /NIVELEUSE/.test(u) ||           // NIVELEUSE E50, NIVELEUSE E12
    /^CAMION$/.test(u)               // ligne d'entête (pour le skip)
  );
};

// ─────────────────────────────────────────────────────────────
// findColOffset — Détecte dynamiquement l'indice de colonne
// pour "equipe1" (la colonne juste avant le code véhicule).
//
// Stratégie : chercher une ligne où une cellule est un code véhicule
// ou le mot "CAMION"/"ENGIN" (entête). L'indice de cette cellule
// est l'indice du code (iCode). equipe1 = iCode-1, equipe2 = iCode+1.
// ─────────────────────────────────────────────────────────────
const findColOffset = (rows: unknown[][]): { iEquipe1: number; iCode: number; iEquipe2: number } => {
  for (const row of rows) {
    for (let j = 0; j < row.length; j++) {
      const cell = toStr(row[j]);
      if (isVehicleCode(cell) && j > 0) {
        // Trouver si la cellule précédente ressemble à un nom (non-vide, non-titre)
        const prev = toStr(row[j - 1]);
        if (prev && !/LISTE|AFFECTATION|BENGUERIR/i.test(prev)) {
          return { iEquipe1: j - 1, iCode: j, iEquipe2: j + 1 };
        }
      }
    }
  }
  // Fallback sécurisé pour nos fichiers exportés (aoa_to_sheet avec padding 3 null)
  return { iEquipe1: 3, iCode: 4, iEquipe2: 5 };
};

// ─────────────────────────────────────────────────────────────
// AFFECTATION — Affectation.xlsx / PARK_BG_16_FEVRIER.xlsx
//
// Structure réelle (feuille Feuil1, !ref = C1:O45) :
//   Row 2  : titre "LISTE D'AFFECTATION BENGUERIR DU 16/02/2026" (cellule fusionnée D2:F2)
//   Row 3  : entête "MOHA | CAMION | ERRAJI"
//   Row 4–32  : données camions (D183–D255, T01, T02, Arr D69)
//   Row 33 : marqueur "ENGINS" (cellule fusionnée D33:F33)
//   Row 34–41 : données engins (350 E71, 480 E49, 350-E64, 336-E,
//               CH 966 E48, CH 760 E22, NIVELEUSE E50, NIVELEUSE E12)
//
// BUG CORRIGÉ : !ref=C1:O45 → XLSX.js retourne row[0]=ColC, row[1]=ColD…
// Au lieu de supposer des indices fixes, on détecte dynamiquement iCode.
// ─────────────────────────────────────────────────────────────

export const parseAffectationExcel = async (file: File): Promise<TruckAssignment[]> => {
  const wb = await readWorkbook(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // ── Détection dynamique de l'offset de colonnes ──────────
  const { iEquipe1, iCode, iEquipe2 } = findColOffset(rows);

  const result: TruckAssignment[] = [];
  let currentType: "camion" | "engin" = "camion";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];

    const colEquipe1 = toStr(row[iEquipe1]);
    const colCode    = toStr(row[iCode]);
    const colEquipe2 = toStr(row[iEquipe2]);
    const colE1U     = colEquipe1.toUpperCase();
    const colCU      = colCode.toUpperCase();

    // Ligne entièrement vide → skip
    if (!colEquipe1 && !colCode && !colEquipe2) continue;

    // Titre "LISTE D'AFFECTATION..." → skip
    if (colE1U.includes("LISTE") || colE1U.includes("AFFECTATION")) continue;

    // Ligne d'entête colonnes : code = "CAMION", "CAMION / CODE", "CODE", "ENGIN"…
    if (
      colCU === "CAMION" || colCU === "CODE" || colCU === "ENGIN" ||
      colCU === "CAMION / CODE" || colCU === "ENGIN / CODE"
    ) continue;

    // Marqueur section ENGINS : equipe1 = "ENGINS", code vide
    if (colE1U === "ENGINS" && !colCode) {
      currentType = "engin";
      continue;
    }

    // Ligne sans code véhicule → skip
    if (!colCode) continue;

    // ── Déterminer le type depuis le code ─────────────────
    let type: "camion" | "engin" = currentType;

    if (/^D\d+/.test(colCU) || /^T\d+/.test(colCU) || /^ARR/.test(colCU)) {
      // Camions benne D183-D255, Tombereau T01/T02, Arrière D69
      type = "camion";
    } else if (
      /\bE\d*\b/.test(colCU) ||   // E seul ou E+chiffres : E71, E49, E64…
      colCU.endsWith("-E")    ||   // 336-E
      colCU.includes(" E")         // 350 E71, 480 E49, CH 760 E22, NIVELEUSE E50…
    ) {
      type = "engin";
    }

    result.push({
      equipe1: colEquipe1,
      camion:  colCode,
      equipe2: colEquipe2,
      type,
    });
  }

  return result;
};

export const exportAffectationExcel = (data: TruckAssignment[]) => {
  const camions = data.filter(d => d.type === "camion");
  const engins  = data.filter(d => d.type === "engin");

  // Export avec padding de 3 colonnes vides (A, B, C) pour reproduire
  // la structure originale — données en ColD(3), ColE(4), ColF(5)
  const rows: unknown[][] = [
    [null, null, null, null, null, null],
    [null, null, null, "LISTE D'AFFECTATION BENGUERIR", null, null],
    [null, null, null, "ÉQUIPE 1 (1er Shift)", "CAMION / CODE", "ÉQUIPE 2 (2ème Shift)"],
    ...camions.map(e => [null, null, null, e.equipe1, e.camion, e.equipe2]),
    [null, null, null, "ENGINS", null, null],
    ...engins.map(e => [null, null, null, e.equipe1, e.camion, e.equipe2]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 3 }, { wch: 3 }, { wch: 3 },
    { wch: 30 }, { wch: 16 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Feuil1");
  XLSX.writeFile(wb, `Affectation_BENGUERIR_${new Date().toISOString().split("T")[0]}.xlsx`);
};

// ─────────────────────────────────────────────────────────────
// RAPPORT CHAUFFEURS
// ─────────────────────────────────────────────────────────────

export const parseRapportChauffeurExcel = async (file: File): Promise<ConsommationChauffeur[]> => {
  const wb = await readWorkbook(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let headerRow = 0;
  const colMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] ?? [];
    const hasHeader = row.some(v =>
      /equipe|chauffeur|code|litre|pourcentage|activite|activité/i.test(toStr(v))
    );
    if (hasHeader) {
      headerRow = i;
      row.forEach((v, idx) => {
        const key = toStr(v).toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[\s\-_]+/g, "");
        colMap[key] = idx;
      });
      break;
    }
  }

  const get = (row: unknown[], ...keys: string[]): string => {
    for (const k of keys) {
      const idx = colMap[k];
      if (idx !== undefined && row[idx] != null) return toStr(row[idx]);
    }
    return "";
  };

  const result: ConsommationChauffeur[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (!row.some(v => v != null && String(v).trim())) continue;
    const equipe1  = get(row, "equipe1","equipe","chauffeur1","nom1") || toStr(row[0]);
    const equipe2  = get(row, "equipe2","chauffeur2","nom2")          || toStr(row[1]);
    const code     = get(row, "code","camion","vehicule")             || toStr(row[2]);
    const litres   = toNum(get(row, "litres","litre","qte"))          || toNum(row[3]);
    const pct      = toNum(get(row, "pourcentage","pct","%"))         || toNum(row[4]);
    const activite = get(row, "activite","activité","affectation")    || toStr(row[5]);
    if (!code && !equipe1) continue;
    result.push({ equipe1, equipe2, code, litres, pourcentage: pct, activite });
  }
  return result;
};

// ─────────────────────────────────────────────────────────────
// RAPPORT ENGINS
// ─────────────────────────────────────────────────────────────

export const parseRapportEnginExcel = async (file: File): Promise<ConsommationEngin[]> => {
  const wb = await readWorkbook(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let headerRow = 0;
  const colMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i] ?? [];
    const hasHeader = row.some(v =>
      /equipe|engin|litre|pourcentage|heure|affectation/i.test(toStr(v))
    );
    if (hasHeader) {
      headerRow = i;
      row.forEach((v, idx) => {
        const key = toStr(v).toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[\s\-_]+/g, "");
        colMap[key] = idx;
      });
      break;
    }
  }

  const get = (row: unknown[], ...keys: string[]): string => {
    for (const k of keys) {
      const idx = colMap[k];
      if (idx !== undefined && row[idx] != null) return toStr(row[idx]);
    }
    return "";
  };

  const result: ConsommationEngin[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (!row.some(v => v != null && String(v).trim())) continue;
    const equipe1     = get(row, "equipe1","equipe","conducteur1","nom1") || toStr(row[0]);
    const equipe2     = get(row, "equipe2","conducteur2","nom2")           || toStr(row[1]);
    const engin       = get(row, "engin","code","machine")                 || toStr(row[2]);
    const litres      = toNum(get(row, "litres","litre","qte"))            || toNum(row[3]);
    const pct         = toNum(get(row, "pourcentage","pct","%"))           || toNum(row[4]);
    const heure       = get(row, "heure","heures","h")                     || toStr(row[5]);
    const affectation = get(row, "affectation","activite","activité")      || toStr(row[6]);
    if (!engin && !equipe1) continue;
    result.push({ equipe1, equipe2, engin, litres, pourcentage: pct, heure, affectation });
  }
  return result;
};
