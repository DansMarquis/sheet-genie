/* app.js — orchestration */
(function () {
  'use strict';

  dayjs.extend(dayjs_plugin_customParseFormat);

  const { $, toast, renderTable, setValidation, setProgress, updateBadge, updateSummary, initTheme } = window.UI;
  const { validateHeaders, canonicalizeHeaders } = window.Validator;
  const { applyRules } = window.RuleEngine;
  const { readFile, parsePasted, download } = window.ExcelIO;

  const state = {
    headers: [],
    rows: [],
    originalRows: null,
    config: null,
    processed: null,   // { results, log, processed, skipped }
    search: ''
  };

  const RULES_KEY = 'sad-rules-json';

  // ---------- Init ----------
  initTheme();
  loadRules();

  // ---------- File upload ----------
  const dz = $('#dropzone');
  const fileInput = $('#file-input');
  $('#browse-btn').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragging'); }));
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast('Please upload a .xlsx file', 'error'); return;
    }
    try {
      const { headers, rows } = await readFile(file);
      loadData(headers, rows, `Loaded ${rows.length} rows from ${file.name}`);
    } catch (e) {
      console.error(e);
      toast('Failed to read file: ' + e.message, 'error');
    }
  }

  // ---------- Paste ----------
  $('#parse-paste-btn').addEventListener('click', () => {
    const text = $('#paste-input').value;
    if (!text.trim()) { toast('Nothing to parse', 'error'); return; }
    const { headers, rows } = parsePasted(text);
    if (!rows.length) { toast('Could not parse pasted data', 'error'); return; }
    loadData(headers, rows, `Parsed ${rows.length} rows from clipboard`);
  });
  // Global paste catch
  document.addEventListener('paste', (e) => {
    if (document.activeElement && ['TEXTAREA','INPUT'].includes(document.activeElement.tagName)) return;
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (text && text.includes('\t')) {
      const { headers, rows } = parsePasted(text);
      if (rows.length) loadData(headers, rows, `Pasted ${rows.length} rows`);
    }
  });

  function loadData(headers, rows, msg) {
    // Canonicalize headers so pasted data with different casing/spacing still
    // matches the required columns and the rule engine's source/target names.
    const known = collectKnownColumns(state.config);
    const { canonicalHeaders, mapping } = canonicalizeHeaders(headers, known);
    const normalizedRows = rows.map(r => {
      const out = {};
      headers.forEach(h => { out[mapping[h]] = r[h]; });
      return out;
    });

    state.headers = canonicalHeaders;
    state.rows = normalizedRows;
    state.originalRows = null;
    state.processed = null;
    updateBadge(normalizedRows.length);
    const v = validateHeaders(canonicalHeaders, state.config?.requiredColumns || []);
    if (v.ok) {
      setValidation({ ok: true, message: `All required columns present (${state.config.requiredColumns.length}).` });
      $('#process-btn').disabled = false;
    } else {
      setValidation({ ok: false, message: `Missing required column${v.missing.length>1?'s':''}: ${v.missing.join(', ')}` });
      $('#process-btn').disabled = true;
    }
    $('#summary-card').hidden = true;
    renderTable(mergeHeaders(canonicalHeaders), normalizedRows);
    toast(msg, 'success');
  }

  function collectKnownColumns(config) {
    const cols = new Set();
    if (!config) return [];
    (config.requiredColumns || []).forEach(c => cols.add(c));
    (config.rules || []).forEach(r => {
      if (r.column) cols.add(r.column);
      if (r.source) cols.add(r.source);
      if (Array.isArray(r.sources)) r.sources.forEach(s => cols.add(s));
    });
    return [...cols];
  }

  function mergeHeaders(headers) {
    // Ensure rule target columns show in preview
    const ruleCols = (state.config?.rules || []).map(r => r.column);
    const merged = [...headers];
    ruleCols.forEach(c => { if (!merged.includes(c)) merged.push(c); });
    return merged;
  }

  // ---------- Rules editor ----------
  const rulesEditor = $('#rules-editor');
  const rulesError = $('#rules-error');

  async function loadRules() {
    const cached = localStorage.getItem(RULES_KEY);
    if (cached) {
      rulesEditor.value = cached;
      applyEditorConfig();
      return;
    }
    try {
      const res = await fetch('./config/rules.json');
      const json = await res.json();
      rulesEditor.value = JSON.stringify(json, null, 2);
      applyEditorConfig();
    } catch (e) {
      // Fallback default
      rulesEditor.value = JSON.stringify({
        requiredColumns: ['Production Statement','PO','Request Date','Requester','Description','Price','Transfection'],
        rules: [
          { column: 'Purification', operation: 'addDays', source: 'Transfection', days: 9 },
          { column: 'QC', operation: 'addDays', source: 'Purification', days: 1 },
          { column: 'Delivery', operation: 'addDays', source: 'QC', days: 1 },
          { column: 'Status', operation: 'constant', value: 'Completed' }
        ]
      }, null, 2);
      applyEditorConfig();
    }
  }

  function applyEditorConfig() {
    try {
      state.config = JSON.parse(rulesEditor.value);
      rulesError.hidden = true;
      return true;
    } catch (e) {
      rulesError.textContent = 'Invalid JSON: ' + e.message;
      rulesError.hidden = false;
      return false;
    }
  }

  rulesEditor.addEventListener('input', () => { applyEditorConfig(); });
  $('#save-rules-btn').addEventListener('click', () => {
    if (!applyEditorConfig()) return;
    localStorage.setItem(RULES_KEY, rulesEditor.value);
    toast('Rules saved locally', 'success');
    if (state.rows.length) loadData(state.headers, state.rows, 'Re-validated with updated rules');
  });
  $('#reset-rules-btn').addEventListener('click', async () => {
    localStorage.removeItem(RULES_KEY);
    await loadRules();
    toast('Rules reset to default', 'info');
  });

  // ---------- Process ----------
  $('#process-btn').addEventListener('click', () => {
    if (!applyEditorConfig()) { toast('Fix JSON errors first', 'error'); return; }
    if (!state.rows.length) return;

    const t0 = performance.now();
    setProgress(0);
    const { results, log, processed, skipped } = applyRules(state.rows, state.config, (p) => setProgress(p));
    const duration = Math.round(performance.now() - t0);
    setTimeout(() => setProgress(null), 400);

    state.originalRows = state.rows.map(r => ({ ...r }));
    // Merge changes into rows
    state.rows = state.rows.map((r, i) => ({ ...r, ...(results[i].changes || {}) }));
    const errorsByRow = results.map(r => r.error);
    state.processed = { results, log, processed, skipped, duration, errors: errorsByRow.filter(Boolean).length };

    renderTable(mergeHeaders(state.headers), state.rows, { changes: results, errors: errorsByRow, search: state.search });
    updateSummary({
      imported: state.rows.length,
      processed, skipped,
      errors: state.processed.errors,
      duration
    });
    toast(`Processed ${processed} rows in ${duration}ms`, 'success');
  });

  // ---------- Search ----------
  $('#table-search').addEventListener('input', (e) => {
    state.search = e.target.value;
    const opts = { search: state.search };
    if (state.processed) { opts.changes = state.processed.results; opts.errors = state.processed.results.map(r => r.error); }
    renderTable(mergeHeaders(state.headers), state.rows, opts);
  });

  // ---------- Download / Undo / Log ----------
  $('#download-btn').addEventListener('click', () => {
    if (!state.rows.length) { toast('No data to download', 'error'); return; }
    download(mergeHeaders(state.headers), state.rows, 'updated.xlsx');
    toast('Download started', 'success');
  });

  $('#undo-btn').addEventListener('click', () => {
    if (!state.originalRows) { toast('Nothing to undo', 'info'); return; }
    state.rows = state.originalRows;
    state.originalRows = null;
    state.processed = null;
    renderTable(mergeHeaders(state.headers), state.rows);
    $('#summary-card').hidden = true;
    toast('Reverted to original data', 'info');
  });

  $('#export-log-btn').addEventListener('click', () => {
    if (!state.processed) { toast('Process the spreadsheet first', 'info'); return; }
    const log = state.processed.log;
    const text = ['Row\tLevel\tMessage', ...log.map(l => `${l.row}\t${l.level}\t${l.message}`)].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'processing-log.txt'; a.click();
    URL.revokeObjectURL(url);
  });
})();
