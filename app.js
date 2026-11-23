const D = SpeseDomain
const KEY = "spese.v1"

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  once: '<path d="M7 3.5h7l4.5 4.5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5M8.5 13h7M8.5 17h4.5"/>',
  sub: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4.5V10h-5.5"/>',
  plan: '<path d="M4 7.5h16V20H4z"/><path d="M4 12h16M9.2 7.5V20M14.8 7.5V20"/>',
  month: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 5.5V3M16 5.5V3"/>',
  archive: '<path d="M4 8h16v11.5H4z"/><path d="M4 8l2.2-3h11.6L20 8M10 13.5h4"/>',
  commitments: '<path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5"/><path d="M19.5 4.5V9H15"/><path d="M19.5 12a7.5 7.5 0 0 1-12.6 5.5"/><path d="M4.5 19.5V15H9"/>',
  back: '<path d="M15 5.5 8 12l7 6.5"/>',
  download: '<path d="M12 4.5v10"/><path d="M8 11l4 4 4-4"/><path d="M5.5 19.5h13"/>',
  close: '<path d="M7 7l10 10M17 7 7 17"/>',
  trash: '<path d="M5 7.5h14"/><path d="M9.5 7.5V5.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7.5"/><path d="M7.2 7.5l.7 11.2a1 1 0 0 0 1 .8h6.2a1 1 0 0 0 1-.8l.7-11.2"/><path d="M10.2 11v5M13.8 11v5"/>',
  pencil: '<path d="M13.2 6.2 17.8 10.8"/><path d="M4.8 19.2h3.6L19 8.6a1.6 1.6 0 0 0 0-2.3l-1.3-1.3a1.6 1.6 0 0 0-2.3 0L4.8 15.6z"/>',
}

let entries = load()
let dirty = false
let viewKey = ""
let lastHash = location.hash
let sheetAbort = null
let suppress = false
let dockIndex = 0
let confirming = false

function icon(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + "</svg>"
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]))
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "")
    if (!parsed || !Array.isArray(parsed.entries)) return []
    return parsed.entries.filter(validEntry)
  } catch {
    return []
  }
}

function validEntry(entry) {
  if (!entry || typeof entry.id !== "string" || typeof entry.name !== "string") return false
  if (entry.kind === "once") return Number.isInteger(entry.amount) && isoDate(entry.date)
  if (entry.kind === "sub") {
    return Number.isInteger(entry.amount) && Number.isInteger(entry.renewDay) && /^\d{4}-\d{2}$/.test(entry.startedMonth)
  }
  return entry.kind === "plan" && Number.isInteger(entry.total) && Number.isInteger(entry.months) && isoDate(entry.startDate)
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify({ entries }))
}

function status(message) {
  document.getElementById("status").textContent = message
}

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function parseRoute() {
  const parts = (location.hash || "#/mese").replace(/^#/, "").split("/").filter(Boolean)
  const top = parts[0] || "mese"
  const today = D.todayISO()
  const current = D.currentYM()
  if (top === "archivio") {
    const year = /^\d{4}$/.test(parts[1] || "") ? parts[1] : today.slice(0, 4)
    return { name: "archivio", year }
  }
  if (top === "impegni") {
    if (parts[1] === "modifica" && parts[2]) return { name: "impegni", mode: "edit", id: parts[2] }
    return { name: "impegni" }
  }
  if (top === "documento") {
    const ym = /^\d{4}-\d{2}$/.test(parts[1] || "") ? parts[1] : current
    if (ym >= current) return { name: "mese", ym: current }
    return { name: "documento", ym }
  }
  let cursor = 1
  if (/^\d{4}-\d{2}$/.test(parts[1] || "")) {
    const ym = parts[1]
    cursor = 2
    if (parts[cursor] !== "nuova" && parts[cursor] !== "modifica" && ym < current) return { name: "documento", ym }
  }
  if (parts[cursor] === "nuova") {
    const kind = ["once", "sub", "plan"].includes(parts[cursor + 1]) ? parts[cursor + 1] : "once"
    return { name: "mese", ym: current, mode: "create", kind }
  }
  if (parts[cursor] === "modifica" && parts[cursor + 1]) return { name: "mese", ym: current, mode: "edit", id: parts[cursor + 1] }
  return { name: "mese", ym: current }
}

function placeHash(route) {
  if (route.name === "impegni") return "#/impegni"
  if (route.name === "archivio") return "#/archivio/" + route.year
  if (route.name === "documento") return "#/documento/" + route.ym
  return "#/mese"
}

function editHash(route, id) {
  if (route.name === "impegni") return "#/impegni/modifica/" + id
  return "#/mese/modifica/" + id
}

function go(hash) {
  if (location.hash === hash) render()
  else location.hash = hash
}

function names() {
  return [...new Set(entries.map((entry) => entry.name))].sort((a, b) => a.localeCompare(b, "it"))
}

function kindLabel(line) {
  if (line.kind === "once") return "Occasionale"
  if (line.kind === "sub") return "Abbonamento"
  return "Rata " + (line.index + 1) + " di " + line.months
}

function meta(line) {
  const when = line.upcoming ? "In arrivo" : "Addebitata"
  return D.dayLabel(line.date) + " · " + kindLabel(line) + " · " + when
}

function brand(label, long) {
  return '<div class="brand' + (long ? " long" : "") + '"><span class="mark" aria-hidden="true"></span> ' + label + "</div>"
}

function pdfButton(ym) {
  return '<button type="button" class="top-action" id="pdf" aria-label="Scarica il PDF di ' + esc(D.monthTitle(ym)) + '">' + icon("download") + "</button>"
}

function topHTML(route) {
  if (route.name === "documento") {
    return '<a class="back" href="#/archivio/' + route.ym.slice(0, 4) + '">' + icon("back") + "<span>Documenti</span></a>" + pdfButton(route.ym)
  }
  if (route.name === "archivio") return brand("Documenti")
  if (route.name === "impegni") return brand("Fatturazioni ricorrenti", true)
  return brand("Spese") + pdfButton(D.currentYM())
}

function dockIndexOf(route) {
  if (route.name === "archivio" || route.name === "documento") return 1
  if (route.name === "impegni") return 2
  return 0
}

function navHTML(route) {
  const items = [
    ["mese", "Mese", "month"],
    ["archivio", "Documenti", "archive"],
    ["impegni", "Fatturazioni ricorrenti", "commitments"],
  ]
  const links = items.map(([id, label, glyph]) => {
    const here = route.name === id || (id === "archivio" && route.name === "documento")
    const current = here ? ' aria-current="page"' : ""
    const href = id === "archivio" ? "#/archivio/" + D.todayISO().slice(0, 4) : "#/" + id
    return '<a href="' + href + '"' + current + ' aria-label="' + label + '">' + icon(glyph) + "</a>"
  }).join("")
  return '<span class="dock-mark" aria-hidden="true"></span>' + links
}

function settleDock(index) {
  const mark = document.querySelector(".dock-mark")
  if (!mark) return
  const from = dockIndex
  dockIndex = index
  if (reduceMotion() || from === index) {
    mark.style.transform = "translateX(" + (index * 100) + "%)"
    return
  }
  mark.style.transition = "none"
  mark.style.transform = "translateX(" + (from * 100) + "%)"
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      mark.style.transition = "transform 220ms var(--ease-in-out)"
      mark.style.transform = "translateX(" + (index * 100) + "%)"
    })
  })
}

function monthHTML(route) {
  const today = D.todayISO()
  const lines = D.linesForMonth(entries, route.ym, today)
  const total = D.totalOf(lines)
  const fee = lines.reduce((sum, line) => line.kind === "once" ? sum : sum + line.amount, 0)
  const ym = route.ym
  const actions = [
    ["nuova/once", "add", "Aggiungi"],
    ["nuova/once", "once", "Occasionale"],
    ["nuova/sub", "sub", "Abbonamento"],
    ["nuova/plan", "plan", "Rate"],
  ].map(([path, bubble, label]) => {
    return '<a href="#/mese/' + path + '"><span class="bubble ' + bubble + '">' + icon(bubble === "add" ? "plus" : bubble) + "</span>" + esc(label) + "</a>"
  }).join("")
  const list = lines.length
    ? '<ul class="moves">' + lines.map((line) => {
      return '<li class="swipe"><button type="button" class="swipe-delete" data-ask="' + esc(line.id) + '" tabindex="-1" aria-hidden="true" aria-label="Elimina ' + esc(line.name) + '">' + icon("trash") + '</button><button type="button" class="move" data-edit="' + esc(line.id) + '" title="' + esc(line.name) + '"><span class="badge ' + line.kind + '">' + icon(line.kind) + '</span><span class="move-text"><span class="move-name">' + esc(line.name) + '</span><span class="move-meta">' + esc(meta(line)) + '</span></span><span class="move-amount">' + esc(D.formatEUR(line.amount)) + "</span></button></li>"
    }).join("") + "</ul>"
    : '<div class="empty"><img src="assets/img/mese-vuoto.jpg" alt="" width="1024" height="1024"><p>Nessuna spesa in ' + esc(D.monthName(ym).toLowerCase()) + ". Aggiungine una con i tasti qui sopra.</p></div>"
  return '<article class="hero"><div class="hero-copy"><h1>' + esc(D.monthName(ym)) + '</h1><p class="hero-amount"><span class="sr">Totale del mese </span>' + esc(D.formatEUR(total)) + '</p><p class="hero-fee">Canone mensile: ' + esc(D.formatEUR(fee)) + "/mese</p></div><div class=\"hero-art\"><img src=\"assets/img/hero-spesa.jpg\" alt=\"\" width=\"1024\" height=\"1024\" fetchpriority=\"high\"></div></article><div class=\"actions\">" + actions + '</div><div class="ledger">' + list + "</div>"
}

function archiveHTML(route) {
  const today = D.todayISO()
  const year = Number(route.year)
  const nowY = Number(today.slice(0, 4))
  let min = nowY
  entries.forEach((entry) => {
    const source = entry.kind === "once" ? entry.date : entry.kind === "sub" ? entry.startedMonth : entry.startDate
    min = Math.min(min, Number(source.slice(0, 4)))
  })
  const years = []
  for (let y = nowY; y >= min; y -= 1) years.push(String(y))
  const chips = years.map((item) => {
    const current = item === route.year ? ' aria-current="true"' : ""
    return '<a href="#/archivio/' + item + '"' + current + ">" + item + "</a>"
  }).join("")
  const months = D.pastMonths(year, today)
  const cards = months.map((ym) => {
    const total = D.totalOf(D.linesForMonth(entries, ym, today))
    const title = D.monthTitle(ym)
    const href = ym === D.currentYM() ? "#/mese" : "#/documento/" + ym
    return '<div class="month-card"><a href="' + href + '"><span><strong>' + esc(D.monthName(ym)) + '</strong><span>' + esc(String(year)) + '</span></span></a><b>' + esc(D.formatEUR(total)) + '</b><i class="month-rule" aria-hidden="true"></i><button type="button" class="month-pdf" data-pdf="' + ym + '" aria-label="Scarica il PDF di ' + esc(title) + '">' + icon("download") + "</button></div>"
  }).join("")
  const body = months.length
    ? '<div class="stack">' + cards + '</div><article class="year-total"><h2>Totale del ' + esc(route.year) + "</h2><p>" + esc(D.formatEUR(months.reduce((sum, ym) => sum + D.totalOf(D.linesForMonth(entries, ym, today)), 0))) + "</p></article>"
    : '<div class="empty"><p>I mesi del ' + esc(route.year) + " compariranno qui.</p></div>"
  return '<figure class="banner"><img src="assets/img/archivio-mesi.jpg" alt="" width="1280" height="720"></figure><div class="years">' + chips + "</div>" + body
}

function documentHTML(route) {
  const today = D.todayISO()
  const lines = D.linesForMonth(entries, route.ym, today)
  const total = D.totalOf(lines)
  const rows = lines.map((line) => {
    const day = String(Number(line.date.slice(8, 10)))
    return '<div class="doc-row"><span class="doc-day">' + esc(day) + '</span><span class="doc-what"><span class="doc-name">' + esc(line.name) + '</span><span class="doc-kind">' + esc(kindLabel(line)) + '</span></span><span class="doc-amount">' + esc(D.formatEUR(line.amount)) + "</span></div>"
  }).join("")
  const body = lines.length
    ? '<div class="doc-table"><div class="doc-head"><span>Giorno</span><span>Servizio</span><span>Importo</span></div>' + rows + "</div>"
    : '<p class="doc-empty">Nessuna spesa in questo mese.</p>'
  return '<article class="doc"><h1>' + esc(D.monthTitle(route.ym)) + "</h1>" + body + '<div class="doc-total"><span>Totale</span><b>' + esc(D.formatEUR(total)) + "</b></div></article>"
}

function commitmentsHTML() {
  const today = D.todayISO()
  const subs = D.activeSubs(entries, today)
  const plans = D.activePlans(entries, today)
  const subCards = subs.length
    ? subs.map((entry) => subCard(entry)).join("")
    : '<div class="empty"><p>Nessun abbonamento attivo.</p></div>'
  const planCards = plans.length
    ? plans.map((entry) => planCard(entry, today)).join("")
    : '<div class="empty"><p>Nessuna rateizzazione attiva.</p></div>'
  return '<h2 class="lead-title">Abbonamenti</h2><div class="stack">' + subCards + '</div><h2>Rateizzazioni</h2><div class="stack">' + planCards + "</div>"
}

function commitCard(id, name, detail) {
  return '<button type="button" class="commit" data-edit="' + esc(id) + '"><span class="pencil" aria-hidden="true">' + icon("pencil") + '</span><span class="commit-copy"><span class="commit-name">' + esc(name) + '</span><span class="commit-meta">' + detail + '</span></span><span class="sr">Modifica</span></button>'
}

function subCard(entry) {
  return commitCard(entry.id, entry.name, "Rinnovo il " + entry.renewDay + " · " + esc(D.formatEUR(entry.amount)))
}

function planCard(entry, today) {
  const progress = D.planProgress(entry, today)
  const place = progress.current === 0
    ? "Inizia il " + D.dayLabel(entry.startDate)
    : "Rata " + progress.current + " di " + progress.months
  return commitCard(entry.id, entry.name, esc(place) + " · fine " + esc(D.dayLabel(D.planEnd(entry))) + " " + D.planEnd(entry).slice(0, 4) + " · " + esc(D.formatEUR(entry.total)))
}

function field(key, label, control) {
  const uid = (control.match(/id="([^"]+)"/) || ["", key])[1]
  return '<label class="field" data-field="' + key + '"><span>' + label + "</span>" + control + '<span class="error" id="' + uid + '-error"></span></label>'
}

function input(attrs) {
  return "<input " + attrs + ' autocomplete="off">'
}

function sheetHTML(route) {
  const editing = route.mode === "edit"
  const entry = editing ? entries.find((item) => item.id === route.id) : null
  if (editing && !entry) return ""
  const kind = editing ? entry.kind : route.kind
  const title = editing ? "Modifica spesa" : "Nuova spesa"
  const values = editing ? valuesFrom(entry) : blank(route)
  const kinds = editing
    ? ""
    : '<div class="kinds" role="radiogroup" aria-label="Tipo di spesa">' +
      [["once", "Occasionale"], ["sub", "Abbonamento"], ["plan", "Rateizzazione"]].map(([value, label]) => {
        const checked = value === kind ? " checked" : ""
        return '<label><input type="radio" name="kind" value="' + value + '"' + checked + ">" + label + "</label>"
      }).join("") + "</div>"
  const service = field("name", "Nome del servizio", input('id="service-name" name="name" value="' + esc(values.name) + '" list="nomi"') + listNames())
  const panels = service + panelOnce(values, kind) + panelSub(values, editing, kind) + panelPlan(values, kind)
  const save = editing
    ? '<div class="sheet-actions"><button type="button" class="trash" id="delete" aria-label="Elimina">' + icon("trash") + '</button><button class="submit" type="submit">Salva</button></div>'
    : '<button class="submit" type="submit">Aggiungi</button>'
  return '<div class="overlay"><div class="dim" data-close></div><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><button type="button" class="handle" data-drag aria-label="Trascina per chiudere"><span></span></button><div class="sheet-head"><h2 id="sheet-title">' + title + '</h2></div><form class="sheet-body" id="expense-form" data-kind="' + kind + '" novalidate>' + kinds + panels + save + "</form></section></div>"
}

function blank(route) {
  const { y, m } = D.parseYM(route.ym)
  const today = D.todayISO()
  const date = today.slice(0, 7) === route.ym ? today : D.iso(y, m, 1)
  return { name: "", amount: "", date, renewDay: String(Math.min(28, new Date().getDate())), total: "", months: "", startDate: date, firstDate: date, startedMonth: route.ym }
}

function centsToField(cents) {
  const whole = Math.floor(cents / 100)
  const frac = String(cents % 100).padStart(2, "0")
  return whole + "," + frac
}

function valuesFrom(entry) {
  if (entry.kind === "once") {
    return { name: entry.name, amount: centsToField(entry.amount), date: entry.date, renewDay: "1", total: "", months: "", startDate: entry.date, firstDate: entry.date, startedMonth: entry.date.slice(0, 7) }
  }
  if (entry.kind === "sub") {
    return { name: entry.name, amount: centsToField(entry.amount), date: D.todayISO(), renewDay: String(entry.renewDay), total: "", months: "", startDate: entry.startedMonth + "-01", firstDate: entry.startedMonth + "-01", startedMonth: entry.startedMonth, disdetta: Boolean(entry.disdettaMonth || entry.deactivatedOn) }
  }
  return { name: entry.name, amount: "", date: entry.startDate, renewDay: "1", total: centsToField(entry.total), months: String(entry.months), startDate: entry.startDate, firstDate: entry.startDate, startedMonth: entry.startDate.slice(0, 7) }
}

function listNames() {
  const options = names().map((name) => '<option value="' + esc(name) + '">').join("")
  return '<datalist id="nomi">' + options + "</datalist>"
}

function panelOnce(values, kind) {
  return '<div data-panel="once"' + (kind === "once" ? "" : " hidden") + ">" +
    field("amount", "Cifra", input('id="amount-once" name="amount" inputmode="decimal" placeholder="15,99" value="' + esc(values.amount) + '"')) +
    field("date", "Data", input('id="date-once" name="date" type="date" value="' + esc(values.date) + '"')) +
    "</div>"
}

function panelSub(values, editing, kind) {
  const disdetta = editing
    ? '<label class="check"><input type="checkbox" name="disdetta"' + (values.disdetta ? " checked" : "") + ">Ho disdetto: dal mese prossimo non si rinnova</label>"
    : ""
  return '<div data-panel="sub"' + (kind === "sub" ? "" : " hidden") + ">" +
    field("amount", "Tariffa mensile", input('id="amount-sub" name="amount" inputmode="decimal" placeholder="15,99" value="' + esc(values.amount) + '"')) +
    field("renew", "Giorno di rinnovo", input('id="renew" name="renew" inputmode="numeric" placeholder="28" value="' + esc(values.renewDay) + '"')) +
    field("started", "Data primo addebito", input('id="started" name="started" type="date" value="' + esc(values.firstDate) + '"')) +
    disdetta + "</div>"
}

function panelPlan(values, kind) {
  return '<div data-panel="plan"' + (kind === "plan" ? "" : " hidden") + ">" +
    field("total", "Costo totale", input('id="total-plan" name="total" inputmode="decimal" placeholder="1.000,00" value="' + esc(values.total) + '"')) +
    field("months", "Numero di mesi", input('id="months-plan" name="months" inputmode="numeric" placeholder="12" value="' + esc(values.months) + '"')) +
    field("start", "Data primo addebito", input('id="start-plan" name="start" type="date" value="' + esc(values.startDate) + '"')) +
    "</div>"
}

function render() {
  sheetAbort?.abort()
  const route = parseRoute()
  const key = route.name === "archivio" ? "archivio/" + route.year : route.name === "documento" ? "documento/" + route.ym : route.name
  const screen = document.getElementById("contenuto")
  const keep = key === viewKey
  const saved = keep ? { page: screen.scrollTop, ledger: screen.querySelector(".ledger")?.scrollTop || 0 } : null
  document.getElementById("top").innerHTML = topHTML(route)
  screen.innerHTML = route.name === "archivio"
    ? archiveHTML(route)
    : route.name === "impegni"
      ? commitmentsHTML()
      : route.name === "documento"
        ? documentHTML(route)
        : monthHTML(route)
  document.getElementById("nav").innerHTML = navHTML(route)
  settleDock(dockIndexOf(route))
  const root = document.getElementById("sheet-root")
  const markup = route.mode ? sheetHTML(route) : ""
  root.innerHTML = markup
  setInert(Boolean(markup))
  bindScreen(route)
  if (markup) bindSheet(route)
  viewKey = key
  if (saved) {
    screen.scrollTop = saved.page
    const ledger = screen.querySelector(".ledger")
    if (ledger) ledger.scrollTop = saved.ledger
  } else screen.scrollTop = 0
}

function setInert(on) {
  document.getElementById("top").inert = on
  document.getElementById("contenuto").inert = on
  document.getElementById("nav").inert = on
}

function bindScreen(route) {
  document.getElementById("pdf")?.addEventListener("click", () => downloadMonth(route.ym))
  document.querySelectorAll("[data-pdf]").forEach((button) => {
    button.addEventListener("click", () => downloadMonth(button.dataset.pdf))
  })
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.swiped === "1") {
        button.dataset.swiped = ""
        return
      }
      const row = button.closest(".swipe")
      if (row?.classList.contains("is-open")) {
        settleFace(button, 0, 0)
        return
      }
      go(editHash(route, button.dataset.edit))
    })
  })
  document.querySelectorAll("[data-ask]").forEach((button) => {
    button.addEventListener("click", () => askDelete(button.dataset.ask, route))
  })
  bindSwipes()
}

function downloadMonth(ym) {
  const today = D.todayISO()
  const lines = D.linesForMonth(entries, ym, today)
  const rows = lines.map((line) => D.dayLabel(line.date) + "  " + line.name + "  " + kindLabel(line) + "  " + (line.upcoming ? "in arrivo" : "addebitata") + "  " + D.formatEUR(line.amount))
  const bytes = D.buildMonthPdf("Spese " + D.monthTitle(ym), rows.length ? rows : ["Nessuna spesa"], "Totale " + D.formatEUR(D.totalOf(lines)))
  const blob = new Blob([bytes], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  if (/iPhone|iPad/.test(navigator.userAgent)) {
    window.open(url, "_blank")
  } else {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "spese-" + ym + ".pdf"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 8000)
  status("PDF di " + D.monthTitle(ym) + " pronto.")
}

function bindSheet(route) {
  const root = document.getElementById("sheet-root")
  const panel = root.querySelector(".sheet")
  const dim = root.querySelector(".dim")
  const form = root.querySelector("#expense-form")
  const reduce = reduceMotion()
  sheetAbort = new AbortController()
  const signal = sheetAbort.signal
  syncPanels(form)
  if (!reduce) {
    panel.style.transform = "translateY(100%)"
    dim.style.opacity = "0"
    requestAnimationFrame(() => {
      panel.style.transition = "transform 420ms var(--ease-drawer)"
      dim.style.transition = "opacity 420ms var(--ease-out)"
      requestAnimationFrame(() => {
        panel.style.transform = "translateY(0)"
        dim.style.opacity = "1"
      })
    })
  }
  bindDrag(panel, dim, route, reduce)
  root.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => leave(route), { signal }))
  form.addEventListener("input", () => { dirty = true }, { signal })
  form.addEventListener("change", (event) => {
    syncPanels(form)
    if (event.target.name === "kind") showErrors(form, {})
  }, { signal })
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    submitForm(form, route)
  }, { signal })
  document.getElementById("delete")?.addEventListener("click", () => askDelete(route.id, route), { signal })
  document.addEventListener("keydown", (event) => {
    if (confirming) return
    if (event.key === "Escape") leave(route)
    if (event.key === "Tab") trapFocus(event, root)
  }, { signal })
  const viewport = window.visualViewport
  if (viewport) {
    const lift = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      panel.style.bottom = overlap + "px"
    }
    viewport.addEventListener("resize", lift, { signal })
    viewport.addEventListener("scroll", lift, { signal })
  }
}

function syncPanels(form) {
  const selected = form.querySelector("input[name=kind]:checked")
  const kind = selected ? selected.value : form.dataset.kind
  form.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== kind
  })
}

function activeKind(form) {
  return form.querySelector("input[name=kind]:checked")?.value || form.dataset.kind
}

function valueOf(form, panel, selector) {
  return panel.querySelector(selector)?.value.trim() || ""
}

function submitForm(form, route) {
  const kind = activeKind(form)
  const panel = form.querySelector('[data-panel="' + kind + '"]')
  const errors = {}
  const name = form.querySelector("#service-name").value.trim()
  if (!name) errors.name = "Scrivi il nome del servizio."
  else if (name.length > 80) errors.name = "Il nome è troppo lungo."
  let entry = null
  if (kind === "once") {
    const amount = D.parseAmount(valueOf(form, panel, "[name=amount]"))
    const date = valueOf(form, panel, "[name=date]")
    if (amount == null) errors.amount = "Scrivi una cifra, per esempio 15,99."
    if (!isoDate(date)) errors.date = "Scegli una data."
    if (!Object.keys(errors).length) {
      entry = { id: route.id || crypto.randomUUID(), kind, name, amount, date }
    }
  } else if (kind === "sub") {
    const amount = D.parseAmount(valueOf(form, panel, "[name=amount]"))
    const renewDay = Number(valueOf(form, panel, "[name=renew]"))
    const firstDate = valueOf(form, panel, "[name=started]")
    const startedMonth = firstDate.slice(0, 7)
    if (amount == null) errors.amount = "Scrivi la tariffa mensile."
    if (!Number.isInteger(renewDay) || renewDay < 1 || renewDay > 31) errors.renew = "Il giorno va da 1 a 31."
    if (!isoDate(firstDate)) errors.started = "Scegli la data del primo addebito."
    if (!Object.keys(errors).length) {
      const previous = entries.find((item) => item.id === route.id)
      const wantsEnd = Boolean(panel.querySelector("[name=disdetta]")?.checked)
      entry = {
        id: route.id || crypto.randomUUID(),
        kind,
        name,
        amount,
        renewDay,
        startedMonth,
        disdettaMonth: wantsEnd ? (previous?.disdettaMonth || D.currentYM()) : null,
        deactivatedOn: null,
      }
    }
  } else {
    const total = D.parseAmount(valueOf(form, panel, "[name=total]"))
    const months = Number(valueOf(form, panel, "[name=months]"))
    const startDate = valueOf(form, panel, "[name=start]")
    if (total == null) errors.total = "Scrivi il costo totale."
    if (!Number.isInteger(months) || months < 1 || months > 120) errors.months = "I mesi vanno da 1 a 120."
    if (!isoDate(startDate)) errors.start = "Scegli la data del primo addebito."
    if (!Object.keys(errors).length) {
      entry = { id: route.id || crypto.randomUUID(), kind, name, total, months, startDate }
    }
  }
  if (!entry) {
    showErrors(form, errors)
    ;[...form.querySelectorAll("[aria-invalid='true']")].find((el) => !el.closest("[hidden]"))?.focus()
    status("Controlla i campi evidenziati.")
    return
  }
  const index = entries.findIndex((item) => item.id === entry.id)
  if (index >= 0) entries[index] = entry
  else entries.push(entry)
  persist()
  dirty = false
  status(route.mode === "edit" ? "Spesa aggiornata." : "Spesa aggiunta.")
  go(placeHash(route))
}

function showErrors(form, errors) {
  form.querySelectorAll(".field").forEach((field) => {
    const message = errors[field.dataset.field] || ""
    const input = field.querySelector("input")
    const note = field.querySelector(".error")
    if (!input || !note) return
    if (message && !field.closest("[hidden]")) {
      input.setAttribute("aria-invalid", "true")
      input.setAttribute("aria-describedby", note.id)
      note.textContent = message
    } else {
      input.removeAttribute("aria-invalid")
      note.textContent = ""
    }
  })
}

function deleteCopy(entry) {
  if (entry.kind === "sub") return "L'abbonamento sparisce da questo mese e da tutti gli altri in cui compare, passati e futuri."
  if (entry.kind === "plan") return "La rateizzazione sparisce da questo mese e da ogni mese in cui è divisa."
  return "Questa spesa sparisce da questo mese. L'eliminazione è definitiva."
}

function askDelete(id, route) {
  const entry = entries.find((item) => item.id === id)
  if (!entry || confirming) return
  confirming = true
  const host = document.getElementById("confirm-root")
  host.innerHTML = '<div class="confirm-pop"><div class="confirm-dim" data-confirm-cancel></div><div class="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-copy"><h2 id="confirm-title">Eliminare ' + esc(entry.name) + '?</h2><p id="confirm-copy">' + esc(deleteCopy(entry)) + '</p><div class="confirm-actions"><button type="button" class="ghost" data-confirm-cancel>Annulla</button><button type="button" class="danger" data-confirm-yes>Elimina</button></div></div></div>'
  const pop = host.querySelector(".confirm-pop")
  const card = host.querySelector(".confirm-card")
  const reduce = reduceMotion()
  document.getElementById("top").inert = true
  document.getElementById("contenuto").inert = true
  document.getElementById("nav").inert = true
  document.getElementById("sheet-root").inert = true
  if (!reduce) {
    pop.style.opacity = "0"
    card.style.opacity = "0"
    card.style.transform = "scale(0.96)"
    requestAnimationFrame(() => {
      pop.style.transition = "opacity 200ms var(--ease-out)"
      card.style.transition = "opacity 200ms var(--ease-out), transform 200ms var(--ease-out)"
      requestAnimationFrame(() => {
        pop.style.opacity = "1"
        card.style.opacity = "1"
        card.style.transform = "none"
      })
    })
  }
  const cancel = host.querySelector(".ghost")
  cancel.focus()
  const finish = (remove) => {
    closeConfirm(() => {
      if (!remove) return
      entries = entries.filter((item) => item.id !== id)
      persist()
      dirty = false
      status("Spesa eliminata.")
      go(placeHash(route))
    })
  }
  host.querySelectorAll("[data-confirm-cancel]").forEach((el) => el.addEventListener("click", () => finish(false)))
  host.querySelector("[data-confirm-yes]").addEventListener("click", () => finish(true))
  host.querySelector(".confirm-card").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault()
      finish(false)
    }
    if (event.key === "Tab") trapFocus(event, card)
  })
}

function closeConfirm(done) {
  const pop = document.querySelector(".confirm-pop")
  const release = () => {
    document.getElementById("confirm-root").innerHTML = ""
    confirming = false
    const sheet = Boolean(document.querySelector(".sheet"))
    setInert(sheet)
    document.getElementById("sheet-root").inert = false
    if (done) done()
  }
  if (!pop || reduceMotion()) {
    release()
    return
  }
  const card = pop.querySelector(".confirm-card")
  pop.style.transition = "opacity 160ms var(--ease-out)"
  card.style.transition = "opacity 160ms var(--ease-out), transform 160ms var(--ease-out)"
  pop.style.opacity = "0"
  card.style.opacity = "0"
  card.style.transform = "scale(0.98)"
  card.addEventListener("transitionend", release, { once: true })
}

const REVEAL = 84

function readX(el) {
  const transform = getComputedStyle(el).transform
  if (!transform || transform === "none") return 0
  return new DOMMatrix(transform).m41
}

function settleFace(face, dest, velocity) {
  const row = face.closest(".swipe")
  const from = readX(face)
  const token = String(Number(face.dataset.settle || 0) + 1)
  face.dataset.settle = token
  face.style.transition = "none"
  face.style.transform = "translateX(" + from + "px)"
  row.classList.toggle("is-open", dest !== 0)
  const bin = row.querySelector(".swipe-delete")
  if (dest === 0) {
    bin.tabIndex = -1
    bin.setAttribute("aria-hidden", "true")
  } else {
    bin.tabIndex = 0
    bin.removeAttribute("aria-hidden")
  }
  if (reduceMotion()) {
    if (dest === 0) {
      face.style.transition = ""
      face.style.transform = ""
    } else face.style.transform = "translateX(" + dest + "px)"
    return
  }
  const speed = Math.max(Math.abs(velocity || 0), 0.45)
  const duration = Math.round(Math.min(280, Math.max(140, Math.abs(dest - from) / speed)))
  requestAnimationFrame(() => {
    if (face.dataset.settle !== token) return
    face.style.transition = "transform " + duration + "ms var(--ease-drawer)"
    face.style.transform = dest === 0 ? "translateX(0px)" : "translateX(" + dest + "px)"
  })
  if (dest === 0) {
    face.addEventListener("transitionend", () => {
      if (face.dataset.settle !== token || row.classList.contains("is-open")) return
      face.style.transition = ""
      face.style.transform = ""
    }, { once: true })
  }
}

function closeSwipes(except) {
  document.querySelectorAll(".swipe.is-open").forEach((row) => {
    if (row === except) return
    settleFace(row.querySelector(".move"), 0, 0)
  })
}

function bindSwipes() {
  const ledger = document.querySelector(".ledger")
  ledger?.addEventListener("scroll", () => closeSwipes(), { passive: true })
  document.querySelectorAll(".swipe").forEach((row) => {
    const face = row.querySelector(".move")
    let pointerId = null
    let startX = 0
    let startY = 0
    let origin = 0
    let axis = ""
    let lastX = 0
    let lastT = 0
    let velocity = 0
    face.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return
      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      axis = ""
      lastX = event.clientX
      lastT = performance.now()
      velocity = 0
      face.dataset.swiped = ""
      origin = 0
    })
    face.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
        if (axis === "y") return
        face.style.transition = "none"
        origin = readX(face)
        row.classList.add("is-dragging")
        face.setPointerCapture(event.pointerId)
        closeSwipes(row)
      }
      if (axis !== "x") return
      face.dataset.swiped = "1"
      const now = performance.now()
      const dt = now - lastT
      if (dt > 0 && dt < 60) velocity = (event.clientX - lastX) / dt
      else velocity *= 0.4
      lastX = event.clientX
      lastT = now
      let x = origin + dx
      if (x > 0) x *= 0.2
      else if (x < -REVEAL) x = -REVEAL + (x + REVEAL) * 0.2
      face.style.transform = "translateX(" + x + "px)"
    })
    const end = (event) => {
      if (event.pointerId !== pointerId) return
      pointerId = null
      row.classList.remove("is-dragging")
      if (axis !== "x") {
        if (!row.classList.contains("is-open")) {
          face.style.transition = ""
          face.style.transform = ""
        }
        return
      }
      const x = readX(face)
      const dest = velocity > 0.45 ? 0 : x < -REVEAL * 0.4 || velocity < -0.45 ? -REVEAL : 0
      settleFace(face, dest, velocity)
    }
    face.addEventListener("pointerup", end)
    face.addEventListener("pointercancel", end)
  })
}

function leave(route) {
  if (dirty && !window.confirm("Ci sono modifiche non salvate. Vuoi uscire?")) {
    const panel = document.querySelector(".sheet")
    const dim = document.querySelector(".dim")
    if (panel) {
      panel.style.transition = "transform 320ms var(--ease-drawer)"
      panel.style.transform = "translateY(0)"
    }
    if (dim) {
      dim.style.transition = "opacity 320ms var(--ease-out)"
      dim.style.opacity = "1"
    }
    return
  }
  dirty = false
  go(placeHash(route))
}

function bindDrag(panel, dim, route, reduce) {
  let pointerId = null
  let dragging = false
  let startY = 0
  let origin = 0
  let lastY = 0
  let lastT = 0
  let velocity = 0
  let height = 1
  let closeTimer = 0

  function currentY() {
    const transform = getComputedStyle(panel).transform
    if (!transform || transform === "none") return 0
    return new DOMMatrix(transform).m42
  }

  function blocked(target) {
    if (target.closest("[data-drag]")) return false
    return Boolean(target.closest("input, textarea, select, button, a, .kinds, .check"))
  }

  panel.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || blocked(event.target)) return
    event.preventDefault()
    window.clearTimeout(closeTimer)
    pointerId = event.pointerId
    dragging = false
    startY = event.clientY
    lastY = event.clientY
    lastT = performance.now()
    velocity = 0
    height = panel.getBoundingClientRect().height || 1
  })
  panel.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return
    const dy = event.clientY - startY
    if (!dragging) {
      if (dy < 8) return
      dragging = true
      origin = Math.max(0, currentY())
      startY = event.clientY
      lastY = event.clientY
      panel.classList.add("is-dragging")
      panel.style.transition = "none"
      dim.style.transition = "none"
      panel.setPointerCapture(event.pointerId)
    }
    const y = Math.max(0, origin + (event.clientY - startY))
    const now = performance.now()
    const dt = now - lastT
    if (dt > 0 && dt < 60) velocity = (event.clientY - lastY) / dt
    else velocity *= 0.4
    lastY = event.clientY
    lastT = now
    panel.style.transform = "translateY(" + y + "px)"
    dim.style.opacity = String(Math.max(0, 1 - y / height))
  })
  function finish(event) {
    if (event.pointerId !== pointerId) return
    pointerId = null
    panel.classList.remove("is-dragging")
    if (!dragging) return
    dragging = false
    const y = Math.max(0, currentY())
    const dismiss = y > height * 0.4 || velocity > 0.65
    const duration = reduce ? "1ms" : "320ms"
    panel.style.transition = "transform " + duration + " var(--ease-drawer)"
    dim.style.transition = "opacity " + duration + " var(--ease-out)"
    if (dismiss) {
      panel.style.transform = "translateY(100%)"
      dim.style.opacity = "0"
      closeTimer = window.setTimeout(() => leave(route), reduce ? 0 : 300)
    } else {
      panel.style.transform = "translateY(0)"
      dim.style.opacity = "1"
    }
  }
  panel.addEventListener("pointerup", finish)
  panel.addEventListener("pointercancel", finish)
}

function trapFocus(event, root) {
  const nodes = [...root.querySelectorAll("button, a, input")].filter((el) => !el.closest("[hidden]") && !el.disabled)
  if (!nodes.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

document.addEventListener("gesturestart", (event) => event.preventDefault())
document.addEventListener("touchmove", (event) => {
  if (event.touches && event.touches.length > 1) event.preventDefault()
}, { passive: false })

window.addEventListener("hashchange", () => {
  if (suppress) {
    suppress = false
    lastHash = location.hash
    return
  }
  if (dirty) {
    const ok = window.confirm("Ci sono modifiche non salvate. Vuoi uscire?")
    if (!ok) {
      suppress = true
      location.hash = lastHash
      return
    }
    dirty = false
  }
  lastHash = location.hash
  render()
})

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return
  event.preventDefault()
  event.returnValue = ""
})

dockIndex = dockIndexOf(parseRoute())
if (!location.hash) location.hash = "#/mese"
else render()
