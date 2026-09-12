/**
 * Builds __snapshots__/index.html — a contact sheet of every baseline, one row per page state and
 * one column per viewport width, so a whole breakpoint matrix can be eyeballed at once.
 *
 *   npm run test:visual:index && xdg-open test/visual/__snapshots__/index.html
 *
 * Reads only what is on disk; run it after a baseline or a compare run. The file lives inside the
 * gitignored snapshots folder, so nothing here ends up in the repo.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SNAPSHOTS = path.join(HERE, "__snapshots__")
const OUT = path.join(SNAPSHOTS, "index.html")

// project folder name (w320, w1200, …) sorted by the number in it
const projects = fs
  .readdirSync(SNAPSHOTS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^w\d+$/.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))

if (projects.length === 0) {
  console.error(`No baselines in ${SNAPSHOTS} — run: npm run test:visual:update`)
  process.exit(1)
}

// { "<spec file>": { "<shot name>": { "<project>": { href, bytes } } } }
const shots = {}
let total = 0
let bytes = 0
for (const project of projects) {
  const projectDir = path.join(SNAPSHOTS, project)
  for (const spec of fs.readdirSync(projectDir).filter((name) => name.endsWith(".ts"))) {
    for (const file of fs.readdirSync(path.join(projectDir, spec))) {
      if (!file.endsWith(".png")) continue
      const name = file.replace(/\.png$/, "")
      const size = fs.statSync(path.join(projectDir, spec, file)).size
      shots[spec] ??= {}
      shots[spec][name] ??= {}
      shots[spec][name][project] = { href: `${project}/${spec}/${file}`, bytes: size }
      total += 1
      bytes += size
    }
  }
}

const meta = fs.existsSync(path.join(SNAPSHOTS, "meta.json"))
  ? JSON.parse(fs.readFileSync(path.join(SNAPSHOTS, "meta.json"), "utf8"))
  : {}
const mib = (value) => `${(value / 1024 / 1024).toFixed(1)} MiB`

const rows = Object.entries(shots)
  .sort()
  .map(([spec, states]) => {
    const body = Object.entries(states)
      .sort()
      .map(([name, byProject]) => {
        const cells = projects
          .map((project) => {
            const shot = byProject[project]
            if (!shot) return `<td class="missing" data-w="${project}">—</td>`
            return `<td data-w="${project}"><a href="${shot.href}" target="_blank"><img loading="lazy" src="${shot.href}" alt="${name} ${project}"></a></td>`
          })
          .join("")
        return `<tr class="shot" data-name="${name}"><th>${name}</th>${cells}</tr>`
      })
      .join("\n")
    return `<tbody class="spec"><tr class="spec-head"><th colspan="${
      projects.length + 1
    }">${spec}</th></tr>\n${body}</tbody>`
  })
  .join("\n")

const html = `<!doctype html>
<meta charset="utf-8">
<title>dreamingsheep visual baselines</title>
<style>
  :root { color-scheme: light dark; --line: #8884; }
  body { margin: 0; font: 13px/1.5 system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 2; padding: 10px 14px; background: Canvas;
           border-bottom: 1px solid var(--line); display: flex; gap: 14px; align-items: center;
           flex-wrap: wrap; }
  h1 { font-size: 15px; margin: 0; }
  .muted { opacity: .65; }
  input[type="search"] { padding: 5px 9px; min-width: 220px; }
  label { display: inline-flex; gap: 5px; align-items: center; }
  table { border-collapse: collapse; width: max-content; }
  th { text-align: left; font-weight: 600; }
  tbody.spec > tr.spec-head th { padding: 18px 14px 6px; font-size: 14px; opacity: .7; }
  tr.shot > th { position: sticky; left: 0; background: Canvas; padding: 6px 14px; vertical-align: top;
                 white-space: nowrap; border-top: 1px solid var(--line); }
  td { padding: 6px; vertical-align: top; border-top: 1px solid var(--line); }
  td.missing { text-align: center; opacity: .4; }
  img { display: block; width: var(--thumb, 170px); height: auto; max-height: var(--cap, 520px);
        object-fit: contain; object-position: top; background: #0002; }
  thead th { position: sticky; top: 43px; background: Canvas; padding: 6px; font-size: 12px;
             border-bottom: 1px solid var(--line); z-index: 1; }
  thead th:first-child { left: 0; z-index: 2; }
</style>
<header>
  <h1>visual baselines</h1>
  <span class="muted">${total} shots · ${mib(bytes)} · seeded ${meta.seedDate ?? "?"} · capture ${
  meta.capture ?? "?"
}</span>
  <input type="search" id="filter" placeholder="filter by name (e.g. settings, dialog, 320)">
  <label>size <input type="range" id="thumb" min="110" max="460" value="170"></label>
  <label><input type="checkbox" id="full"> full height</label>
</header>
<table>
  <thead><tr><th>state</th>${projects
    .map((p) => `<th data-w="${p}">${p.slice(1)}px</th>`)
    .join("")}</tr></thead>
  ${rows}
</table>
<script>
  const filter = document.getElementById("filter")
  filter.addEventListener("input", () => {
    const term = filter.value.trim().toLowerCase()
    const widthTerm = /^\\d+$/.test(term) ? "w" + term : null
    for (const cell of document.querySelectorAll("td[data-w], thead th[data-w]")) {
      cell.hidden = Boolean(widthTerm) && cell.dataset.w !== widthTerm
    }
    for (const row of document.querySelectorAll("tr.shot")) {
      row.hidden = Boolean(term) && !widthTerm && !row.dataset.name.includes(term)
    }
    for (const spec of document.querySelectorAll("tbody.spec")) {
      const visible = [...spec.querySelectorAll("tr.shot")].some((row) => !row.hidden)
      spec.querySelector(".spec-head").hidden = !visible
    }
  })
  document.getElementById("thumb").addEventListener("input", (event) => {
    document.documentElement.style.setProperty("--thumb", event.target.value + "px")
  })
  document.getElementById("full").addEventListener("change", (event) => {
    document.documentElement.style.setProperty("--cap", event.target.checked ? "none" : "520px")
  })
</script>
`

fs.writeFileSync(OUT, html)
console.log(`${OUT}\n${total} shots across ${projects.length} widths, ${mib(bytes)} on disk`)
