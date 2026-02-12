import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Cell, PieChart, Pie } from 'recharts';
import { Package, ThumbsUp, Clock, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(res => setData(res.data))
      .catch(err => console.error("Erro ao carregar dados:", err));
  }, []);

  if (!data) return <div className="flex h-screen items-center justify-center bg-slate-50 font-bold">Carregando Dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-4 md:p-8 font-sans">
      {/* HEADER DE FILTROS */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-xl bg-white p-4 shadow-sm text-[10px] font-bold text-slate-500 uppercase">
        <div className="flex flex-col border-r pr-4"><span>Data Base:</span> <span className="text-slate-900">21/05/2024</span></div>
        <div className="flex flex-col border-r pr-4"><span>Inventário:</span> <span className="text-slate-900">Geral</span></div>
        <div className="flex flex-col"><span>Setor:</span> <span className="text-slate-900">Todos</span></div>
      </div>

      {/* CARDS INDICADORES */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard title="Posições Ativas" value={data.cards.ativas} color="bg-[#1e5bb0]" icon={<Package size={16}/>} />
        <StatCard title="Posições Contadas" value={data.cards.contadas} color="bg-[#43a047]" icon={<ThumbsUp size={16}/>} />
        <StatCard title="Posições Pendentes" value={data.cards.pendentes} color="bg-[#f2994a]" icon={<Clock size={16}/>} />
        <StatCard title="% de Avanço" value={data.cards.avanco} color="bg-[#27ae60]" icon={<TrendingUp size={16}/>} />
        <StatCard title="Acuracidade" value={data.cards.acuracidade} color="bg-[#2d9cdb]" icon={<CheckCircle size={16}/>} />
        <StatCard title="Divergências" value={data.cards.divergencias} color="bg-[#eb5757]" icon={<AlertTriangle size={16}/>} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* GRÁFICO PRINCIPAL */}
        <div className="rounded-xl bg-white p-6 shadow-md lg:col-span-2">
          <h3 className="mb-6 text-sm font-bold text-slate-700">Avanço Diário de Contagem</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.grafico_avanco}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                <Tooltip />
                <Bar dataKey="posicoes" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Line type="monotone" dataKey="media" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABELA DE PENDÊNCIAS */}
        <div className="overflow-hidden rounded-xl bg-white shadow-md">
          <div className="bg-[#2c3e50] p-3 text-center text-xs font-bold uppercase tracking-widest text-white">
            Posições Pendentes
          </div>
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b">
              <tr className="text-slate-400 font-bold">
                <th className="p-3 uppercase">Posição</th>
                <th className="p-3 uppercase">Produto</th>
                <th className="p-3 text-center uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tabela_pendentes.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{item.pos}</td>
                  <td className="p-3 text-slate-600">{item.produto}</td>
                  <td className="p-3 text-center text-orange-500 font-black uppercase text-[10px]">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color, icon }) => (
  <div className={`${color} flex flex-col justify-between rounded-xl p-4 text-white shadow-lg transition-all hover:scale-105`}>
    <div className="flex items-center justify-between opacity-80">
      <span className="text-[9px] font-bold uppercase tracking-wider">{title}</span>
      {icon}
    </div>
    <div className="mt-2 text-3xl font-black">{value}</div>
  </div>
);

export default Dashboard;