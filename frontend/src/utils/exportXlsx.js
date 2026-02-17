import * as XLSX from "xlsx";

function isoToBR(iso) {
  if (!iso) return "";
  const [yy, mm, dd] = String(iso).split("-");
  if (!yy || !mm || !dd) return iso;
  return `${dd}/${mm}/${yy}`;
}

function toNumberOrBlank(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function autoFitColumns(rows, headers) {
  // largura aproximada por tamanho do texto
  const cols = headers.map((h) => ({ wch: Math.max(10, String(h).length + 2) }));

  for (const r of rows) {
    headers.forEach((h, idx) => {
      const val = r[h];
      const len = val === null || val === undefined ? 0 : String(val).length;
      cols[idx].wch = Math.min(60, Math.max(cols[idx].wch, len + 2));
    });
  }
  return cols;
}

export function exportXLSX({
  filename = "relatorio.xlsx",
  sheetName = "Relatorio",
  columns, // [{ key, header, type?: "text"|"number"|"dateBR" }]
  rows,    // array de objetos
  freezeHeader = true,
  enableFilter = true,
}) {
  // 1) Monta linhas já “tipadas”
  const headers = columns.map((c) => c.header);

  const data = rows.map((r) => {
    const out = {};
    for (const c of columns) {
      let v = r[c.key];

      if (c.type === "number") v = toNumberOrBlank(v);
      if (c.type === "dateBR") v = isoToBR(v);

      // garante vazio ao invés de null/undefined
      out[c.header] = v === null || v === undefined ? "" : v;
    }
    return out;
  });

  // 2) Cria worksheet a partir de JSON
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });

  // 3) Congela cabeçalho (linha 1)
  if (freezeHeader) {
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    // (fallback pro Excel: pane)
    ws["!pane"] = { topLeftCell: "A2", ySplit: 1, activePane: "bottomLeft", state: "frozen" };
  }

  // 4) Filtro automático no cabeçalho
  if (enableFilter) {
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }),
    };
  }

  // 5) Auto width
  ws["!cols"] = autoFitColumns(data, headers);

  // 6) Workbook + download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, filename);
}
