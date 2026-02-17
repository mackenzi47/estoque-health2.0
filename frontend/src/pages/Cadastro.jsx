import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import {
  MapPin,
  Package,
  Barcode,
  Hash,
  Calendar,
  Layers,
  Search,
  Trash2,
  PlusCircle,
  ChevronDown,
} from "lucide-react";

const Cadastro = () => {
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  const [form, setForm] = useState({
    endereco: "B1031",
    nome_produto: "",
    sku: "",
    codigo_barras: "",
    qtd_sistemica: "",
    validade: "",
    lote_industria: "",
    lote_senior: "",
    observacao: "",
  });

  const parsed = useMemo(() => parseEndereco(form.endereco), [form.endereco]);

  const [posicoes, setPosicoes] = useState([]);

  const focusRef = useRef(null);
  useEffect(() => {
    setTimeout(() => focusRef.current?.focus?.(), 120);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "posicoes"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosicoes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const posicoesFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return posicoes;
    return posicoes.filter((p) => {
      const end = String(p.endereco || "").toLowerCase();
      const rua = String(p.rua || "").toLowerCase();
      const sku = String(p.sku || "").toLowerCase();
      const ean = String(p.codigo_barras || "").toLowerCase();
      const nome = String(p.nome_produto || "").toLowerCase();
      return end.includes(q) || rua.includes(q) || sku.includes(q) || ean.includes(q) || nome.includes(q);
    });
  }, [busca, posicoes]);

  const salvar = async (e) => {
    e.preventDefault();

    if (!parsed.ok) return alert("Endereço inválido. Use padrão tipo B1031 (Letra + 2 dígitos + nível + 1).");

    const nome = form.nome_produto.trim();
    const sku = form.sku.trim();
    const ean = form.codigo_barras.trim();
    const qtd = toInt(form.qtd_sistemica);

    if (!nome) return alert("Informe o nome do produto.");
    if (!sku) return alert("Informe o SKU.");
    if (!ean) return alert("Informe o código de barras (EAN).");
    if (form.qtd_sistemica === "" || Number.isNaN(qtd)) return alert("Informe a quantidade sistêmica (número).");

    setLoading(true);
    try {
      await addDoc(collection(db, "posicoes"), {
        // Endereço
        endereco: parsed.endereco,
        rua: parsed.rua,
        local_num: parsed.localNum,
        nivel: parsed.nivel,

        // Produto
        nome_produto: nome,
        sku,
        codigo_barras: ean,

        // Quantidade sistêmica cadastrada
        qtd_sistemica: qtd,

        // Lotes / validade
        validade: form.validade || null,
        lote_industria: String(form.lote_industria || "").trim().toUpperCase(),
        lote_senior: String(form.lote_senior || "").trim().toUpperCase(),

        observacao: String(form.observacao || "").trim(),
        created_at: serverTimestamp(),
      });

      setForm((p) => ({
        ...p,
        nome_produto: "",
        sku: "",
        codigo_barras: "",
        qtd_sistemica: "",
        validade: "",
        lote_industria: "",
        lote_senior: "",
        observacao: "",
      }));

      alert("✅ Posição cadastrada!");
      setTimeout(() => focusRef.current?.focus?.(), 80);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao cadastrar");
    }
    setLoading(false);
  };

  const excluir = async (id) => {
    const ok = confirm("Excluir este cadastro de posição?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "posicoes", id));
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao excluir");
    }
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] p-4 text-slate-700">
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1f2a44] to-[#2b3a5c] px-6 py-4 text-white">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/70">WMS Ybera Group</div>
            <h1 className="text-lg font-black tracking-wide">Cadastro de Posição (Produto + Local + Qtd Sistêmica)</h1>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
              <Search size={16} />
            </div>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por endereço, rua, SKU, EAN, nome..."
              className="w-[420px] max-w-[70vw] rounded-lg border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-[12px] font-bold text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cadastro</div>
              <div className="text-base font-black text-slate-800">Vincular produto ao endereço</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Package size={18} />
            </div>
          </div>

          <form onSubmit={salvar} className="grid grid-cols-1 gap-4">
            <Field label="Endereço (ex: B1031)" icon={<MapPin size={14} />}>
              <input
                ref={focusRef}
                value={form.endereco}
                onChange={(e) => setForm((p) => ({ ...p, endereco: e.target.value.toUpperCase().trim() }))}
                className={`w-full rounded-xl border-2 bg-slate-50 p-3 font-bold outline-none focus:ring-2 ${
                  parsed.ok ? "border-slate-100 focus:ring-blue-200" : "border-red-200 focus:ring-red-200"
                }`}
                placeholder="B1031"
                required
              />
              <div className={`mt-2 text-[10px] font-black ${parsed.ok ? "text-slate-400" : "text-red-600"}`}>
                {parsed.ok
                  ? `${parsed.rua} • Local ${parsed.localNum} • Nível ${parsed.nivel} • final 1 fixo`
                  : "Padrão: Letra + 2 dígitos (Local) + 1 dígito (Nível) + 1 (fixo). Ex: B1031, G0571"}
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Readonly label="Rua" value={parsed.ok ? parsed.rua : "—"} icon={<Layers size={14} />} />
              <Readonly label="Local" value={parsed.ok ? parsed.localNum : "—"} icon={<Layers size={14} />} />
              <Readonly label="Nível" value={parsed.ok ? parsed.nivel : "—"} icon={<Layers size={14} />} />
            </div>

            <Field label="Nome do Produto" icon={<Package size={14} />}>
              <input
                value={form.nome_produto}
                onChange={(e) => setForm((p) => ({ ...p, nome_produto: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Ex: GENOMA - FIO LIQUIDO 500ML"
                required
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="SKU" icon={<Hash size={14} />}>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: 65547"
                  required
                />
              </Field>

              <Field label="Código de barras (EAN)" icon={<Barcode size={14} />}>
                <input
                  value={form.codigo_barras}
                  onChange={(e) => setForm((p) => ({ ...p, codigo_barras: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Escaneie aqui..."
                  required
                />
              </Field>
            </div>

            <Field label="Qtd Sistêmica (cadastrada)" icon={<Hash size={14} />}>
              <input
                type="number"
                value={form.qtd_sistemica}
                onChange={(e) => setForm((p) => ({ ...p, qtd_sistemica: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xl font-black outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="0"
                required
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Validade" icon={<Calendar size={14} />}>
                <input
                  type="date"
                  value={form.validade}
                  onChange={(e) => setForm((p) => ({ ...p, validade: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>

              <Field label="Lote Indústria" icon={<Layers size={14} />}>
                <input
                  value={form.lote_industria}
                  onChange={(e) => setForm((p) => ({ ...p, lote_industria: e.target.value.toUpperCase() }))}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="IND456"
                />
              </Field>

              <Field label="Lote Sênior" icon={<Layers size={14} />}>
                <input
                  value={form.lote_senior}
                  onChange={(e) => setForm((p) => ({ ...p, lote_senior: e.target.value.toUpperCase() }))}
                  className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="AB123"
                />
              </Field>
            </div>

            <Field label="Observação (opcional)">
              <input
                value={form.observacao}
                onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Ex: prateleira alta..."
              />
            </Field>

            <button
              type="submit"
              disabled={loading || !parsed.ok}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-60"
            >
              <PlusCircle size={18} />
              {loading ? "SALVANDO..." : "CADASTRAR POSIÇÃO"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
          <div className="border-b bg-white px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lista</div>
              <div className="text-base font-black text-slate-800">Total: {posicoesFiltradas.length}</div>
            </div>
          </div>

          <div className="overflow-x-auto p-2">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-tight text-slate-400">
                  <th className="border-b p-4">Endereço</th>
                  <th className="border-b p-4">Produto</th>
                  <th className="border-b p-4">SKU</th>
                  <th className="border-b p-4">EAN</th>
                  <th className="border-b p-4 text-center">Qtd Sist.</th>
                  <th className="border-b p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold">
                {posicoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-sm font-bold text-slate-400">
                      Nenhuma posição cadastrada.
                    </td>
                  </tr>
                ) : (
                  posicoesFiltradas.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-100 transition-colors hover:bg-blue-50/30 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-black text-slate-800">{p.endereco}</div>
                        <div className="text-[10px] font-black text-slate-400">
                          {p.rua} • Local {p.local_num} • Nível {p.nivel}
                        </div>
                      </td>
                      <td className="p-4 text-slate-800">{p.nome_produto || "—"}</td>
                      <td className="p-4 text-slate-600">{p.sku || "—"}</td>
                      <td className="p-4 text-slate-600">{p.codigo_barras || "—"}</td>
                      <td className="p-4 text-center font-black text-blue-700">{p.qtd_sistemica ?? "—"}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => excluir(p.id)}
                          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 text-xs font-extrabold text-slate-500">
            Mostrando <span className="text-slate-700">{posicoesFiltradas.length}</span> posição(ões).
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, icon, children }) => (
  <div>
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
      {icon ? icon : null} {label}
    </div>
    <div className="mt-2">{children}</div>
  </div>
);

const Readonly = ({ label, value, icon }) => (
  <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
      {icon ? icon : null} {label}
    </div>
    <div className="mt-2 text-[12px] font-black text-slate-700">{value}</div>
  </div>
);

function toInt(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function parseEndereco(raw) {
  const x = String(raw || "").trim().toUpperCase();
  const m = x.match(/^([A-Z])(\d{2})(\d)(1)$/);
  if (!m) return { ok: false, endereco: x, rua: "", localNum: "", nivel: "" };
  const ruaLetra = m[1];
  const localNum = m[2];
  const nivel = m[3];
  return {
    ok: true,
    endereco: `${ruaLetra}${localNum}${nivel}1`,
    rua: `Rua ${ruaLetra}`,
    localNum,
    nivel,
  };
}

export default Cadastro;
