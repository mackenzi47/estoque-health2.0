import { useEffect, useState } from "react";
import "./dashboard.css";

function Card({ title, value, subtitle }) {
  return (
    <div className="card">
      <div className="cardTitle">{title}</div>
      <div className="cardValue">{value}</div>
      {subtitle ? <div className="cardSub">{subtitle}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const [kpis] = useState({
    posicoesAtivas: 4078,
    contadas: 3210,
    pendentes: 868,
    avancopct: "78,7%",
    acuracia: "99,96%",
    divergencias: 22,
  });

  // Depois vamos buscar do backend com api.get(...)
  useEffect(() => {}, []);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbarTitle">Dashboard de Inventário - Saúde do Estoque</div>
        <button className="btn">Sair</button>
      </header>

      <div className="filters">
        <select><option>Data Base: Hoje</option></select>
        <select><option>Inventário: Geral</option></select>
        <select><option>Setor: Todos</option></select>
        <select><option>Usuário: Todos</option></select>
        <select><option>Status: Todos</option></select>
        <select><option>Condição: BOM / Danificado</option></select>
      </div>

      <div className="kpis">
        <Card title="Posições Ativas com Estoque" value={kpis.posicoesAtivas} />
        <Card title="Posições Contadas" value={kpis.contadas} />
        <Card title="Posições Pendentes" value={kpis.pendentes} />
        <Card title="% de Avanço" value={kpis.avancopct} />
        <Card title="Acuracidade" value={kpis.acuracia} />
        <Card title="Divergências" value={kpis.divergencias} />
      </div>

      <div className="grid">
        <div className="panel big">Gráfico: Avanço Diário (vamos colocar depois)</div>
        <div className="panel">Divergências (depois)</div>
        <div className="panel">Acuracidade (depois)</div>
        <div className="panel big">Tabela: Posições Pendentes (depois)</div>
      </div>
    </div>
  );
}
