import "./dashboard.css";
import logo from "../assets/ybera-logo.png";

export default function Dashboard() {
  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <img src={logo} alt="Ybera Group" />
          <div className="title">
            <strong>Dashboard de Inventário</strong>
            <span>Saúde do Estoque</span>
          </div>
        </div>

        <div className="pill">● Online</div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="kpiLabel">Posições Ativas com Estoque</div>
          <div className="kpiValue">4.078</div>
          <div className="badgeRow">
            <span className="badge">Base do inventário</span>
            <span className="badge">Saldo &gt; 0</span>
          </div>
        </div>

        <div className="card">
          <div className="kpiLabel">Posições Contadas</div>
          <div className="kpiValue">3.210</div>
          <div className="badgeRow">
            <span className="badge">% Avanço: 78,7%</span>
          </div>
        </div>

        <div className="card">
          <div className="kpiLabel">Divergências</div>
          <div className="kpiValue">22</div>
          <div className="badgeRow">
            <span className="badge">Atenção</span>
          </div>
        </div>
      </div>
    </div>
  );
}
