(function (root, factory) {
  const api = factory()
  if (typeof module === "object" && module.exports) module.exports = api
  else root.SpeseDomain = api
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MONTHS = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
  ]

  function pad(n) {
    return String(n).padStart(2, "0")
  }

  function iso(y, m, d) {
    return y + "-" + pad(m + 1) + "-" + pad(d)
  }

  function parseISO(value) {
    const [y, m, d] = value.split("-").map(Number)
    return { y, m: m - 1, d }
  }

  function parseYM(value) {
    const [y, m] = value.split("-").map(Number)
    return { y, m: m - 1 }
  }

  function ymOf(y, m) {
    return y + "-" + pad(m + 1)
  }

  function todayISO(now) {
    const date = now || new Date()
    return iso(date.getFullYear(), date.getMonth(), date.getDate())
  }

  function currentYM(now) {
    const date = now || new Date()
    return ymOf(date.getFullYear(), date.getMonth())
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate()
  }

  function clampDay(y, m, day) {
    return Math.min(day, daysInMonth(y, m))
  }

  function monthIndex(value) {
    const { y, m } = parseYM(value)
    return y * 12 + m
  }

  function monthDiff(fromYM, toYM) {
    return monthIndex(toYM) - monthIndex(fromYM)
  }

  function addMonths(value, count) {
    const index = monthIndex(value) + count
    const y = Math.floor(index / 12)
    const m = index % 12
    return ymOf(y, m)
  }

  function capital(word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
  }

  function monthName(value) {
    return capital(MONTHS[parseYM(value).m])
  }

  function monthTitle(value) {
    const { y } = parseYM(value)
    return monthName(value) + " " + y
  }

  function dayLabel(value) {
    const { d, m } = parseISO(value)
    return d + " " + MONTHS[m]
  }

  function formatEUR(cents) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100)
  }

  function parseAmount(raw) {
    const cleaned = String(raw == null ? "" : raw).trim().replace(/\s/g, "").replace(/€/g, "")
    if (!cleaned) return null
    let normalized = cleaned
    if (cleaned.includes(",") && cleaned.includes(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".")
    } else if (cleaned.includes(",")) {
      normalized = cleaned.replace(",", ".")
    }
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
    const [whole, frac = ""] = normalized.split(".")
    const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2))
    if (!Number.isInteger(cents) || cents <= 0 || cents > 999999999) return null
    return cents
  }

  function shares(total, count) {
    const base = Math.floor(total / count)
    const parts = Array(count).fill(base)
    parts[count - 1] = total - base * (count - 1)
    return parts
  }

  function chargeDate(y, m, day) {
    return iso(y, m, clampDay(y, m, day))
  }

  function planEnd(entry) {
    const start = parseISO(entry.startDate)
    const end = addMonths(ymOf(start.y, start.m), entry.months - 1)
    const { y, m } = parseYM(end)
    return chargeDate(y, m, start.d)
  }

  function lineFor(entry, viewed, today) {
    if (entry.kind === "once") {
      if (entry.date.slice(0, 7) !== viewed) return null
      return {
        id: entry.id,
        kind: "once",
        name: entry.name,
        amount: entry.amount,
        date: entry.date,
        upcoming: entry.date > today,
      }
    }

    if (entry.kind === "sub") {
      if (viewed < entry.startedMonth) return null
      const { y, m } = parseYM(viewed)
      const date = chargeDate(y, m, entry.renewDay)
      if (entry.deactivatedOn && date > entry.deactivatedOn) return null
      return {
        id: entry.id,
        kind: "sub",
        name: entry.name,
        amount: entry.amount,
        date,
        upcoming: date > today,
      }
    }

    const start = parseISO(entry.startDate)
    const index = monthDiff(ymOf(start.y, start.m), viewed)
    if (index < 0 || index >= entry.months) return null
    const { y, m } = parseYM(viewed)
    return {
      id: entry.id,
      kind: "plan",
      name: entry.name,
      amount: shares(entry.total, entry.months)[index],
      date: chargeDate(y, m, start.d),
      upcoming: chargeDate(y, m, start.d) > today,
      index,
      months: entry.months,
    }
  }

  function linesForMonth(entries, viewed, today) {
    return entries
      .map((entry) => lineFor(entry, viewed, today))
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "it"))
  }

  function totalOf(lines) {
    return lines.reduce((sum, line) => sum + line.amount, 0)
  }

  function activeSubs(entries) {
    return entries
      .filter((entry) => entry.kind === "sub" && !entry.deactivatedOn)
      .sort((a, b) => a.renewDay - b.renewDay || a.name.localeCompare(b.name, "it"))
  }

  function activePlans(entries, today) {
    return entries
      .filter((entry) => entry.kind === "plan" && planEnd(entry) >= today)
      .sort((a, b) => planEnd(a).localeCompare(planEnd(b)) || a.name.localeCompare(b.name, "it"))
  }

  function planProgress(entry, today) {
    const start = parseISO(entry.startDate)
    const startYM = ymOf(start.y, start.m)
    const todayYM = today.slice(0, 7)
    const index = monthDiff(startYM, todayYM)
    const current = Math.min(entry.months, Math.max(1, index + 1))
    return { current: todayYM < startYM ? 0 : current, months: entry.months }
  }

  function pastMonths(year, today) {
    const now = parseISO(today)
    const list = []
    for (let m = 0; m < 12; m += 1) {
      if (year > now.y) continue
      if (year === now.y && m >= now.m) continue
      list.push(ymOf(year, m))
    }
    return list.reverse()
  }

  function buildMonthPdf(title, rows, totalLine) {
    const body = [title, ""].concat(rows).concat(["", totalLine])
    const pages = []
    for (let i = 0; i < body.length; i += 36) pages.push(body.slice(i, i + 36))
    return pdfBytes(pages.map((lines, index) => pageStream(lines, index === 0)))
  }

function pdfEscape(value) {
  return String(value)
    .replace(/€/g, "EUR")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, (ch) => {
      const code = ch.charCodeAt(0)
      if (code >= 160 && code <= 255) return "\\" + code.toString(8).padStart(3, "0")
      return "?"
    })
}

  function pageStream(lines, firstPage) {
    let y = 800
    let out = "BT\n"
    lines.forEach((line, index) => {
      const size = firstPage && index === 0 ? 18 : 11
      out += "/F1 " + size + " Tf\n1 0 0 1 48 " + y + " Tm\n(" + pdfEscape(line) + ") Tj\n"
      y -= size === 18 ? 28 : 16
    })
    return out + "ET\n"
  }

  function pdfBytes(streams) {
    const encoder = new TextEncoder()
    const chunks = []
    let offset = 0
    function push(text) {
      const bytes = encoder.encode(text)
      chunks.push(bytes)
      offset += bytes.length
    }
    push("%PDF-1.4\n")
    const count = streams.length
    const pageIds = streams.map((_, index) => 4 + index)
    const contentIds = streams.map((_, index) => 4 + count + index)
    const objects = []
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
    objects[2] = "<< /Type /Pages /Count " + count + " /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") + "] >>"
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    streams.forEach((stream, index) => {
      objects[pageIds[index]] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents " + contentIds[index] + " 0 R >>"
      objects[contentIds[index]] = stream
    })
    const maxId = 3 + count * 2
    const offsets = [0]
    for (let id = 1; id <= maxId; id += 1) {
      offsets[id] = offset
      const object = objects[id]
      if (id > 3 + count) {
        const length = encoder.encode(object).length
        push(id + " 0 obj\n<< /Length " + length + " >>\nstream\n" + object + "endstream\nendobj\n")
      } else {
        push(id + " 0 obj\n" + object + "\nendobj\n")
      }
    }
    const xref = offset
    let table = "xref\n0 " + (maxId + 1) + "\n0000000000 65535 f \n"
    for (let id = 1; id <= maxId; id += 1) {
      table += String(offsets[id]).padStart(10, "0") + " 00000 n \n"
    }
    push(table)
    push("trailer\n<< /Size " + (maxId + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF")
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const out = new Uint8Array(total)
    let cursor = 0
    chunks.forEach((chunk) => {
      out.set(chunk, cursor)
      cursor += chunk.length
    })
    return out
  }

  return {
    MONTHS,
    iso,
    parseISO,
    parseYM,
    ymOf,
    todayISO,
    currentYM,
    clampDay,
    monthDiff,
    addMonths,
    monthName,
    monthTitle,
    dayLabel,
    formatEUR,
    parseAmount,
    shares,
    planEnd,
    linesForMonth,
    totalOf,
    activeSubs,
    activePlans,
    planProgress,
    pastMonths,
    buildMonthPdf,
  }
})
