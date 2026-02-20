// src/App.jsx
import React, { useState } from "react";

import Dashboard  from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Produtos   from "./pages/Produtos";
import Relatorios from "./pages/Relatorios";

const PAGES = [
  { id: "dashboard",  label: "Dashboard"  },
  { id: "inventario", label: "Inventário" },
  { id: "produtos",   label: "Produtos"   },
  { id: "relatorios", label: "Relatórios" },
];

const App = () => {
  const [pagina, setPagina] = useState("dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#07070a" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#07070a}
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexWrap: "wrap",
      }}>
        {PAGES.map(({ id, label }) => {
          const active = pagina === id;
          return (
            <button
              key={id}
              onClick={() => setPagina(id)}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: active ? "1px solid rgba(255,58,168,0.40)" : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "linear-gradient(135deg,rgba(255,58,168,0.20),rgba(74,163,255,0.15))"
                  : "rgba(255,255,255,0.04)",
                color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.50)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              {label}
            </button>
          );
        })}

        {/* ── LOGO ── texto estilizado */}
        <div style={{ marginLeft: "auto", lineHeight: 1 }}>
          <span style={{
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: 3,
            textTransform: "uppercase",
            background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.60) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            YBERA GROUP
          </span>
          <sup style={{
            fontSize: 8,
            color: "rgba(255,255,255,0.45)",
            WebkitTextFillColor: "rgba(255,255,255,0.45)",
            marginLeft: 1,
          }}>®</sup>
        </div>
      </nav>

      {/* ── PÁGINAS ─────────────────────────────────────────────────────── */}
      {pagina === "dashboard"  && <Dashboard />}
      {pagina === "inventario" && <Inventario />}
      {pagina === "produtos"   && <Produtos />}
      {pagina === "relatorios" && <Relatorios />}
    </div>
  );
};

export default App;