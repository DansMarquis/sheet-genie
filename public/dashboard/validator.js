/* validator.js — data & rule validation */
(function (global) {
  'use strict';

  const DATE_FORMATS = ['YYYY/MM/DD', 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'MM/DD/YYYY', 'D/M/YYYY'];

  function parseDate(value) {
    if (value == null || value === '') return null;
    if (value instanceof Date && !isNaN(value)) return dayjs(value);
    if (typeof value === 'number') {
      // Excel serial date
      const epoch = new Date(Math.round((value - 25569) * 86400 * 1000));
      const d = dayjs(epoch);
      return d.isValid() ? d : null;
    }
    const str = String(value).trim();
    for (const fmt of DATE_FORMATS) {
      const d = dayjs(str, fmt, true);
      if (d.isValid()) return d;
    }
    const loose = dayjs(str);
    return loose.isValid() ? loose : null;
  }

  function formatDate(d) {
    return d ? d.format('DD/MM/YYYY') : '';
  }

  // Normalize a header for case/whitespace-insensitive comparison.
  function normalizeHeader(h) {
    return String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function validateHeaders(headers, requiredColumns) {
    const present = new Set((headers || []).map(normalizeHeader));
    const missing = (requiredColumns || []).filter(c => !present.has(normalizeHeader(c)));
    return { ok: missing.length === 0, missing };
  }

  // Given the parsed headers and a list of known canonical column names,
  // return the headers rewritten to their canonical form (when a match exists)
  // plus a mapping of originalHeader -> canonicalHeader for remapping row keys.
  function canonicalizeHeaders(headers, knownColumns) {
    const lookup = new Map();
    (knownColumns || []).forEach(c => {
      const key = normalizeHeader(c);
      if (key && !lookup.has(key)) lookup.set(key, c);
    });
    const mapping = {};
    const canonicalHeaders = (headers || []).map(h => {
      const canon = lookup.get(normalizeHeader(h));
      const finalName = canon != null ? canon : h;
      mapping[h] = finalName;
      return finalName;
    });
    return { canonicalHeaders, mapping };
  }

  global.Validator = { parseDate, formatDate, validateHeaders, canonicalizeHeaders, normalizeHeader };
})(window);
