import React, { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Cadastro from "./pages/Cadastro";
import Relatorios from "./pages/Relatorios";

const App = () => {
  const [pagina, setPagina] = useState("dashboard"); // dashboard | inventario | cadastro | relatorios

  const Btn = ({ id, label }) => (
    <button
      onClick={() => setPagina(id)}
      className={`rounded-md px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
        pagina === id
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      {/* TOP MENU */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-3">
        <Btn id="dashboard" label="Dashboard" />
        <Btn id="inventario" label="Inventário" />
        <Btn id="cadastro" label="Cadastro" />
        <Btn id="relatorios" label="Relatórios" />

        <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400">
          WMS Ybera Group
        </div>
      </div>

      {/* PÁGINAS */}
      {pagina === "dashboard" && <Dashboard />}
      {pagina === "inventario" && <Inventario />}
      {pagina === "cadastro" && <Cadastro />}
      {pagina === "relatorios" && <Relatorios />}
    </div>
  );
};

export default App;
