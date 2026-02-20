// src/pages/Relatorios.jsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { Search, Download, AlertTriangle, Clock, Package, CheckCircle, Filter, Calendar, X } from "lucide-react";
import * as XLSX from "xlsx";
import {
  safeNum, safeNumOrBlank, formatBRInt,
  toISODate, startOfDay, calcPeriodo, toTimeSafe,
  getValidadeBucket, bucketLabel,
  keyFromAuditoria, keyFromPosicao, getDiasParaVencer,
} from "../utils/estoqueUtils";

const C = {
  bg:"#07070a", panel:"rgba(255,255,255,0.055)", border:"rgba(255,255,255,0.10)",
  text:"rgba(255,255,255,0.92)", muted:"rgba(255,255,255,0.50)",
  pink:"#ff3aa8", orange:"#ff7a18", blue:"#4aa3ff", purple:"#8b5cf6",
  green:"#22d3a0", red:"#ff4d6a", amber:"#fbbf24",
};

const cardStyle = {
  borderRadius:16, border:`1px solid ${C.border}`, background:C.panel,
  boxShadow:"0 18px 60px rgba(0,0,0,0.55)", backdropFilter:"blur(10px)",
};

const inputStyle = {
  background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`,
  borderRadius:8, color:C.text, fontSize:12, fontWeight:700,
  padding:"8px 12px", outline:"none", colorScheme:"dark",
};

const thStyle = {
  padding:"12px 14px", textAlign:"left", fontSize:9, fontWeight:900,
  letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.40)",
  borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)",
  whiteSpace:"nowrap",
};

const tdStyle = {
  padding:"10px 14px", fontSize:11, fontWeight:700,
  color:"rgba(255,255,255,0.80)", borderBottom:"1px solid rgba(255,255,255,0.04)",
};

const ABAS = ["Pendências","Divergências","Vencimentos","Corrigidos"];

// ─── Modal de Correção ────────────────────────────────────────────────────────
const ModalCorrecao = ({ item, onConfirm, onClose }) => {
  const [obs, setObs] = useState(item?.observacao || "");
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(item, obs);
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
      <div style={{ ...cardStyle, width:"100%", maxWidth:480, padding:28, position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", cursor:"pointer", color:C.muted }}>
          <X size={18}/>
        </button>

        <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>Confirmar Correção</div>
        <div style={{ fontSize:17, fontWeight:900, marginTop:6, marginBottom:20, background:"linear-gradient(90deg,#22d3a0,#4aa3ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Marcar item como corrigido
        </div>

        {/* Info do item */}
        <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 16px", marginBottom:18, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13, fontWeight:900, color:C.blue }}>{item.endereco || item.local || "—"}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{item.nome_produto || "—"}</div>
          <div style={{ display:"flex", gap:16, marginTop:8, fontSize:11, fontWeight:800 }}>
            <span>Sis: <span style={{ color:C.text }}>{item.qtd_sistemica}</span></span>
            <span>Fís: <span style={{ color:C.blue }}>{item.qtd_fisica}</span></span>
            <span>Div: <span style={{ color:Number(item.divergencia)<0?C.red:C.amber }}>{Number(item.divergencia)>0?`+${item.divergencia}`:item.divergencia}</span></span>
          </div>
        </div>

        {/* Observação */}
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted, marginBottom:8 }}>Observação</div>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Descreva o que foi corrigido no WMS..."
          rows={3}
          style={{ ...inputStyle, width:"100%", resize:"vertical", fontFamily:"inherit" }}
        />

        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:10, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.05)", color:C.muted, fontSize:12, fontWeight:800, cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading} style={{
            flex:2, padding:"11px", borderRadius:10, border:"none",
            background:"linear-gradient(135deg,#22d3a0,#4aa3ff)",
            color:"#fff", fontSize:12, fontWeight:900, cursor:"pointer",
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Salvando..." : "✓ Confirmar Correção"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const Relatorios = () => {
  const [aba,       setAba]       = useState("Pendências");
  const [busca,     setBusca]     = useState("");
  const [periodo,   setPeriodo]   = useState("DIARIO");
  const [dataBase,  setDataBase]  = useState(() => toISODate(new Date()));
  const [numInv,    setNumInv]    = useState("Todos");
  const [ruaFiltro, setRuaFiltro] = useState("Todos");
  const [modalItem, setModalItem] = useState(null);

  const [auditorias, setAuditorias] = useState([]);
  const [produtos,   setProdutos]   = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db,"auditorias"), orderBy("data_auditoria","desc")),
      (s) => setAuditorias(s.docs.map((d) => ({ id:d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db,"produtos"), orderBy("created_at","desc")),
      (s) => setProdutos(s.docs.map((d) => ({ id:d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, []);

  const hoje = useMemo(() => startOfDay(new Date()), []);
  const { startKey, endKey, labelPeriodo } = useMemo(() => calcPeriodo(periodo, dataBase), [periodo, dataBase]);

  // Opções de filtro
  const ruasDisponiveis = useMemo(() => {
    const s = new Set();
    auditorias.forEach((a) => { const r = String(a.rua||"").trim(); if (r) s.add(r); });
    return ["Todos", ...Array.from(s).sort()];
  }, [auditorias]);

  const inventariosDisponiveis = useMemo(() => {
    const s = new Set();
    auditorias.forEach((a) => { const n = String(a.inventario_id||"").trim(); if (n) s.add(n); });
    return ["Todos", ...Array.from(s).sort((a,b) => Number(a)-Number(b))];
  }, [auditorias]);

  // Auditorias filtradas por período + rua + inventário
  // Exclui itens já corrigidos das abas de divergência/pendência
  const auditoriasFiltradas = useMemo(() =>
    auditorias
      .filter((a) => { const k = String(a.dia_key||""); return k && k >= startKey && k <= endKey; })
      .filter((a) => ruaFiltro==="Todos" || String(a.rua||"")===ruaFiltro)
      .filter((a) => numInv==="Todos" || String(a.inventario_id||"")===numInv),
    [auditorias, startKey, endKey, ruaFiltro, numInv]
  );

  // Busca
  const q = busca.trim().toLowerCase();
  const match = useMemo(() => (obj) => {
    if (!q) return true;
    return Object.values(obj).map((v) => String(v??"").toLowerCase()).join("|").includes(q);
  }, [q]);

  // Mapa última auditoria global
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

  // Set EANs auditados no período
  const audKeysPeriodo = useMemo(() => {
    const s = new Set();
    for (const a of auditoriasFiltradas) {
      const k = keyFromAuditoria(a);
      if (k && !k.startsWith("__")) s.add(k);
    }
    return s;
  }, [auditoriasFiltradas]);

  // ══ PENDÊNCIAS ══════════════════════════════════════════════════════════════
  // Produtos já corrigidos (all-time) — para excluir das pendências
  const produtosCorrigidosEAN = useMemo(() => {
    const s = new Set();
    for (const a of auditorias) {
      const jaCorrigido = a.corrigido===true || String(a.corrigido||"").toUpperCase()==="SIM";
      if (jaCorrigido && a.codigo_barras) s.add(String(a.codigo_barras));
      if (jaCorrigido && a.codigo_produto) s.add(String(a.codigo_produto));
    }
    return s;
  }, [auditorias]);

  // Pendente = produto nunca auditado E nunca corrigido
  //          OU auditado com divergência não corrigida no período
  const pendenciasRows = useMemo(() => {
    const rows = [];

    // 1) Produtos cadastrados nunca auditados EM NENHUM MOMENTO (all-time) e nunca corrigidos
    for (const p of produtos) {
      const ean = String(p.codigo_barras||"");
      const cod = String(p.codigo_produto||"");

      // Se já foi corrigido alguma vez, não é mais pendente
      if (produtosCorrigidosEAN.has(ean) || produtosCorrigidosEAN.has(cod)) continue;

      // Se foi auditado em algum momento (all-time), não é pendente como "NAO AUDITADO"
      const foiAuditadoAllTime = auditorias.some(
        (a) => String(a.codigo_barras||"")===ean || String(a.codigo_produto||"")===cod
      );
      if (foiAuditadoAllTime) continue;

      rows.push({
        _id:             null,
        _tipo:           "NAO_AUDITADO",
        endereco:        "—",
        rua:             "—",
        codigo_produto:  cod,
        codigo_barras:   ean,
        nome_produto:    p.nome_produto||"",
        qtd_sistemica:   "",
        qtd_fisica:      "",
        divergencia:     "",
        tipo_divergencia:"NAO AUDITADO",
        validade:        p.validade||"",
        validade_bucket: getValidadeBucket(p.validade, hoje),
        dia_key:         "",
        inventario_id:   "",
      });
    }

    // 2) Auditados no período com divergência (corrigido ou não — histórico sempre fica)
    for (const a of auditoriasFiltradas) {
      const temDivergencia = safeNum(a.divergencia) !== 0;
      const temVencimento  = ["VENCIDO","CRITICO_30D","CRITICO_90D"].includes(
        a.validade_bucket||getValidadeBucket(a.validade, hoje)
      );
      if (!temDivergencia && !temVencimento) continue;
      rows.push({
        _id:             a.id,
        _tipo:           "DIVERGENTE",
        _corrigido:      a.corrigido===true || String(a.corrigido||"").toUpperCase()==="SIM",
        endereco:        a.endereco||a.local||"",
        rua:             a.rua||"",
        codigo_produto:  a.codigo_produto||"",
        codigo_barras:   a.codigo_barras||"",
        nome_produto:    a.nome_produto||"",
        qtd_sistemica:   safeNum(a.qtd_sistemica),
        qtd_fisica:      safeNum(a.qtd_fisica),
        divergencia:     safeNum(a.divergencia),
        tipo_divergencia:a.tipo_divergencia||"NENHUMA",
        tipo_erro:       a.tipo_erro||"NENHUM",
        validade:        a.validade||"",
        validade_bucket: a.validade_bucket||getValidadeBucket(a.validade, hoje),
        dia_key:         a.dia_key||"",
        inventario_id:   a.inventario_id||"",
        observacao:      a.observacao||"",
      });
    }

    return rows.filter(match);
  }, [produtos, auditorias, auditoriasFiltradas, produtosCorrigidosEAN, ruaFiltro, match, hoje]);

  // ══ DIVERGÊNCIAS ═══════════════════════════════════════════════════════════
  const divergenciasRows = useMemo(() =>
    auditoriasFiltradas
      .filter((a) => safeNum(a.divergencia) !== 0)
      .map((a) => ({
        _id:              a.id,
        dia_key:          a.dia_key||"",
        inventario_id:    a.inventario_id||"",
        endereco:         a.endereco||a.local||"",
        rua:              a.rua||"",
        codigo_barras:    a.codigo_barras||"",
        codigo_produto:   a.codigo_produto||"",
        nome_produto:     a.nome_produto||"",
        qtd_sistemica:    safeNum(a.qtd_sistemica),
        qtd_fisica:       safeNum(a.qtd_fisica),
        divergencia:      safeNum(a.divergencia),
        resultado:        a.resultado||(safeNum(a.divergencia)<0?"FALTA":"SOBRA"),
        tipo_divergencia: a.tipo_divergencia||"NENHUMA",
        lote_industria:   a.lote_industria||"",
        lote_senior:      a.lote_senior||"",
        condicao:         a.condicao||"",
        validade:         a.validade||"",
        observacao:       a.observacao||"",
      }))
      .sort((a,b) => Math.abs(b.divergencia)-Math.abs(a.divergencia))
      .filter(match),
    [auditoriasFiltradas, match]
  );

  // ══ VENCIMENTOS ════════════════════════════════════════════════════════════
  const vencimentosRows = useMemo(() => {
    const seen = new Set();
    const rows = [];

    // 1) Direto das auditorias — validade_bucket já calculado no momento da contagem
    for (const a of auditorias) {
      if (ruaFiltro !== "Todos" && String(a.rua||"") !== ruaFiltro) continue;
      const bucket = a.validade_bucket || getValidadeBucket(a.validade||"", hoje);
      if (!["VENCIDO","CRITICO_30D","CRITICO_90D"].includes(bucket)) continue;
      const chave = `${a.endereco||a.local}__${a.codigo_barras}__${a.validade}`;
      if (seen.has(chave)) continue;
      seen.add(chave);
      rows.push({
        _id:                 a.id,
        fonte:               "Inventário",
        bucket,
        dias:                a.dias_para_vencer ?? getDiasParaVencer(a.validade||"", hoje) ?? "-",
        validade:            a.validade||"—",
        condicao:            a.condicao||"",
        dia_ultima_contagem: a.dia_key||"",
        inventario_id:       a.inventario_id||"",
        endereco:            a.endereco||a.local||"",
        rua:                 a.rua||"",
        codigo_produto:      a.codigo_produto||"",
        codigo_barras:       a.codigo_barras||"",
        nome_produto:        a.nome_produto||"",
        qtd_sistemica:       a.qtd_sistemica??"",
        qtd_fisica:          a.qtd_fisica??"",
        observacao:          a.observacao||"",
      });
    }

    // 2) Produtos cadastrados com condicao=VENCIDO ou validade vencida (sem auditoria)
    for (const p of produtos) {
      const ean = String(p.codigo_barras||"");
      const val = p.validade||"";
      const condicaoVencido = String(p.condicao||"").toUpperCase()==="VENCIDO";
      const bucket = condicaoVencido && !val ? "VENCIDO" : getValidadeBucket(val, hoje);
      if (!["VENCIDO","CRITICO_30D","CRITICO_90D"].includes(bucket)) continue;
      // Só adiciona se não foi encontrado nas auditorias
      const jaNaLista = rows.some((r) => r.codigo_barras===ean || r.codigo_produto===p.codigo_produto);
      if (jaNaLista) continue;
      rows.push({
        _id:                 null,
        fonte:               "Cadastro",
        bucket,
        dias:                val ? (getDiasParaVencer(val, hoje)??"-") : "VENCIDO",
        validade:            val||"—",
        condicao:            p.condicao||"",
        dia_ultima_contagem: "",
        inventario_id:       "",
        endereco:            "—",
        rua:                 "—",
        codigo_produto:      p.codigo_produto||"",
        codigo_barras:       ean,
        nome_produto:        p.nome_produto||"",
        qtd_sistemica:       "",
        qtd_fisica:          "",
        observacao:          "",
      });
    }

    return rows
      .filter(match)
      .sort((a,b) => {
        const pr=(x)=>x.bucket==="VENCIDO"?0:x.bucket==="CRITICO_30D"?1:2;
        return pr(a)!==pr(b)?pr(a)-pr(b):String(a.validade)>String(b.validade)?1:-1;
      });
  }, [auditorias, produtos, ruaFiltro, match, hoje]);

  // ══ CORRIGIDOS ═════════════════════════════════════════════════════════════
  // corrigidosRows: filtra por data_correcao (quando foi corrigido) dentro do período
  // mas mantém os dados originais da auditoria (dia_key, local, qtds do momento da contagem)
  const corrigidosRows = useMemo(() =>
    auditorias
      .filter((a) => a.corrigido===true || String(a.corrigido||"").toUpperCase()==="SIM")
      .filter((a) => {
        // Filtra pelo dia em que foi corrigido
        // Fallback: se não tem data_correcao (itens corrigidos antes da atualização), usa dia_key
        const dc = String(a.data_correcao || a.dia_key || "");
        return dc && dc >= startKey && dc <= endKey;
      })
      .filter((a) => ruaFiltro==="Todos" || String(a.rua||"")===ruaFiltro)
      .filter((a) => numInv==="Todos" || String(a.inventario_id||"")===numInv)
      .map((a) => ({
        _id:              a.id,
        dia_key:          a.dia_key||"",           // dia original da auditoria
        data_correcao:    a.data_correcao||"",     // dia que foi corrigido
        inventario_id:    a.inventario_id||"",
        endereco:         a.endereco||a.local||"",
        rua:              a.rua||"",
        codigo_produto:   a.codigo_produto||"",
        nome_produto:     a.nome_produto||"",
        qtd_sistemica:    safeNum(a.qtd_sistemica),
        qtd_fisica:       safeNum(a.qtd_fisica),
        divergencia:      safeNum(a.divergencia),
        tipo_divergencia: a.tipo_divergencia||"",
        observacao:       a.observacao||"",
        obs_correcao:     a.obs_correcao||"",
      }))
      .filter(match),
    [auditorias, startKey, endKey, ruaFiltro, numInv, match]
  );

  // Resumo cards
  const erros = useMemo(() => ({
    posicaoLote: auditoriasFiltradas.filter((a) =>
      a.tipo_erro==="ERRO DE POSIÇÃO" || a.tipo_erro==="ERRO DE LOTE"
    ).length,
    qtd:    auditoriasFiltradas.filter((a) => safeNum(a.divergencia)!==0).length,
    estado: auditoriasFiltradas.filter((a) =>
      a.tipo_erro==="ERRO DE ESTADO" ||
      String(a.condicao||"").toUpperCase()==="DANIFICADO" ||
      String(a.condicao||"").toUpperCase()==="VENCIDO"
    ).length,
  }), [auditoriasFiltradas]);

  const contagem = {
    "Pendências":   pendenciasRows.length,
    "Divergências": divergenciasRows.length,
    "Vencimentos":  vencimentosRows.length,
    "Corrigidos":   corrigidosRows.length,
  };

  // ── Marcar como corrigido ─────────────────────────────────────────────────
  // Salva data_correcao = dia em que foi corrigido (separado de dia_key = dia da auditoria)
  const handleCorrigir = async (item, obs) => {
    if (!item._id) return;
    try {
      await updateDoc(doc(db,"auditorias",item._id), {
        corrigido:     true,
        obs_correcao:  obs||"",
        data_correcao: toISODate(new Date()),
      });
      setModalItem(null);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar correção.");
    }
  };

  // ── Export XLSX ───────────────────────────────────────────────────────────
  const exportarXLSX = () => {
    let dados = [];
    let nomeAba = aba;

    if (aba==="Pendências") {
      dados = pendenciasRows.map((r) => ({
        "Local":           r.endereco,
        "Rua":             r.rua,
        "Cód. Produto":    r.codigo_produto,
        "EAN":             r.codigo_barras,
        "Produto":         r.nome_produto,
        "Qtd Sistêmica":   r.qtd_sistemica,
        "Qtd Física":      r.qtd_fisica,
        "Divergência":     r.divergencia,
        "Tipo":            r.tipo_divergencia,
        "Validade":        r.validade,
        "Status Venc.":    bucketLabel(r.validade_bucket),
        "Nº Inventário":   r.inventario_id,
        "Dia":             r.dia_key,
      }));
    } else if (aba==="Divergências") {
      dados = divergenciasRows.map((r) => ({
        "Dia":             r.dia_key,
        "Nº Inventário":   r.inventario_id,
        "Local":           r.endereco,
        "Rua":             r.rua,
        "EAN":             r.codigo_barras,
        "Cód. Produto":    r.codigo_produto,
        "Produto":         r.nome_produto,
        "Qtd Sistêmica":   r.qtd_sistemica,
        "Qtd Física":      r.qtd_fisica,
        "Divergência":     r.divergencia,
        "Resultado":       r.resultado,
        "Tipo Div.":       r.tipo_divergencia,
        "Lote Indústria":  r.lote_industria,
        "Lote Senior":     r.lote_senior,
        "Condição":        r.condicao,
        "Validade":        r.validade,
      }));
    } else if (aba==="Vencimentos") {
      dados = vencimentosRows.map((r) => ({
        "Status":          bucketLabel(r.bucket),
        "Dias":            r.dias,
        "Validade":        r.validade,
        "Fonte":           r.fonte,
        "Última Contagem": r.dia_ultima_contagem,
        "Nº Inventário":   r.inventario_id,
        "Local":           r.endereco,
        "Rua":             r.rua,
        "Cód. Produto":    r.codigo_produto,
        "EAN":             r.codigo_barras,
        "Produto":         r.nome_produto,
        "Qtd Sistêmica":   r.qtd_sistemica,
        "Qtd Física":      r.qtd_fisica,
      }));
    } else {
      dados = corrigidosRows.map((r) => ({
        "Dia":             r.dia_key,
        "Nº Inventário":   r.inventario_id,
        "Local":           r.endereco,
        "Rua":             r.rua,
        "Cód. Produto":    r.codigo_produto,
        "Produto":         r.nome_produto,
        "Qtd Sistêmica":   r.qtd_sistemica,
        "Qtd Física":      r.qtd_fisica,
        "Divergência":     r.divergencia,
        "Tipo Div.":       r.tipo_divergencia,
        "Observação":      r.observacao,
        "Obs. Correção":   r.obs_correcao,
      }));
    }

    if (dados.length===0) return alert("Sem dados para exportar.");

    const ws  = XLSX.utils.json_to_sheet(dados);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomeAba);

    // Auto-width
    const cols = Object.keys(dados[0]||{});
    ws["!cols"] = cols.map((k) => ({
      wch: Math.max(k.length, ...dados.map((r) => String(r[k]??"").length), 10),
    }));

    XLSX.writeFile(wb, `${nomeAba.toLowerCase()}_${startKey}_${endKey}.xlsx`);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif", padding:"20px 18px 40px" }}>
      <style>{`
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:rgba(255,255,255,0.04)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:99px}
        input,select,textarea{color-scheme:dark}
        select option{background:#1a1a2e;color:#fff}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .35s ease both}
        tbody tr:hover td{background:rgba(255,255,255,0.025)}
      `}</style>

      {modalItem && <ModalCorrecao item={modalItem} onConfirm={handleCorrigir} onClose={() => setModalItem(null)} />}

      <div style={{ maxWidth:1400, margin:"0 auto" }}>

        {/* HEADER */}
        <div className="fade" style={{ ...cardStyle, padding:"18px 24px", marginBottom:14, background:"linear-gradient(135deg,rgba(255,122,24,0.12),rgba(139,92,246,0.08))" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>WMS Ybera Group</div>
              <h1 style={{ margin:"4px 0 0", fontSize:20, fontWeight:900, background:"linear-gradient(90deg,#ff7a18,#8b5cf6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Relatórios de Inventário
              </h1>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{labelPeriodo}</div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              {["DIARIO","SEMANAL","MENSAL"].map((p) => (
                <button key={p} onClick={() => setPeriodo(p)} style={{
                  padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer",
                  fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase",
                  background: periodo===p?"linear-gradient(135deg,#ff7a18,#8b5cf6)":"rgba(255,255,255,0.06)",
                  color: periodo===p?"#fff":C.muted, transition:"all .2s",
                }}>
                  {p==="DIARIO"?"Diário":p==="SEMANAL"?"Semanal":"Mensal"}
                </button>
              ))}
              <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} style={inputStyle}/>
              <button onClick={exportarXLSX} style={{
                display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
                borderRadius:8, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#22d3a0,#4aa3ff)",
                color:"#fff", fontSize:11, fontWeight:900, boxShadow:"0 4px 16px rgba(34,211,160,0.25)",
              }}>
                <Download size={14}/> Exportar XLSX
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ marginTop:14, display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
            <Filter size={13} color={C.muted} style={{ marginBottom:8 }}/>
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
                <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.muted, pointerEvents:"none" }}/>
                <input value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Local, produto, EAN, código..."
                  style={{ ...inputStyle, paddingLeft:30, width:"100%" }}/>
              </div>
            </FilterBox>
          </div>
        </div>

        {/* CARDS */}
        <div className="fade" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:14, animationDelay:".05s" }}>
          <ResumoCard label="Cadastrados"          val={formatBRInt(produtos.length)}             color={C.blue}   icon={<Package size={15}/>}/>
          <ResumoCard label="Pendentes"            val={formatBRInt(pendenciasRows.length)}       color={C.amber}  icon={<Clock size={15}/>}/>
          <ResumoCard label="Divergências"         val={formatBRInt(divergenciasRows.length)}     color={C.red}    icon={<AlertTriangle size={15}/>}/>
          <ResumoCard label="Vencimentos"          val={formatBRInt(vencimentosRows.length)}      color={C.orange} icon={<Calendar size={15}/>}/>
          <ResumoCard label="Corrigidos"           val={formatBRInt(corrigidosRows.length)}       color={C.green}  icon={<CheckCircle size={15}/>}/>
          <ResumoCard label="Erro de Posição/Lote" val={formatBRInt(erros.posicaoLote)}                  color={C.purple} icon={<AlertTriangle size={15}/>}/>
          <ResumoCard label="Erro de Quantidade"   val={formatBRInt(erros.qtd)}                   color={C.red}    icon={<AlertTriangle size={15}/>}/>
          <ResumoCard label="Erro de Estado"       val={formatBRInt(erros.estado)}                color={C.pink}   icon={<AlertTriangle size={15}/>}/>
        </div>

        {/* ABAS + TABELA */}
        <div className="fade" style={{ ...cardStyle, overflow:"hidden", animationDelay:".10s" }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:"rgba(255,255,255,0.02)", overflowX:"auto" }}>
            {ABAS.map((tab) => (
              <button key={tab} onClick={() => setAba(tab)} style={{
                padding:"14px 22px", border:"none", background:"none", cursor:"pointer", whiteSpace:"nowrap",
                fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase",
                borderBottom: aba===tab?`2px solid ${C.orange}`:"2px solid transparent",
                color: aba===tab?C.orange:C.muted, transition:"all .2s",
              }}>
                {tab}
                <span style={{ marginLeft:6, fontSize:9, background:"rgba(255,255,255,0.08)", padding:"2px 7px", borderRadius:99, color:C.muted }}>
                  {contagem[tab]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ overflowX:"auto" }}>
            {aba==="Pendências"   && <TabelaPendencias   rows={pendenciasRows}   onCorrigir={setModalItem}/>}
            {aba==="Divergências" && <TabelaDivergencias rows={divergenciasRows} onCorrigir={setModalItem}/>}
            {aba==="Vencimentos"  && <TabelaVencimentos  rows={vencimentosRows}  onCorrigir={setModalItem}/>}
            {aba==="Corrigidos"   && <TabelaCorrigidos   rows={corrigidosRows}/>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══ TABELAS ════════════════════════════════════════════════════════════════ */

const Empty = ({ cols }) => (
  <tr><td colSpan={cols} style={{ ...tdStyle, textAlign:"center", padding:40, color:"rgba(255,255,255,0.25)", fontSize:13, fontWeight:800 }}>
    Sem registros para mostrar.
  </td></tr>
);

const BtnCorrigir = ({ row, onCorrigir }) => {
  if (!row._id) return null;
  return (
    <button onClick={() => onCorrigir(row)} style={{
      padding:"5px 11px", borderRadius:7, border:"none", cursor:"pointer", fontSize:10, fontWeight:900,
      background:"rgba(34,211,160,0.12)", color:"#22d3a0",
      display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap",
      transition:"background .2s",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background="rgba(34,211,160,0.22)"}
    onMouseLeave={(e) => e.currentTarget.style.background="rgba(34,211,160,0.12)"}>
      <CheckCircle size={12}/> Corrigir
    </button>
  );
};

const TabelaPendencias = ({ rows, onCorrigir }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Local","Rua","Cód. Produto","EAN","Produto","Sis.","Fís.","Div.","Tipo","Validade","Status","Nº Inv.",""].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={13}/> : rows.slice(0,300).map((r,i) => (
        <tr key={i}>
          <td style={{ ...tdStyle, color:"#4aa3ff", fontWeight:900 }}>{r.endereco}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.rua}</td>
          <td style={{ ...tdStyle, fontFamily:"monospace", fontSize:10 }}>{r.codigo_produto||"—"}</td>
          <td style={{ ...tdStyle, fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.50)" }}>{r.codigo_barras||"—"}</td>
          <td style={tdStyle}>{r.nome_produto||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>{r.qtd_sistemica===""?"—":r.qtd_sistemica}</td>
          <td style={{ ...tdStyle, textAlign:"center", color:"#4aa3ff", fontWeight:900 }}>{r.qtd_fisica===""?"—":r.qtd_fisica}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>
            {r.divergencia===""?"—":(
              <span style={{ padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:900,
                background:Number(r.divergencia)<0?"rgba(255,77,106,0.15)":Number(r.divergencia)>0?"rgba(251,191,36,0.15)":"rgba(34,211,160,0.10)",
                color:Number(r.divergencia)<0?"#ff4d6a":Number(r.divergencia)>0?"#fbbf24":"#22d3a0" }}>
                {Number(r.divergencia)>0?`+${r.divergencia}`:r.divergencia}
              </span>
            )}
          </td>
          <td style={tdStyle}><TipoPill v={r.tipo_divergencia}/></td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.50)" }}>{r.validade||"—"}</td>
          <td style={tdStyle}><BucketPill bucket={r.validade_bucket}/></td>
          <td style={{ ...tdStyle, color:"#8b5cf6", fontWeight:900 }}>{r.inventario_id||"—"}</td>
          <td style={{ ...tdStyle }}>
            {r._corrigido
              ? <span style={{ padding:"4px 10px", borderRadius:7, fontSize:9, fontWeight:900, textTransform:"uppercase", background:"rgba(34,211,160,0.15)", color:"#22d3a0", display:"inline-flex", alignItems:"center", gap:4 }}>
                  <CheckCircle size={11}/> CORRIGIDO
                </span>
              : <BtnCorrigir row={r} onCorrigir={onCorrigir}/>
            }
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TabelaDivergencias = ({ rows, onCorrigir }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Dia","Nº Inv.","Local","Rua","EAN","Cód. Produto","Produto","Sis.","Fís.","Div.","Resultado","Tipo Div.","Lote Ind.","Lote Senior","Condição","Validade",""].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={17}/> : rows.slice(0,300).map((r,i) => (
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
              background:r.divergencia<0?"rgba(255,77,106,0.15)":"rgba(251,191,36,0.15)",
              color:r.divergencia<0?"#ff4d6a":"#fbbf24" }}>
              {r.divergencia>0?`+${r.divergencia}`:r.divergencia}
            </span>
          </td>
          <td style={{ ...tdStyle, textAlign:"center" }}><ResultPill v={r.resultado}/></td>
          <td style={{ ...tdStyle, textAlign:"center" }}><TipoPill v={r.tipo_divergencia}/></td>
          <td style={{ ...tdStyle, fontSize:10, color:"rgba(255,255,255,0.45)" }}>{r.lote_industria||"—"}</td>
          <td style={{ ...tdStyle, fontSize:10, color:"rgba(255,255,255,0.45)" }}>{r.lote_senior||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>
            <span style={{ fontSize:9, fontWeight:900, padding:"2px 7px", borderRadius:6,
              background:r.condicao==="DANIFICADO"?"rgba(255,77,106,0.15)":r.condicao==="VENCIDO"?"rgba(251,191,36,0.12)":"rgba(34,211,160,0.10)",
              color:r.condicao==="DANIFICADO"?"#ff4d6a":r.condicao==="VENCIDO"?"#fbbf24":"#22d3a0" }}>
              {r.condicao||"—"}
            </span>
          </td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.50)" }}>{r.validade||"—"}</td>
          <td style={tdStyle}><BtnCorrigir row={r} onCorrigir={onCorrigir}/></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TabelaVencimentos = ({ rows, onCorrigir }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Status","Dias","Validade","Fonte","Última Cont.","Nº Inv.","Local","Rua","Produto","Sis.","Fís.",""].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={12}/> : rows.slice(0,400).map((r,i) => (
        <tr key={i}>
          <td style={tdStyle}><BucketPill bucket={r.bucket}/></td>
          <td style={{ ...tdStyle, textAlign:"center", fontWeight:900, color:Number(r.dias)<0?"#ff4d6a":"#fbbf24" }}>{r.dias}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.70)" }}>{r.validade||"—"}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.fonte}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.dia_ultima_contagem||"—"}</td>
          <td style={{ ...tdStyle, color:"#8b5cf6", fontWeight:900 }}>{r.inventario_id||"—"}</td>
          <td style={{ ...tdStyle, color:"#4aa3ff", fontWeight:900 }}>{r.endereco||"—"}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)" }}>{r.rua||"—"}</td>
          <td style={tdStyle}>{r.nome_produto||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>{safeNumOrBlank(r.qtd_sistemica)}</td>
          <td style={{ ...tdStyle, textAlign:"center", color:"#4aa3ff", fontWeight:900 }}>{safeNumOrBlank(r.qtd_fisica)}</td>
          <td style={tdStyle}><BtnCorrigir row={r} onCorrigir={onCorrigir}/></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TabelaCorrigidos = ({ rows }) => (
  <table style={{ width:"100%", borderCollapse:"collapse" }}>
    <thead><tr>
      {["Dia Auditoria","Corrigido em","Nº Inv.","Local","Rua","Produto","Sis.","Fís.","Div.","Tipo Div.","Obs. Correção"].map((h) => (
        <th key={h} style={thStyle}>{h}</th>
      ))}
    </tr></thead>
    <tbody>
      {rows.length===0 ? <Empty cols={11}/> : rows.slice(0,300).map((r,i) => (
        <tr key={i}>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)", fontSize:10 }}>{r.dia_key||"—"}</td>
          <td style={{ ...tdStyle, color:"#22d3a0", fontWeight:900, fontSize:10 }}>{r.data_correcao||"—"}</td>
          <td style={{ ...tdStyle, color:"#8b5cf6", fontWeight:900 }}>{r.inventario_id||"—"}</td>
          <td style={{ ...tdStyle, color:"#4aa3ff", fontWeight:900 }}>{r.endereco}</td>
          <td style={{ ...tdStyle, color:"rgba(255,255,255,0.40)" }}>{r.rua}</td>
          <td style={tdStyle}>{r.nome_produto||"—"}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>{r.qtd_sistemica}</td>
          <td style={{ ...tdStyle, textAlign:"center", color:"#4aa3ff", fontWeight:900 }}>{r.qtd_fisica}</td>
          <td style={{ ...tdStyle, textAlign:"center" }}>
            <span style={{ padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:900,
              background:r.divergencia===0?"rgba(34,211,160,0.12)":r.divergencia<0?"rgba(255,77,106,0.12)":"rgba(251,191,36,0.12)",
              color:r.divergencia===0?"#22d3a0":r.divergencia<0?"#ff4d6a":"#fbbf24" }}>
              {r.divergencia>0?`+${r.divergencia}`:r.divergencia}
            </span>
          </td>
          <td style={tdStyle}><TipoPill v={r.tipo_divergencia}/></td>
          <td style={{ ...tdStyle, color:"#22d3a0", fontSize:10, fontStyle:r.obs_correcao?"normal":"italic" }}>{r.obs_correcao||"—"}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* ══ UI ═════════════════════════════════════════════════════════════════════ */

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
        <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.50)", lineHeight:1.4 }}>{label}</div>
        <div style={{ color, opacity:.7 }}>{icon}</div>
      </div>
      <div style={{ fontSize:24, fontWeight:900, marginTop:6, color }}>{val}</div>
    </div>
  </div>
);

const ResultPill = ({ v }) => {
  const s = v==="FALTA"||v==="VENCIDO" ? { bg:"rgba(255,77,106,0.15)", color:"#ff4d6a" }
          : v==="SOBRA"                 ? { bg:"rgba(251,191,36,0.15)",  color:"#fbbf24" }
          :                              { bg:"rgba(34,211,160,0.12)",   color:"#22d3a0" };
  return <span style={{ padding:"3px 8px", borderRadius:6, fontSize:9, fontWeight:900, textTransform:"uppercase", ...s }}>{v||"OK"}</span>;
};

const TipoPill = ({ v }) => {
  const color = v==="AJUSTAR SISTEMA"?"#ff4d6a":v==="VERIFICAR ENTRADA"?"#fbbf24":v==="ERRO DE POSIÇÃO"?"#8b5cf6":v==="NAO AUDITADO"?"#ff7a18":"rgba(255,255,255,0.35)";
  const bg    = v==="AJUSTAR SISTEMA"?"rgba(255,77,106,0.12)":v==="VERIFICAR ENTRADA"?"rgba(251,191,36,0.12)":v==="ERRO DE POSIÇÃO"?"rgba(139,92,246,0.12)":v==="NAO AUDITADO"?"rgba(255,122,24,0.12)":"rgba(255,255,255,0.05)";
  return <span style={{ padding:"3px 8px", borderRadius:6, fontSize:9, fontWeight:900, textTransform:"uppercase", background:bg, color, whiteSpace:"nowrap" }}>{v||"NENHUMA"}</span>;
};

const BucketPill = ({ bucket }) => {
  const b = bucket||"SEM_VALIDADE";
  const color = b==="VENCIDO"?"#ff4d6a":b==="CRITICO_30D"?"#fbbf24":b==="CRITICO_90D"?"#ff7a18":"rgba(255,255,255,0.35)";
  const bg    = b==="VENCIDO"?"rgba(255,77,106,0.15)":b==="CRITICO_30D"?"rgba(251,191,36,0.12)":b==="CRITICO_90D"?"rgba(255,122,24,0.12)":"rgba(255,255,255,0.05)";
  return <span style={{ padding:"3px 8px", borderRadius:6, fontSize:9, fontWeight:900, textTransform:"uppercase", background:bg, color }}>{bucketLabel(b)}</span>;
};

export default Relatorios;