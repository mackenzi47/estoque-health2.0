import React from 'react';
import { FileText, Download, Filter } from 'lucide-react';

const Relatorios = () => {
  return (
    <div className="p-8">
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Relatórios de Inventário
          </h2>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-all">
            <Download size={18} /> Exportar Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase">Período</p>
            <select className="w-full mt-1 bg-transparent font-bold outline-none">
              <option>Diário (Hoje)</option>
              <option>Semanal</option>
              <option>Mensal</option>
            </select>
          </div>
          {/* Espaço para mais filtros no futuro */}
        </div>

        <div className="text-center py-20 text-slate-400">
          <Filter size={48} className="mx-auto mb-4 opacity-20" />
          <p>Selecione um período para gerar o relatório de divergências.</p>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;