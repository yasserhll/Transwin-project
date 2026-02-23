// lib/stockExcelUtils.ts
// Parsing basé sur la STRUCTURE RÉELLE des fichiers Excel fournis
//
// FIXES v2 :
//   1. parseGlobalExcel  — codes numériques (74090, 81669…) correctement normalisés en string
//                          + consommation #REF! / #DIV/0! ignorée proprement
//   2. parseMatriculeExcel — auto-détection du type enrichie :
//                          codes numériques → "Citerne", CIT* → "Citerne",
//                          D*/T*/Arr* → "Camion", E* / *E\d* → "Engin",
//                          mots-clés spéciaux (GROUPE, CADEX, GIDNA…) → "Autre"
//   3. parseSortieExcel  — colonne Beng 2 toujours "#VALUE!" car formule vers fichier externe.
//                          On recalcule le total journalier directement depuis les données
//                          en mémoire (beng2Data passé en paramètre optionnel).
//                          parseSortieFromCiternes reste la méthode recommandée.

import * as XLSX from "xlsx";
import { CiterneEntry, SortieEntry, MatriculeEntry, GlobalEntry } from "@/data/stockTypes";

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

/** Date (Date object, string, nombre Excel) → "JJ/MM/AAAA" */
const fmtDate = (val: unknown): string => {
  if (!val) return "";
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, "0");
    const m = String(val.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}/${val.getFullYear()}`;
  }
  const s = String(val).trim();
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}$/.test(s)) return s.replace(/[.\-]/g, "/");
  const n = Number(s);
  if (!isNaN(n) && n > 30000) {
    try {
      const d = XLSX.SSF.parse_date_code(n);
      if (d) return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`;
    } catch {}
  }
  return s;
};

/** Heure → "HH:MM" */
const fmtTime = (val: unknown): string => {
  if (!val) return "";
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2, "0")}:${String(val.getMinutes()).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) return s.substring(0, 5);
  const n = Number(s);
  if (!isNaN(n) && n > 0 && n < 1) {
    const totalMin = Math.round(n * 24 * 60);
    const h = Math.floor(totalMin / 60);
    const mn = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
  }
  return s;
};

const toNum = (v: unknown): number => Math.max(0, Number(v) || 0);
const toStr = (v: unknown): string => (v === null || v === undefined) ? "" : String(v).trim();

/**
 * FIX 1 — normalizeCode
 * Dans les fichiers Excel, les codes véhicules numériques (74090, 81669…)
 * sont stockés comme Number, pas comme String.
 * On les convertit en string entier proprement pour éviter "74090.0" etc.
 * Les codes alphanumériques (D185, E22…) restent inchangés.
 */
const normalizeCode = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    // Code numérique → entier en chaîne (ex: 74090, 81669)
    return String(Math.round(v));
  }
  return String(v).trim();
};

/**
 * FIX 1 — isSafeConsommation
 * La colonne consommation dans Global.xlsx peut contenir :
 *   - number  → valeur valide
 *   - "#REF!" → formule cassée (code numérique sans référence)
 *   - "#DIV/0!" → parcours = 0
 *   - null / undefined → cellule vide
 * On renvoie 0 dans tous les cas non-numériques.
 */
const parseConso = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
  return 0;
};

// ─────────────────────────────────────────────────────────────
// FIX 2 — detectType
// Auto-détection du type de véhicule depuis le code.
// Basé sur l'analyse réelle du fichier Matricule.xlsx :
//
//   Codes numériques (78715, 74090, 81669…) → "Citerne"
//   CIT*                                    → "Citerne"
//   D\d+, T\d+, Arr*                        → "Camion"
//   E\d+, *E\d*, *-E*, CH * E*…             → "Engin"
//   Groupe, CADEX, GIDNA, JAMAL, MAINTENANCE → "Autre"
//   Reste (inconnu)                          → "Autre"
// ─────────────────────────────────────────────────────────────
const detectType = (code: string): string => {
  const c = code.trim();
  const cu = c.toUpperCase();

  // Vide
  if (!c) return "Autre";

  // Code entièrement numérique → citerne-camion ravitailleur
  if (/^\d+$/.test(c)) return "Citerne";

  // Préfixe CIT
  if (cu.startsWith("CIT")) return "Citerne";

  // Camions benne D + Tombereau T + Arr(ière)
  if (/^D\d+/i.test(c) || /^T\d+/i.test(c) || /^ARR/i.test(c)) return "Camion";

  // Engins : E seul ou suivi de chiffres, partout dans le code
  // Exemples : E22, E49, E50, E71, 350 E71, 480 E49, 350-E64, 336-E, CH 966 E48
  if (/\bE\d+\b/i.test(c) || /[-\s]E\d*/i.test(c) || /^E\d+/i.test(c)) return "Engin";

  // Nivelevse, chargeuse, pelle (engins sans code E explicite)
  if (/NIVELEUSE|CHARGEUSE|PELLE|BULLDOZER|SCRAPER/i.test(c)) return "Engin";

  // Équipements divers
  if (/GROUPE|ELECTRIC|CADEX|GIDNA|JAMAL|MAINTENANCE/i.test(c)) return "Autre";

  return "Autre";
};

// ─────────────────────────────────────────────────────────────
// CITERNE — Beng 1, Beng 2, 81669A55
//
// Structure réelle :
//   Lignes 1-5 : entêtes
//   Ligne 6    : [Date, Qte, Fournisseur, N° BON, Heure, Code, Immat, Km, Qte, Remarque, …]
//   Ligne 7+   : données
// ─────────────────────────────────────────────────────────────

export const parseCiterneExcel = async (file: File): Promise<CiterneEntry[]> => {
  const wb = await readWorkbook(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Trouver la ligne de données — chercher "Date" en colonne A
  let startRow = 6;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    if (String(rows[i]?.[0] ?? "").trim().toLowerCase() === "date") {
      startRow = i + 1;
      break;
    }
  }

  const result: CiterneEntry[] = [];
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (!row.some(v => v !== null && v !== undefined && String(v).trim() !== "")) continue;
    const date = fmtDate(row[0]);
    const numBon = toStr(row[3]);
    if (!date && !numBon) continue;

    result.push({
      date,
      qteEntree:       toNum(row[1]),
      fournisseur:     toStr(row[2]),
      numBon,
      heure:           fmtTime(row[4]),
      code:            normalizeCode(row[5]),   // FIX 1 — codes numériques
      immatriculation: toStr(row[6]),
      kilometrage:     toNum(row[7]),
      qteSortie:       toNum(row[8]),
      remarque:        toStr(row[9]),
      serieDepart:     toNum(row[10]),
      serieFin:        toNum(row[11]),
    });
  }
  return result;
};

export const exportCiterneExcel = (data: CiterneEntry[], name = "Citerne") => {
  const h1 = ["", "ENTREE", "", "SORTIES", "", "", "", "", "", "", "SERIE DEPART", "SERIE FIN"];
  const h2 = ["Date", "Qte", "Fournisseur", "N° DE BON", "Heure", "Code", "Immatriculation", "Kilometrage", "Qte", "Remarque", "", ""];
  const rows = data.map(e => [
    e.date, e.qteEntree || "", e.fournisseur, e.numBon,
    e.heure, e.code, e.immatriculation, e.kilometrage || "",
    e.qteSortie, e.remarque, e.serieDepart || "", e.serieFin || "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([[], [], [], [], h1, h2, ...rows]);
  ws["!cols"] = [10, 8, 14, 10, 7, 8, 22, 12, 8, 14, 12, 12].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
  XLSX.writeFile(wb, `${name}_${new Date().toISOString().split("T")[0]}.xlsx`);
};

// ─────────────────────────────────────────────────────────────
// SORTIE — sortie.xlsx
//
// FIX 3 — Colonne Beng 2 (col G) contient TOUJOURS "#VALUE!" car la formule
// SUMIFS pointe vers beng_2.xlsx externe non disponible lors de la lecture.
//
// Solution : on calcule le total journalier de Beng 2 directement depuis
// les données CiterneEntry en mémoire, transmises en paramètre optionnel.
// Si beng2Data est absent, la colonne Beng 2 reste à 0 (comportement legacy).
//
// USAGE RECOMMANDÉ : parseSortieFromCiternes (calcule tout depuis les 3 fichiers).
// ─────────────────────────────────────────────────────────────

export const parseSortieExcel = async (
  file: File,
  beng2Data?: CiterneEntry[]   // FIX 3 — données Beng 2 en mémoire
): Promise<SortieEntry[]> => {
  const wb = await readWorkbook(file);

  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes("sortie")) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Trouver la ligne de données — chercher "Date" en col B (index 1)
  let startRow = 6;
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    if (String(rows[i]?.[1] ?? "").trim().toLowerCase() === "date") {
      startRow = i + 1;
      break;
    }
  }

  // FIX 3 — Précalculer totaux Beng 2 depuis les données en mémoire
  const beng2ByDate = new Map<string, number>();
  if (beng2Data && beng2Data.length > 0) {
    for (const entry of beng2Data) {
      if (!entry.date || !entry.qteSortie) continue;
      beng2ByDate.set(entry.date, (beng2ByDate.get(entry.date) ?? 0) + entry.qteSortie);
    }
  }

  const map = new Map<string, SortieEntry>();

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] ?? [];

    // Beng 1 : col B(1)=date, C(2)=qte
    const date1 = fmtDate(row[1]);
    const beng1  = typeof row[2] === "number" && isFinite(row[2]) ? Math.max(0, row[2]) : 0;

    // Beng 2 : col F(5)=date, G(6)=qte → TOUJOURS "#VALUE!" → on utilise beng2ByDate
    const date2 = fmtDate(row[5]);

    // 81669A55 : col J(9)=date, K(10)=qte
    const date3  = fmtDate(row[9]);
    const c81669 = typeof row[10] === "number" && isFinite(row[10]) ? Math.max(0, row[10] as number) : 0;

    const date = date1 || date2 || date3;
    if (!date) continue;

    const existing = map.get(date) ?? { date, beng1: 0, beng2: 0, citerne81669: 0 };
    if (date1) existing.beng1 = beng1;
    if (date2 || date1) {
      // FIX 3 : priorité aux données calculées depuis beng2Data
      const computedBeng2 = beng2ByDate.get(date) ?? 0;
      existing.beng2 = computedBeng2;
    }
    if (date3) existing.citerne81669 = c81669;
    map.set(date, existing);
  }

  // FIX 3 — Ajouter les dates présentes dans beng2Data mais absentes de sortie.xlsx
  for (const [date, total] of beng2ByDate) {
    if (!map.has(date)) {
      map.set(date, { date, beng1: 0, beng2: total, citerne81669: 0 });
    } else {
      map.get(date)!.beng2 = total;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    // Tri chronologique JJ/MM/AAAA
    const parse = (s: string) => {
      const [d, m, y] = s.split("/");
      return new Date(+y, +m - 1, +d).getTime();
    };
    return parse(a.date) - parse(b.date);
  });
};

export const exportSortieExcel = (data: SortieEntry[]) => {
  const h1 = ["", "Citerne Beng 1", "", "", "", "Citerne Beng 2", "", "", "", "Citerne 81669A55"];
  const h2 = ["", "Date", "QTE sortie", "", "", "Date", "QTE sortie", "", "", "Date", "QTE sortie"];
  const rows = data.map(e => [
    "", e.date, e.beng1 || "", "", "", e.date, e.beng2 || "", "", "", e.date, e.citerne81669 || "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([[], [], [], h1, [], h2, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sortie");
  XLSX.writeFile(wb, `Sortie_${new Date().toISOString().split("T")[0]}.xlsx`);
};

// ─────────────────────────────────────────────────────────────
// SORTIE depuis les 3 fichiers citernes directement
// Méthode recommandée — contourne tous les problèmes de formules externes
// ─────────────────────────────────────────────────────────────

export const parseSortieFromCiternes = async (
  fileBeng1: File,
  fileBeng2: File,
  file81669: File
): Promise<SortieEntry[]> => {
  const [b1, b2, c81] = await Promise.all([
    parseCiterneExcel(fileBeng1),
    parseCiterneExcel(fileBeng2),
    parseCiterneExcel(file81669),
  ]);

  const sumByDate = (entries: CiterneEntry[]) => {
    const m = new Map<string, number>();
    for (const e of entries) {
      if (!e.date || !e.qteSortie) continue;
      m.set(e.date, (m.get(e.date) ?? 0) + e.qteSortie);
    }
    return m;
  };

  const m1 = sumByDate(b1);
  const m2 = sumByDate(b2);
  const m3 = sumByDate(c81);

  const allDates = new Set([...m1.keys(), ...m2.keys(), ...m3.keys()]);
  return Array.from(allDates)
    .map(date => ({
      date,
      beng1:        m1.get(date) ?? 0,
      beng2:        m2.get(date) ?? 0,
      citerne81669: m3.get(date) ?? 0,
    }))
    .sort((a, b) => {
      const parse = (s: string) => {
        const [d, m, y] = s.split("/");
        return new Date(+y, +m - 1, +d).getTime();
      };
      return parse(a.date) - parse(b.date);
    });
};

// ─────────────────────────────────────────────────────────────
// MATRICULE
//
// FIX 2 — Auto-détection du type depuis le code enrichie.
// Analyse du fichier réel : la colonne "Type" (index 6) est quasi vide.
// On utilise detectType() pour déduire le bon type depuis le code.
// ─────────────────────────────────────────────────────────────

export const parseMatriculeExcel = async (file: File): Promise<MatriculeEntry[]> => {
  const wb = await readWorkbook(file);
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes("matricule")) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Chercher la ligne d'entête "Code" en colonne E (index 4)
  let startRow = 5;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (String(rows[i]?.[4] ?? "").trim().toLowerCase() === "code") {
      startRow = i + 1;
      break;
    }
  }

  const result: MatriculeEntry[] = [];
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] ?? [];

    // FIX 2 — normalizeCode gère les codes numériques (78715, 81669…)
    const code       = normalizeCode(row[4]);
    const matricule  = toStr(row[5]);
    if (!code && !matricule) continue;

    // FIX 2 — Type : on utilise la valeur Excel si présente, sinon detectType()
    const typeExcel = toStr(row[6]);
    const type = typeExcel || detectType(code);

    result.push({ code, matricule, type });
  }
  return result;
};

export const exportMatriculeExcel = (data: MatriculeEntry[]) => {
  const header = ["", "", "", "", "Code", "Matricule", "Type"];
  const rows = data.map(e => ["", "", "", "", e.code, e.matricule, e.type]);
  const ws = XLSX.utils.aoa_to_sheet([[], [], [], [], header, ...rows]);
  ws["!cols"] = [2, 2, 2, 2, 12, 22, 12].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Matricule");
  XLSX.writeFile(wb, `Matricule_${new Date().toISOString().split("T")[0]}.xlsx`);
};

// ─────────────────────────────────────────────────────────────
// GLOBAL — Export
// ─────────────────────────────────────────────────────────────

export const exportGlobalExcel = (data: GlobalEntry[]) => {
  const headers = [
    "Date", "Heure", "Code", "Immatriculation",
    "Compteur Km", "Kilométrage", "Parcours",
    "Litre", "Consommation", "Remarque", "Affectation",
  ];
  const rows = data.map(e => [
    e.date, e.heure, e.code, e.immatriculation,
    e.compteurKm  || "",
    e.kilometrage || "",
    e.parcours,
    e.litres,
    e.consommation > 0 ? e.consommation : "",
    e.remarque,
    e.affectation,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Format numérique pour la colonne Consommation (col I = index 8)
  // Gros camions D≥183 → L/km (ex: 0.87), engins/petits → L/100 (ex: 0.14)
  // On utilise un format décimal à 4 places, pas "%" qui tromperait
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 8 })];
    if (cell && typeof cell.v === "number") {
      cell.z = "0.0000";
    }
  }

  ws["!cols"] = [12, 7, 10, 22, 12, 12, 10, 8, 12, 14, 12].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "GLOBAL %");
  XLSX.writeFile(wb, `Global_${new Date().toISOString().split("T")[0]}.xlsx`);
};

// ─────────────────────────────────────────────────────────────
// GLOBAL — Import
//
// FIX 1 — Codes numériques normalisés via normalizeCode()
//          Consommation #REF! / #DIV/0! → 0 via parseConso()
// ─────────────────────────────────────────────────────────────

export const parseGlobalExcel = async (file: File): Promise<GlobalEntry[]> => {
  const wb = await readWorkbook(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Chercher la ligne d'entête "Date" en colonne A
  let startRow = 1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (String(rows[i]?.[0] ?? "").trim().toLowerCase() === "date") {
      startRow = i + 1;
      break;
    }
  }

  const result: GlobalEntry[] = [];
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (!row[0]) continue;

    // FIX 1 — normalizeCode() gère les codes numériques (74090, 81669…)
    const code = normalizeCode(row[2]);
    if (!code) continue;

    const compteurKm  = toNum(row[4]);
    const kilometrage = toNum(row[5]);
    const parcours    = toNum(row[6]) || Math.max(0, compteurKm - kilometrage);
    const litres      = toNum(row[7]);

    // FIX 1 — parseConso() ignore #REF!, #DIV/0!, null
    const consommation = parseConso(row[8]);

    result.push({
      date:            fmtDate(row[0]),
      heure:           fmtTime(row[1]),
      code,
      immatriculation: toStr(row[3]),
      compteurKm,
      kilometrage,
      parcours,
      litres,
      consommation,
      remarque:        toStr(row[9]),
      affectation:     toStr(row[10]),
    });
  }
  return result;
};
