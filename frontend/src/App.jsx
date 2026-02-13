import React, { useState } from 'react';
import { User, Lock, LayoutDashboard, ClipboardList, FileText, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';

const App = () => {
  const [user, setUser] = useState(null); // null = deslogado
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  // Simulação de login
  const handleLogin = (e) => {
    e.preventDefault();
    if (credentials.username === 'admin' && credentials.password === 'ybera123') {
      setUser({ name: 'Administrador', role: 'ADMIN' });
    } else if (credentials.username === 'equipe' && credentials.password === 'ybera456') {
      setUser({ name: 'Equipe Ybera', role: 'VIEWER' });
      setAbaAtiva('dashboard'); // Garante que cai no dashboard
    } else {
      alert("Usuário ou senha inválidos");
    }
  };

  // Tela de Login (Aparece se user for null)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
          <div className="text-center mb-8">
            <img src="/logo-ybera.png" alt="Ybera" className="h-12 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sistema de Auditoria Interna</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User size={18} className="absolute left-5 top-4 text-slate-400" />
              <input 
                type="text" placeholder="Usuário" 
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-5 top-4 text-slate-400" />
              <input 
                type="password" placeholder="Senha" 
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-14 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95">
              ENTRAR NO SISTEMA
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <img src="/logo-ybera.png" alt="YBERA GROUP" className="h-10 w-auto" />

        <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setAbaAtiva('dashboard')} className={`px-4 py-2 rounded-lg text-[10px] font-[1000] ${abaAtiva === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>DASHBOARD</button>
          
          {/* SÓ MOSTRA INVENTÁRIO SE FOR ADMIN */}
          {user.role === 'ADMIN' && (
            <button onClick={() => setAbaAtiva('inventario')} className={`px-4 py-2 rounded-lg text-[10px] font-[1000] ${abaAtiva === 'inventario' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>INVENTÁRIO</button>
          )}
          
          <button onClick={() => setAbaAtiva('relatorios')} className={`px-4 py-2 rounded-lg text-[10px] font-[1000] ${abaAtiva === 'relatorios' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>RELATÓRIOS</button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{user.role}</p>
            <p className="text-xs font-bold text-slate-800">{user.name}</p>
          </div>
          <button onClick={() => setUser(null)} className="w-10 h-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1">
        {abaAtiva === 'dashboard' && <Dashboard />}
        {abaAtiva === 'inventario' && user.role === 'ADMIN' && <Inventario />}
        {abaAtiva === 'relatorios' && (
          <div className="p-10 text-center font-black text-slate-300 uppercase tracking-widest">Módulo de Relatórios</div>
        )}
      </main>
    </div>
  );
};

export default App;