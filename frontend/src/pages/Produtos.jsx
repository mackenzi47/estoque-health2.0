// src/pages/Produtos.jsx
// Cadastro de produtos: EAN (lido pelo Zebra) + Código do Produto + Descrição
// Visual: dark/gold — mesmo tema do Dashboard

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../firebaseConfig";
import {
  addDoc, collection, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { Barcode, Hash, Package, Search, Trash2, PlusCircle } from "lucide-react";

// ─── Paleta ──────────────────────────────────────────────────────────────────
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

const cardStyle = {
  borderRadius: 18,
  border: `1px solid ${C.border}`,
  background: C.panel,
  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
  backdropFilter: "blur(10px)",
  overflow: "hidden",
};

const Produtos = () => {
  const [loading,  setLoading]  = useState(false);
  const [busca,    setBusca]    = useState("");
  const [produtos, setProdutos] = useState([]);

  const [form, setForm] = useState({
    codigo_barras:   "",
    codigo_produto:  "",
    nome_produto:    "",
  });

  const barcodeRef = useRef(null);
  useEffect(() => { setTimeout(() => barcodeRef.current?.focus?.(), 120); }, []);

  // ── Firestore ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "produtos"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ── Filtro de busca ────────────────────────────────────────────────────────
  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) =>
      [p.codigo_barras, p.codigo_produto, p.nome_produto]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [busca, produtos]);

  // ── Salvar ─────────────────────────────────────────────────────────────────
  const salvar = async (e) => {
    e.preventDefault();
    const ean  = form.codigo_barras.trim();
    const cod  = form.codigo_produto.trim();
    const nome = form.nome_produto.trim();

    if (!ean)  return alert("Escaneie ou informe o código de barras (EAN).");
    if (!cod)  return alert("Informe o código do produto.");
    if (!nome) return alert("Informe a descrição do produto.");

    // Verifica duplicata por EAN
    const duplicado = produtos.find((p) => p.codigo_barras === ean);
    if (duplicado) return alert(`EAN ${ean} já cadastrado como "${duplicado.nome_produto}".`);

    setLoading(true);
    try {
      await addDoc(collection(db, "produtos"), {
        codigo_barras:  ean,
        codigo_produto: cod,
        nome_produto:   nome,
        created_at:     serverTimestamp(),
      });
      setForm({ codigo_barras: "", codigo_produto: "", nome_produto: "" });
      setTimeout(() => barcodeRef.current?.focus?.(), 80);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao cadastrar produto.");
    }
    setLoading(false);
  };

  // ── Excluir ────────────────────────────────────────────────────────────────
  const excluir = async (id, nome) => {
    if (!confirm(`Excluir "${nome}"?`)) return;
    try { await deleteDoc(doc(db, "produtos", id)); }
    catch (err) { console.error(err); alert("❌ Erro ao excluir."); }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui,-apple-system,'Segoe UI',sans-serif", padding:"20px 18px 40px" }}>
      <style>{`
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:rgba(255,255,255,0.04)}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:99px}
        input,select{color-scheme:dark}
        input:focus{border-color:rgba(74,163,255,0.6) !important;box-shadow:0 0 0 3px rgba(74,163,255,0.12)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp .35s ease both}
        tr:hover td{background:rgba(255,255,255,0.03)}
      `}</style>

      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="fade" style={{ ...cardStyle, padding:"20px 24px", marginBottom:20, background:"linear-gradient(135deg,rgba(255,58,168,0.12),rgba(74,163,255,0.08))" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>WMS Ybera Group</div>
              <h1 style={{ margin:"4px 0 0", fontSize:20, fontWeight:900, background:"linear-gradient(90deg,#ff3aa8,#4aa3ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Cadastro de Produtos
              </h1>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>EAN • Código • Descrição</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.06)", border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 14px" }}>
              <Search size={15} color={C.muted} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por EAN, código ou nome..."
                style={{ background:"none", border:"none", outline:"none", color:C.text, fontSize:13, fontWeight:700, width:280 }}
              />
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"380px 1fr", gap:16, alignItems:"start" }}>

          {/* ── FORMULÁRIO ───────────────────────────────────────────────── */}
          <div className="fade" style={{ ...cardStyle, animationDelay:".05s" }}>
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}`, background:"rgba(255,255,255,0.02)" }}>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>Novo Produto</div>
              <div style={{ fontSize:15, fontWeight:900, marginTop:4 }}>Vincular EAN ao produto</div>
            </div>

            <form onSubmit={salvar} style={{ padding:24, display:"flex", flexDirection:"column", gap:18 }}>

              <Field label="Código de Barras (EAN)" icon={<Barcode size={14} color={C.blue} />} hint="Escaneie com o leitor Zebra">
                <input
                  ref={barcodeRef}
                  value={form.codigo_barras}
                  onChange={(e) => setForm((p) => ({ ...p, codigo_barras: e.target.value.trim() }))}
                  placeholder="Escaneie aqui..."
                  style={inputStyle}
                  required
                />
              </Field>

              <Field label="Código do Produto" icon={<Hash size={14} color={C.purple} />} hint="Ex: 4000100006--U">
                <input
                  value={form.codigo_produto}
                  onChange={(e) => setForm((p) => ({ ...p, codigo_produto: e.target.value.trim() }))}
                  placeholder="Código do WMS..."
                  style={inputStyle}
                  required
                />
              </Field>

              <Field label="Descrição do Produto" icon={<Package size={14} color={C.pink} />}>
                <input
                  value={form.nome_produto}
                  onChange={(e) => setForm((p) => ({ ...p, nome_produto: e.target.value }))}
                  placeholder="Ex: GENOMA - FIO LIQUIDO 500ML"
                  style={inputStyle}
                  required
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop:4,
                  padding:"14px",
                  borderRadius:12,
                  border:"none",
                  background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#ff3aa8,#4aa3ff)",
                  color:"#fff",
                  fontSize:14,
                  fontWeight:900,
                  cursor: loading ? "not-allowed" : "pointer",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:8,
                  transition:"opacity .2s",
                  opacity: loading ? 0.6 : 1,
                  boxShadow: loading ? "none" : "0 8px 24px rgba(255,58,168,0.30)",
                }}
              >
                <PlusCircle size={18} />
                {loading ? "SALVANDO..." : "CADASTRAR PRODUTO"}
              </button>
            </form>
          </div>

          {/* ── LISTA ────────────────────────────────────────────────────── */}
          <div className="fade" style={{ ...cardStyle, animationDelay:".10s" }}>
            <div style={{ padding:"18px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", color:C.muted }}>Produtos Cadastrados</div>
                <div style={{ fontSize:15, fontWeight:900, marginTop:4 }}>
                  {produtosFiltrados.length}
                  <span style={{ fontSize:11, color:C.muted, fontWeight:700, marginLeft:6 }}>
                    {busca ? "encontrados" : "total"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"rgba(255,255,255,0.04)" }}>
                    {["EAN","Código do Produto","Descrição",""].map((h) => (
                      <th key={h} style={{
                        padding:"12px 16px", textAlign:"left",
                        fontSize:9, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:C.muted,
                        borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding:40, textAlign:"center", color:C.muted, fontSize:13, fontWeight:700 }}>
                        {busca ? "Nenhum produto encontrado." : "Nenhum produto cadastrado ainda."}
                      </td>
                    </tr>
                  ) : produtosFiltrados.map((p) => (
                    <tr key={p.id} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:"background .15s" }}>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:800, color:C.blue, background:"rgba(74,163,255,0.10)", padding:"3px 8px", borderRadius:6 }}>
                          {p.codigo_barras}
                        </span>
                      </td>
                      <td style={{ padding:"12px 16px", fontWeight:800, color:C.text }}>{p.codigo_produto}</td>
                      <td style={{ padding:"12px 16px", color:"rgba(255,255,255,0.75)", fontWeight:700 }}>{p.nome_produto}</td>
                      <td style={{ padding:"12px 16px", textAlign:"right" }}>
                        <button
                          onClick={() => excluir(p.id, p.nome_produto)}
                          style={{
                            background:"rgba(255,77,106,0.10)",
                            border:`1px solid rgba(255,77,106,0.20)`,
                            borderRadius:8,
                            color:C.red,
                            padding:"6px 12px",
                            fontSize:11,
                            fontWeight:800,
                            cursor:"pointer",
                            display:"inline-flex",
                            alignItems:"center",
                            gap:5,
                            transition:"background .2s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background="rgba(255,77,106,0.20)"}
                          onMouseLeave={(e) => e.currentTarget.style.background="rgba(255,77,106,0.10)"}
                        >
                          <Trash2 size={13} /> Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const Field = ({ label, icon, hint, children }) => (
  <div>
    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:900, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.45)", marginBottom:8 }}>
      {icon}{label}
    </div>
    {children}
    {hint && <div style={{ fontSize:10, color:"rgba(255,255,255,0.30)", fontWeight:700, marginTop:5 }}>{hint}</div>}
  </div>
);

export default Produtos;