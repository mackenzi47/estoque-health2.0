import React, { useState, useEffect } from 'react';
import { 
  QrCode, Package, MapPin, CheckCircle2, 
  ChevronRight, ClipboardCheck, AlertCircle, Calendar, Barcode, Tag, Monitor
} from 'lucide-react';

const Inventario = () => {
  const [formData, setFormData] = useState({
    codigoBarras: '',
    local: '',
    sku: '',
    loteSenior: '',
    loteIndustria: '',
    validade: '',
    quantidadeSistemica: '100', // Exemplo vindo do Sênior
    quantidadeFisica: '',
    condicao: 'BOM'
  });

  const [divergencia, setDivergencia] = useState(0);

  // Calcula a divergência em tempo real
  useEffect(() => {
    const total = Number(formData.quantidadeFisica) - Number(formData.quantidadeSistemica);
    setDivergencia(formData.quantidadeFisica === '' ? 0 : total);
  }, [formData.quantidadeFisica, formData.quantidadeSistemica]);

  const handleSalvar = (e) => {
    e.preventDefault();
    alert(`Auditoria concluída! Divergência de ${divergencia} UN registrada.`);
    setFormData({ ...formData, codigoBarras: '', local: '', sku: '', loteSenior: '', loteIndustria: '', validade: '', quantidadeFisica: '', condicao: 'BOM' });
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-baseline mb-1">
            <span className="text-3xl font-[900] tracking-tighter text-slate-800">YBERA</span>
            <span className="text-3xl font-[300] tracking-tight text-slate-600 ml-1">GROUP</span>
            <span className="text-[9px] font-bold relative -top-[10px] ml-0.5 text-slate-400">®</span>
          </div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Coletor de Dados de Auditoria</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULÁRIO PRINCIPAL */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <h3 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ClipboardCheck size={18} className="text-blue-400" /> Registrar Movimentação
              </h3>
            </div>

            <form onSubmit={handleSalvar} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Local e Código de Barras */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Local (Ex: A2031)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-5 top-4 text-slate-400" />
                  <input type="text" placeholder="A2031" className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none" value={formData.local} onChange={(e) => setFormData({...formData, local: e.target.value.toUpperCase()})} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Código de Barras</label>
                <div className="relative">
                  <Barcode size={16} className="absolute left-5 top-4 text-slate-400" />
                  <input type="text" placeholder="EAN" className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.codigoBarras} onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})} />
                </div>
              </div>

              {/* SKU e Lote Sênior */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">SKU</label>
                <div className="relative">
                  <Tag size={16} className="absolute left-5 top-4 text-slate-400" />
                  <input type="text" placeholder="Código Material" className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Lote Sênior</label>
                <div className="relative">
                  <QrCode size={16} className="absolute left-5 top-4 text-slate-400" />
                  <input type="text" placeholder="WMS Lote" className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.loteSenior} onChange={(e) => setFormData({...formData, loteSenior: e.target.value.toUpperCase()})} required />
                </div>
              </div>

              {/* Lote Indústria e Validade */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Lote Indústria</label>
                <div className="relative">
                  <Package size={16} className="absolute left-5 top-4 text-slate-400" />
                  <input type="text" placeholder="Lote Embalagem" className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.loteIndustria} onChange={(e) => setFormData({...formData, loteIndustria: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Validade</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-5 top-4 text-slate-400" />
                  <input type="date" className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.validade} onChange={(e) => setFormData({...formData, validade: e.target.value})} />
                </div>
              </div>

              {/* SEÇÃO DE QUANTIDADES (DIVERGÊNCIA) */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Qtd. Sistêmica</p>
                  <p className="text-xl font-black text-slate-600">{formData.quantidadeSistemica} UN</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Qtd. Física</p>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full bg-transparent border-none p-0 text-xl font-[1000] text-blue-600 outline-none"
                    value={formData.quantidadeFisica}
                    onChange={(e) => setFormData({...formData, quantidadeFisica: e.target.value})}
                  />
                </div>

                <div className={`p-4 rounded-2xl ${divergencia === 0 ? 'bg-emerald-50' : 'bg-red-50 animate-pulse'}`}>
                  <p className={`text-[9px] font-black uppercase mb-1 ${divergencia === 0 ? 'text-emerald-400' : 'text-red-400'}`}>Divergência</p>
                  <p className={`text-xl font-black ${divergencia === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{divergencia} UN</p>
                </div>
              </div>

              {/* Condição */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest block">Condição</label>
                <div className="flex gap-4">
                  {['BOM', 'AVARIADO', 'VENCIDO'].map((s) => (
                    <button key={s} type="button" onClick={() => setFormData({...formData, condicao: s})} className={`flex-1 py-3 rounded-xl text-[10px] font-[1000] transition-all border-2 ${formData.condicao === s ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-[1000] uppercase tracking-[0.2em] text-xs py-5 rounded-[1.8rem] shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3">
                  Confirmar Auditoria <CheckCircle2 size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SIDEBAR (PRODUTIVIDADE E AVISOS) */}
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 flex flex-col justify-between min-h-[220px]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Sua Produtividade</p>
            <div>
              <h3 className="text-5xl font-[1000] mb-1">142</h3>
              <p className="text-xs font-bold opacity-80 italic">Posições conferidas hoje</p>
            </div>
            <div className="pt-4 border-t border-white/20 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Meta: 200</span>
              <span className="text-[10px] font-black uppercase">71%</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest">Avisos do Sistema</h3>
            <div className="space-y-5">
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><AlertCircle size={18}/></div>
                <p className="text-[11px] font-bold text-slate-500 leading-tight"> Certifique-se de <span className="text-slate-900">verificar a VALIDADE.</span>.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Package size={18}/></div>
                <p className="text-[11px] font-bold text-slate-500 leading-tight">Certifique-se de <span className="text-slate-900 font-black">Verificar </span> a QUANTIDADE.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventario;