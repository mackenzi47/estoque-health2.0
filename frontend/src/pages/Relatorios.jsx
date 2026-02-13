import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Relatorios = () => {
  const [dados, setDados] = useState([]);

  useEffect(() => {
    const carregarAuditorias = async () => {
      const { data, error } = await supabase
        .from('auditorias') // Nome da tabela que criamos
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setDados(data);
    };
    carregarAuditorias();
  }, []);

  return (
    <div className="p-10">
      <h2 className="text-xl font-black uppercase mb-6">Relatório de Auditorias</h2>
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white text-[10px] uppercase">
            <tr>
              <th className="p-4">SKU</th>
              <th className="p-4">Físico</th>
              <th className="p-4">Divergência</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 text-xs font-bold">
                <td className="p-4">{item.sku}</td>
                <td className="p-4">{item.quantidade_fisica}</td>
                <td className={`p-4 ${item.divergencia < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {item.divergencia}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Relatorios;