/* ui.js — rendering, toasts, theme */
(function (global) {
  'use strict';

  function $(sel) { return document.querySelector(sel); }
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function toast(msg, type = 'info', ms = 3200) {
    const container = $('#toast-container');
    const t = el('div', { class: `toast ${type}` }, msg);
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; setTimeout(() => t.remove(), 220); }, ms);
  }

  function renderTable(headers, rows, options = {}) {
    const table = $('#preview-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (!rows.length) {
      $('#empty-state').hidden = false;
      return;
    }
    $('#empty-state').hidden = true;

    const headRow = el('tr');
    headers.forEach(h => headRow.appendChild(el('th', {}, h)));
    thead.appendChild(headRow);

    const changes = options.changes || [];
    const errors = options.errors || [];
    const search = (options.search || '').toLowerCase().trim();

    rows.forEach((row, i) => {
      const rowChanges = changes[i]?.changes || {};
      const rowError = errors[i];
      const rowText = headers.map(h => String(row[h] ?? '')).join(' ').toLowerCase();
      if (search && !rowText.includes(search)) return;

      const tr = el('tr');
      if (rowError) tr.classList.add('row-error');
      headers.forEach(h => {
        const changed = Object.prototype.hasOwnProperty.call(rowChanges, h);
        const val = changed ? rowChanges[h] : row[h];
        const td = el('td', changed ? { class: 'changed', title: 'Modified by rules' } : {}, formatCell(val));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function formatCell(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.toLocaleDateString();
    return String(v);
  }

  function setValidation(status) {
    const box = $('#validation-status');
    if (!status) { box.hidden = true; return; }
    box.hidden = false;
    box.className = 'validation-status ' + (status.ok ? 'ok' : 'err');
    box.textContent = status.message;
  }

  function setProgress(pct) {
    const wrap = $('#progress');
    const bar = $('#progress-bar');
    if (pct == null) { wrap.hidden = true; bar.style.width = '0%'; return; }
    wrap.hidden = false;
    bar.style.width = Math.round(pct * 100) + '%';
  }

  function updateBadge(count) {
    $('#row-count-badge').textContent = `${count} row${count === 1 ? '' : 's'}`;
  }

  function updateSummary(s) {
    const card = $('#summary-card');
    card.hidden = false;
    $('#stat-imported').textContent = s.imported;
    $('#stat-processed').textContent = s.processed;
    $('#stat-skipped').textContent = s.skipped;
    $('#stat-errors').textContent = s.errors;
    $('#stat-duration').textContent = `${s.duration} ms`;
  }

  function initTheme() {
    const saved = localStorage.getItem('sad-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', saved);
    $('#theme-toggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sad-theme', next);
    });
  }

  global.UI = { $, el, toast, renderTable, setValidation, setProgress, updateBadge, updateSummary, initTheme };
})(window);
