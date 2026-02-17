import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../firebaseConfig";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import {
  Calendar,
  MapPin,
  Layers,
  Barcode,
  Hash,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

const Inventario = () => {
  const [loading, setLoading] = useState(false);
  const [inventarioId, setInventarioId] = useState("Inventário Geral");

  const [form, setForm] = useState({
    endereco: "B1031",
    sku: "",
    codigo_barras: "",

    // vindo do cadastro (posicoes)
    nome_produto_real: "",
    qtd_sistemica: "",
    validade: "",
    lote_industria: "",
    lote_senior: "",

    // preenchido no inventário diário
    qtd_fisica: "",
    condicao: "BOM",

    observacao: "",
  });

  const [cadastroInfo, setCadastroInfo] = useState({
    status: "idle", // idle | searching | found | notfound | invalid
    msg: "Aguardando Endereço + SKU/EAN...",
  });

  const barcodeRef = useRef(null);
  useEffect(() => {
    setTimeout(() => barcodeRef.current?.focus?.(), 120);
  }, []);

  const dia_key = useMemo(() => toISODate(new Date()), []);

  const parsed = useMemo(() => parseEndereco(form.endereco), [form.endereco]);

  // ===== Cálculos de quantidade
  const qtdS = toNum(form.qtd_sistemica);
  const qtdF = toNum(form.qtd_fisica);

  const divergencia = useMemo(() => {
    if (form.qtd_sistemica === "" || form.qtd_fisica === "") return null;
    return qtdF - qtdS;
  }, [form.qtd_sistemica, form.qtd_fisica, qtdF, qtdS]);

  const resultado = useMemo(() => {
    if (divergencia === null) return "—";
    if (divergencia === 0) return "OK";
    if (divergencia < 0) return "FALTA";
    return "SOBRA";
  }, [divergencia]);

  const status = useMemo(() => {
    if (divergencia === null) return "—";
    return divergencia === 0 ? "OK" : "DIVERGENTE";
  }, [divergencia]);

  // ===== Cálculo de vencimento (sempre que mudar validade)
  const vencInfo = useMemo(() => getValidadeInfo(form.validade), [form.validade]);

  // ===== BUSCA NO CADASTRO (posicoes) por (endereco+sku) ou (endereco+ean)
  useEffect(() => {
    let alive = true;

    const doLookup = async () => {
      if (!parsed.ok) {
        setCadastroInfo({ status: "invalid", msg: "Endereço inválido (ex: B1031, G0571)." });
        return;
      }

      const sku = String(form.sku || "").trim();
      const ean = String(form.codigo_barras || "").trim();

      if (!sku && !ean) {
        setCadastroInfo({ status: "idle", msg: "Aguardando Endereço + SKU/EAN..." });
        return;
      }

      setCadastroInfo({ status: "searching", msg: "Buscando cadastro da posição..." });

      try {
        let docFound = null;

        if (sku) {
          const q1 = query(
            collection(db, "posicoes"),
            where("endereco", "==", parsed.endereco),
            where("sku", "==", sku),
            limit(1)
          );
          const snap1 = await getDocs(q1);
          if (!snap1.empty) docFound = { id: snap1.docs[0].id, ...snap1.docs[0].data() };
        }

        if (!docFound && ean) {
          const q2 = query(
            collection(db, "posicoes"),
            where("endereco", "==", parsed.endereco),
            where("codigo_barras", "==", ean),
            limit(1)
          );
          const snap2 = await getDocs(q2);
          if (!snap2.empty) docFound = { id: snap2.docs[0].id, ...snap2.docs[0].data() };
        }

        if (!alive) return;

        if (docFound) {
          setCadastroInfo({ status: "found", msg: "Cadastro encontrado ✅" });

          setForm((p) => ({
            ...p,
            nome_produto_real: docFound.nome_produto || p.nome_produto_real || "",
            sku: p.sku || docFound.sku || "",
            codigo_barras: p.codigo_barras || docFound.codigo_barras || "",
            qtd_sistemica: p.qtd_sistemica !== "" ? p.qtd_sistemica : String(docFound.qtd_sistemica ?? ""),
            validade: p.validade || docFound.validade || "",
            lote_industria: p.lote_industria || docFound.lote_industria || "",
            lote_senior: p.lote_senior || docFound.lote_senior || "",
          }));
        } else {
          setCadastroInfo({ status: "notfound", msg: "Não existe cadastro para esse endereço + SKU/EAN." });
        }
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setCadastroInfo({ status: "notfound", msg: "Erro ao buscar cadastro (ver console)." });
      }
    };

    const t = setTimeout(doLookup, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [parsed.ok, parsed.endereco, form.sku, form.codigo_barras]); // eslint-disable-line

  const resetItem = () => {
    setForm((p) => ({
      ...p,
      sku: "",
      codigo_barras: "",
      nome_produto_real: "",
      qtd_sistemica: "",
      validade: "",
      lote_industria: "",
      lote_senior: "",
      qtd_fisica: "",
      condicao: "BOM",
      observacao: "",
    }));
    setCadastroInfo({ status: "idle", msg: "Aguardando Endereço + SKU/EAN..." });
    setTimeout(() => barcodeRef.current?.focus?.(), 80);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();

    if (!parsed.ok) return alert("Endereço inválido. Use padrão tipo B1031 (Letra + 2 dígitos + nível + 1).");
    if (!String(form.sku).trim() && !String(form.codigo_barras).trim())
      return alert("Informe SKU ou Código de barras.");
    if (!String(form.nome_produto_real).trim())
      return alert("Nome do produto está vazio (cadastre a posição ou preencha manualmente).");
    if (form.qtd_sistemica === "") return alert("Qtd Sistêmica está vazia.");
    if (form.qtd_fisica === "") return alert("Insira a quantidade física.");

    // Se vencido, opcionalmente você pode alertar
    // if (vencInfo.bucket === "VENCIDO") { /* alert opcional */ }

    setLoading(true);
    try {
      await addDoc(collection(db, "auditorias"), {
        dia_key,
        inventario_id: inventarioId,
        data_auditoria: serverTimestamp(),

        // endereço
        endereco: parsed.endereco,
        local: parsed.endereco, // Dashboard usa isso como Posição
        rua: parsed.rua,
        local_num: parsed.localNum,
        nivel: parsed.nivel,

        // item
        nome_produto_real: String(form.nome_produto_real).trim(),
        sku: String(form.sku || "").trim(),
        codigo_barras: String(form.codigo_barras || "").trim(),

        // quantidades
        qtd_sistemica: toNum(form.qtd_sistemica),
        qtd_fisica: toNum(form.qtd_fisica),
        divergencia: Number(divergencia ?? 0),

        // calculados
        status,     // OK / DIVERGENTE
        resultado,  // OK / FALTA / SOBRA

        // rastreio
        validade: form.validade || null, // ISO yyyy-mm-dd
        validade_bucket: vencInfo.bucket, // VENCIDO / CRITICO_30D / CRITICO_90D / OK / SEM_VALIDADE
        dias_para_vencer: vencInfo.dias,  // número (negativo se vencido)
        is_vencido: vencInfo.bucket === "VENCIDO",

        lote_industria: String(form.lote_industria || "").trim().toUpperCase(),
        lote_senior: String(form.lote_senior || "").trim().toUpperCase(),
        condicao: form.condicao,

        observacao: String(form.observacao || "").trim(),
      });

      alert("✅ Gravado no inventário do dia!");

      // mantém endereço e limpa o resto
      setForm((p) => ({
        ...p,
        sku: "",
        codigo_barras: "",
        nome_produto_real: "",
        qtd_sistemica: "",
        validade: "",
        lote_industria: "",
        lote_senior: "",
        qtd_fisica: "",
        condicao: "BOM",
        observacao: "",
      }));
      setCadastroInfo({ status: "idle", msg: "Aguardando Endereço + SKU/EAN..." });
      setTimeout(() => barcodeRef.current?.focus?.(), 80);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao salvar");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] p-4 text-slate-700">
      {/* Header */}
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1f2a44] to-[#2b3a5c] px-6 py-4 text-white">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/70">
              Inventário Diário • Vencimento automático
            </div>
            <h1 className="text-lg font-black tracking-wide">Contagem</h1>
          </div>
          <div className="text-right">
            <div className="text-xs font-extrabold text-white/80 flex items-center gap-2 justify-end">
              <Calendar size={14} />
              Hoje • {dia_key}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/60">
              {inventarioId}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 bg-slate-100 px-4 py-3 md:grid-cols-4">
          <MiniSelect
            label="INVENTÁRIO"
            value={inventarioId}
            onChange={setInventarioId}
            options={["Inventário Geral", "Cíclico A", "Cíclico B", "Cíclico C"]}
          />

          <MiniInput
            label="ENDEREÇO"
            value={form.endereco}
            onChange={(v) => setForm((p) => ({ ...p, endereco: v.toUpperCase().trim() }))}
            icon={<MapPin size={14} />}
            placeholder="Ex: B1031"
            hint={
              parsed.ok
                ? `${parsed.rua} • Local ${parsed.localNum} • Nível ${parsed.nivel}`
                : "Padrão: Letra + 2 dígitos (Local) + 1 dígito (Nível) + 1"
            }
            error={!parsed.ok && form.endereco.trim().length > 0}
          />

          <MiniInput label="RUA (AUTO)" value={parsed.ok ? parsed.rua : "—"} readOnly icon={<Layers size={14} />} />
          <MiniInput
            label="LOCAL / NÍVEL (AUTO)"
            value={parsed.ok ? `Local ${parsed.localNum} • Nível ${parsed.nivel}` : "—"}
            readOnly
            icon={<Layers size={14} />}
          />
        </div>
      </div>

      {/* Cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
        <CardBI
          label="Qtd Sistêmica"
          val={form.qtd_sistemica === "" ? "—" : `${toNum(form.qtd_sistemica)} UN`}
          color="blue"
          icon={<Package size={20} />}
        />
        <CardBI
          label="Qtd Física"
          val={form.qtd_fisica === "" ? "—" : `${toNum(form.qtd_fisica)} UN`}
          color="green"
          icon={<Hash size={20} />}
        />
        <CardBI
          label="Divergência"
          val={divergencia === null ? "—" : `${divergencia > 0 ? "+" : ""}${divergencia}`}
          color={divergencia === null ? "slate" : divergencia === 0 ? "green" : "red"}
          icon={<AlertTriangle size={20} />}
        />
        <CardBI
          label="Resultado"
          val={resultado}
          color={resultado === "OK" ? "green" : resultado === "—" ? "slate" : "amber"}
          icon={<CheckCircle2 size={20} />}
        />
        <CardBI
          label="Validade"
          val={vencInfo.label}
          color={vencInfo.bucket === "VENCIDO" ? "red" : vencInfo.bucket === "CRITICO_30D" ? "amber" : vencInfo.bucket === "CRITICO_90D" ? "orange" : "slate"}
          icon={<Clock size={20} />}
        />
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cadastro da posição
            </div>
            <div className="text-sm font-black">
              {cadastroInfo.status === "found" ? (
                <span className="text-emerald-700">{cadastroInfo.msg}</span>
              ) : cadastroInfo.status === "searching" ? (
                <span className="text-slate-600">{cadastroInfo.msg}</span>
              ) : cadastroInfo.status === "notfound" ? (
                <span className="text-amber-700">{cadastroInfo.msg}</span>
              ) : cadastroInfo.status === "invalid" ? (
                <span className="text-red-700">{cadastroInfo.msg}</span>
              ) : (
                <span className="text-slate-600">{cadastroInfo.msg}</span>
              )}
            </div>
            <div className="mt-1 text-xs font-extrabold text-slate-500">
              Status: <span className="text-slate-800">{status}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={resetItem}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            Novo item
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
          <Field col="md:col-span-4" label="Código de Barras (EAN)" icon={<Barcode size={14} />}>
            <input
              ref={barcodeRef}
              value={form.codigo_barras}
              onChange={(e) => setForm((p) => ({ ...p, codigo_barras: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Escaneie aqui..."
            />
          </Field>

          <Field col="md:col-span-3" label="SKU" icon={<Hash size={14} />}>
            <input
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Código do produto"
            />
          </Field>

          <Field col="md:col-span-5" label="Qtd Física" highlight icon={<Hash size={14} />}>
            <input
              required
              type="number"
              value={form.qtd_fisica}
              onChange={(e) => setForm((p) => ({ ...p, qtd_fisica: e.target.value }))}
              className="w-full bg-transparent text-3xl font-black text-blue-900 outline-none"
              placeholder="0"
            />
          </Field>

          <Field col="md:col-span-12" label="Nome do Produto (puxado do cadastro, mas pode editar)" icon={<Package size={14} />}>
            <input
              required
              value={form.nome_produto_real}
              onChange={(e) => setForm((p) => ({ ...p, nome_produto_real: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Nome do produto..."
            />
          </Field>

          <Field col="md:col-span-4" label="Qtd Sistêmica (puxada do cadastro, pode editar)" icon={<Hash size={14} />}>
            <input
              required
              type="number"
              value={form.qtd_sistemica}
              onChange={(e) => setForm((p) => ({ ...p, qtd_sistemica: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xl font-black outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="0"
            />
          </Field>

          <Field col="md:col-span-4" label="Validade (gera vencimento automático)" icon={<Calendar size={14} />}>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.validade || ""}
                onChange={(e) => setForm((p) => ({ ...p, validade: e.target.value }))}
                className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-black uppercase ${
                vencInfo.bucket === "VENCIDO"
                  ? "bg-red-50 text-red-700"
                  : vencInfo.bucket === "CRITICO_30D"
                  ? "bg-amber-50 text-amber-700"
                  : vencInfo.bucket === "CRITICO_90D"
                  ? "bg-orange-50 text-orange-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {vencInfo.badge}
              </span>
            </div>
          </Field>

          <Field col="md:col-span-4" label="Condição">
            <select
              value={form.condicao}
              onChange={(e) => setForm((p) => ({ ...p, condicao: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xs font-black text-slate-700 outline-none"
            >
              <option value="BOM">🟢 BOM</option>
              <option value="AVARIADO">🔴 AVARIADO</option>
            </select>
          </Field>

          <Field col="md:col-span-6" label="Lote Indústria">
            <input
              value={form.lote_industria}
              onChange={(e) => setForm((p) => ({ ...p, lote_industria: e.target.value.toUpperCase() }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="IND..."
            />
          </Field>

          <Field col="md:col-span-6" label="Lote Sênior">
            <input
              value={form.lote_senior}
              onChange={(e) => setForm((p) => ({ ...p, lote_senior: e.target.value.toUpperCase() }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 font-bold outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="AB..."
            />
          </Field>

          <Field col="md:col-span-12" label="Observação (opcional)">
            <input
              value={form.observacao}
              onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
              className="w-full rounded-xl border-2 border-slate-100 bg-white p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Ex: caixa avariada, conferir entrada..."
            />
          </Field>

          <div className="md:col-span-12">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "SALVANDO..." : "CONFIRMAR INVENTÁRIO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =================== UI pequenos =================== */

const CardBI = ({ label, val, color, icon }) => {
  const bg =
    color === "blue"
      ? "bg-gradient-to-r from-[#1967d2] to-[#174ea6]"
      : color === "green"
      ? "bg-gradient-to-r from-[#1e8e3e] to-[#137333]"
      : color === "red"
      ? "bg-gradient-to-r from-[#d93025] to-[#b31412]"
      : color === "amber"
      ? "bg-gradient-to-r from-[#f9ab00] to-[#f57c00]"
      : color === "orange"
      ? "bg-gradient-to-r from-[#fb8c00] to-[#ef6c00]"
      : "bg-gradient-to-r from-[#64748b] to-[#475569]";

  return (
    <div className={`relative overflow-hidden rounded-xl p-5 text-white shadow-sm ${bg}`}>
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-extrabold tracking-wide opacity-95">{label}</span>
        <div className="opacity-95">{icon}</div>
      </div>
      <div className="mt-3">
        <h3 className="text-[30px] leading-none font-black tracking-tight">{val}</h3>
      </div>
      <div className="absolute -right-6 -bottom-8 scale-[2.2] opacity-15">{icon}</div>
    </div>
  );
};

const Field = ({ label, children, col, icon, highlight }) => (
  <div className={`${col || ""} ${highlight ? "rounded-xl border-2 border-blue-200 bg-blue-50 p-3" : ""}`}>
    <label className={`text-[10px] font-black uppercase ${highlight ? "text-blue-700" : "text-slate-400"} flex items-center gap-2`}>
      {icon ? icon : null} {label}
    </label>
    <div className="mt-1">{children}</div>
  </div>
);

const MiniSelect = ({ label, value, onChange, options }) => (
  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full bg-transparent text-[12px] font-extrabold text-slate-700 outline-none"
    >
      {options.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
    </select>
  </div>
);

const MiniInput = ({ label, value, onChange, placeholder, readOnly, icon, hint, error }) => (
  <div className={`rounded-md border px-3 py-2 ${error ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
      {icon ? icon : null} {label}
    </div>
    <input
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`mt-1 w-full bg-transparent text-[12px] font-extrabold outline-none ${
        readOnly ? "text-slate-500" : error ? "text-red-700" : "text-slate-700"
      }`}
    />
    {hint ? (
      <div className={`mt-1 text-[10px] font-black ${error ? "text-red-600" : "text-slate-400"}`}>
        {hint}
      </div>
    ) : null}
  </div>
);

/* =================== Helpers =================== */

function toNum(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toISODate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function parseEndereco(raw) {
  const x = String(raw || "").trim().toUpperCase();
  const m = x.match(/^([A-Z])(\d{2})(\d)(1)$/); // B1031 / G0571
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

function fromISODate(iso) {
  const [yy, mm, dd] = String(iso || "").split("-");
  if (!yy || !mm || !dd) return null;
  const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function diffDays(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / ms);
}

/**
 * bucket:
 * - SEM_VALIDADE
 * - VENCIDO (dias < 0)
 * - CRITICO_30D (0..30)
 * - CRITICO_90D (31..90)
 * - OK (>90)
 */
function getValidadeInfo(validadeISO) {
  if (!validadeISO) {
    return { bucket: "SEM_VALIDADE", dias: null, badge: "Sem validade", label: "—" };
  }
  const vd = fromISODate(validadeISO);
  if (!vd) return { bucket: "SEM_VALIDADE", dias: null, badge: "Sem validade", label: "—" };

  const hoje = startOfDay(new Date());
  const dias = diffDays(vd, hoje); // vd - hoje
  if (dias < 0) return { bucket: "VENCIDO", dias, badge: "Vencido", label: `${validadeISO} (${dias}d)` };
  if (dias <= 30) return { bucket: "CRITICO_30D", dias, badge: `Crítico ${dias}d`, label: `${validadeISO} (${dias}d)` };
  if (dias <= 90) return { bucket: "CRITICO_90D", dias, badge: `A vencer ${dias}d`, label: `${validadeISO} (${dias}d)` };
  return { bucket: "OK", dias, badge: `OK ${dias}d`, label: `${validadeISO} (${dias}d)` };
}

export default Inventario;
