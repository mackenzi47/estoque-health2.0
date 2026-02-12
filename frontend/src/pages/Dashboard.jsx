import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Package, ThumbsUp, Clock, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);

  // Simulação de dados baseada na imagem enviada
  const chartData = [
    { name: '10/05', posicoes: 260, media: 360 },
    { name: '11/05', posicoes: 350, media: 340 },
    { name: '12/05', posicoes: 280, media: 370 },
    { name: '13/05', posicoes: 330, media: 390 },
    { name: '14/05', posicoes: 400, media: 410 },
  ];

  const pieData = [
    { name: 'Acuracidade', value: 99.96 },
    { name: 'Restante', value: 0.04 },
  ];

  return (
    <div className="p-6 bg-slate-100 min-h-screen font-sans">
      {/* HEADER DE FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
        <div className="flex flex-col"><span>Data Base:</span> <input type="text" value="21/05/2024" className="border p-1 rounded" readOnly /></div>
        <div className="flex flex-col"><span>Inventário:</span> <select className="border p-1 rounded"><option>Inventário Geral</option></select></div>
        <div className="flex flex-col"><span>Setor:</span> <select className="border p-1 rounded"><option>Todos</option></select></div>
      </div>

      {/* CARDS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard title="Posições Ativas" value="4.078" icon={<Package />} color="bg-blue-600" />
        <StatCard title="Posições Contadas" value="3.210" icon={<ThumbsUp />} color="bg-green-600" />
        <StatCard title="Posições Pendentes" value="868" icon={<Clock />} color="bg-orange-500" />
        <StatCard title="% de Avanço" value="78,7%" icon={<TrendingUp />} color="bg-green-500" />
        <StatCard title="Acuracidade" value="99,96%" icon={<CheckCircle />} color="bg-blue-500" />
        <StatCard title="Divergências" value="22" icon={<AlertTriangle />} color="bg-red-500" />
      </div>

      {/* GRÁFICOS CENTRAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Avanço Diário */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold mb-4">Avanço Diário de Contagem</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="posicoes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="media" stroke="#f59e0b" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acuracidade Circular */}
        <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold mb-4">Acuracidade</h3>
          <div className="relative h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  <Cell fill="#3b82f6" />
                  <Cell fill="#e2e8f0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl">99,96%</div>
          </div>
        </div>
      </div>

      {/* TABELA INFERIOR */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-800 text-white p-3 text-sm font-bold">Posições Pendentes</div>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b">
              <th className="p-3">Posição</th>
              <th className="p-3">Região</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {['A12-05-03', 'B05-07-02', 'C03-02-01'].map((pos, i) => (
              <tr key={i} className="border-b">
                <td className="p-3">{pos}</td>
                <td className="p-3">Setor {i + 1}</td>
                <td className="p-3">Material Hosp. {i}</td>
                <td className="p-3 text-orange-500 font-bold">Pendente</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Componente de Card Reutilizável
const StatCard = ({ title, value, icon, color }) => (
  <div className={`${color} text-white p-4 rounded-xl shadow-md flex flex-col justify-between`}>
    <div className="flex justify-between items-center opacity-80">
      <span className="text-xs font-semibold uppercase">{title}</span>
      {React.cloneElement(icon, { size: 18 })}
    </div>
    <div className="text-2xl font-bold mt-2">{value}</div>
  </div>
);

export default Dashboard;