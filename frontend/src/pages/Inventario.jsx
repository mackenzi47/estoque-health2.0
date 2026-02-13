import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Barcode, MapPin, Tag, QrCode, Package, Calendar, CheckCircle2, Save } from 'lucide-react';

const Inventario = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    barras: '',
    local: 'A2031', // Local padrão solicitado
    sku: '',
    loteSenior: '',
    loteIndustria: '',
    validade: '',
    quantidadeSistemica: 100,
    quantidadeFisica: '',
    condicao: 'BOM'
  });

  const handleSalvar = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const divergencia = Number(formData.quantidadeFisica) - Number(formData.quantidadeSistemica);
      
      await addDoc(collection(db, "auditorias"), {
        ...formData,
        quantidadeFisica: Number(formData.quantidadeFisica),
        divergencia: divergencia,
        dataCriacao: serverTimestamp()
      });

      alert("Auditoria salva no Firebase!");
      setFormData({ ...formData, barras: '', sku: '', loteSenior: '', loteIndustria: '', validade: '', quantidadeFisica: '' });
    } catch (e) {
      console.error("Erro ao salvar: ", e);
      alert("Erro ao conectar com Firebase.");
    } finally {
      setLoading(false);
    }
  };

  // ... (Resto do seu código de interface/JSX permanece o mesmo)