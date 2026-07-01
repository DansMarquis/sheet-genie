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

  function validateHeaders(headers, requiredColumns) {
    const missing = requiredColumns.filter(c => !headers.includes(c));
    return { ok: missing.length === 0, missing };
  }

  global.Validator = { parseDate, formatDate, validateHeaders };
})(window);
