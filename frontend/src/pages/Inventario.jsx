import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Barcode, MapPin, Tag, QrCode, Package, Calendar, CheckCircle2, Save, AlertTriangle } from 'lucide-react';

const Inventario = () => {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  
  const [formData, setFormData] = useState({
    codigo_barras: '',
    local: 'A2031',
    sku: '',
    lote_senior: '',
    lote_industria: '',
    validade: '',
    condicao: 'BOM'
  });

  const handleSalvar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      await addDoc(collection(db, "auditorias"), {
        ...formData,
        data_auditoria: serverTimestamp()
      });

      setMensagem({ tipo: 'sucesso', texto: 'Auditoria salva com sucesso!' });
      
      setFormData({
        ...formData,
        codigo_barras: '',
        sku: '',
        lote_senior: '',
        lote_industria: '',
        validade: '',
        condicao: 'BOM'
      });
    } catch (error) {
      console.error("Erro:", error);
      setMensagem({ tipo: 'erro', texto: 'Erro ao conectar com o Firebase. Verifique as regras de banco de dados.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Avisos Mantidos */}
      <div className="mb-6 space-y-3">
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 mt-1" size={20} />
          <div>
            <h4 className="text-amber-800 font-bold">Aviso de Segurança</h4>
            <p className="text-amber-700 text-sm">Certifique-se de estar usando EPIs completos e mantenha a distância de segurança das empilhadeiras no corredor.</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 flex items-start gap-3">
          <CheckCircle2 className="text-blue-500 mt-1" size={20} />
          <div>
            <h4 className="text-blue-800 font-bold">Instrução de Coleta</h4>
            <p className="text-blue-700 text-sm">Sempre bipe o código de barras da etiqueta Sênior primeiro para validar o SKU automaticamente.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={24} />
            <h2 className="text-xl font-bold">Aba de Produtividade - Ybera Group</h2>
          </div>
        </div>

        <form onSubmit={handleSalvar} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Barcode size={18} className="text-blue-600" /> Código de Barras
              </label>
              <input required className="w-full p-3 border border-slate-300 rounded-lg" value={formData.codigo_barras} onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" /> Local
              </label>
              <input disabled className="w-full p-3 border border-slate-200 rounded-lg bg-slate-100" value={formData.local} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Tag size={18} className="text-blue-600" /> SKU
              </label>
              <input required className="w-full p-3 border border-slate-300 rounded-lg" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <QrCode size={18} className="text-blue-600" /> Lote Sênior
              </label>
              <input required className="w-full p-3 border border-slate-300 rounded-lg" value={formData.lote_senior} onChange={(e) => setFormData({...formData, lote_senior: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <QrCode size={18} className="text-blue-600" /> Lote Indústria
              </label>
              <input required className="w-full p-3 border border-slate-300 rounded-lg" value={formData.lote_industria} onChange={(e) => setFormData({...formData, lote_industria: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" /> Validade
              </label>
              <input type="date" required className="w-full p-3 border border-slate-300 rounded-lg" value={formData.validade} onChange={(e) => setFormData({...formData, validade: e.target.value})} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Condição do Produto</label>
              <select className="w-full p-3 border border-slate-300 rounded-lg" value={formData.condicao} onChange={(e) => setFormData({...formData, condicao: e.target.value})}>
                <option value="BOM">BOM ESTADO</option>
                <option value="AVARIADO">AVARIADO</option>
                <option value="VENCIDO">VENCIDO</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="mt-8 w-full p-4 bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2">
            {loading ? 'Salvando...' : <><Save size={24} /> CONFIRMAR AUDITORIA</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Inventario;