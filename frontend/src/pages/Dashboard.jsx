import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, Package, History, 
  MapPin, Calendar, Activity, TrendingUp, Clock, Search 
} from 'lucide-react';

const Dashboard = () => {
  // --- ESTADOS ---
  const [filtroAtivo, setFiltroAtivo] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState({ coluna: 'loc', direcao: 'asc' });

  // --- DADOS DOS GRÁFICOS ---
  const dadosAcuracidade = [
    { name: 'Correto', value: 98.2, color: '#10b981' },
    { name: 'Divergente', value: 1.8, color: '#f1f5f9' },
  ];

  const dadosCondicao = [
    { name: 'Bom', value: 95, color: '#3b82f6' },
    { name: 'Danificado', value: 5, color: '#f1f5f9' },
  ];

  const dadosDivergenciasRua = [
    { name: 'Rua A', qtd: 12, lote: 5 },
    { name: 'Rua B', qtd: 8, lote: 2 },
    { name: 'Rua C', qtd: 15, lote: 9 },
    { name: 'Rua D', qtd: 4, lote: 1 },
  ];

  // --- DADOS DA TABELA ---
  const todasPosicoes = [
    { loc: 'A2031', prod: 'Óleo Reparador Ybera', lote: 'SN001', status: 'ERRO QUANTIDADE', div: '-12 UN', cor: 'text-red-600 bg-red-50', tipo: 'DIVERGÊNCIAS' },
    { loc: 'B1012', prod: 'Máscara Vello', lote: 'SN987', status: 'ERRO LOTE', div: 'Divergente', cor: 'text-blue-600 bg-blue-50', tipo: 'ERRO LOTE' },
    { loc: 'C5051', prod: 'Shampoo Fashion Gold', lote: 'SN444', status: 'OK', div: '0', cor: 'text-green-600 bg-green-50', tipo: 'OK' },
    { loc: 'D3042', prod: 'Leave-in Terra Forte', lote: 'SN222', status: 'DANIFICADO', div: 'Avaria', cor: 'text-orange-600 bg-orange-50', tipo: 'AVARIAS' },
    { loc: 'E1106', prod: 'Kit Cronograma Capilar', lote: 'SN555', status: 'PENDENTE', div: 'Aguardando', cor: 'text-slate-500 bg-slate-100', tipo: 'TODOS' },
  ];

  // --- LÓGICA DE FILTRO, BUSCA E ORDENAÇÃO ---
  const handleOrdenar = (coluna) => {
    const novaDirecao = ordem.coluna === coluna && ordem.direcao === 'asc' ? 'desc' : 'asc';
    setOrdem({ coluna, direcao: novaDirecao });
  };

  const posicoesProcessadas = todasPosicoes
    .filter(item => {
      const atendeFiltro = filtroAtivo === 'TODOS' || item.tipo === filtroAtivo;
      const atendeBusca = item.prod.toLowerCase().includes(busca.toLowerCase()) || 
                          item.loc.toLowerCase().includes(busca.toLowerCase());
      return atendeFiltro && atendeBusca;
    })
    .sort((a, b) => {
      const valorA = a[ordem.coluna].toString().toUpperCase();
      const valorB = b[ordem.coluna].toString().toUpperCase();
      if (valorA < valorB) return ordem.direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return ordem.direcao === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-baseline mb-1">
            <span className="text-3xl font-[900] tracking-tighter text-slate-800">YBERA</span>
            <span className="text-3xl font-[300] tracking-tight text-slate-600 ml-1">GROUP</span>
            <span className="text-[9px] font-bold relative -top-4 ml-0.5 text-slate-400">®</span>
          </div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Painel de Auditoria de Estoque</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 min-w-[140px] text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Acuracidade Total</p>
            <p className="text-2xl font-[1000] text-emerald-500">98.2%</p>
          </div>
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 min-w-[140px] text-center text-white">
            <p className="text-[9px] font-black opacity-80 uppercase tracking-tighter">Itens Contados</p>
            <p className="text-2xl font-[1000]">1.284</p>
          </div>
        </div>
      </div>

      {/* CARDS DE KPI (ESTILO MODERNO ARREDONDADO) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Posições', val: '4.500', icon: <Package size={18}/>, color: 'bg-blue-600' },
          { label: 'Pendentes', val: '320', icon: <Clock size={18}/>, color: 'bg-orange-500' },
          { label: 'Divergências', val: '42', icon: <AlertTriangle size={18}/>, color: 'bg-red-500' },
          { label: 'Produtividade/H', val: '156', icon: <TrendingUp size={18}/>, color: 'bg-emerald-500' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.color} p-5 rounded-[2rem] text-white shadow-lg shadow-slate-200 flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
            <div className="mb-2 opacity-60">{kpi.icon}</div>
            <p className="text-[9px] font-black uppercase tracking-wider mb-1">{kpi.label}</p>
            <h3 className="text-xl font-black">{kpi.val}</h3>
          </div>
        ))}
      </div>

      {/* SEÇÃO DE GRÁFICOS COM PORCENTAGEM CENTRAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráficos de Rosca */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Qualidade do Inventário</h3>
          <div className="flex justify-around items-center h-48">
            
            {/* Donut Acuracidade */}
            <div className="h-full w-1/2 relative flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosAcuracidade} innerRadius="70%" outerRadius="90%" paddingAngle={0} dataKey="value" startAngle={90} endAngle={450}>
                    {dadosAcuracidade.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pb-8">
                <span className="text-lg font-[1000] text-slate-800">98%</span>
              </div>
              <p className="text-center text-[9px] font-black text-emerald-500 uppercase">Acuracidade</p>
            </div>

            {/* Donut Condição */}
            <div className="h-full w-1/2 relative flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosCondicao} innerRadius="70%" outerRadius="90%" paddingAngle={0} dataKey="value" startAngle={90} endAngle={450}>
                    {dadosCondicao.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pb-8">
                <span className="text-lg font-[1000] text-slate-800">95%</span>
              </div>
              <p className="text-center text-[9px] font-black text-blue-600 uppercase">Estoque Bom</p>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-1">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Divergências por Rua</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosDivergenciasRua}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="qtd" fill="#ef4444" radius={[8, 8, 8, 8]} barSize={20} />
                <Bar dataKey="lote" fill="#3b82f6" radius={[8, 8, 8, 8]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status de Vencimento */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Controle de Vencimento</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-[1.5rem] text-red-700 border border-red-100">
              <span className="text-[10px] font-black uppercase flex items-center gap-2"><AlertTriangle size={14}/> Vencidos</span>
              <span className="font-[1000]">12</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-[1.5rem] text-orange-700 border border-orange-100">
              <span className="text-[10px] font-black uppercase flex items-center gap-2"><Calendar size={14}/> Críticos (90D)</span>
              <span className="font-[1000]">45</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-[1.5rem] text-emerald-700 border border-emerald-100">
              <span className="text-[10px] font-black uppercase flex items-center gap-2"><CheckCircle size={14}/> Válidos</span>
              <span className="font-[1000]">854</span>
            </div>
          </div>
        </div>
      </div>

      {/* MONITOR DE AUDITORIA (BUSCA + FILTROS + TABELA) */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        
        {/* HEADER DA TABELA */}
        <div className="bg-slate-900 p-5 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-xs text-white">
              <History size={18} className="text-blue-400" /> Auditoria Recente
            </div>
            
            {/* BARRA DE BUSCA OPERACIONAL */}
            <div className="relative w-full lg:w-80">
              <Search size={14} className="absolute left-4 top-3 text-slate-500" />
              <input 
                type="text"
                placeholder="Buscar por local ou material..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-slate-800/50 border-none rounded-2xl py-2.5 pl-11 pr-4 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* BOTÕES DE FILTRO */}
          <div className="flex gap-2 bg-slate-800/50 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto">
            {['TODOS', 'DIVERGÊNCIAS', 'ERRO LOTE', 'AVARIAS'].map((f) => (
              <button 
                key={f} 
                onClick={() => setFiltroAtivo(f)} 
                className={`px-4 py-2 rounded-xl text-[9px] font-[1000] whitespace-nowrap transition-all ${filtroAtivo === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA COM ORDENAÇÃO DINÂMICA */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="p-6 cursor-pointer hover:text-blue-600" onClick={() => handleOrdenar('loc')}>
                  Local {ordem.coluna === 'loc' && (ordem.direcao === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-6 cursor-pointer hover:text-blue-600" onClick={() => handleOrdenar('prod')}>
                  Material {ordem.coluna === 'prod' && (ordem.direcao === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-6 text-center cursor-pointer hover:text-blue-600" onClick={() => handleOrdenar('status')}>
                  Status {ordem.coluna === 'status' && (ordem.direcao === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-6">Divergência</th>
                <th className="p-6 text-right pr-10">Lote Sênior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-xs text-slate-700">
              {posicoesProcessadas.length > 0 ? (
                posicoesProcessadas.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 font-[1000] text-blue-600">{item.loc}</td>
                    <td className="p-6 text-slate-600">{item.prod}</td>
                    <td className="p-6 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] uppercase font-[1000] ${item.cor}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-6 font-mono text-slate-400 italic">{item.div}</td>
                    <td className="p-6 text-right pr-10 font-mono text-slate-400 group-hover:text-slate-900 transition-colors">
                      {item.lote}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-slate-400 font-bold italic">
                    Nenhum registro encontrado para sua busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;