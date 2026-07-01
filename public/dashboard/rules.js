/* rules.js — extensible rule engine */
(function (global) {
  'use strict';

  const { parseDate, formatDate } = global.Validator;

  // Rule operations registry — add new operation types here without touching engine code.
  const operations = {
    addDays({ row, rule }) {
      const src = row[rule.source];
      const d = parseDate(src);
      if (!d) throw new Error(`Invalid date in "${rule.source}"`);
      return formatDate(d.add(Number(rule.days) || 0, 'day'));
    },
    subtractDays({ row, rule }) {
      const d = parseDate(row[rule.source]);
      if (!d) throw new Error(`Invalid date in "${rule.source}"`);
      return formatDate(d.subtract(Number(rule.days) || 0, 'day'));
    },
    constant({ rule }) {
      return rule.value;
    },
    copy({ row, rule }) {
      return row[rule.source];
    },
    concat({ row, rule }) {
      return (rule.sources || []).map(s => row[s] ?? '').join(rule.separator ?? ' ');
    },
    conditional({ row, rule }) {
      const v = row[rule.source];
      const match = (rule.cases || []).find(c => String(v) === String(c.equals));
      return match ? match.value : rule.default ?? '';
    }
  };

  function registerOperation(name, fn) { operations[name] = fn; }

  function applyRules(rows, config, onProgress) {
    const rules = config.rules || [];
    const total = rows.length;
    const results = rows.map(() => ({ changes: {}, error: null }));
    const log = [];

    rows.forEach((row, idx) => {
      const rowResult = results[idx];
      for (const rule of rules) {
        const op = operations[rule.operation];
        if (!op) {
          rowResult.error = `Unknown operation "${rule.operation}"`;
          log.push({ row: idx + 1, level: 'error', message: rowResult.error });
          break;
        }
        try {
          const value = op({ row: { ...row, ...rowResult.changes }, rule });
          rowResult.changes[rule.column] = value;
        } catch (e) {
          rowResult.error = e.message;
          log.push({ row: idx + 1, level: 'error', message: e.message });
          break;
        }
      }
      if (onProgress) onProgress((idx + 1) / total);
    });

    const processed = results.filter(r => !r.error).length;
    const skipped = results.filter(r => r.error).length;
    return { results, log, processed, skipped };
  }

  global.RuleEngine = { applyRules, registerOperation };
})(window);
