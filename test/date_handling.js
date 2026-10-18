// Date-only spreadsheet values used to sort lexicographically, putting 10/1
// before 9/30. This covers ISO and legacy US dates without a browser runner.
const assert = require("assert");
const path = require("path");

global.window = {};
require(path.join(__dirname, "..", "js", "distill.js"));
const D = global.window.DISTILL;

assert.strictEqual(D.dateKey("2026-10-18"), D.dateKey("10/18/2026"));
assert.strictEqual(D.todayISO(new Date(2026, 9, 18)), "2026-10-18");

const readings = D.sortedReadings([
  { reading_date: "10/1/2026", reading_time: "09:00", gravity: "1.020" },
  { reading_date: "9/30/2026", reading_time: "18:00", gravity: "1.030" },
  { reading_date: "2026-10-02", reading_time: "08:00", gravity: "1.010" },
]);
assert.deepStrictEqual(readings.map(r => r.g), [1.03, 1.02, 1.01]);

console.log("PASS: ISO and legacy US dates sort chronologically.");
