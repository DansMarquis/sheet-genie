/* excel.js — read/write Excel and paste parsing */
(function (global) {
  'use strict';

  async function readFile(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
    const headers = json.length ? Object.keys(json[0]) : [];
    return { headers, rows: json, sheetName };
  }

  function parsePasted(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(l => l.length > 0);
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split('\t').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cells = line.split('\t');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
      return obj;
    });
    return { headers, rows };
  }

  function buildWorkbook(headers, rows) {
    const aoa = [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return wb;
  }

  function download(headers, rows, filename = 'updated.xlsx') {
    const wb = buildWorkbook(headers, rows);
    XLSX.writeFile(wb, filename);
  }

  global.ExcelIO = { readFile, parsePasted, download };
})(window);
