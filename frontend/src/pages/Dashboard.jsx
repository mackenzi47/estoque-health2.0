import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Search,
  ChevronUp,
  ChevronDown,
  Calendar,
} from "lucide-react";

const Dashboard = () => {
  const [auditorias, setAuditorias] = useState([]);
  const [posicoes, setPosicoes] = useState([]);

  const [abaAtiva, setAbaAtiva] = useState("Top Divergências");
  const [busca, setBusca] = useState("");

  // Período
  const [periodo, setPeriodo] = useState("DIARIO"); // DIARIO | SEMANAL | MENSAL
  const [dataBase, setDataBase] = useState(() => toISODate(new Date()));
  const [metaDiaria, setMetaDiaria] = useState(200);

  // ===== Firestore =====
  useEffect(() => {
    const q = query(collection(db, "auditorias"), orderBy("data_auditoria", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setAuditorias(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "posicoes"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setPosicoes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // ===== Range =====
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

  // ===== Métricas gerais =====
  const totalPosicoesCadastradas = posicoes.length;

  const keyPosicao = (p) => `${String(p.endereco || "").trim().toUpperCase()}__${String(p.sku || "").trim()}`;
  const keyAud = (a) => `${String(a.endereco || a.local || "").trim().toUpperCase()}__${String(a.sku || "").trim()}`;

  const setAudKeysPeriodo = useMemo(() => {
    const s = new Set();
    for (const a of auditoriasPeriodo) s.add(keyAud(a));
    return s;
  }, [auditoriasPeriodo]);

  const posicoesContadasUnicas = useMemo(() => {
    let n = 0;
    for (const p of posicoes) if (setAudKeysPeriodo.has(keyPosicao(p))) n++;
    return n;
  }, [posicoes, setAudKeysPeriodo]);

  const pendentes = Math.max(totalPosicoesCadastradas - posicoesContadasUnicas, 0);

  const totalAuditado = auditoriasPeriodo.length;
  const divergencias = auditoriasPeriodo.filter((i) => Number(i.divergencia || 0) !== 0).length;
  const acuracidade = totalAuditado > 0 ? ((totalAuditado - divergencias) / totalAuditado) * 100 : 100;
  const progresso = totalPosicoesCadastradas > 0 ? (posicoesContadasUnicas / totalPosicoesCadastradas) * 100 : 0;

  // ===== Vencimentos (baseado na ÚLTIMA contagem por posição+SKU no período) =====
  const ultimaPorPosicao = useMemo(() => {
    const map = new Map(); // key -> auditoria mais recente
    for (const a of auditoriasPeriodo) {
      const k = keyAud(a);
      const prev = map.get(k);
      const t = toTimeSafe(a.data_auditoria);
      const tp = prev ? toTimeSafe(prev.data_auditoria) : -1;
      if (!prev || t > tp) map.set(k, a);
    }
    return Array.from(map.values());
  }, [auditoriasPeriodo]);

  const vencResumo = useMemo(() => {
    let vencidos = 0, c30 = 0, c90 = 0;
    for (const a of ultimaPorPosicao) {
      const b = a.validade_bucket || getValidadeBucket(a.validade);
      if (b === "VENCIDO") vencidos++;
      else if (b === "CRITICO_30D") c30++;
      else if (b === "CRITICO_90D") c90++;
    }
    return { vencidos, c30, c90 };
  }, [ultimaPorPosicao]);

  // ===== Busca =====
  const qBusca = busca.trim().toLowerCase();
  const match = (obj) => {
    if (!qBusca) return true;
    return Object.values(obj)
      .map((v) => String(v ?? "").toLowerCase())
      .join(" | ")
      .includes(qBusca);
  };

  // ===== Tabelas =====
  const auditoriaGeralRows = useMemo(() => auditoriasPeriodo.filter(match), [auditoriasPeriodo, qBusca]); // eslint-disable-line
  const topDivergenciasRows = useMemo(() => {
    return auditoriasPeriodo
      .filter((a) => Number(a.divergencia || 0) !== 0)
      .filter(match)
      .sort((a, b) => Math.abs(Number(b.divergencia || 0)) - Math.abs(Number(a.divergencia || 0)))
      .slice(0, 150);
  }, [auditoriasPeriodo, qBusca]); // eslint-disable-line

  const posicoesPendentesRows = useMemo(() => {
    return posicoes
      .filter((p) => !setAudKeysPeriodo.has(keyPosicao(p)))
      .filter(match)
      .map((p) => ({
        endereco: p.endereco,
        rua: p.rua,
        sku: p.sku,
        codigo_barras: p.codigo_barras,
        nome_produto: p.nome_produto,
        qtd_sistemica: p.qtd_sistemica,
        validade: p.validade,
        validade_bucket: p.validade_bucket || getValidadeBucket(p.validade),
      }))
      .slice(0, 200);
  }, [posicoes, setAudKeysPeriodo, qBusca]); // eslint-disable-line

  const vencimentosRows = useMemo(() => {
    return ultimaPorPosicao
      .filter((a) => {
        const b = a.validade_bucket || getValidadeBucket(a.validade);
        return b === "VENCIDO" || b === "CRITICO_30D" || b === "CRITICO_90D";
      })
      .filter(match)
      .map((a) => ({
        dia_key: a.dia_key,
        endereco: a.endereco || a.local,
        rua: a.rua,
        sku: a.sku,
        codigo_barras: a.codigo_barras,
        nome_produto: a.nome_produto_real,
        qtd_sistemica: a.qtd_sistemica,
        qtd_fisica: a.qtd_fisica,
        validade: a.validade,
        validade_bucket: a.validade_bucket || getValidadeBucket(a.validade),
        dias_para_vencer: a.dias_para_vencer ?? getDiasParaVencer(a.validade),
      }))
      .sort((a, b) => (String(a.validade || "") > String(b.validade || "") ? 1 : -1))
      .slice(0, 250);
  }, [ultimaPorPosicao, qBusca]); // eslint-disable-line

  // ===== Gráfico por dia =====
  const chartData = useMemo(() => {
    const map = new Map(); // dia_key -> count
    for (const a of auditoriasPeriodo) {
      const k = String(a.dia_key || "");
      if (!k) continue;
      map.set(k, (map.get(k) || 0) + 1);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a > b ? 1 : -1)).slice(-5);
    return keys.map((k) => ({
      name: shortDayLabel(k),
      realizado: map.get(k) || 0,
      meta: Number(metaDiaria || 0),
    }));
  }, [auditoriasPeriodo, metaDiaria]);

  return (
    <div className="p-4 bg-[#f4f7fc] min-h-screen font-sans text-slate-700">
      {/* Header */}
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-6 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Dashboard • Contagem + Vencimentos
            </div>
            <div className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              {labelPeriodo}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setPeriodo("DIARIO")}
                className={`px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest ${
                  periodo === "DIARIO" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Diário
              </button>
              <button
                onClick={() => setPeriodo("SEMANAL")}
                className={`px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest ${
                  periodo === "SEMANAL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setPeriodo("MENSAL")}
                className={`px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-widest ${
                  periodo === "MENSAL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Mensal
              </button>
            </div>

            <input
              type="date"
              value={dataBase}
              onChange={(e) => setDataBase(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 outline-none"
              title="Data base"
            />

            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meta/dia</span>
              <input
                type="number"
                value={metaDiaria}
                onChange={(e) => setMetaDiaria(Number(e.target.value || 0))}
                className="w-24 bg-transparent text-[12px] font-black text-slate-700 outline-none"
              />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </div>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar produto, local, SKU, EAN, Rua..."
                className="w-[320px] max-w-[80vw] rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-[12px] font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards principais + vencimentos */}
      <div className="grid grid-cols-1 md:grid-cols-9 gap-4 mb-6">
        <CardBI label="Posições Cadastradas" val={formatInt(totalPosicoesCadastradas)} trend="Cadastro" color="border-l-[#1a73e8]" icon={<Package size={20} className="text-[#1a73e8]"/>} />
        <CardBI label="Posições Contadas" val={formatInt(posicoesContadasUnicas)} trend="Período" color="border-l-[#4caf50]" icon={<CheckCircle size={20} className="text-[#4caf50]"/>} />
        <CardBI label="Pendentes" val={formatInt(pendentes)} trend="Período" down={pendentes>0} color="border-l-[#ff9800]" icon={<Clock size={20} className="text-[#ff9800]"/>} />
        <CardBI label="Avanço" val={`${progresso.toFixed(1)}%`} trend="Período" color="border-l-[#2e7d32]" icon={<TrendingUp size={20} className="text-[#2e7d32]"/>} />
        <CardBI label="Acuracidade" val={`${acuracidade.toFixed(1)}%`} trend="Período" color="border-l-[#1565c0]"/>
        <CardBI label="Divergências" val={formatInt(divergencias)} trend="Período" isAlert={divergencias>0} color="border-l-[#d32f2f]" icon={<AlertTriangle size={20} className="text-[#d32f2f]"/>} />

        <CardBI label="Vencidos" val={formatInt(vencResumo.vencidos)} trend="Última contagem" isAlert={vencResumo.vencidos>0} color="border-l-[#b31412]" icon={<AlertTriangle size={20} className="text-[#b31412]"/>} />
        <CardBI label="Prazo Crítico 30d" val={formatInt(vencResumo.c30)} trend="Última contagem" down={false} color="border-l-[#f57c00]" icon={<Clock size={20} className="text-[#f57c00]"/>} />
        <CardBI label="Prazo Crítico 90d" val={formatInt(vencResumo.c90)} trend="Última contagem" down={false} color="border-l-[#ef6c00]" icon={<Clock size={20} className="text-[#ef6c00]"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Gráfico */}
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider">Contagem por Dia (período)</h3>
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#1a73e8] rounded-sm"></div> Realizado</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#e0e0e0] rounded-sm"></div> Meta</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="realizado" fill="#1a73e8" radius={[4,4,0,0]} barSize={30} />
                <Bar dataKey="meta" fill="#e0e0e0" radius={[4,4,0,0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rosca acuracidade */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex flex-col items-center">
          <h3 className="text-sm font-black uppercase tracking-wider mb-8 text-center">Acuracidade Total</h3>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{v: clamp(acuracidade,0,100)}, {v: 100-clamp(acuracidade,0,100)}]} innerRadius="75%" outerRadius="95%" paddingAngle={5} dataKey="v" startAngle={90} endAngle={450}>
                  <Cell fill="#1a73e8" stroke="none" />
                  <Cell fill="#f1f5f9" stroke="none" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-[1000] text-slate-800">{clamp(acuracidade,0,100).toFixed(0)}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global</span>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="lg:col-span-4 bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b flex-wrap">
            {["Posições Pendentes", "Top Divergências", "Vencimentos", "Auditoria Geral"].map((tab) => (
              <button
                key={tab}
                onClick={() => setAbaAtiva(tab)}
                className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                  abaAtiva === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-2 overflow-x-auto">
            {abaAtiva === "Auditoria Geral" && <TableAuditoria rows={auditoriaGeralRows} />}
            {abaAtiva === "Top Divergências" && <TableAuditoria rows={topDivergenciasRows} />}
            {abaAtiva === "Posições Pendentes" && <TablePendentes rows={posicoesPendentesRows} />}
            {abaAtiva === "Vencimentos" && <TableVencimentos rows={vencimentosRows} />}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== Tabelas ===================== */

const TableAuditoria = ({ rows }) => (
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50">
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
        <tr><td colSpan={9} className="p-6 text-center text-slate-400 font-black">Sem registros para o filtro atual.</td></tr>
      ) : (
        rows.slice(0, 200).map((a, i) => {
          const pos = a.endereco || a.local || "—";
          const div = Number(a.divergencia || 0);
          const isOk = div === 0;
          const res = a.resultado || (div === 0 ? "OK" : div < 0 ? "FALTA" : "SOBRA");
          return (
            <tr key={a.id || i} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
              <td className="p-4 text-blue-600 font-black">{pos}</td>
              <td className="p-4 text-slate-600">{a.rua || "—"}</td>
              <td className="p-4 text-slate-400">
                <div className="font-black text-slate-700">{a.codigo_barras || "—"}</div>
                <div className="text-[10px] font-black text-slate-400">{a.sku || "—"}</div>
              </td>
              <td className="p-4">{a.nome_produto_real || "—"}</td>
              <td className="p-4 text-center text-slate-400">{safeNum(a.qtd_sistemica)}</td>
              <td className="p-4 text-center font-black text-blue-700">{safeNum(a.qtd_fisica)}</td>
              <td className="p-4 text-center">
                <span className={`px-2 py-1 rounded ${isOk ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                  {div > 0 ? `+${div}` : div}
                </span>
              </td>
              <td className="p-4 text-center">
                <span className={`px-2 py-1 rounded ${res === "OK" ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"}`}>
                  {res}
                </span>
              </td>
              <td className="p-4 text-center text-slate-600">{a.validade ? a.validade : "—"}</td>
            </tr>
          );
        })
      )}
    </tbody>
  </table>
);

const TablePendentes = ({ rows }) => (
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
      </tr>
    </thead>
    <tbody className="text-[11px] font-bold">
      {rows.length === 0 ? (
        <tr><td colSpan={7} className="p-6 text-center text-slate-400 font-black">Nenhuma pendência no período (ou nada cadastrado).</td></tr>
      ) : (
        rows.map((r, i) => (
          <tr key={`${r.endereco}-${r.sku}-${i}`} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
            <td className="p-4 text-blue-600 font-black">{r.endereco || "—"}</td>
            <td className="p-4 text-slate-600">{r.rua || "—"}</td>
            <td className="p-4 text-slate-700">{r.sku || "—"}</td>
            <td className="p-4 text-slate-400">{r.codigo_barras || "—"}</td>
            <td className="p-4">{r.nome_produto || "—"}</td>
            <td className="p-4 text-center font-black text-slate-700">{safeNum(r.qtd_sistemica)}</td>
            <td className="p-4 text-slate-600">{r.validade ? r.validade : "—"}</td>
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
        <th className="p-4 border-b">Dias</th>
        <th className="p-4 border-b">Validade</th>
        <th className="p-4 border-b">Posição</th>
        <th className="p-4 border-b">Rua</th>
        <th className="p-4 border-b">EAN / SKU</th>
        <th className="p-4 border-b">Produto</th>
      </tr>
    </thead>
    <tbody className="text-[11px] font-bold">
      {rows.length === 0 ? (
        <tr><td colSpan={7} className="p-6 text-center text-slate-400 font-black">Nenhum vencimento no período.</td></tr>
      ) : (
        rows.map((r, i) => (
          <tr key={`${r.validade}-${r.endereco}-${r.sku}-${i}`} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
            <td className="p-4">
              <span className={`px-2 py-1 rounded ${
                r.validade_bucket === "VENCIDO" ? "text-red-700 bg-red-50" :
                r.validade_bucket === "CRITICO_30D" ? "text-amber-700 bg-amber-50" :
                "text-orange-700 bg-orange-50"
              }`}>
                {bucketLabel(r.validade_bucket)}
              </span>
            </td>
            <td className="p-4 text-slate-700 font-black">{r.dias_para_vencer}</td>
            <td className="p-4 text-slate-600">{r.validade || "—"}</td>
            <td className="p-4 text-blue-600 font-black">{r.endereco || "—"}</td>
            <td className="p-4 text-slate-600">{r.rua || "—"}</td>
            <td className="p-4 text-slate-400">
              <div className="font-black text-slate-700">{r.codigo_barras || "—"}</div>
              <div className="text-[10px] font-black text-slate-400">{r.sku || "—"}</div>
            </td>
            <td className="p-4">{r.nome_produto || "—"}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

/* ===================== Card ===================== */

const CardBI = ({ label, val, trend, down, color, icon, isAlert }) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${color} flex flex-col justify-between`}>
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      {icon}
    </div>
    <div className="mt-2 flex items-baseline justify-between">
      <h3 className="text-xl font-[1000] text-slate-800">{val}</h3>
      <div className={`flex items-center text-[10px] font-black ${down || isAlert ? "text-red-500" : "text-emerald-500"}`}>
        {down || isAlert ? <ChevronDown size={10}/> : <ChevronUp size={10}/>}
        {trend}
      </div>
    </div>
  </div>
);

/* ===================== Utils ===================== */

function bucketLabel(b) {
  if (b === "VENCIDO") return "Vencido";
  if (b === "CRITICO_30D") return "Crítico (30d)";
  if (b === "CRITICO_90D") return "Crítico (90d)";
  return b;
}
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function formatInt(n) {
  try { return Number(n || 0).toLocaleString("pt-BR"); } catch { return String(n || 0); }
}
function clamp(n,a,b){ return Math.min(Math.max(Number(n||0),a),b); }

function toISODate(d){
  const yy=d.getFullYear();
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const dd=String(d.getDate()).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
}
function fromISODate(iso){
  const [yy,mm,dd]=String(iso||"").split("-");
  const d=new Date(Number(yy),Number(mm)-1,Number(dd));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
function formatBR(d){
  const dd=String(d.getDate()).padStart(2,"0");
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const yy=d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
function startOfWeekMonday(d){
  const copy=new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
  const day=copy.getDay();
  const diff=day===0?-6:1-day;
  copy.setDate(copy.getDate()+diff);
  return copy;
}
function endOfWeekSunday(d){
  const s=startOfWeekMonday(d);
  const e=new Date(s);
  e.setDate(e.getDate()+6);
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23,59,59,999);
}
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999); }

function shortDayLabel(iso){
  const d=fromISODate(iso);
  const dias=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  return dias[d.getDay()];
}

function toTimeSafe(ts){
  if (!ts) return -1;
  if (typeof ts?.toDate === "function") return ts.toDate().getTime();
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isNaN(d.getTime()) ? -1 : d.getTime();
}

function fromISODateStrict(iso){
  const [yy,mm,dd]=String(iso||"").split("-");
  if(!yy||!mm||!dd) return null;
  const d=new Date(Number(yy),Number(mm)-1,Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0); }
function diffDays(a,b){
  const ms=24*60*60*1000;
  return Math.floor((a.getTime()-b.getTime())/ms);
}
function getDiasParaVencer(validadeISO){
  const vd = fromISODateStrict(validadeISO);
  if(!vd) return null;
  return diffDays(vd, startOfDay(new Date()));
}
function getValidadeBucket(validadeISO){
  if(!validadeISO) return "SEM_VALIDADE";
  const dias = getDiasParaVencer(validadeISO);
  if(dias === null) return "SEM_VALIDADE";
  if(dias < 0) return "VENCIDO";
  if(dias <= 30) return "CRITICO_30D";
  if(dias <= 90) return "CRITICO_90D";
  return "OK";
}

export default Dashboard;
