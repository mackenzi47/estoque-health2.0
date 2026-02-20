// src/pages/Relatorios.jsx
// Visual: dark/gold — mesmo tema do Dashboard
// Melhorias: filtro Nº Inventário, filtro Rua, cards Erro de Lote/Qtd/Estado,
//            aba Corrigidos, coluna Tipo de Divergência

import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Search, Download, AlertTriangle, Clock, Package, CheckCircle, Filter, Calendar } from "lucide-react";
import {
  safeNum, safeNumOrBlank, formatBRInt,
  toISODate, startOfDay, calcPeriodo, toTimeSafe,
  getValidadeBucket, bucketLabel,
  keyFromAuditoria, keyFromPosicao, getDiasParaVencer,
} from "../utils/estoqueUtils";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  bg:     "#07070a",
  panel:  "rgba(255,255,255,0.055)",
  border: "rgba(255,255,255,0.10)",
  text:   "rgba(255,255,255,0.92)",
  muted:  "rgba(255,255,255,0.50)",
  pink:   "#ff3aa8",
  orange: "#ff7a18",
  blue:   "#4aa3ff",
  purple: "#8b5cf6",
  green:  "#22d3a0",
  red:    "#ff4d6a",
  amber:  "#fbbf24",
};

const cardStyle = {
  borderRadius: 16,
  border: `1px solid ${C.border}`,
  background: C.panel,
  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
  backdropFilter: "blur(10px)",
};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  outline: "none",
  colorScheme: "dark",
};

const thStyle = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.40)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.80)",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

const ABAS = ["Divergências", "Pendências", "Vencimentos", "Corrigidos"];

const Relatorios = () => {
  const [aba,       setAba]       = useState("Divergências");
  const [busca,     setBusca]     = useState("");
  const [periodo,   setPeriodo]   = useState("DIARIO");
  const [dataBase,  setDataBase]  = useState(() => toISODate(new Date()));
  const [numInv,    setNumInv]    = useState("Todos");
  const [ruaFiltro, setRuaFiltro] = useState("Todos");

  const [auditorias, setAuditorias] = useState([]);
  const [posicoes,   setPosicoes]   = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "auditorias"), orderBy("data_auditoria", "desc")),
      (s) => setAuditorias(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, "posicoes"), orderBy("created_at", "desc")),
      (s) => setPosicoes(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, []);

  const hoje = useMemo(() => startOfDay(new Date()), []);
  const { startKey, endKey, labelPeriodo } = useMemo(() => calcPeriodo(periodo, dataBase), [periodo, dataBase]);

  // ── Opções de filtro ───────────────────────────────────────────────────────
  const ruasDisponiveis = useMemo(() => {
    const s = new Set();
    auditorias.forEach((a) => { const r = String(a.rua || "").trim(); if (r) s.add(r); });
    return ["Todos", ...Array.from(s).sort()];
  }, [auditorias]);

  const inventariosDisponiveis = useMemo(() => {
    const s = new Set();
    auditorias.forEach((a) => { const n = String(a.inventario_id || "").trim(); if (n) s.add(n); });
    return ["Todos", ...Array.from(s).sort((a, b) => Number(a) - Number(b))];
  }, [auditorias]);

  // ── Auditorias filtradas ───────────────────────────────────────────────────
  const auditoriasFiltradas = useMemo(() =>
    auditorias
      .filter((a) => { const k = String(a.dia_key || ""); return k && k >= startKey && k <= endKey; })
      .filter((a) => ruaFiltro === "Todos" || String(a.rua || "") === ruaFiltro)
      .filter((a) => numInv === "Todos" || String(a.inventario_id || "") === numInv),
    [auditorias, startKey, endKey, ruaFiltro, numInv]
  );

  // ── Busca ──────────────────────────────────────────────────────────────────
  const q = busca.trim().toLowerCase();
  const match = useMemo(() => (obj) => {
    if (!q) return true;
    return Object.values(obj).map((v) => String(v ?? "").toLowerCase()).join("|").includes(q);
  }, [q]);

  // ── Mapa última auditoria global ───────────────────────────────────────────
  const ultimaAudMap = useMemo(() => {
    const map = new Map();
    for (const a of auditorias) {
      const k = keyFromAuditoria(a);
      if (!k || k.startsWith("__")) continue;
      const prev = map.get(k);
      if (!prev || toTimeSafe(a.data_auditoria) > toTimeSafe(prev.data_auditoria)) map.set(k, a);
    }
    return map;
  }, [auditorias]);

  // ── Set auditados no período ───────────────────────────────────────────────
  const audKeysPeriodo = useMemo(() => {
    const s = new Set();
    for (const a of auditoriasFiltradas) {
      const k = keyFromAuditoria(a);
      if (k && !k.startsWith("__")) s.add(k);
    }
    return s;
  }, [auditoriasFiltradas]);

  // ══ DIVERGÊNCIAS ══════════════════════════════════════════════════════════
  const divergenciasRows = useMemo(() =>
    auditoriasFiltradas
      .filter((a) => safeNum(a.divergencia) !== 0)
      .map((a) => ({
        dia_key:          a.dia_key || "",
        inventario_id:    a.inventario_id || "",
        endereco:         a.endereco || a.local || "",
        rua:              a.rua || "",
        codigo_barras:    a.codigo_barras || "",
        codigo_produto:   a.codigo_produto || "",
        nome_produto:     a.nome_produto || "",
        qtd_sistemica:    safeNum(a.qtd_sistemica),
        qtd_fisica:       safeNum(a.qtd_fisica),
        divergencia:      safeNum(a.divergencia),
        resultado:        a.resultado || (safeNum(a.divergencia) < 0 ? "FALTA" : "SOBRA"),
        tipo_divergencia: a.tipo_divergencia || "NENHUMA",
        lote_industria:   a.lote_industria || "",
        lote_senior:      a.lote_senior || "",
        condicao:         a.condicao || "",
        validade:         a.validade || "",
      }))
      .sort((a, b) => Math.abs(b.divergencia) - Math.abs(a.divergencia))
      .filter(match),
    [auditoriasFiltradas, match]
  );

  // ══ PENDÊNCIAS ════════════════════════════════════════════════════════════
  const pendenciasRows = useMemo(() =>
    posicoes
      .filter((p) => ruaFiltro === "Todos" || String(p.rua || "") === ruaFiltro)
      .filter((p) => !audKeysPeriodo.has(keyFromPosicao(p)))
      .map((p) => ({
        endereco:        p.endereco || "",
        rua:             p.rua || "",
        codigo_produto:  p.codigo_produto || p.sku || "",
        codigo_barras:   p.codigo_barras || "",
        nome_produto:    p.nome_produto || "",
        qtd_sistemica:   safeNum(p.qtd_sistemica),
        validade:        p.validade || "",
        validade_bucket: p.validade_bucket || getValidadeBucket(p.validade, hoje),
      }))
      .sort((a, b) => (a.endereco > b.endereco ? 1 : -1))
      .filter(match),
    [posicoes, audKeysPeriodo, ruaFiltro, match, hoje]
  );

  // ══ VENCIMENTOS ═══════════════════════════════════════════════════════════
  const vencimentosRows = useMemo(() => {
    const base = posicoes
      .filter((p) => ruaFiltro === "Todos" || String(p.rua || "") === ruaFiltro)
      .map((p) => {
        const k   = keyFromPosicao(p);
        const aud = ultimaAudMap.get(k);
        const val    = (aud?.validade ?? p.validade) || "";
        const bucket = (aud?.validade_bucket ?? p.validade_bucket) || getValidadeBucket(val, hoje);
        const dias   = aud?.dias_para_vencer ?? getDiasParaVencer(val, hoje);
        if (!["VENCIDO","CRITICO_30D","CRITICO_90D"].includes(bucket)) return null;
        return {
          fonte: aud?.validade ? "Inventário" : "Cadastro",
          bucket, dias: dias ?? "",
          validade: val,
          dia_ultima_contagem: aud?.dia_key || "",
          inventario_id: aud?.inventario_id || "",
          endereco: p.endereco || aud?.endereco || "",
          rua: p.rua || aud?.rua || "",
          codigo_produto: p.codigo_produto || aud?.codigo_produto || "",
          nome_produto: p.nome_produto || aud?.nome_produto || "",
          qtd_sistemica: aud?.qtd_sistemica ?? p.qtd_sistemica ?? "",
          qtd_fisica: aud?.qtd_fisica ?? "",
        };
      }).filter(Boolean);

    const extra = [];
    for (const [k, aud] of ultimaAudMap.entries()) {
      if (ruaFiltro !== "Todos" && String(aud?.rua || "") !== ruaFiltro) continue;
      if (posicoes.some((p) => keyFromPosicao(p) === k)) continue;
      const val    = aud?.validade || "";
      const bucket = aud?.validade_bucket || getValidadeBucket(val, hoje);
      const dias   = aud?.dias_para_vencer ?? getDiasParaVencer(val, hoje);
      if (!["VENCIDO","CRITICO_30D","CRITICO_90D"].includes(bucket)) continue;
      extra.push({
        fonte: "Inventário", bucket, dias: dias ?? "", validade: val,
        dia_ultima_contagem: aud?.dia_key || "",
        inventario_id: aud?.inventario_id || "",
        endereco: aud?.endereco || aud?.local || "",
        rua: aud?.rua || "",
        codigo_produto: aud?.codigo_produto || "",
        nome_produto: aud?.nome_produto || "",
        qtd_sistemica: aud?.qtd_sistemica ?? "",
        qtd_fisica: aud?.qtd_fisica ?? "",
      });
    }

    return [...base, ...extra]
      .filter(match)
      .sort((a, b) => {
        const pr = (x) => x.bucket === "VENCIDO" ? 0 : x.bucket === "CRITICO_30D" ? 1 : 2;
        return pr(a) !== pr(b) ? pr(a) - pr(b) : String(a.validade) > String(b.validade) ? 1 : -1;
      });
  }, [posicoes, ultimaAudMap, ruaFiltro, match, hoje]);

  // ══ CORRIGIDOS ════════════════════════════════════════════════════════════
  const corrigidosRows = useMemo(() =>
    auditoriasFiltradas
      .filter((a) => a.corrigido === true || String(a.corrigido || "").toUpperCase() === "SIM")
      .map((a) => ({
        dia_key:          a.dia_key || "",
        inventario_id:    a.inventario_id || "",
        endereco:         a.endereco || a.local || "",
        rua:              a.rua || "",
        codigo_produto:   a.codigo_produto || "",
        nome_produto:     a.nome_produto || "",
        qtd_sistemica:    safeNum(a.qtd_sistemica),
        qtd_fisica:       safeNum(a.qtd_fisica),
        divergencia:      safeNum(a.divergencia),
        tipo_divergencia: a.tipo_divergencia || "",
        observacao:       a.observacao || "",
      }))
      .filter(match),
    [auditoriasFiltradas, match]
  );

  // ══ CARDS RESUMO ══════════════════════════════════════════════════════════
  const erros = useMemo(() => ({
    lote:   auditoriasFiltradas.filter((a) => a.tipo_divergencia === "ERRO DE POSIÇÃO").length,
    qtd:    auditoriasFiltradas.filter((a) => safeNum(a.divergencia) !== 0).length,
    estado: auditoriasFiltradas.filter((a) =>
      a.tipo_divergencia === "VERIFICAR ENTRADA" ||
      a.tipo_divergencia === "AJUSTAR SISTEMA" ||
      String(a.condicao || "").toUpperCase() === "DANIFICADO"
    ).length,
  }), [auditoriasFiltradas]);

  const contagem = {
    "Divergências": divergenciasRows.length,
    "Pendências":   pendenciasRows.length,
    "Vencimentos":  vencimentosRows.length,
    "Corrigidos":   corrigidosRows.length,
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif", padding:"20px 18px 40px" }}>
      <style>{`
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:rgba(255,255,255,0.04)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:99px}
        input,select{color-scheme:dark}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .35s ease both}
        tbody tr:hover td{background:rgba(255,255,255,0.025)}
      `}</style>

      <div style={{ maxWidth:1400, margin:"0 auto" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="fade" style={{ ...cardStyle, padding:"18px 24px", marginBottom:14, background:"linear-gradient(135deg,rgba(255,122,24,0.12),rgba(139,92,246,0.08))" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>WMS Ybera Group</div>
              <h1 style={{ margin:"4px 0 0", fontSize:20, fontWeight:900, background:"linear-gradient(90deg,#ff7a18,#8b5cf6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Relatórios de Inventário
              </h1>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{labelPeriodo}</div>
            </div>

            {/* Período + Data */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              {["DIARIO","SEMANAL","MENSAL"].map((p) => (
                <button key={p} onClick={() => setPeriodo(p)} style={{
                  padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer",
                  fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase",
                  background: periodo===p ? "linear-gradient(135deg,#ff7a18,#8b5cf6)" : "rgba(255,255,255,0.06)",
                  color: periodo===p ? "#fff" : C.muted, transition:"all .2s",
                }}>
                  {p==="DIARIO"?"Diário":p==="SEMANAL"?"Semanal":"Mensal"}
                </button>
              ))}
              <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Filtros */}
          <div style={{ marginTop:14, display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
            <Filter size={13} color={C.muted} style={{ marginBottom:8 }} />

            <FilterBox label="Nº Inventário">
              <select value={numInv} onChange={(e) => setNumInv(e.target.value)} style={{ ...inputStyle, minWidth:120 }}>
                {inventariosDisponiveis.map((n) => <option key={n}>{n}</option>)}
              </select>
            </FilterBox>

            <FilterBox label="Rua">
              <select value={ruaFiltro} onChange={(e) => setRuaFiltro(e.target.value)} style={{ ...inputStyle, minWidth:120 }}>
                {ruasDisponiveis.map((r) => <option key={r}>{r}</option>)}
              </select>
            </FilterBox>

            <FilterBox label="Pesquisa" style={{ flex:1, minWidth:240 }}>
              <div style={{ position:"relative" }}>
                <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.muted, pointerEvents:"none" }} />
                <input value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Local, produto, EAN, código..."
                  style={{ ...inputStyle, paddingLeft:30, width:"100%" }} />
              </div>
            </FilterBox>

            <button onClick={() => {/* exportar */}} style={{
              display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
              borderRadius:8, border:"none", cursor:"pointer", marginBottom:0,
              background:"linear-gradient(135deg,#22d3a0,#4aa3ff)",
              color:"#fff", fontSize:11, fontWeight:900,
              boxShadow:"0 4px 16px rgba(34,211,160,0.25)",
            }}>
              <Download size={14}/> Exportar
            </button>
          </div>
        </div>

        {/* ── CARDS ─────────────────────────────────────────────────────── */}
        <div className="fade" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:14, animationDelay:".05s" }}>
          <ResumoCard label="Cadastrados"         val={formatBRInt(posicoes.length)}             color={C.blue}   icon={<Package size={15}/>} />
          <ResumoCard label="Pendentes"           val={formatBRInt(pendenciasRows.length)}       color={C.amber}  icon={<Clock size={15}/>} />
          <ResumoCard label="Divergências"        val={formatBRInt(divergenciasRows.length)}     color={C.red}    icon={<AlertTriangle size={15}/>} />
          <ResumoCard label="Vencimentos"         val={formatBRInt(vencimentosRows.length)}      color={C.orange} icon={<Calendar size={15}/>} />
          <ResumoCard label="Corrigidos"          val={formatBRInt(corrigidosRows.length)}       color={C.green}  icon={<CheckCircle size={15}/>} />
          <ResumoCard label="Erro de Posição/Lote" val={formatBRInt(erros.lote)}                 color={C.purple} icon={<AlertTriangle size={15}/>} />
          <ResumoCard label="Erro de Quantidade"  val={formatBRInt(erros.qtd)}                   color={C.red}    icon={<AlertTriangle size={15}/>} />
          <ResumoCard label="Erro de Estado"      val={formatBRInt(erros.estado)}                color={C.pink}   icon={<AlertTriangle size={15}/>} />
        </div>

        {/* ── ABAS + TABELA ─────────────────────────────────────────────── */}
        <div className="fade" style={{ ...cardStyle, overflow:"hidden", animationDelay:".10s" }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:"rgba(255,255,255,0.02)", overflowX:"auto" }}>
            {ABAS.map((tab) => (
              <button key={tab} onClick={() => setAba(tab)} style={{
                padding:"14px 22px", border:"none", background:"none", cursor:"pointer", whiteSpace:"nowrap",
                fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase",
                borderBottom: aba===tab ? `2px solid ${C.orange}` : "2px solid transparent",
                color: aba===tab ? C.orange : C.muted, transition:"all .2s",
              }}>
                {tab}
                <span style={{ marginLeft:6, fontSize:9, background:"rgba(255,255,255,0.08)", padding:"2px 7px", borderRadius:99, color:C.muted }}>
                  {contagem[tab]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ overflowX:"auto" }}>
            {aba==="Divergências" && <TabelaDivergencias rows={divergenciasRows} />}
            {aba==="Pendências"   && <TabelaPendencias   rows={pendenciasRows} />}
            {aba==="Vencimentos"  && <TabelaVencimentos  rows={vencimentosRows} />}
            {aba==="Corrigidos"   && <TabelaCorrigidos   rows={corrigidosRows} />}
          </div>
        </div>

      </div>
    </div>
  );
};

/* ══ TABELAS ════════════════════════════════════════════════════════════════*/

const Empty = ({ cols }) => (
  <tr><td colSpan={cols} style={{ ...tdStyle, textAlign:"center", padding:40, color:"rgba(255,255,255,0.25)", fontSize:13, fontWeight:800 }}>
    Sem registros para mostrar.
  </td></tr>
);

const TabelaDivergencias = ({ rows }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Dia","Nº Inv.","Local","Rua","EAN","Cód. Produto","Produto","Sis.","Fís.","Div.","Resultado","Tipo Div.","Lote Ind.","Lote Senior","Condição","Validade"].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={16}/> : rows.slice(0,300).map((r,i) => (
        <tr key={i}>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.45)", fontSize:10 }}>{r.dia_key}</td>
          <td style={{ ...tdStyle, color:"#8b5cf6", fontWeight:900 }}>{r.inventario_id||"—"}</td>
          <td style={{ ...tdStyle, color:"#4aa3ff", fontWeight:900 }}>{r.endereco}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.rua}</td>
          <td style={{ ...tdStyle, fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.55)" }}>{r.codigo_barras||"—"}</td>
          <td style={{ ...tdStyle, fontFamily:"monospace", fontSize:10 }}>{r.codigo_produto||"—"}</td>
          <td style={tdStyle}>{r.nome_produto||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center", color:"rgba(255,255,255,0.55)" }}>{r.qtd_sistemica}</td>
          <td style={{ ...tdStyle, textAlign:"center", color:"#4aa3ff", fontWeight:900 }}>{r.qtd_fisica}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>
            <span style={{ padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:900,
              background: r.divergencia<0?"rgba(255,77,106,0.15)":"rgba(251,191,36,0.15)",
              color: r.divergencia<0?"#ff4d6a":"#fbbf24" }}>
              {r.divergencia>0?`+${r.divergencia}`:r.divergencia}
            </span>
          </td>
          <td style={{ ...tdStyle, textAlign:"center" }}><ResultPill v={r.resultado}/></td>
          <td style={{ ...tdStyle, textAlign:"center" }}><TipoPill v={r.tipo_divergencia}/></td>
          <td style={{ ...tdStyle, fontSize:10, color:"rgba(255,255,255,0.45)" }}>{r.lote_industria||"—"}</td>
          <td style={{ ...tdStyle, fontSize:10, color:"rgba(255,255,255,0.45)" }}>{r.lote_senior||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>
            <span style={{ fontSize:9, fontWeight:900, padding:"2px 7px", borderRadius:6,
              background: r.condicao==="DANIFICADO"?"rgba(255,77,106,0.15)":"rgba(34,211,160,0.10)",
              color: r.condicao==="DANIFICADO"?"#ff4d6a":"#22d3a0" }}>
              {r.condicao||"—"}
            </span>
          </td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.50)" }}>{r.validade||"—"}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TabelaPendencias = ({ rows }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Local","Rua","Cód. Produto","EAN","Produto","Qtd Sis.","Validade","Status Venc."].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={8}/> : rows.slice(0,300).map((r,i) => (
        <tr key={i}>
          <td style={{ ...tdStyle, color:"#4aa3ff", fontWeight:900 }}>{r.endereco}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.rua}</td>
          <td style={{ ...tdStyle, fontFamily:"monospace", fontSize:10 }}>{r.codigo_produto||"—"}</td>
          <td style={{ ...tdStyle, fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.50)" }}>{r.codigo_barras||"—"}</td>
          <td style={tdStyle}>{r.nome_produto||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center", fontWeight:900 }}>{r.qtd_sistemica}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.50)" }}>{r.validade||"—"}</td>
          <td style={tdStyle}><BucketPill bucket={r.validade_bucket}/></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TabelaVencimentos = ({ rows }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Status","Dias","Validade","Fonte","Última Cont.","Nº Inv.","Local","Rua","Produto","Sis.","Fís."].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={11}/> : rows.slice(0,400).map((r,i) => (
        <tr key={i}>
          <td style={tdStyle}><BucketPill bucket={r.bucket}/></td>
          <td style={{ ...tdStyle, textAlign:"center", fontWeight:900, color: Number(r.dias)<0?"#ff4d6a":"#fbbf24" }}>{r.dias}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.70)" }}>{r.validade||"—"}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.fonte}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.dia_ultima_contagem||"—"}</td>
          <td style={{ ...tdStyle, color:"#8b5cf6", fontWeight:900 }}>{r.inventario_id||"—"}</td>
          <td style={{ ...tdStyle, color:"#4aa3ff", fontWeight:900 }}>{r.endereco||"—"}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)" }}>{r.rua||"—"}</td>
          <td style={tdStyle}>{r.nome_produto||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>{safeNumOrBlank(r.qtd_sistemica)}</td>
          <td style={{ ...tdStyle, textAlign:"center", color:"#4aa3ff", fontWeight:900 }}>{safeNumOrBlank(r.qtd_fisica)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TabelaCorrigidos = ({ rows }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Dia","Nº Inv.","Local","Rua","Produto","Sis.","Fís.","Div.","Tipo Div.","Observação"].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={10}/> : rows.slice(0,300).map((r,i) => (
        <tr key={i}>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.45)", fontSize:10 }}>{r.dia_key}</td>
          <td style={{ ...tdStyle, color:"#8b5cf6", fontWeight:900 }}>{r.inventario_id}</td>
          <td style={{ ...tdStyle, color:"#4aa3ff", fontWeight:900 }}>{r.endereco}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)" }}>{r.rua}</td>
          <td style={tdStyle}>{r.nome_produto||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>{r.qtd_sistemica}</td>
          <td style={{ ...tdStyle, textAlign:"center", color:"#4aa3ff", fontWeight:900 }}>{r.qtd_fisica}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>
            <span style={{ padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:900,
              background: r.divergencia===0?"rgba(34,211,160,0.12)":r.divergencia<0?"rgba(255,77,106,0.12)":"rgba(251,191,36,0.12)",
              color: r.divergencia===0?"#22d3a0":r.divergencia<0?"#ff4d6a":"#fbbf24" }}>
              {r.divergencia>0?`+${r.divergencia}`:r.divergencia}
            </span>
          </td>
          <td style={tdStyle}><TipoPill v={r.tipo_divergencia}/></td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.45)", fontSize:10 }}>{r.observacao||"—"}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* ══ UI COMPONENTS ══════════════════════════════════════════════════════════*/

const FilterBox = ({ label, children, style }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4, ...style }}>
    <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.35)" }}>{label}</div>
    {children}
  </div>
);

const ResumoCard = ({ label, val, color, icon }) => (
  <div style={{ ...cardStyle, padding:"14px 16px", position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", inset:-10, background:color, opacity:.08, filter:"blur(16px)" }}/>
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted, lineHeight:1.4 }}>{label}</div>
        <div style={{ color, opacity:.7 }}>{icon}</div>
      </div>
      <div style={{ fontSize:24, fontWeight:900, marginTop:6, color }}>{val}</div>
    </div>
  </div>
);

const ResultPill = ({ v }) => {
  const s = v==="FALTA"||v==="VENCIDO"
    ? { bg:"rgba(255,77,106,0.15)", color:"#ff4d6a" }
    : v==="SOBRA"
    ? { bg:"rgba(251,191,36,0.15)", color:"#fbbf24" }
    : { bg:"rgba(34,211,160,0.12)", color:"#22d3a0" };
  return <span style={{ padding:"3px 8px", borderRadius:6, fontSize:9, fontWeight:900, textTransform:"uppercase", ...s }}>{v||"OK"}</span>;
};

const TipoPill = ({ v }) => {
  const color = v==="AJUSTAR SISTEMA"?"#ff4d6a":v==="VERIFICAR ENTRADA"?"#fbbf24":v==="ERRO DE POSIÇÃO"?"#8b5cf6":"rgba(255,255,255,0.35)";
  const bg    = v==="AJUSTAR SISTEMA"?"rgba(255,77,106,0.12)":v==="VERIFICAR ENTRADA"?"rgba(251,191,36,0.12)":v==="ERRO DE POSIÇÃO"?"rgba(139,92,246,0.12)":"rgba(255,255,255,0.05)";
  return <span style={{ padding:"3px 8px", borderRadius:6, fontSize:9, fontWeight:900, textTransform:"uppercase", background:bg, color, whiteSpace:"nowrap" }}>{v||"NENHUMA"}</span>;
};

const BucketPill = ({ bucket }) => {
  const b = bucket || "SEM_VALIDADE";
  const color = b==="VENCIDO"?"#ff4d6a":b==="CRITICO_30D"?"#fbbf24":b==="CRITICO_90D"?"#ff7a18":"rgba(255,255,255,0.35)";
  const bg    = b==="VENCIDO"?"rgba(255,77,106,0.15)":b==="CRITICO_30D"?"rgba(251,191,36,0.12)":b==="CRITICO_90D"?"rgba(255,122,24,0.12)":"rgba(255,255,255,0.05)";
  return <span style={{ padding:"3px 8px", borderRadius:6, fontSize:9, fontWeight:900, textTransform:"uppercase", background:bg, color }}>{bucketLabel(b)}</span>;
};

export default Relatorios;