// src/lib/api.ts
const BASE = "http://127.0.0.1:8000/api";

export const tokenStorage = {
  get:    ()          => sessionStorage.getItem("auth_token") ?? "",
  set:    (t: string) => sessionStorage.setItem("auth_token", t),
  clear:  ()          => sessionStorage.removeItem("auth_token"),
  exists: ()          => !!sessionStorage.getItem("auth_token"),
};

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept":       "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    tokenStorage.clear();
    window.location.href = "/";
    throw new Error("Session expirée.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[API] ${method} ${path} → ${res.status}: ${text}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined as T;
  return res.json();
}

// ── Types ────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
}

export interface CiterneEntryAPI {
  id?: number; source: "beng1"|"beng2"|"81669";
  date: string; heure: string; qte_entree: number; fournisseur: string;
  num_bon: string; code: string; immatriculation: string; kilometrage: number;
  qte_sortie: number; remarque: string; serie_depart: number; serie_fin: number;
}
export interface SortieEntryAPI {
  id?: number; date: string; heure: string; code: string;
  immatriculation: string; litres: number; chauffeur: string; remarque: string;
}
export interface MatriculeEntryAPI {
  id?: number; code: string; matricule: string; type: string;
}
export interface AffectationAPI {
  id?: number; equipe1: string; camion: string; equipe2: string;
  type: "camion"|"engin"; date_affectation?: string;
}
export interface RapportChauffeurAPI {
  id?: number; rapport_date_id?: number; equipe1: string; equipe2: string;
  code: string; litres: number; pourcentage: number; activite: string;
}
export interface RapportEnginAPI {
  id?: number; rapport_date_id?: number; equipe1: string; equipe2: string;
  engin: string; litres: number; pourcentage: number; heure: string; affectation: string;
}
export interface RapportDateAPI {
  id: number; date: string;
  chauffeurs: RapportChauffeurAPI[];
  engins: RapportEnginAPI[];
}

// ── AUTH ─────────────────────────────────────────────────────
export const auth = {
  login: async (email: string, password: string): Promise<AuthUser> => {
    const data = await req<{ token: string; user: AuthUser }>("POST", "/login", { email, password });
    tokenStorage.set(data.token);
    return data.user;
  },
  logout: async () => { try { await req("POST", "/logout"); } catch {} tokenStorage.clear(); },
  me: () => req<AuthUser>("GET", "/me"),
};

// ── USERS (admin only) ───────────────────────────────────────
export const users = {
  getAll: () => req<UserRecord[]>("GET", "/users"),
  add:    (data: { name: string; email: string; password: string; role?: string; is_active?: boolean }) =>
    req<UserRecord>("POST", "/users", data),
  update: (id: number, data: Partial<{ name: string; email: string; password: string; role: string; is_active: boolean }>) =>
    req<UserRecord>("PUT", `/users/${id}`, data),
  remove: (id: number) => req<{ ok: boolean }>("DELETE", `/users/${id}`),
};

// ── CITERNES ─────────────────────────────────────────────────
export const citernes = {
  getAll:  (source: string) => req<CiterneEntryAPI[]>("GET", `/citernes?source=${source}`),
  add:     (data: Omit<CiterneEntryAPI,"id">) => req<CiterneEntryAPI>("POST", "/citernes", data),
  update:  (id: number, data: Partial<CiterneEntryAPI>) => req<CiterneEntryAPI>("PUT", `/citernes/${id}`, data),
  remove:  (id: number) => req<{ok:boolean}>("DELETE", `/citernes/${id}`),
  import:  (source: string, items: object[]) => req<{imported:number}>("POST", "/citernes/import", { source, items }),
  reset:   (source: string) => req<{ok:boolean}>("POST", "/citernes/reset", { source }),
};

// ── SORTIES ──────────────────────────────────────────────────
export const sorties = {
  getAll:  () => req<SortieEntryAPI[]>("GET", "/sorties"),
  add:     (data: Omit<SortieEntryAPI,"id">) => req<SortieEntryAPI>("POST", "/sorties", data),
  update:  (id: number, data: Partial<SortieEntryAPI>) => req<SortieEntryAPI>("PUT", `/sorties/${id}`, data),
  remove:  (id: number) => req<{ok:boolean}>("DELETE", `/sorties/${id}`),
  import:  (items: object[]) => req<{imported:number}>("POST", "/sorties/import", { items }),
  reset:   () => req<{ok:boolean}>("POST", "/sorties/reset"),
};

// ── MATRICULES ───────────────────────────────────────────────
export const matricules = {
  getAll:  () => req<MatriculeEntryAPI[]>("GET", "/matricules"),
  add:     (data: Omit<MatriculeEntryAPI,"id">) => req<MatriculeEntryAPI>("POST", "/matricules", data),
  update:  (id: number, data: Partial<MatriculeEntryAPI>) => req<MatriculeEntryAPI>("PUT", `/matricules/${id}`, data),
  remove:  (id: number) => req<{ok:boolean}>("DELETE", `/matricules/${id}`),
  import:  (items: object[]) => req<{imported:number}>("POST", "/matricules/import", { items }),
};

// ── AFFECTATIONS ─────────────────────────────────────────────
export const affectations = {
  getAll:  () => req<AffectationAPI[]>("GET", "/affectations"),
  add:     (data: Omit<AffectationAPI,"id">) => req<AffectationAPI>("POST", "/affectations", data),
  update:  (id: number, data: Partial<AffectationAPI>) => req<AffectationAPI>("PUT", `/affectations/${id}`, data),
  remove:  (id: number) => req<{ok:boolean}>("DELETE", `/affectations/${id}`),
  import:  (items: object[]) => req<{imported:number}>("POST", "/affectations/import", { items }),
};

// ── RAPPORTS ─────────────────────────────────────────────────
export const rapports = {
  getAll:      () => req<RapportDateAPI[]>("GET", "/rapports"),
  createDate:  (date: string) => req<RapportDateAPI>("POST", "/rapports", { date }),
  removeDate:  (id: number) => req<{ok:boolean}>("DELETE", `/rapports/${id}`),
  addChauffeur:     (dateId: number, data: object) => req<RapportChauffeurAPI>("POST", `/rapports/${dateId}/chauffeurs`, data),
  updateChauffeur:  (id: number, data: object) => req<RapportChauffeurAPI>("PUT", `/rapports/chauffeurs/${id}`, data),
  removeChauffeur:  (id: number) => req<{ok:boolean}>("DELETE", `/rapports/chauffeurs/${id}`),
  importChauffeurs: (dateId: number, items: object[]) => req<{imported:number}>("POST", `/rapports/${dateId}/import-chauffeurs`, { items }),
  addEngin:     (dateId: number, data: object) => req<RapportEnginAPI>("POST", `/rapports/${dateId}/engins`, data),
  updateEngin:  (id: number, data: object) => req<RapportEnginAPI>("PUT", `/rapports/engins/${id}`, data),
  removeEngin:  (id: number) => req<{ok:boolean}>("DELETE", `/rapports/engins/${id}`),
  importEngins: (dateId: number, items: object[]) => req<{imported:number}>("POST", `/rapports/${dateId}/import-engins`, { items }),
};

const api = { auth, users, citernes, sorties, matricules, affectations, rapports };
export default api;
