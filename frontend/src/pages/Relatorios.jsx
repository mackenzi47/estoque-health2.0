import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { exportXLSX } from "../utils/exportXlsx";
import { Search, Calendar, Download, AlertTriangle, Clock, Package } from "lucide-react";

const Relatorios = () => {
  const [aba, setAba] = useState("Vencimentos"); // Divergências | Pendências | Vencimentos
  const [busca, setBusca] = useState("");

  const [periodo, setPeriodo] = useState("DIARIO"); // DIARIO | SEMANAL | MENSAL
  const [dataBase, setDataBase] = useState(() => toISODate(new Date()));

  const [auditorias, setAuditorias] = useState([]);
  const [posicoes, setPosicoes] = useState([]);

  // ===== Firestore =====
  useEffect(() => {
    const q = query(collection(db, "auditorias"), orderBy("data_auditoria", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAuditorias(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "posicoes"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosicoes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Período =====
  const { startKey, endKey, labelPeriodo } = useMemo(() => {
    const base = fromISODate(dataBase);

    if (periodo === "DIARIO") {
      const k = toISODate(base);
      return { startKey: k, endKey: k, labelPeriodo: `Diário • ${formatBR(base)}` };
    }

    if (periodo === "SEMANAL") {
      const s = startOfWeekMonday(base);
      const e = endOfWeekSunday(base);
      return { startKey: toISODate(s), endKey: toISODate(e), labelPeriodo: `Semanal • ${formatBR(s)} – ${formatBR(e)}` };
    }

    const s = startOfMonth(base);
    const e = endOfMonth(base);
    return { startKey: toISODate(s), endKey: toISODate(e), labelPeriodo: `Mensal • ${String(base.getMonth() + 1).padStart(2, "0")}/${base.getFullYear()}` };
  }, [periodo, dataBase]);

  const auditoriasPeriodo = useMemo(() => {
    return auditorias.filter((a) => {
      const k = String(a.dia_key || "");
      return k >= startKey && k <= endKey;
    });
  }, [auditorias, startKey, endKey]);

  // ===== Busca =====
  const qBusca = busca.trim().toLowerCase();
  const match = (obj) => {
    if (!qBusca) return true;
    return Object.values(obj)
      .map((v) => String(v ?? "").toLowerCase())
      .join(" | ")
      .includes(qBusca);
  };

  // ===== Keys =====
  const keyPos = (p) => `${String(p.endereco || "").trim().toUpperCase()}__${String(p.sku || "").trim()}`;
  const keyAud = (a) => `${String(a.endereco || a.local || "").trim().toUpperCase()}__${String(a.sku || "").trim()}`;

  // ===== Mapa última auditoria por posição+SKU (GLOBAL, não só período) =====
  // Importante para "vencimentos cadastrados no inventário" aparecerem.
  const ultimaAuditoriaGlobalMap = useMemo(() => {
    const map = new Map();
    for (const a of auditorias) {
      const k = keyAud(a);
      if (!k || k.startsWith("__")) continue;

      const prev = map.get(k);
      const t = toTimeSafe(a.data_auditoria);
      const tp = prev ? toTimeSafe(prev.data_auditoria) : -1;
      if (!prev || t > tp) map.set(k, a);
    }
    return map;
  }, [auditorias]);

  // ===== Mapa auditoria por posição+SKU (PERÍODO) para pendências =====
  const setAudKeysPeriodo = useMemo(() => {
    const s = new Set();
    for (const a of auditoriasPeriodo) s.add(keyAud(a));
    return s;
  }, [auditoriasPeriodo]);

  // =========================
  // RELATÓRIO: DIVERGÊNCIAS
  // =========================
  const divergenciasRows = useMemo(() => {
    const rows = auditoriasPeriodo
      .filter((a) => safeNum(a.divergencia) !== 0)
      .map((a) => ({
        dia_key: a.dia_key || "",
        endereco: a.endereco || a.local || "",
        rua: a.rua || "",
        sku: a.sku || "",
        codigo_barras: a.codigo_barras || "",
        nome_produto: a.nome_produto_real || "",
        qtd_sistemica: safeNum(a.qtd_sistemica),
        qtd_fisica: safeNum(a.qtd_fisica),
        divergencia: safeNum(a.divergencia),
        resultado: a.resultado || (safeNum(a.divergencia) < 0 ? "FALTA" : "SOBRA"),
        validade: a.validade || "",
        validade_bucket: a.validade_bucket || getValidadeBucket(a.validade),
      }))
      .sort((a, b) => Math.abs(b.divergencia) - Math.abs(a.divergencia));

    return rows.filter(match);
  }, [auditoriasPeriodo, qBusca]); // eslint-disable-line

  const resumoDivergencias = useMemo(() => {
    const total = divergenciasRows.length;
    const falta = divergenciasRows.filter((r) => r.divergencia < 0).length;
    const sobra = divergenciasRows.filter((r) => r.divergencia > 0).length;
    return { total, falta, sobra };
  }, [divergenciasRows]);

  // =========================
  // RELATÓRIO: PENDÊNCIAS
  // (cadastro não contado no período)
  // =========================
  const pendenciasRows = useMemo(() => {
    const rows = posicoes
      .filter((p) => !setAudKeysPeriodo.has(keyPos(p)))
      .map((p) => ({
        endereco: p.endereco || "",
        rua: p.rua || "",
        sku: p.sku || "",
        codigo_barras: p.codigo_barras || "",
        nome_produto: p.nome_produto || "",
        qtd_sistemica: safeNum(p.qtd_sistemica),
        validade: p.validade || "",
        validade_bucket: p.validade_bucket || getValidadeBucket(p.validade),
      }))
      .sort((a, b) => (a.endereco > b.endereco ? 1 : -1));

    return rows.filter(match);
  }, [posicoes, setAudKeysPeriodo, qBusca]); // eslint-disable-line

  // =========================
  // RELATÓRIO: VENCIMENTOS (COMBINADO)
  // - Pega do cadastro (posicoes)
  // - Sobrescreve pelo inventário (última auditoria global) quando existir
  // - Inclui também itens que existem só em auditorias (não cadastrados)
  // =========================
  const vencimentosRows = useMemo(() => {
    const hoje = startOfDay(new Date());

    // 1) Base a partir do CADASTRO
    const base = posicoes.map((p) => {
      const k = keyPos(p);
      const aud = ultimaAuditoriaGlobalMap.get(k);

      // Usa validade do inventário se existir (mais "real")
      const validade = (aud?.validade ?? p.validade) || "";
      const bucket = (aud?.validade_bucket ?? p.validade_bucket) || getValidadeBucket(validade);
      const dias = aud?.dias_para_vencer ?? getDiasParaVencer(validade);

      // Só entra se for vencido/critico
      if (!["VENCIDO", "CRITICO_30D", "CRITICO_90D"].includes(bucket)) return null;

      return {
        fonte: aud?.validade ? "Inventário" : "Cadastro",
        bucket,
        dias: dias ?? "",
        validade,
        dia_ultima_contagem: aud?.dia_key || "",
        endereco: p.endereco || aud?.endereco || aud?.local || "",
        rua: p.rua || aud?.rua || "",
        sku: p.sku || aud?.sku || "",
        codigo_barras: p.codigo_barras || aud?.codigo_barras || "",
        nome_produto: p.nome_produto || aud?.nome_produto_real || "",
        qtd_sistemica: aud?.qtd_sistemica ?? p.qtd_sistemica ?? "",
        qtd_fisica: aud?.qtd_fisica ?? "",
      };
    }).filter(Boolean);

    // 2) Itens que existem apenas no INVENTÁRIO (não têm cadastro)
    const extra = [];
    for (const [k, aud] of ultimaAuditoriaGlobalMap.entries()) {
      const existsInCadastro = posicoes.some((p) => keyPos(p) === k);
      if (existsInCadastro) continue;

      const validade = aud?.validade || "";
      const bucket = aud?.validade_bucket || getValidadeBucket(validade);
      const dias = aud?.dias_para_vencer ?? getDiasParaVencer(validade);

      if (!["VENCIDO", "CRITICO_30D", "CRITICO_90D"].includes(bucket)) continue;

      extra.push({
        fonte: "Inventário",
        bucket,
        dias: dias ?? "",
        validade,
        dia_ultima_contagem: aud?.dia_key || "",
        endereco: aud?.endereco || aud?.local || "",
        rua: aud?.rua || "",
        sku: aud?.sku || "",
        codigo_barras: aud?.codigo_barras || "",
        nome_produto: aud?.nome_produto_real || "",
        qtd_sistemica: aud?.qtd_sistemica ?? "",
        qtd_fisica: aud?.qtd_fisica ?? "",
      });
    }

    const rows = [...base, ...extra]
      .filter((r) => {
        // Se validade estiver vazia não entra (SEM_VALIDADE)
        if (!r.validade) return false;

        // segurança: recalc bucket
        const b = r.bucket || getValidadeBucket(r.validade);
        return ["VENCIDO", "CRITICO_30D", "CRITICO_90D"].includes(b);
      })
      .filter(match)
      .sort((a, b) => {
        // ordem: vencidos primeiro, depois 30d, depois 90d, e por validade
        const pr = (x) => (x.bucket === "VENCIDO" ? 0 : x.bucket === "CRITICO_30D" ? 1 : 2);
        const pa = pr(a), pb = pr(b);
        if (pa !== pb) return pa - pb;
        return String(a.validade || "") > String(b.validade || "") ? 1 : -1;
      });

    return rows;
  }, [posicoes, ultimaAuditoriaGlobalMap, qBusca]); // eslint-disable-line

  const resumoVenc = useMemo(() => {
    const vencidos = vencimentosRows.filter((r) => r.bucket === "VENCIDO").length;
    const c30 = vencimentosRows.filter((r) => r.bucket === "CRITICO_30D").length;
    const c90 = vencimentosRows.filter((r) => r.bucket === "CRITICO_90D").length;
    return { vencidos, c30, c90, total: vencimentosRows.length };
  }, [vencimentosRows]);

  // ===== Export XLSX (de acordo com aba atual) =====
  const exportarXLSX = () => {
    if (aba === "Divergências") {
      exportXLSX({
        filename: `relatorio_divergencias_${startKey}_${endKey}.xlsx`,
        sheetName: "Divergencias",
        columns: [
          { key: "dia_key", header: "Dia", type: "text" },
          { key: "endereco", header: "Posição", type: "text" },
          { key: "rua", header: "Rua", type: "text" },
          { key: "sku", header: "SKU", type: "text" },
          { key: "codigo_barras", header: "EAN", type: "text" },
          { key: "nome_produto", header: "Produto", type: "text" },
          { key: "qtd_sistemica", header: "Qtd Sistêmica", type: "number" },
          { key: "qtd_fisica", header: "Qtd Física", type: "number" },
          { key: "divergencia", header: "Divergência", type: "number" },
          { key: "resultado", header: "Resultado", type: "text" },
          { key: "validade", header: "Validade", type: "dateBR" },
          { key: "validade_bucket", header: "Status Venc.", type: "text" },
        ],
        rows: divergenciasRows,
      });
      return;
    }

    if (aba === "Pendências") {
      exportXLSX({
        filename: `relatorio_pendencias_${startKey}_${endKey}.xlsx`,
        sheetName: "Pendencias",
        columns: [
          { key: "endereco", header: "Posição", type: "text" },
          { key: "rua", header: "Rua", type: "text" },
          { key: "sku", header: "SKU", type: "text" },
          { key: "codigo_barras", header: "EAN", type: "text" },
          { key: "nome_produto", header: "Produto", type: "text" },
          { key: "qtd_sistemica", header: "Qtd Sistêmica", type: "number" },
          { key: "validade", header: "Validade", type: "dateBR" },
          { key: "validade_bucket", header: "Status Venc.", type: "text" },
        ],
        rows: pendenciasRows,
      });
      return;
    }

    // VENCIMENTOS
    exportXLSX({
      filename: `relatorio_vencimentos_${toISODate(new Date())}.xlsx`,
      sheetName: "Vencimentos",
      columns: [
        { key: "bucket", header: "Status", type: "text" },
        { key: "dias", header: "Dias", type: "number" },
        { key: "validade", header: "Validade", type: "dateBR" },
        { key: "fonte", header: "Fonte", type: "text" },
        { key: "dia_ultima_contagem", header: "Última Contagem", type: "text" },
        { key: "endereco", header: "Posição", type: "text" },
        { key: "rua", header: "Rua", type: "text" },
        { key: "sku", header: "SKU", type: "text" },
        { key: "codigo_barras", header: "EAN", type: "text" },
        { key: "nome_produto", header: "Produto", type: "text" },
        { key: "qtd_sistemica", header: "Qtd Sistêmica", type: "number" },
        { key: "qtd_fisica", header: "Qtd Física", type: "number" },
      ],
      rows: vencimentosRows,
    });
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] p-4 text-slate-700">
      {/* HEADER */}
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-6 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatórios</div>
            <div className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              {labelPeriodo}
            </div>
            {aba === "Vencimentos" ? (
              <div className="mt-1 text-sm font-black text-slate-700">
                Vencidos: {resumoVenc.vencidos} • Crítico 30d: {resumoVenc.c30} • Crítico 90d: {resumoVenc.c90}
              </div>
            ) : null}
            {aba === "Divergências" ? (
              <div className="mt-1 text-sm font-black text-slate-700">
                Total: {resumoDivergencias.total} • Falta: {resumoDivergencias.falta} • Sobra: {resumoDivergencias.sobra}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex gap-2">
              <PeriodBtn active={periodo === "DIARIO"} onClick={() => setPeriodo("DIARIO")}>Diário</PeriodBtn>
              <PeriodBtn active={periodo === "SEMANAL"} onClick={() => setPeriodo("SEMANAL")}>Semanal</PeriodBtn>
              <PeriodBtn active={periodo === "MENSAL"} onClick={() => setPeriodo("MENSAL")}>Mensal</PeriodBtn>
            </div>

            <input
              type="date"
              value={dataBase}
              onChange={(e) => setDataBase(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 outline-none"
              title="Data base"
            />

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </div>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar endereço, rua, SKU, EAN, produto..."
                className="w-[340px] max-w-[80vw] rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[12px] font-bold text-slate-700 outline-none"
              />
            </div>

            <button
              onClick={exportarXLSX}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-700"
              title="Exportar XLSX"
            >
              <Download size={16} /> Exportar
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-t bg-white">
          {["Divergências", "Pendências", "Vencimentos"].map((t) => (
            <button
              key={t}
              onClick={() => setAba(t)}
              className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                aba === t ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* CARDS RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <ResumoCard icon={<Package size={18} className="text-blue-600" />} label="Posições Cadastradas" value={formatInt(posicoes.length)} />
        <ResumoCard icon={<Clock size={18} className="text-amber-600" />} label="Pendentes no Período" value={formatInt(pendenciasRows.length)} />
        <ResumoCard icon={<AlertTriangle size={18} className="text-red-600" />} label="Divergências no Período" value={formatInt(divergenciasRows.length)} />
        <ResumoCard icon={<Calendar size={18} className="text-slate-600" />} label="Vencimentos (geral)" value={formatInt(vencimentosRows.length)} />
      </div>

      {/* TABELA */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-2 overflow-x-auto">
          {aba === "Divergências" && <TableDivergencias rows={divergenciasRows} />}
          {aba === "Pendências" && <TablePendencias rows={pendenciasRows} />}
          {aba === "Vencimentos" && <TableVencimentos rows={vencimentosRows} />}
        </div>
      </div>
    </div>
  );
};

/* ===================== UI ===================== */

const PeriodBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest ${
      active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`}
  >
    {children}
  </button>
);

const ResumoCard = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-black text-slate-800">{value}</div>
    </div>
    <div className="rounded-lg bg-slate-50 p-2">{icon}</div>
  </div>
);

/* ===================== Tabelas ===================== */

const TableDivergencias = ({ rows }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50">
        <th className="p-4 border-b">Dia</th>
        <th className="p-4 border-b">Posição</th>
        <th className="p-4 border-b">Rua</th>
        <th className="p-4 border-b">EAN / SKU</th>
        <th className="p-4 border-b">Produto</th>
        <th className="p-4 border-b text-center">Sis.</th>
        <th className="p-4 border-b text-center">Fis.</th>
        <th className="p-4 border-b text-center">Div.</th>
        <th className="p-4 border-b text-center">Resultado</th>
        <th className="p-4 border-b text-center">Validade</th>
      </tr>
    </thead>
    <tbody className="text-[11px] font-bold">
      {rows.length === 0 ? (
        <tr><td colSpan={10} className="p-6 text-center text-slate-400 font-black">Sem divergências no período.</td></tr>
      ) : (
        rows.slice(0, 250).map((r, i) => (
          <tr key={`${r.dia_key}-${r.endereco}-${r.sku}-${i}`} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
            <td className="p-4 text-slate-500">{r.dia_key}</td>
            <td className="p-4 text-blue-600 font-black">{r.endereco}</td>
            <td className="p-4 text-slate-600">{r.rua}</td>
            <td className="p-4 text-slate-400">
              <div className="font-black text-slate-700">{r.codigo_barras || "—"}</div>
              <div className="text-[10px] font-black text-slate-400">{r.sku || "—"}</div>
            </td>
            <td className="p-4">{r.nome_produto || "—"}</td>
            <td className="p-4 text-center text-slate-500">{r.qtd_sistemica}</td>
            <td className="p-4 text-center font-black text-blue-700">{r.qtd_fisica}</td>
            <td className="p-4 text-center">
              <span className={`px-2 py-1 rounded ${r.divergencia < 0 ? "text-red-600 bg-red-50" : "text-amber-700 bg-amber-50"}`}>
                {r.divergencia > 0 ? `+${r.divergencia}` : r.divergencia}
              </span>
            </td>
            <td className="p-4 text-center">
              <span className={`px-2 py-1 rounded ${r.resultado === "FALTA" ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"}`}>
                {r.resultado}
              </span>
            </td>
            <td className="p-4 text-center text-slate-600">{r.validade ? r.validade : "—"}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

const TablePendencias = ({ rows }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50">
        <th className="p-4 border-b">Posição</th>
        <th className="p-4 border-b">Rua</th>
        <th className="p-4 border-b">SKU</th>
        <th className="p-4 border-b">EAN</th>
        <th className="p-4 border-b">Produto</th>
        <th className="p-4 border-b text-center">Sis.</th>
        <th className="p-4 border-b">Validade</th>
        <th className="p-4 border-b">Status Venc.</th>
      </tr>
    </thead>
    <tbody className="text-[11px] font-bold">
      {rows.length === 0 ? (
        <tr><td colSpan={8} className="p-6 text-center text-slate-400 font-black">Sem pendências no período.</td></tr>
      ) : (
        rows.slice(0, 300).map((r, i) => (
          <tr key={`${r.endereco}-${r.sku}-${i}`} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
            <td className="p-4 text-blue-600 font-black">{r.endereco}</td>
            <td className="p-4 text-slate-600">{r.rua}</td>
            <td className="p-4 text-slate-700">{r.sku}</td>
            <td className="p-4 text-slate-400">{r.codigo_barras || "—"}</td>
            <td className="p-4">{r.nome_produto || "—"}</td>
            <td className="p-4 text-center font-black text-slate-700">{r.qtd_sistemica}</td>
            <td className="p-4 text-slate-600">{r.validade || "—"}</td>
            <td className="p-4">
              <BucketPill bucket={r.validade_bucket} />
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

const TableVencimentos = ({ rows }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50">
        <th className="p-4 border-b">Status</th>
        <th className="p-4 border-b text-center">Dias</th>
        <th className="p-4 border-b">Validade</th>
        <th className="p-4 border-b">Fonte</th>
        <th className="p-4 border-b">Última contagem</th>
        <th className="p-4 border-b">Posição</th>
        <th className="p-4 border-b">Rua</th>
        <th className="p-4 border-b">EAN / SKU</th>
        <th className="p-4 border-b">Produto</th>
        <th className="p-4 border-b text-center">Sis.</th>
        <th className="p-4 border-b text-center">Fis.</th>
      </tr>
    </thead>
    <tbody className="text-[11px] font-bold">
      {rows.length === 0 ? (
        <tr><td colSpan={11} className="p-6 text-center text-slate-400 font-black">Nenhum vencimento encontrado.</td></tr>
      ) : (
        rows.slice(0, 400).map((r, i) => (
          <tr key={`${r.validade}-${r.endereco}-${r.sku}-${i}`} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
            <td className="p-4"><BucketPill bucket={r.bucket} /></td>
            <td className="p-4 text-center font-black text-slate-700">{r.dias}</td>
            <td className="p-4 text-slate-700">{r.validade || "—"}</td>
            <td className="p-4 text-slate-600">{r.fonte}</td>
            <td className="p-4 text-slate-500">{r.dia_ultima_contagem || "—"}</td>
            <td className="p-4 text-blue-600 font-black">{r.endereco || "—"}</td>
            <td className="p-4 text-slate-600">{r.rua || "—"}</td>
            <td className="p-4 text-slate-400">
              <div className="font-black text-slate-700">{r.codigo_barras || "—"}</div>
              <div className="text-[10px] font-black text-slate-400">{r.sku || "—"}</div>
            </td>
            <td className="p-4">{r.nome_produto || "—"}</td>
            <td className="p-4 text-center font-black text-slate-700">{safeNumOrBlank(r.qtd_sistemica)}</td>
            <td className="p-4 text-center font-black text-blue-700">{safeNumOrBlank(r.qtd_fisica)}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

const BucketPill = ({ bucket }) => {
  const b = bucket || "SEM_VALIDADE";
  const cls =
    b === "VENCIDO"
      ? "text-red-700 bg-red-50"
      : b === "CRITICO_30D"
      ? "text-amber-700 bg-amber-50"
      : b === "CRITICO_90D"
      ? "text-orange-700 bg-orange-50"
      : "text-slate-600 bg-slate-100";

  return (
    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${cls}`}>
      {bucketLabel(b)}
    </span>
  );
};

/* ===================== Utils ===================== */

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safeNumOrBlank(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}
function formatInt(n) {
  try { return Number(n || 0).toLocaleString("pt-BR"); } catch { return String(n || 0); }
}

function bucketLabel(b) {
  if (b === "VENCIDO") return "Vencido";
  if (b === "CRITICO_30D") return "Crítico 30d";
  if (b === "CRITICO_90D") return "Crítico 90d";
  if (b === "SEM_VALIDADE") return "Sem validade";
  return b;
}

function toISODate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function fromISODate(iso) {
  const [yy, mm, dd] = String(iso || "").split("-");
  const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
function formatBR(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function startOfWeekMonday(d) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}
function endOfWeekSunday(d) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

function fromISODateStrict(iso) {
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
function getDiasParaVencer(validadeISO) {
  const vd = fromISODateStrict(validadeISO);
  if (!vd) return null;
  return diffDays(vd, startOfDay(new Date()));
}
function getValidadeBucket(validadeISO) {
  if (!validadeISO) return "SEM_VALIDADE";
  const dias = getDiasParaVencer(validadeISO);
  if (dias === null) return "SEM_VALIDADE";
  if (dias < 0) return "VENCIDO";
  if (dias <= 30) return "CRITICO_30D";
  if (dias <= 90) return "CRITICO_90D";
  return "OK";
}
function toTimeSafe(ts) {
  if (!ts) return -1;
  if (typeof ts?.toDate === "function") return ts.toDate().getTime();
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isNaN(d.getTime()) ? -1 : d.getTime();
}

export default Relatorios;
