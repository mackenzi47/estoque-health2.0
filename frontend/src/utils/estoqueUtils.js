// src/utils/estoqueUtils.js
// Utilitários compartilhados — Dashboard, Inventario, Relatorios, Produtos

// ─── Números ─────────────────────────────────────────────────────────────────

export function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function safeNumOrBlank(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}
export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, Number(n || 0)));
}
export function formatBRInt(n) {
  try { return Number(n || 0).toLocaleString("pt-BR"); } catch { return String(n || 0); }
}

// ─── Datas ────────────────────────────────────────────────────────────────────

export function toISODate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
export function fromISODate(iso) {
  const [yy, mm, dd] = String(iso || "").split("-");
  const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
export function fromISODateStrict(iso) {
  const [yy, mm, dd] = String(iso || "").split("-");
  if (!yy || !mm || !dd) return null;
  const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}
export function formatBR(d) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
export function diffDays(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 864e5);
}
export function startOfWeekMonday(d) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  c.setDate(c.getDate() + (c.getDay() === 0 ? -6 : 1 - c.getDay()));
  return c;
}
export function endOfWeekSunday(d) {
  const s = startOfWeekMonday(d), e = new Date(s);
  e.setDate(e.getDate() + 6);
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
export function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
export function calcPeriodo(periodo, dataBase) {
  const base = fromISODate(dataBase);
  if (periodo === "DIARIO") {
    const k = toISODate(base);
    return { startKey: k, endKey: k, labelPeriodo: `Diário • ${formatBR(base)}` };
  }
  if (periodo === "SEMANAL") {
    const s = startOfWeekMonday(base), e = endOfWeekSunday(base);
    return { startKey: toISODate(s), endKey: toISODate(e), labelPeriodo: `Semanal • ${formatBR(s)} – ${formatBR(e)}` };
  }
  const s = startOfMonth(base), e = endOfMonth(base);
  return {
    startKey: toISODate(s), endKey: toISODate(e),
    labelPeriodo: `Mensal • ${String(base.getMonth()+1).padStart(2,"0")}/${base.getFullYear()}`,
  };
}

// ─── Firestore ────────────────────────────────────────────────────────────────

export function toTimeSafe(ts) {
  if (!ts) return -1;
  if (typeof ts?.toDate === "function") return ts.toDate().getTime();
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isNaN(d.getTime()) ? -1 : d.getTime();
}

// ─── Vencimentos ─────────────────────────────────────────────────────────────

export function getDiasParaVencer(iso, hoje) {
  const vd = fromISODateStrict(iso);
  if (!vd) return null;
  return diffDays(vd, hoje);
}
export function getValidadeBucket(iso, hoje) {
  if (!iso) return "SEM_VALIDADE";
  const dias = getDiasParaVencer(iso, hoje);
  if (dias === null) return "SEM_VALIDADE";
  if (dias < 0)   return "VENCIDO";
  if (dias <= 30) return "CRITICO_30D";
  if (dias <= 90) return "CRITICO_90D";
  return "OK";
}
export function bucketLabel(b) {
  if (b === "VENCIDO")      return "Vencido";
  if (b === "CRITICO_30D")  return "Crítico 30d";
  if (b === "CRITICO_90D")  return "Crítico 90d";
  if (b === "SEM_VALIDADE") return "Sem validade";
  return b || "—";
}

// ─── Endereço D-22-1-1 ───────────────────────────────────────────────────────

/**
 * Aceita: D-22-1-1 | D2211 | d-2-1-1 (flexível, normaliza para maiúsculo)
 * Normaliza para: D-22-1-1
 * Grupos: [Rua]-[Local 2 dígitos]-[Nível]-[Posição]
 */
export function parseEndereco(raw) {
  const x = String(raw || "").trim().toUpperCase();
  const m = x.match(/^([A-Z])-?(\d{1,2})-?(\d)-?(\d)$/);
  if (!m) return { ok: false, endereco: x, rua: "", localNum: "", nivel: "", posicao: "" };
  const rua      = m[1];
  const localNum = m[2].padStart(2, "0");
  const nivel    = m[3];
  const posicao  = m[4];
  return {
    ok: true,
    endereco: `${rua}-${localNum}-${nivel}-${posicao}`,
    rua: `Rua ${rua}`,
    localNum,
    nivel,
    posicao,
  };
}

// ─── Chaves de cruzamento ─────────────────────────────────────────────────────
// Usa endereco + codigo_produto como chave única de auditoria

export function keyPS(endereco, codProduto) {
  return `${String(endereco || "").trim().toUpperCase()}__${String(codProduto || "").trim()}`;
}
export function keyFromAuditoria(a) {
  return keyPS(a?.endereco || a?.local, a?.codigo_produto);
}
export function keyFromPosicao(p) {
  return keyPS(p?.endereco, p?.codigo_produto || p?.sku);
}
export function keyFromProduto(p) {
  return String(p?.codigo_barras || "").trim();
}

// ─── Resultado ───────────────────────────────────────────────────────────────

export function calcResultado(a, hoje) {
  const bucket = String(a?.validade_bucket || getValidadeBucket(a?.validade, hoje) || "").toUpperCase();
  if (bucket === "VENCIDO") return "VENCIDO";
  const div = safeNum(a?.divergencia);
  if (div < 0) return "FALTA";
  if (div > 0) return "SOBRA";
  return "OK";
}

// ─── Constantes ──────────────────────────────────────────────────────────────

export const TIPOS_DIVERGENCIA = [
  "NENHUMA",
  "AJUSTAR SISTEMA",
  "VERIFICAR ENTRADA",
  "ERRO DE POSIÇÃO",
];

export const CONDICOES = ["BOM", "DANIFICADO"];