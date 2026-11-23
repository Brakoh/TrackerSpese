const assert = require("assert")
const d = require("./domain.js")

const today = "2026-11-23"

const once = { id: "o", kind: "once", name: "Pranzo", amount: 1850, date: "2026-11-02" }
const later = { id: "l", kind: "once", name: "Treno", amount: 2400, date: "2026-11-28" }
const sub = {
  id: "s",
  kind: "sub",
  name: "Netflix",
  amount: 1599,
  renewDay: 31,
  startedMonth: "2026-01",
  deactivatedOn: null,
}
const stopped = { ...sub, id: "x", disdettaMonth: "2026-11", name: "Palestra" }
const plan = {
  id: "p",
  kind: "plan",
  name: "Telefono",
  total: 100000,
  months: 3,
  startDate: "2026-10-31",
}

assert.deepStrictEqual(d.shares(100000, 3), [33333, 33333, 33334])
assert.strictEqual(d.clampDay(2026, 1, 31), 28)
assert.strictEqual(d.clampDay(2024, 1, 31), 29)
assert.strictEqual(d.parseAmount("1.234,50"), 123450)
assert.strictEqual(d.parseAmount("15,9"), 1590)
assert.strictEqual(d.parseAmount("0"), null)

const november = d.linesForMonth([once, later, sub, stopped, plan], "2026-11", today)
assert.strictEqual(november.length, 5)
assert.ok(november.find((line) => line.id === "l" && line.upcoming))
assert.ok(november.find((line) => line.id === "s" && line.date === "2026-11-30"))
assert.ok(november.find((line) => line.id === "x"))
const phone = november.find((line) => line.id === "p")
assert.strictEqual(phone.amount, 33333)
assert.strictEqual(phone.index, 1)

const october = d.linesForMonth([plan, sub], "2026-10", today)
assert.strictEqual(october.find((line) => line.id === "p").amount, 33333)
assert.strictEqual(october.find((line) => line.id === "s").date, "2026-10-31")

const december = d.linesForMonth([plan], "2026-12", today)
assert.strictEqual(december[0].amount, 33334)
assert.strictEqual(d.planEnd(plan), "2026-12-31")
assert.strictEqual(d.linesForMonth([plan], "2027-01", today).length, 0)
assert.strictEqual(d.linesForMonth([sub], "2025-12", today).length, 0)

assert.strictEqual(d.linesForMonth([stopped], "2026-12", today).length, 0)
assert.strictEqual(d.linesForMonth([stopped], "2026-10", today).length, 1)
assert.deepStrictEqual(d.activeSubs([stopped, sub], today).map((entry) => entry.name), ["Netflix", "Palestra"])
assert.strictEqual(d.activeSubs([{ ...stopped, disdettaMonth: "2026-10" }], today).length, 0)

assert.deepStrictEqual(d.pastMonths(2026, today), [
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  "2026-07", "2026-08", "2026-09", "2026-10",
])

const pdf = d.buildMonthPdf("Spese novembre 2026", ["02 novembre  Pranzo  EUR 18,50"], "Totale EUR 18,50")
const text = new TextDecoder().decode(pdf)
assert.ok(text.startsWith("%PDF-1.4"))
assert.ok(text.includes("Spese novembre 2026"))
assert.ok(text.includes("%%EOF"))

console.log("domain ok")
