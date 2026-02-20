// src/pages/Dashboard.jsx
// Visual: Dark mode "Fashion Gold" — rosa, laranja, azul, roxo
// Lógica: Firebase (auditorias + posicoes) — todos os bugs corrigidos

import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  Package, CheckCircle, Clock, TrendingUp, AlertTriangle, Search,
} from "lucide-react";

/* ─── Paleta dark/gold ────────────────────────────────────────────────── */
const C = {
  bg:      "#07070a",
  panel:   "rgba(255,255,255,0.055)",
  panel2:  "rgba(255,255,255,0.09)",
  border:  "rgba(255,255,255,0.10)",
  text:    "rgba(255,255,255,0.92)",
  muted:   "rgba(255,255,255,0.50)",
  pink:    "#ff3aa8",
  orange:  "#ff7a18",
  blue:    "#4aa3ff",
  purple:  "#8b5cf6",
  green:   "#22d3a0",
  red:     "#ff4d6a",
  amber:   "#fbbf24",
};

const GRADIENTS = {
  pink:   `linear-gradient(135deg, #ff3aa8 0%, #ff7a18 100%)`,
  blue:   `linear-gradient(135deg, #4aa3ff 0%, #8b5cf6 100%)`,
  green:  `linear-gradient(135deg, #22d3a0 0%, #4aa3ff 100%)`,
  orange: `linear-gradient(135deg, #ff7a18 0%, #fbbf24 100%)`,
  red:    `linear-gradient(135deg, #ff4d6a 0%, #ff7a18 100%)`,
  purple: `linear-gradient(135deg, #8b5cf6 0%, #4aa3ff 100%)`,
};

/* ─── Utils ──────────────────────────────────────────────────────────────*/
const safeNum       = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const safeNumOrBlank= (v) => { const n = Number(v); return Number.isFinite(n) ? n : ""; };
const clamp         = (n,a,b) => Math.max(a, Math.min(b, Number(n||0)));
const formatBRInt   = (n) => { try { return Number(n||0).toLocaleString("pt-BR"); } catch { return String(n||0); } };

const toISODate = (d) => {
  const yy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
};
const fromISODate = (iso) => {
  const [yy,mm,dd] = String(iso||"").split("-");
  const d = new Date(Number(yy), Number(mm)-1, Number(dd));
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const fromISODateStrict = (iso) => {
  const [yy,mm,dd] = String(iso||"").split("-");
  if (!yy||!mm||!dd) return null;
  const d = new Date(Number(yy), Number(mm)-1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
};
const formatBR = (d) => {
  const dd=String(d.getDate()).padStart(2,"0"), mm=String(d.getMonth()+1).padStart(2,"0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const diffDays   = (a,b) => Math.floor((a.getTime()-b.getTime())/(864e5));

const startOfWeekMonday = (d) => {
  const c = new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);
  c.setDate(c.getDate()+(c.getDay()===0?-6:1-c.getDay()));
  return c;
};
const endOfWeekSunday = (d) => {
  const s=startOfWeekMonday(d), e=new Date(s);
  e.setDate(e.getDate()+6);
  return new Date(e.getFullYear(),e.getMonth(),e.getDate(),23,59,59,999);
};
const startOfMonth = (d) => new Date(d.getFullYear(),d.getMonth(),1,0,0,0,0);
const endOfMonth   = (d) => new Date(d.getFullYear(),d.getMonth()+1,0,23,59,59,999);

const toTimeSafe = (ts) => {
  if (!ts) return -1;
  if (typeof ts?.toDate==="function") return ts.toDate().getTime();
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isNaN(d.getTime()) ? -1 : d.getTime();
};

const getDiasParaVencer = (iso, hoje) => {
  const vd = fromISODateStrict(iso);
  if (!vd) return null;
  return diffDays(vd, hoje);
};

const getValidadeBucket = (iso, hoje) => {
  if (!iso) return "SEM_VALIDADE";
  const dias = getDiasParaVencer(iso, hoje);
  if (dias===null) return "SEM_VALIDADE";
  if (dias<0)   return "VENCIDO";
  if (dias<=30) return "CRITICO_30D";
  if (dias<=90) return "CRITICO_90D";
  return "OK";
};

const calcResultado = (a, hoje) => {
  const bucket = String(a?.validade_bucket||getValidadeBucket(a?.validade,hoje)||"").toUpperCase();
  if (bucket==="VENCIDO") return "VENCIDO";
  const div = safeNum(a?.divergencia);
  if (div<0) return "FALTA";
  if (div>0) return "SOBRA";
  return "OK";
};

const keyPS = (endereco, sku) =>
  `${String(endereco||"").trim().toUpperCase()}__${String(sku||"").trim()}`;
const keyFromAud = (a) => keyPS(a?.endereco||a?.local, a?.sku);
const keyFromPos = (p) => keyPS(p?.endereco, p?.sku);

/* ─── Estilos inline base ────────────────────────────────────────────────*/
const baseCard = {
  borderRadius: 18,
  border: `1px solid ${C.border}`,
  background: C.panel,
  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
  backdropFilter: "blur(10px)",
  padding: "20px 22px",
  position: "relative",
  overflow: "hidden",
};

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════════════════*/
const Dashboard = () => {
  const [auditorias, setAuditorias] = useState([]);
  const [posicoes,   setPosicoes]   = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);

  const [periodo,        setPeriodo]        = useState("DIARIO");
  const [dataBase,       setDataBase]       = useState(() => toISODate(new Date()));
  const [ruaFiltro,      setRuaFiltro]      = useState("Todos");
  const [statusFiltro,   setStatusFiltro]   = useState("Todos");
  const [condicaoFiltro, setCondicaoFiltro] = useState("Todos");
  const [abaAtiva,       setAbaAtiva]       = useState("Posições Pendentes");
  const [pesquisa,       setPesquisa]       = useState("");

  /* ── Firestore ─────────────────────────────────────────────────────── */
  useEffect(() => {
    let n = 0;
    const done = () => { if (++n >= 2) setIsLoading(false); };

    const u1 = onSnapshot(
      query(collection(db,"auditorias"), orderBy("data_auditoria","desc")),
      (s) => { setAuditorias(s.docs.map((d)=>({id:d.id,...d.data()}))); done(); }
    );
    const u2 = onSnapshot(
      query(collection(db,"posicoes"), orderBy("created_at","desc")),
      (s) => { setPosicoes(s.docs.map((d)=>({id:d.id,...d.data()}))); done(); }
    );
    return () => { u1(); u2(); };
  }, []);

  /* ── "Hoje" estável (FIX BUG 7) ───────────────────────────────────── */
  const hoje = useMemo(() => startOfDay(new Date()), []);

  /* ── Período ───────────────────────────────────────────────────────── */
  const { startKey, endKey, labelPeriodo } = useMemo(() => {
    const base = fromISODate(dataBase);
    if (periodo==="DIARIO") {
      const k=toISODate(base);
      return { startKey:k, endKey:k, labelPeriodo:`Diário • ${formatBR(base)}` };
    }
    if (periodo==="SEMANAL") {
      const s=startOfWeekMonday(base), e=endOfWeekSunday(base);
      return { startKey:toISODate(s), endKey:toISODate(e), labelPeriodo:`Semanal • ${formatBR(s)} – ${formatBR(e)}` };
    }
    const s=startOfMonth(base), e=endOfMonth(base);
    return { startKey:toISODate(s), endKey:toISODate(e), labelPeriodo:`Mensal • ${String(base.getMonth()+1).padStart(2,"0")}/${base.getFullYear()}` };
  }, [periodo, dataBase]);

  /* ── Helpers ───────────────────────────────────────────────────────── */
  const getEndereco = (x) => String(x?.endereco||x?.local||"").trim().toUpperCase();
  const getRua      = (x) => String(x?.rua||"").trim();
  const getEAN      = (x) => String(x?.codigo_barras||"").trim();
  const getSku      = (x) => String(x?.sku||"").trim();

  /* ── Mapa última auditoria all-time ────────────────────────────────── */
  const ultimaAuditoriaMap = useMemo(() => {
    const map = new Map();
    for (const a of auditorias) {
      const k = keyFromAud(a);
      if (!k||k.startsWith("__")) continue;
      const prev = map.get(k);
      if (!prev || toTimeSafe(a.data_auditoria) > toTimeSafe(prev.data_auditoria)) map.set(k,a);
    }
    return map;
  }, [auditorias]);

  /* ── Set de chaves auditadas all-time (FIX BUG 3) ─────────────────── */
  const audKeysAllTime = useMemo(() => {
    const s = new Set();
    for (const a of auditorias) {
      const k = keyFromAud(a);
      if (k && !k.startsWith("__")) s.add(k);
    }
    return s;
  }, [auditorias]);

  /* ── Auditorias do período com filtros ─────────────────────────────── */
  const auditoriasPeriodo = useMemo(() => {
    return auditorias
      .filter((a) => { const k=String(a.dia_key||""); return k && k>=startKey && k<=endKey; })
      .filter((a) => ruaFiltro==="Todos" || getRua(a)===ruaFiltro)
      .filter((a) => {
        if (statusFiltro==="Todos") return true;
        return String(a.resultado||calcResultado(a,hoje)).toUpperCase()===statusFiltro;
      })
      .filter((a) => condicaoFiltro==="Todos" || String(a.condicao||"").toUpperCase()===condicaoFiltro);
  }, [auditorias, startKey, endKey, ruaFiltro, statusFiltro, condicaoFiltro, hoje]);

  /* ── Posições filtradas ─────────────────────────────────────────────── */
  const posicoesFiltradas = useMemo(() => posicoes
    .filter((p) => ruaFiltro==="Todos" || getRua(p)===ruaFiltro)
    .filter((p) => condicaoFiltro==="Todos" || String(p.condicao||"").toUpperCase()===condicaoFiltro),
    [posicoes, ruaFiltro, condicaoFiltro]
  );

  /* ── Ruas disponíveis ───────────────────────────────────────────────── */
  const ruasDisponiveis = useMemo(() => {
    const s = new Set();
    [...posicoes,...auditorias].forEach((x) => { const r=getRua(x); if(r) s.add(r); });
    return ["Todos", ...Array.from(s).sort()];
  }, [posicoes, auditorias]);

  /* ── KPIs ───────────────────────────────────────────────────────────── */
  const posicoesAtivasComEstoque = useMemo(() => {
    const s = new Set();
    for (const p of posicoesFiltradas) {
      if (getEndereco(p) && safeNum(p.qtd_sistemica)>0) s.add(getEndereco(p));
    }
    return s.size;
  }, [posicoesFiltradas]);

  const posicoesContadas = useMemo(() => {
    const s = new Set();
    for (const a of auditoriasPeriodo) { const e=getEndereco(a); if(e) s.add(e); }
    return s.size;
  }, [auditoriasPeriodo]);

  const pendentesAllTime = useMemo(() =>
    posicoesFiltradas.filter((p) => !audKeysAllTime.has(keyFromPos(p))),
    [posicoesFiltradas, audKeysAllTime]
  );

  const percentAvanco = useMemo(() =>
    posicoesAtivasComEstoque > 0 ? (posicoesContadas/posicoesAtivasComEstoque)*100 : 0,
    [posicoesContadas, posicoesAtivasComEstoque]
  );

  const divergenciasCount = useMemo(() =>
    auditoriasPeriodo.filter((a) => safeNum(a.divergencia)!==0).length,
    [auditoriasPeriodo]
  );

  const acuracidade = useMemo(() => {
    const total = auditoriasPeriodo.length;
    return total > 0 ? ((total-divergenciasCount)/total)*100 : 100;
  }, [auditoriasPeriodo, divergenciasCount]);

  /* ── Vencimentos (FIX BUG 2 — respeita filtro de rua) ─────────────── */
  const vencimentosResumo = useMemo(() => {
    let vencidos=0, c30=0, c90=0;
    for (const p of posicoesFiltradas) {
      const k   = keyFromPos(p);
      const aud = ultimaAuditoriaMap.get(k);
      const val = aud?.validade ?? p.validade ?? "";
      const bucket = aud?.validade_bucket ?? p.validade_bucket ?? getValidadeBucket(val, hoje);
      if (bucket==="VENCIDO")     vencidos++;
      else if (bucket==="CRITICO_30D") c30++;
      else if (bucket==="CRITICO_90D") c90++;
    }
    // Itens só em auditorias, respeitando filtro de rua
    for (const [k, aud] of ultimaAuditoriaMap.entries()) {
      if (ruaFiltro!=="Todos" && getRua(aud)!==ruaFiltro) continue; // FIX BUG 2
      const exists = posicoesFiltradas.some((p) => keyFromPos(p)===k);
      if (exists) continue;
      const bucket = aud?.validade_bucket ?? getValidadeBucket(aud?.validade, hoje);
      if (bucket==="VENCIDO")     vencidos++;
      else if (bucket==="CRITICO_30D") c30++;
      else if (bucket==="CRITICO_90D") c90++;
    }
    return { vencidos, c30, c90 };
  }, [posicoesFiltradas, ultimaAuditoriaMap, ruaFiltro, hoje]);

  /* ── Gráfico avanço diário (14d) ───────────────────────────────────── */
  const dataGraficoAvanco = useMemo(() => {
    const base = fromISODate(dataBase);
    const days = Array.from({length:14}, (_,i) => {
      const d = new Date(base); d.setDate(d.getDate()-(13-i)); return toISODate(d);
    });
    const counts = days.map((dayKey) => {
      const s = new Set();
      auditorias.filter((a) => String(a.dia_key||"")===dayKey)
        .forEach((a) => { const e=getEndereco(a); if(e) s.add(e); });
      return { dayKey, posicoes: s.size };
    });
    const avg7 = (idx) => {
      const start = Math.max(0,idx-6);
      let sum=0, n=0;
      for (let i=start; i<=idx; i++) { sum+=counts[i].posicoes; n++; }
      return n ? Math.round((sum/n)*10)/10 : 0;
    };
    return counts.map((c,i) => ({
      name: c.dayKey.slice(5).replace("-","/"),
      posicoes: c.posicoes,
      media: avg7(i),
    }));
  }, [auditorias, dataBase]);

  /* ── Gráfico divergências por tipo ─────────────────────────────────── */
  const dataDivergencias = useMemo(() => {
    const qtd    = auditoriasPeriodo.filter((a) => safeNum(a.divergencia)!==0).length;
    const validade = auditoriasPeriodo.filter((a) => {
      const b = (a.validade_bucket||getValidadeBucket(a.validade,hoje)||"").toUpperCase();
      return b==="VENCIDO"||b==="CRITICO_30D"||b==="CRITICO_90D";
    }).length;
    const local  = auditoriasPeriodo.filter((a) => !getEndereco(a)).length;
    const lote   = auditoriasPeriodo.filter((a) => !String(a.lote_senior||a.lote_industria||"").trim()).length;
    return [
      { name:"Qtd",     v: qtd },
      { name:"Local",   v: local },
      { name:"Lote",    v: lote },
      { name:"Validade",v: validade },
    ];
  }, [auditoriasPeriodo, hoje]);

  /* ── Donut acuracidade ──────────────────────────────────────────────── */
  const dataAcuracidade = useMemo(() => [
    { v: clamp(acuracidade,0,100) },
    { v: clamp(100-acuracidade,0,100) },
  ], [acuracidade]);

  /* ── Pesquisa (FIX BUG 1: q dentro do useMemo, sem stale) ─────────── */
  const q = pesquisa.trim().toLowerCase();

  const matchSearch = useMemo(() => (obj) => {
    if (!q) return true;
    return Object.values(obj||{}).map((v) => String(v??"").toLowerCase()).join("|").includes(q);
  }, [q]);

  /* ── Tabelas ────────────────────────────────────────────────────────── */
  const ultimasAuditoriasTabela = useMemo(() =>
    auditoriasPeriodo.slice(0,300).map((a) => ({
      posicao:   getEndereco(a),
      rua:       getRua(a),
      ean:       getEAN(a),
      sku:       getSku(a),
      produto:   a.nome_produto_real||a.nome_produto||"",
      sis:       safeNumOrBlank(a.qtd_sistemica),
      fis:       safeNumOrBlank(a.qtd_fisica),
      div:       safeNumOrBlank(a.divergencia),
      resultado: String(a.resultado||calcResultado(a,hoje)).toUpperCase(),
      validade:  a.validade||"",
    })).filter(matchSearch),
    [auditoriasPeriodo, matchSearch, hoje]
  );

  const pendentesTabela = useMemo(() =>
    pendentesAllTime.slice(0,400).map((p) => ({
      posicao:   getEndereco(p),
      rua:       getRua(p),
      ean:       getEAN(p),
      sku:       getSku(p),
      produto:   p.nome_produto||"",
      sis:       safeNumOrBlank(p.qtd_sistemica),
      fis:       "",
      div:       "",
      resultado: "PENDENTE",
      validade:  p.validade||"",
    })).filter(matchSearch),
    [pendentesAllTime, matchSearch]
  );

  const topDivergenciasTabela = useMemo(() =>
    auditoriasPeriodo
      .filter((a) => safeNum(a.divergencia)!==0)
      .map((a) => ({
        posicao:   getEndereco(a),
        rua:       getRua(a),
        ean:       getEAN(a),
        sku:       getSku(a),
        produto:   a.nome_produto_real||a.nome_produto||"",
        sis:       safeNumOrBlank(a.qtd_sistemica),
        fis:       safeNumOrBlank(a.qtd_fisica),
        div:       safeNumOrBlank(a.divergencia),
        resultado: String(a.resultado||calcResultado(a,hoje)).toUpperCase(),
        validade:  a.validade||"",
      }))
      .sort((a,b) => Math.abs(Number(b.div||0))-Math.abs(Number(a.div||0)))
      .slice(0,300)
      .filter(matchSearch),
    [auditoriasPeriodo, matchSearch, hoje]
  );

  const itensVencidosTabela = useMemo(() => {
    const rows = [];
    for (const p of posicoesFiltradas) {
      const k   = keyFromPos(p);
      const aud = ultimaAuditoriaMap.get(k);
      const val = (aud?.validade??p.validade)||"";
      const bucket = (aud?.validade_bucket??p.validade_bucket)||getValidadeBucket(val, hoje);
      if (bucket!=="VENCIDO") continue;
      rows.push({
        posicao:   getEndereco(p)||getEndereco(aud),
        rua:       getRua(p)||getRua(aud),
        ean:       getEAN(p)||getEAN(aud),
        sku:       getSku(p)||getSku(aud),
        produto:   p.nome_produto||aud?.nome_produto_real||"",
        sis:       safeNumOrBlank(aud?.qtd_sistemica??p.qtd_sistemica),
        fis:       safeNumOrBlank(aud?.qtd_fisica),
        div:       safeNumOrBlank(aud?.divergencia),
        resultado: "VENCIDO",
        validade:  val,
      });
    }
    return rows.slice(0,400).filter(matchSearch);
  }, [posicoesFiltradas, ultimaAuditoriaMap, matchSearch, hoje]);

  /* ── Loading ────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:48, height:48, borderRadius:"50%", border:`3px solid ${C.border}`, borderTopColor:C.pink, animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
          <p style={{ color:C.muted, fontSize:13, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Carregando dados...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const tabelaRows =
    abaAtiva==="Posições Pendentes"  ? pendentesTabela :
    abaAtiva==="Top Divergências"    ? topDivergenciasTabela :
    abaAtiva==="Itens Vencidos"      ? itensVencidosTabela :
    ultimasAuditoriasTabela;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif", padding:"20px 18px 40px" }}>
      <style>{`
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:rgba(255,255,255,0.04)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:99px}
        input,select{color-scheme:dark}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .dash-row{animation:fadeUp .4s ease both}
      `}</style>

      <div style={{ maxWidth:1400, margin:"0 auto" }}>

        {/* ── FILTROS ──────────────────────────────────────────────────── */}
        <div className="dash-row" style={{ ...baseCard, marginBottom:16, padding:"16px 20px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"flex-end" }}>
            <FilterBox label="Data Base">
              <input type="date" value={dataBase} onChange={(e)=>setDataBase(e.target.value)}
                style={inputStyle} />
            </FilterBox>
            <FilterBox label="Período">
              <select value={periodo} onChange={(e)=>setPeriodo(e.target.value)} style={inputStyle}>
                <option value="DIARIO">Diário</option>
                <option value="SEMANAL">Semanal</option>
                <option value="MENSAL">Mensal</option>
              </select>
            </FilterBox>
            <FilterBox label="Rua">
              <select value={ruaFiltro} onChange={(e)=>setRuaFiltro(e.target.value)} style={inputStyle}>
                {ruasDisponiveis.map((r)=><option key={r}>{r}</option>)}
              </select>
            </FilterBox>
            <FilterBox label="Status">
              <select value={statusFiltro} onChange={(e)=>setStatusFiltro(e.target.value)} style={inputStyle}>
                {["Todos","OK","FALTA","SOBRA","VENCIDO"].map((s)=><option key={s}>{s}</option>)}
              </select>
            </FilterBox>
            <FilterBox label="Condição">
              <select value={condicaoFiltro} onChange={(e)=>setCondicaoFiltro(e.target.value)} style={inputStyle}>
                {["Todos","BOM","AVARIADO"].map((s)=><option key={s}>{s}</option>)}
              </select>
            </FilterBox>
            <FilterBox label="Pesquisa" style={{ flex:1, minWidth:220 }}>
              <div style={{ position:"relative" }}>
                <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.muted, pointerEvents:"none" }} />
                <input value={pesquisa} onChange={(e)=>setPesquisa(e.target.value)}
                  placeholder="Produto, posição, SKU, EAN..."
                  style={{ ...inputStyle, paddingLeft:30, width:"100%" }} />
              </div>
            </FilterBox>
          </div>
          <div style={{ marginTop:10, fontSize:11, fontWeight:800, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>
            {labelPeriodo}
          </div>
        </div>

        {/* ── KPI CARDS ────────────────────────────────────────────────── */}
        <div className="dash-row" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:16, animationDelay:".05s" }}>
          <KpiCard label="Posições Ativas" val={formatBRInt(posicoesAtivasComEstoque)} gradient={GRADIENTS.blue}   icon={<Package size={18}/>} />
          <KpiCard label="Posições Contadas" val={formatBRInt(posicoesContadas)}       gradient={GRADIENTS.green}  icon={<CheckCircle size={18}/>} />
          <KpiCard label="Posições Pendentes" val={formatBRInt(pendentesAllTime.length)} gradient={GRADIENTS.orange} icon={<Clock size={18}/>} alert={pendentesAllTime.length>0} />
          <KpiCard label="% de Avanço"       val={`${clamp(percentAvanco,0,999).toFixed(1)}%`} gradient={GRADIENTS.purple} icon={<TrendingUp size={18}/>} />
          <KpiCard label="Acuracidade"       val={`${clamp(acuracidade,0,100).toFixed(2)}%`}   gradient={GRADIENTS.blue} />
          <KpiCard label="Divergências"      val={formatBRInt(divergenciasCount)}       gradient={GRADIENTS.red}    icon={<AlertTriangle size={18}/>} alert={divergenciasCount>0} />
        </div>

        {/* ── GRÁFICOS ─────────────────────────────────────────────────── */}
        <div className="dash-row" style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:12, marginBottom:12, animationDelay:".1s" }}>

          {/* Avanço diário */}
          <div style={{ ...baseCard }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>Avanço Diário</div>
                <div style={{ fontSize:14, fontWeight:800, marginTop:2 }}>Contagem de Posições — últimos 14 dias</div>
              </div>
              <div style={{ display:"flex", gap:14, fontSize:10, fontWeight:800 }}>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:C.blue }}>
                  <span style={{ display:"inline-block", width:10, height:10, borderRadius:3, background:C.blue }} /> Posições
                </span>
                <span style={{ display:"flex", alignItems:"center", gap:5, color:C.orange }}>
                  <span style={{ display:"inline-block", width:10, height:10, borderRadius:3, background:C.orange }} /> Média 7d
                </span>
              </div>
            </div>
            <div style={{ height:220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGraficoAvanco} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.blue} stopOpacity={1} />
                      <stop offset="100%" stopColor={C.purple} stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="barOrange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.orange} stopOpacity={1} />
                      <stop offset="100%" stopColor={C.pink} stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:700, fill:C.muted }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize:10, fill:C.muted }} />
                  <Tooltip
                    cursor={{ fill:"rgba(255,255,255,0.04)" }}
                    contentStyle={{ background:"#13131a", border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:12 }}
                  />
                  <Bar dataKey="posicoes" fill="url(#barBlue)" radius={[4,4,0,0]} barSize={18} />
                  <Bar dataKey="media"    fill="url(#barOrange)" radius={[4,4,0,0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Controle de vencimento */}
            <div style={{ marginTop:16, borderRadius:12, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:C.muted }}>Controle de Vencimento</div>
              <VencBadge label="Vencidos"     val={vencimentosResumo.vencidos} color={C.red} />
              <VencBadge label="A vencer 30d" val={vencimentosResumo.c30}     color={C.amber} />
              <VencBadge label="A vencer 90d" val={vencimentosResumo.c90}     color={C.orange} />
            </div>
          </div>

          {/* Donut + mini bar divergências */}
          <div style={{ ...baseCard, display:"flex", flexDirection:"column", gap:12 }}>
            {/* Donut */}
            <div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:3, textTransform:"uppercase", color:C.muted, marginBottom:12, textAlign:"center" }}>Acuracidade</div>
              <div style={{ position:"relative", height:170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={C.blue} />
                        <stop offset="100%" stopColor={C.purple} />
                      </linearGradient>
                    </defs>
                    <Pie data={dataAcuracidade} innerRadius="72%" outerRadius="92%"
                      paddingAngle={4} dataKey="v" startAngle={90} endAngle={450}>
                      <Cell fill="url(#donutGrad)" stroke="none" />
                      <Cell fill="rgba(255,255,255,0.06)" stroke="none" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:30, fontWeight:900, background:GRADIENTS.blue, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    {clamp(acuracidade,0,100).toFixed(0)}%
                  </span>
                  <span style={{ fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:C.muted, marginTop:2 }}>Global</span>
                </div>
              </div>
            </div>

            {/* Mini bar divergências */}
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:3, textTransform:"uppercase", color:C.muted, marginBottom:10 }}>Divergências por Tipo</div>
              <div style={{ height:130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataDivergencias} margin={{ top:4, right:4, left:-22, bottom:0 }}>
                    <defs>
                      <linearGradient id="barPink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.pink} />
                        <stop offset="100%" stopColor={C.purple} stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:10, fontWeight:800, fill:C.muted }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize:10, fill:C.muted }} />
                    <Tooltip
                      cursor={{ fill:"rgba(255,255,255,0.04)" }}
                      contentStyle={{ background:"#13131a", border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:12 }}
                    />
                    <Bar dataKey="v" fill="url(#barPink)" radius={[4,4,0,0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── TABELA ───────────────────────────────────────────────────── */}
        <div className="dash-row" style={{ ...baseCard, padding:0, overflow:"hidden", animationDelay:".15s" }}>
          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:"rgba(255,255,255,0.02)", overflowX:"auto" }}>
            {["Posições Pendentes","Top Divergências","Últimas Contagens","Itens Vencidos"].map((tab) => (
              <button key={tab} onClick={()=>setAbaAtiva(tab)} style={{
                padding:"14px 22px",
                fontSize:10, fontWeight:800, letterSpacing:2, textTransform:"uppercase",
                border:"none", background:"none", cursor:"pointer", whiteSpace:"nowrap",
                borderBottom: abaAtiva===tab ? `2px solid ${C.pink}` : "2px solid transparent",
                color: abaAtiva===tab ? C.pink : C.muted,
                transition:"all .2s",
              }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Tabela */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.04)" }}>
                  {["Posição","Rua","EAN / SKU","Produto","Sis.","Fis.","Div.","Resultado","Validade"].map((h) => (
                    <th key={h} style={{ padding:"12px 16px", textAlign: ["Sis.","Fis.","Div.","Resultado"].includes(h) ? "center":"left",
                      fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted,
                      borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabelaRows.length===0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding:40, textAlign:"center", color:C.muted, fontSize:12, fontWeight:800 }}>
                      Sem registros para mostrar.
                    </td>
                  </tr>
                ) : tabelaRows.map((r, i) => (
                  <tr key={`${r.posicao}-${r.sku}-${i}`} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:"background .15s" }}
                    onMouseEnter={(e)=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                    onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"10px 16px", color:C.blue, fontWeight:900 }}>{r.posicao||"—"}</td>
                    <td style={{ padding:"10px 16px", color:C.muted }}>{r.rua||"—"}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <div style={{ fontWeight:800, color:C.text }}>{r.ean||"—"}</div>
                      <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>{r.sku||"—"}</div>
                    </td>
                    <td style={{ padding:"10px 16px", color:C.text }}>{r.produto||"—"}</td>
                    <td style={{ padding:"10px 16px", textAlign:"center", color:C.muted }}>{r.sis===""?"—":r.sis}</td>
                    <td style={{ padding:"10px 16px", textAlign:"center", fontWeight:800, color:C.blue }}>{r.fis===""?"—":r.fis}</td>
                    <td style={{ padding:"10px 16px", textAlign:"center" }}>
                      {r.div==="" ? <span style={{ color:"rgba(255,255,255,0.2)" }}>—</span> : (
                        <span style={{ padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:800,
                          background: Number(r.div)===0?"rgba(34,211,160,0.12)":Number(r.div)<0?"rgba(255,77,106,0.12)":"rgba(251,191,36,0.12)",
                          color: Number(r.div)===0?C.green:Number(r.div)<0?C.red:C.amber }}>
                          {Number(r.div)>0?`+${r.div}`:r.div}
                        </span>
                      )}
                    </td>
                    <td style={{ padding:"10px 16px", textAlign:"center" }}>
                      <ResultPill v={r.resultado} />
                    </td>
                    <td style={{ padding:"10px 16px", textAlign:"center", color:C.muted }}>{r.validade||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTES
══════════════════════════════════════════════════════════════════════════*/

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "rgba(255,255,255,0.92)",
  fontSize: 12,
  fontWeight: 700,
  padding: "7px 10px",
  outline: "none",
  width: "100%",
};

const FilterBox = ({ label, children, style }) => (
  <div style={{ minWidth:140, ...style }}>
    <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.40)", marginBottom:5 }}>{label}</div>
    {children}
  </div>
);

const KpiCard = ({ label, val, gradient, icon, alert }) => (
  <div style={{
    borderRadius:16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.055)",
    backdropFilter:"blur(10px)",
    padding:"18px 20px",
    position:"relative",
    overflow:"hidden",
    boxShadow: alert ? "0 0 24px rgba(255,77,106,0.20)" : "0 12px 40px rgba(0,0,0,0.45)",
  }}>
    {/* Glow de fundo */}
    <div style={{ position:"absolute", inset:-20, background:gradient, opacity:.10, filter:"blur(24px)", pointerEvents:"none" }} />
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.50)", lineHeight:1.3, maxWidth:120 }}>{label}</div>
        {icon && <div style={{ opacity:.7, background:gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{icon}</div>}
      </div>
      <div style={{ fontSize:30, fontWeight:900, marginTop:8, background:gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1 }}>
        {val}
      </div>
    </div>
  </div>
);

const VencBadge = ({ label, val, color }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block", boxShadow:`0 0 8px ${color}` }} />
    <span style={{ fontSize:12, fontWeight:800, color }}>{val}</span>
    <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.45)" }}>{label}</span>
  </div>
);

const ResultPill = ({ v }) => {
  const cfg = {
    VENCIDO:  { bg:"rgba(255,77,106,0.15)",  color:"#ff4d6a" },
    FALTA:    { bg:"rgba(255,77,106,0.15)",  color:"#ff4d6a" },
    SOBRA:    { bg:"rgba(251,191,36,0.15)",  color:"#fbbf24" },
    PENDENTE: { bg:"rgba(255,122,24,0.15)",  color:"#ff7a18" },
    OK:       { bg:"rgba(34,211,160,0.15)",  color:"#22d3a0" },
  };
  const { bg, color } = cfg[v] || cfg.OK;
  return (
    <span style={{ padding:"3px 10px", borderRadius:6, fontSize:9, fontWeight:900, letterSpacing:1, textTransform:"uppercase", background:bg, color }}>
      {v||"OK"}
    </span>
  );
};

export default Dashboard;