// src/pages/Inventario.jsx
// Formulário de auditoria diária — visual dark/gold
// Campos: Nº Inventário, Local (D-22-1-1), EAN (Zebra), Código Produto,
//         Lote Indústria, Lote Senior, Qtd Sistêmica, Qtd Física,
//         Condição, Validade, Tipo de Divergência

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../firebaseConfig";
import {
  addDoc, collection, serverTimestamp,
  query, where, limit, getDocs,
} from "firebase/firestore";
import { Calendar, MapPin, Barcode, Hash, Package, AlertTriangle, CheckCircle2, Clock, Layers } from "lucide-react";
import {
  toISODate, parseEndereco, getValidadeBucket, getDiasParaVencer,
  startOfDay, safeNum, TIPOS_DIVERGENCIA, CONDICOES,
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
  borderRadius: 18,
  border: `1px solid ${C.border}`,
  background: C.panel,
  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
  backdropFilter: "blur(10px)",
};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  fontSize: 13,
  fontWeight: 700,
  padding: "10px 14px",
  outline: "none",
  width: "100%",
  transition: "border .2s",
};

const Inventario = () => {
  const [loading,      setLoading]      = useState(false);
  const [numInventario, setNumInventario] = useState("");

  const [form, setForm] = useState({
    endereco:       "",
    codigo_barras:  "",
    codigo_produto: "",
    nome_produto:   "",
    qtd_sistemica:  "",
    qtd_fisica:     "",
    lote_industria: "",
    lote_senior:    "",
    validade:       "",
    condicao:       "BOM",
    tipo_divergencia: "NENHUMA",
    observacao:     "",
  });

  const [produtoInfo, setProdutoInfo] = useState({
    status: "idle", // idle | searching | found | notfound
    msg: "Aguardando EAN...",
  });

  const barcodeRef = useRef(null);
  useEffect(() => { setTimeout(() => barcodeRef.current?.focus?.(), 120); }, []);

  // ── "Hoje" e dia_key ────────────────────────────────────────────────────────
  const hoje   = useMemo(() => startOfDay(new Date()), []);
  const dia_key = useMemo(() => toISODate(new Date()), []);

  // ── Parse do endereço ────────────────────────────────────────────────────────
  const parsed = useMemo(() => parseEndereco(form.endereco), [form.endereco]);

  // ── Cálculos de divergência ───────────────────────────────────────────────
  const divergencia = useMemo(() => {
    if (form.qtd_sistemica === "" || form.qtd_fisica === "") return null;
    return safeNum(form.qtd_fisica) - safeNum(form.qtd_sistemica);
  }, [form.qtd_sistemica, form.qtd_fisica]);

  const resultado = useMemo(() => {
    if (divergencia === null) return "—";
    if (divergencia === 0)   return "OK";
    if (divergencia < 0)     return "FALTA";
    return "SOBRA";
  }, [divergencia]);

  // ── Vencimento ────────────────────────────────────────────────────────────
  const vencInfo = useMemo(() => {
    if (!form.validade) return { bucket: "SEM_VALIDADE", label: "—", badge: "Sem validade", color: C.muted };
    const bucket = getValidadeBucket(form.validade, hoje);
    const dias   = getDiasParaVencer(form.validade, hoje);
    const color  = bucket === "VENCIDO" ? C.red : bucket === "CRITICO_30D" ? C.amber : bucket === "CRITICO_90D" ? C.orange : C.green;
    const badge  = bucket === "VENCIDO" ? "VENCIDO" : bucket === "CRITICO_30D" ? `Crítico ${dias}d` : bucket === "CRITICO_90D" ? `A vencer ${dias}d` : `OK ${dias}d`;
    return { bucket, label: `${form.validade} (${dias}d)`, badge, color };
  }, [form.validade, hoje]);

  // ── Busca produto por EAN ─────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const ean = form.codigo_barras.trim();

    if (!ean) {
      setProdutoInfo({ status: "idle", msg: "Aguardando EAN..." });
      return;
    }

    setProdutoInfo({ status: "searching", msg: "Buscando produto..." });

    const t = setTimeout(async () => {
      try {
        const q = query(collection(db, "produtos"), where("codigo_barras", "==", ean), limit(1));
        const snap = await getDocs(q);
        if (!alive) return;

        if (!snap.empty) {
          const prod = snap.docs[0].data();
          setProdutoInfo({ status: "found", msg: `✅ ${prod.nome_produto}` });
          setForm((p) => ({
            ...p,
            codigo_produto: p.codigo_produto || prod.codigo_produto || "",
            nome_produto:   prod.nome_produto || p.nome_produto,
          }));
        } else {
          setProdutoInfo({ status: "notfound", msg: "EAN não encontrado no cadastro. Preencha manualmente." });
        }
      } catch (err) {
        console.error(err);
        if (alive) setProdutoInfo({ status: "notfound", msg: "Erro ao buscar produto." });
      }
    }, 300);

    return () => { alive = false; clearTimeout(t); };
  }, [form.codigo_barras]);

  // ── Reset item (mantém endereço e nº inventário) ──────────────────────────
  const resetItem = () => {
    setForm((p) => ({
      ...p,
      codigo_barras:  "",
      codigo_produto: "",
      nome_produto:   "",
      qtd_sistemica:  "",
      qtd_fisica:     "",
      lote_industria: "",
      lote_senior:    "",
      validade:       "",
      condicao:       "BOM",
      tipo_divergencia: "NENHUMA",
      observacao:     "",
    }));
    setProdutoInfo({ status: "idle", msg: "Aguardando EAN..." });
    setTimeout(() => barcodeRef.current?.focus?.(), 80);
  };

  // ── Salvar ────────────────────────────────────────────────────────────────
  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!numInventario.trim()) return alert("Informe o Nº do Inventário.");
    if (!parsed.ok) return alert("Endereço inválido. Use o padrão D-22-1-1.");
    if (!form.codigo_barras.trim() && !form.codigo_produto.trim()) return alert("Informe o EAN ou Código do Produto.");
    if (!form.nome_produto.trim()) return alert("Nome do produto está vazio.");
    if (form.qtd_sistemica === "") return alert("Informe a quantidade sistêmica.");
    if (form.qtd_fisica === "")    return alert("Informe a quantidade física.");

    setLoading(true);
    try {
      await addDoc(collection(db, "auditorias"), {
        // Inventário
        dia_key,
        inventario_id:    numInventario.trim(),
        data_auditoria:   serverTimestamp(),

        // Localização
        endereco:         parsed.endereco,
        local:            parsed.endereco,
        rua:              parsed.rua,
        local_num:        parsed.localNum,
        nivel:            parsed.nivel,
        posicao:          parsed.posicao,

        // Produto
        codigo_barras:    form.codigo_barras.trim(),
        codigo_produto:   form.codigo_produto.trim(),
        nome_produto:     form.nome_produto.trim(),

        // Quantidades
        qtd_sistemica:    safeNum(form.qtd_sistemica),
        qtd_fisica:       safeNum(form.qtd_fisica),
        divergencia:      Number(divergencia ?? 0),
        resultado,
        status:           divergencia === 0 ? "OK" : "DIVERGENTE",

        // Rastreio
        lote_industria:   form.lote_industria.trim().toUpperCase(),
        lote_senior:      form.lote_senior.trim().toUpperCase(),
        validade:         form.validade || null,
        validade_bucket:  vencInfo.bucket,
        dias_para_vencer: getDiasParaVencer(form.validade, hoje),
        is_vencido:       vencInfo.bucket === "VENCIDO",

        // Qualidade
        condicao:         form.condicao,
        tipo_divergencia: form.tipo_divergencia,
        observacao:       form.observacao.trim(),
      });

      alert("✅ Auditoria registrada!");
      resetItem();
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar.");
    }
    setLoading(false);
  };

  // ── KPI Cards topo ────────────────────────────────────────────────────────
  const kpis = [
    { label: "Qtd Sistêmica", val: form.qtd_sistemica === "" ? "—" : `${safeNum(form.qtd_sistemica)} UN`, color: C.blue,   icon: <Package size={18}/> },
    { label: "Qtd Física",    val: form.qtd_fisica    === "" ? "—" : `${safeNum(form.qtd_fisica)} UN`,    color: C.green,  icon: <Hash size={18}/> },
    { label: "Divergência",   val: divergencia === null ? "—" : `${divergencia > 0 ? "+" : ""}${divergencia}`,
      color: divergencia === null ? C.muted : divergencia === 0 ? C.green : C.red, icon: <AlertTriangle size={18}/> },
    { label: "Resultado",     val: resultado, color: resultado === "OK" ? C.green : resultado === "—" ? C.muted : resultado === "FALTA" ? C.red : C.amber, icon: <CheckCircle2 size={18}/> },
    { label: "Validade",      val: vencInfo.badge, color: vencInfo.color, icon: <Clock size={18}/> },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif", padding:"20px 18px 40px" }}>
      <style>{`
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:rgba(255,255,255,0.04)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:99px}
        input,select{color-scheme:dark}
        input:focus,select:focus{border-color:rgba(74,163,255,0.6) !important;box-shadow:0 0 0 3px rgba(74,163,255,0.12)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .35s ease both}
      `}</style>

      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="fade" style={{ ...cardStyle, padding:"18px 24px", marginBottom:16, background:"linear-gradient(135deg,rgba(139,92,246,0.15),rgba(74,163,255,0.08))" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>Inventário Diário</div>
              <h1 style={{ margin:"4px 0 0", fontSize:20, fontWeight:900, background:"linear-gradient(90deg,#8b5cf6,#4aa3ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Contagem e Auditoria
              </h1>
            </div>
            <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
              {/* Nº Inventário */}
              <div>
                <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted, marginBottom:5 }}>Nº Inventário</div>
                <input
                  value={numInventario}
                  onChange={(e) => setNumInventario(e.target.value)}
                  placeholder="Ex: 372"
                  style={{ ...inputStyle, width:120, textAlign:"center", fontSize:16, fontWeight:900 }}
                />
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted }}>Data</div>
                <div style={{ fontSize:14, fontWeight:900, color:C.text, marginTop:4 }}>{dia_key}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ────────────────────────────────────────────────── */}
        <div className="fade" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:16, animationDelay:".05s" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ ...cardStyle, padding:"14px 16px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:-10, background:k.color, opacity:.08, filter:"blur(16px)" }} />
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted }}>{k.label}</div>
                  <div style={{ color:k.color, opacity:.8 }}>{k.icon}</div>
                </div>
                <div style={{ fontSize:22, fontWeight:900, marginTop:6, color:k.color }}>{k.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FORMULÁRIO ───────────────────────────────────────────────── */}
        <div className="fade" style={{ ...cardStyle, animationDelay:".10s" }}>
          {/* Status do produto */}
          <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.02)" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted }}>Produto</div>
              <div style={{ fontSize:13, fontWeight:900, marginTop:3,
                color: produtoInfo.status === "found" ? C.green : produtoInfo.status === "notfound" ? C.amber : C.muted
              }}>
                {produtoInfo.msg}
              </div>
            </div>
            <button
              type="button"
              onClick={resetItem}
              style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"8px 16px", fontSize:11, fontWeight:800, cursor:"pointer" }}
            >
              Novo Item
            </button>
          </div>

          <form onSubmit={handleSalvar} style={{ padding:24 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:16 }}>

              {/* Endereço */}
              <div style={{ gridColumn:"span 4" }}>
                <Field label="Local (Endereço)" icon={<MapPin size={13} color={C.pink}/>}>
                  <input
                    value={form.endereco}
                    onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value.toUpperCase() }))}
                    placeholder="D-22-1-1"
                    style={{ ...inputStyle, borderColor: form.endereco && !parsed.ok ? C.red : C.border }}
                  />
                  <div style={{ fontSize:10, color: parsed.ok ? C.muted : C.red, fontWeight:700, marginTop:5 }}>
                    {parsed.ok ? `${parsed.rua} • Local ${parsed.localNum} • Nível ${parsed.nivel}` : form.endereco ? "Formato inválido — use D-22-1-1" : "Padrão: D-22-1-1"}
                  </div>
                </Field>
              </div>

              {/* EAN */}
              <div style={{ gridColumn:"span 4" }}>
                <Field label="EAN (Código de Barras)" icon={<Barcode size={13} color={C.blue}/>} hint="Escaneie com o Zebra">
                  <input
                    ref={barcodeRef}
                    value={form.codigo_barras}
                    onChange={(e) => setForm((p) => ({ ...p, codigo_barras: e.target.value }))}
                    placeholder="Escaneie aqui..."
                    style={inputStyle}
                  />
                </Field>
              </div>

              {/* Código Produto */}
              <div style={{ gridColumn:"span 4" }}>
                <Field label="Código do Produto" icon={<Hash size={13} color={C.purple}/>}>
                  <input
                    value={form.codigo_produto}
                    onChange={(e) => setForm((p) => ({ ...p, codigo_produto: e.target.value }))}
                    placeholder="4000100006--U"
                    style={inputStyle}
                  />
                </Field>
              </div>

              {/* Nome produto */}
              <div style={{ gridColumn:"span 12" }}>
                <Field label="Descrição do Produto" icon={<Package size={13} color={C.orange}/>}>
                  <input
                    value={form.nome_produto}
                    onChange={(e) => setForm((p) => ({ ...p, nome_produto: e.target.value }))}
                    placeholder="Nome do produto (preenchido automaticamente pelo EAN)..."
                    style={inputStyle}
                    required
                  />
                </Field>
              </div>

              {/* Qtd Sistêmica */}
              <div style={{ gridColumn:"span 3" }}>
                <Field label="Qtd Sistêmica (WMS)" icon={<Hash size={13} color={C.blue}/>}>
                  <input
                    type="number"
                    value={form.qtd_sistemica}
                    onChange={(e) => setForm((p) => ({ ...p, qtd_sistemica: e.target.value }))}
                    placeholder="0"
                    style={{ ...inputStyle, fontSize:22, fontWeight:900 }}
                    required
                  />
                </Field>
              </div>

              {/* Qtd Física */}
              <div style={{ gridColumn:"span 3", background:"rgba(74,163,255,0.06)", borderRadius:12, padding:12 }}>
                <Field label="Qtd Física (Contada)" icon={<Hash size={13} color={C.green}/>}>
                  <input
                    type="number"
                    value={form.qtd_fisica}
                    onChange={(e) => setForm((p) => ({ ...p, qtd_fisica: e.target.value }))}
                    placeholder="0"
                    style={{ ...inputStyle, fontSize:28, fontWeight:900, background:"transparent", border:"none", color:C.green, padding:"6px 0" }}
                    required
                  />
                </Field>
              </div>

              {/* Lote Indústria */}
              <div style={{ gridColumn:"span 3" }}>
                <Field label="Lote Indústria" icon={<Layers size={13} color={C.purple}/>}>
                  <input
                    value={form.lote_industria}
                    onChange={(e) => setForm((p) => ({ ...p, lote_industria: e.target.value.toUpperCase() }))}
                    placeholder="Ex: 88291"
                    style={inputStyle}
                  />
                </Field>
              </div>

              {/* Lote Senior */}
              <div style={{ gridColumn:"span 3" }}>
                <Field label="Lote Senior (WMS)" icon={<Layers size={13} color={C.pink}/>}>
                  <input
                    value={form.lote_senior}
                    onChange={(e) => setForm((p) => ({ ...p, lote_senior: e.target.value.toUpperCase() }))}
                    placeholder="Ex: 1231017769"
                    style={inputStyle}
                  />
                </Field>
              </div>

              {/* Validade */}
              <div style={{ gridColumn:"span 3" }}>
                <Field label="Validade" icon={<Calendar size={13} color={C.amber}/>}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input
                      type="date"
                      value={form.validade}
                      onChange={(e) => setForm((p) => ({ ...p, validade: e.target.value }))}
                      style={{ ...inputStyle, flex:1 }}
                    />
                    {form.validade && (
                      <span style={{ fontSize:9, fontWeight:900, padding:"4px 8px", borderRadius:6, background:`${vencInfo.color}18`, color:vencInfo.color, whiteSpace:"nowrap" }}>
                        {vencInfo.badge}
                      </span>
                    )}
                  </div>
                </Field>
              </div>

              {/* Condição */}
              <div style={{ gridColumn:"span 3" }}>
                <Field label="Condição">
                  <select
                    value={form.condicao}
                    onChange={(e) => setForm((p) => ({ ...p, condicao: e.target.value }))}
                    style={{ ...inputStyle }}
                  >
                    {CONDICOES.map((c) => <option key={c} value={c}>{c === "BOM" ? "🟢 BOM" : "🔴 DANIFICADO"}</option>)}
                  </select>
                </Field>
              </div>

              {/* Tipo Divergência */}
              <div style={{ gridColumn:"span 3" }}>
                <Field label="Tipo de Divergência" icon={<AlertTriangle size={13} color={C.red}/>}>
                  <select
                    value={form.tipo_divergencia}
                    onChange={(e) => setForm((p) => ({ ...p, tipo_divergencia: e.target.value }))}
                    style={{ ...inputStyle, color: form.tipo_divergencia !== "NENHUMA" ? C.amber : C.muted }}
                  >
                    {TIPOS_DIVERGENCIA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              {/* Observação */}
              <div style={{ gridColumn:"span 12" }}>
                <Field label="Observação (opcional)">
                  <input
                    value={form.observacao}
                    onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                    placeholder="Ex: produto danificado, conferir entrada..."
                    style={inputStyle}
                  />
                </Field>
              </div>

              {/* Botão */}
              <div style={{ gridColumn:"span 12" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width:"100%", padding:"16px",
                    borderRadius:14, border:"none",
                    background: loading ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#8b5cf6,#4aa3ff)",
                    color:"#fff", fontSize:15, fontWeight:900,
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: loading ? "none" : "0 8px 28px rgba(139,92,246,0.35)",
                    opacity: loading ? 0.6 : 1,
                    transition:"all .2s",
                    letterSpacing:1,
                  }}
                >
                  {loading ? "SALVANDO..." : "✓ CONFIRMAR AUDITORIA"}
                </button>
              </div>

            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

const Field = ({ label, icon, hint, children }) => (
  <div>
    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.40)", marginBottom:8 }}>
      {icon}{label}
    </div>
    {children}
    {hint && <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", fontWeight:700, marginTop:5 }}>{hint}</div>}
  </div>
);

export default Inventario;