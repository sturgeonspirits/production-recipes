// Shared test helper (v1.23.0): loads apps-script/Code.gs into a Node vm
// against a small in-memory stand-in for SpreadsheetApp, so tests can call the
// real doGet/doPost. Session checks are bypassed.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeBackend() {
  // ---------- a tiny fake of the Sheets service ----------
  function makeSheet(name) {
    const data = []; // array of row arrays
    const sheet = {
      _data: data,
      _formats: {},
      getName: () => name,
      getSheetId: () => name,
      getMaxRows: () => Math.max(1000, data.length),
      getLastRow: () => data.length,
      appendRow: row => { data.push(row.slice()); },
      deleteRow: i => { data.splice(i - 1, 1); },
      deleteRows: (start, n) => { data.splice(start - 1, n); },
      getDataRange: () => ({
        getValues: () => {
          if (!data.length) return [[]];
          const w = Math.max.apply(null, data.map(r => r.length));
          return data.map(r => { const c = r.slice(); while (c.length < w) c.push(''); return c; });
        }
      }),
      getRange: (row, col, numRows, numCols) => ({
        setValues: vals => {
          vals.forEach((v, i) => {
            const r = row - 1 + i;
            while (data.length <= r) data.push([]);
            v.forEach((cell, j) => { data[r][col - 1 + j] = cell; });
          });
        },
        setValue: v => { while (data.length < row) data.push([]); data[row - 1][col - 1] = v; },
        setNumberFormat: f => { sheet._formats[col] = f; }
      })
    };
    return sheet;
  }

  const sheets = {};
  ['Recipes', 'Ingredients', 'changelog'].forEach(n => { sheets[n] = makeSheet(n); });
  sheets.changelog.appendRow(['timestamp', 'recipe_id', 'field', 'old_value', 'new_value', 'source']);
  const ss = {
    getSheetByName: n => sheets[n] || null,
    getSheets: () => Object.values(sheets),
    insertSheet: n => (sheets[n] = makeSheet(n))
  };

  const context = {
    console,
    SpreadsheetApp: { openById: () => ss },
    Utilities: {
      formatDate: d => d.toISOString().slice(0, 10),
      computeDigest: () => [], DigestAlgorithm: {}, Charset: {}
    },
    Session: { getScriptTimeZone: () => 'America/Chicago' },
    ContentService: {
      createTextOutput: s => ({ _s: s, setMimeType() { return this; } }),
      MimeType: { JSON: 'json' }
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {}, deleteProperty() {} }) }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), context);
  // Skip the session check — auth is covered elsewhere.
  vm.runInContext('authOK_ = function () { return true; };', context);

  const get = params => JSON.parse(context.doGet({ parameter: params })._s);
  const post = body => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } })._s);
  return { sheets, get, post, context };
}

module.exports = { makeBackend };
