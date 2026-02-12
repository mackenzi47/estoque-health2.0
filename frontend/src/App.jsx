import React, { useState } from 'react';
import { LayoutDashboard, ClipboardList, FileText, User } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';

const App = () => {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        {/* LOGO PURA */}
        <img src="/src/assets/logo-ybera.png" alt="YBERA GROUP" className="h-12 w-auto" />

        <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setAbaAtiva('dashboard')} className={`px-4 py-2 rounded-lg text-xs font-black ${abaAtiva === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>DASHBOARD</button>
          <button onClick={() => setAbaAtiva('inventario')} className={`px-4 py-2 rounded-lg text-xs font-black ${abaAtiva === 'inventario' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>INVENTÁRIO</button>
          <button onClick={() => setAbaAtiva('relatorios')} className={`px-4 py-2 rounded-lg text-xs font-black ${abaAtiva === 'relatorios' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>RELATÓRIOS</button>
        </nav>

        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white"><User size={20} /></div>
      </header>

      <main className="flex-1 p-6">
        {abaAtiva === 'dashboard' && <Dashboard />}
        {abaAtiva === 'inventario' && <Inventario />}
        {abaAtiva === 'relatorios' && <div className="p-10 text-center font-bold text-slate-400">RELATÓRIOS</div>}
      </main>
    </div>
  );
};

export default App;