import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { FileSpreadsheet, Download, Search, Table as TableIcon, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

const Relatorios = () => {
  const [dados, setDados] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca dados em tempo real do Firestore
    const q = query(collection(db, "auditorias"), orderBy("data_auditoria", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setDados(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditorias");
    XLSX.writeFile(workbook, `Relatorio_Estoque_Ybera_${new Date().toLocaleDateString()}.xlsx`);
  };

  const dadosFiltrados = dados.filter(item => 
    item.sku?.toLowerCase().includes(filtro.toLowerCase()) ||
    item.codigo_barras?.includes(filtro) ||
    item.lote_industria?.includes(filtro)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TableIcon className="text-blue-600" /> Relatório de Auditorias
          </h2>
          <p className="text-slate-500">Histórico de coletas - Unidade A2031</p>
        </div>

        <button 
          onClick={exportarExcel}
          className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-md"
        >
          <FileSpreadsheet size={20} /> EXPORTAR EXCEL
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Filtrar por SKU, Lote ou Código..."
            className="bg-transparent border-none focus:outline-none w-full text-slate-600"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-sm uppercase">
                <th className="p-4 font-semibold">Data/Hora</th>
                <th className="p-4 font-semibold">SKU</th>
                <th className="p-4 font-semibold">Lote Indústria</th>
                <th className="p-4 font-semibold">Validade</th>
                <th className="p-4 font-semibold">Condição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400">Carregando dados...</td></tr>
              ) : dadosFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                  <td className="p-4 text-sm text-slate-600">
                    {item.data_auditoria?.toDate().toLocaleString('pt-BR')}
                  </td>
                  <td className="p-4 font-bold text-slate-700">{item.sku}</td>
                  <td className="p-4 text-slate-600">{item.lote_industria}</td>
                  <td className="p-4 text-slate-600">
                    <span className="flex items-center gap-1"><Calendar size={14}/> {item.validade}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.condicao === 'BOM' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.condicao}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;