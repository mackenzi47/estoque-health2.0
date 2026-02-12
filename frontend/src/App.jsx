import React, { useState } from 'react';
import { User } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';

const App = () => {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        
        {/* LOGO CORRIGIDA PARA O VERCEL */}
        {/* Como o arquivo está na pasta 'public', o caminho é direto da raiz '/' */}
        <img 
          src="/logo-ybera.png" 
          alt="YBERA GROUP" 
          className="h-12 w-auto object-contain" 
        />

        <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setAbaAtiva('dashboard')} 
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${abaAtiva === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            DASHBOARD
          </button>
          
          <button 
            onClick={() => setAbaAtiva('inventario')} 
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${abaAtiva === 'inventario' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            INVENTÁRIO
          </button>
          
          <button 
            onClick={() => setAbaAtiva('relatorios')} 
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${abaAtiva === 'relatorios' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            RELATÓRIOS
          </button>
        </nav>

        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-slate-700 transition-colors">
          <User size={20} />
        </div>
      </header>

      <main className="flex-1">
        {/* Renderização das abas */}
        {abaAtiva === 'dashboard' && <Dashboard />}
        
        {/* A aba Inventário agora contém: Barras, Local (A2031), SKU, Lote Sênior, Lote Indústria, Validade e Condição */}
        {abaAtiva === 'inventario' && <Inventario />}
        
        {abaAtiva === 'relatorios' && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="font-black text-slate-300 uppercase tracking-widest text-sm">Módulo de Relatórios</p>
              <p className="text-xs font-bold text-slate-400 mt-2">Disponível em breve para auditoria.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;