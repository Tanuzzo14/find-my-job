/**
 * app.js
 * -----------------------------------------------------------------------
 * Nessuna dipendenza esterna. Legge COMPANIES / KEYWORDS / SEARCH_DOMAINS
 * da config.js, disegna il tabellone, carica data/jobs.json (generato
 * dalla GitHub Action) per le righe "live", e gestisce il radar di
 * ricerca incrociata per parola chiave.
 * -----------------------------------------------------------------------
 */

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const JOBS_DATA_URL = "data/jobs.json";

let jobsData = null; // popolato da loadJobsData()
let activeKeyword = null;

/* ---------------------------------------------------------------------
 * Split-flap title
 * ------------------------------------------------------------------- */
function animateFlapTitle() {
  const el = document.getElementById("flap-title");
  const finalText = "TABELLONE PARTENZE";
  el.setAttribute("aria-label", finalText);

  if (REDUCED_MOTION) {
    el.textContent = finalText;
    return;
  }

  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ •";
  const chars = finalText.split("").map((ch, i) => {
    const span = document.createElement("span");
    span.className = "flap-char";
    span.textContent = ch === " " ? "\u00A0" : ch;
    el.appendChild(span);
    return { span, final: ch, delay: i * 45 };
  });

  chars.forEach(({ span, final, delay }) => {
    if (final === " ") return;
    let ticks = 8 + Math.floor(Math.random() * 6);
    let count = 0;
    setTimeout(function tick() {
      if (count < ticks) {
        span.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        count += 1;
        setTimeout(tick, 40);
      } else {
        span.textContent = final;
        span.classList.add("flap-char--settled");
      }
    }, delay);
  });
}

/* ---------------------------------------------------------------------
 * Board rows
 * ------------------------------------------------------------------- */
function renderBoard() {
  const body = document.getElementById("board-body");
  body.innerHTML = "";

  COMPANIES.forEach((company, index) => {
    const row = document.createElement("div");
    row.className = "board__row";
    row.style.setProperty("--company-color", company.color);
    row.style.setProperty("--row-delay", `${index * 60}ms`);

    row.innerHTML = `
      <span class="col col--code"><span class="code-badge">${company.code}</span></span>
      <span class="col col--company">${company.name}</span>
      <span class="col col--filters">${company.filters}</span>
      <span class="col col--status">
        ${
          company.live
            ? `<span class="status status--live"><i class="status-dot"></i>LIVE</span>`
            : `<span class="status status--direct">RICERCA DIRETTA</span>`
        }
      </span>
      <span class="col col--gate">
        ${
          company.live
            ? `<button type="button" class="btn btn--ghost" data-toggle="${company.id}" aria-expanded="false">Vedi posizioni ▾</button>`
            : ``
        }
        <a class="btn btn--gate" href="${company.url}" target="_blank" rel="noopener noreferrer">Apri ricerca →</a>
      </span>
    `;
    body.appendChild(row);

    if (company.live) {
      const panel = document.createElement("div");
      panel.className = "live-details";
      panel.id = `panel-${company.id}`;
      panel.hidden = true;
      panel.innerHTML = `<div class="live-details__inner" data-jobs-for="${company.id}"></div>`;
      body.appendChild(panel);
    }
  });

  body.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => toggleLivePanel(btn.dataset.toggle, btn));
  });
}

function toggleLivePanel(companyId, btn) {
  const panel = document.getElementById(`panel-${companyId}`);
  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  btn.setAttribute("aria-expanded", String(willOpen));
  btn.textContent = willOpen ? "Nascondi posizioni ▴" : "Vedi posizioni ▾";
  if (willOpen) renderLiveJobs(companyId);
}

/* ---------------------------------------------------------------------
 * data/jobs.json
 * ------------------------------------------------------------------- */
async function loadJobsData() {
  try {
    const res = await fetch(JOBS_DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    jobsData = await res.json();
  } catch (err) {
    jobsData = { generated_at: null, sources: {} };
  }
  updateLastUpdated();
}

function updateLastUpdated() {
  const el = document.getElementById("last-updated");
  if (!jobsData || !jobsData.generated_at) {
    el.textContent = "in attesa del primo aggiornamento automatico";
    return;
  }
  const d = new Date(jobsData.generated_at);
  el.textContent = `dati live aggiornati il ${d.toLocaleDateString("it-IT")} alle ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
}

function renderLiveJobs(companyId) {
  const container = document.querySelector(`[data-jobs-for="${companyId}"]`);
  if (!container) return;

  const source = jobsData && jobsData.sources ? jobsData.sources[companyId] : null;

  if (!source) {
    container.innerHTML = emptyState(
      "Nessun dato ancora disponibile.",
      "Esegui manualmente il workflow «Aggiorna offerte» dalla scheda Actions del repository, oppure attendi il primo aggiornamento automatico giornaliero."
    );
    return;
  }

  if (!source.ok) {
    container.innerHTML = emptyState(
      "L'ultimo aggiornamento automatico non è riuscito.",
      "Il sito dell'azienda potrebbe aver cambiato struttura. Usa nel frattempo il pulsante «Apri ricerca →» qui sopra."
    );
    return;
  }

  let jobs = source.jobs || [];
  if (activeKeyword) {
    const needle = activeKeyword.toLowerCase();
    jobs = jobs.filter((j) => (j.title || "").toLowerCase().includes(needle));
  }

  if (jobs.length === 0) {
    container.innerHTML = emptyState(
      activeKeyword ? `Nessuna posizione live corrisponde a "${activeKeyword}".` : "Nessuna posizione trovata nell'ultimo aggiornamento.",
      "Prova a rimuovere il filtro parola chiave o usa «Apri ricerca →» per la ricerca completa sul sito."
    );
    return;
  }

  container.innerHTML = `
    <ul class="job-list">
      ${jobs
        .slice(0, 25)
        .map(
          (job) => `
        <li class="job-list__item">
          <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="job-list__title">${escapeHtml(job.title || "Posizione senza titolo")}</a>
          ${job.location ? `<span class="job-list__meta">${escapeHtml(job.location)}</span>` : ""}
          ${job.department ? `<span class="job-list__meta job-list__meta--muted">${escapeHtml(job.department)}</span>` : ""}
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

function emptyState(title, detail) {
  return `<div class="empty-state"><p class="empty-state__title">${title}</p><p class="empty-state__detail">${detail}</p></div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------------------------------------------------------------
 * Radar: parole chiave + ricerca incrociata
 * ------------------------------------------------------------------- */
function renderKeywordChips() {
  const wrap = document.getElementById("keyword-chips");
  wrap.innerHTML = KEYWORDS.map((kw) => `<button type="button" class="chip" data-keyword="${escapeHtml(kw)}">${escapeHtml(kw)}</button>`).join("");

  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const kw = chip.dataset.keyword;
      const isActive = chip.classList.contains("chip--active");
      wrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("chip--active"));
      activeKeyword = isActive ? null : kw;
      if (activeKeyword) chip.classList.add("chip--active");

      // Aggiorna eventuali pannelli live già aperti con il nuovo filtro
      COMPANIES.filter((c) => c.live).forEach((c) => {
        const panel = document.getElementById(`panel-${c.id}`);
        if (panel && !panel.hidden) renderLiveJobs(c.id);
      });

      document.getElementById("radar-input").value = activeKeyword || "";
    });
  });
}

function buildCrossSearchUrl(keyword) {
  const sites = SEARCH_DOMAINS.map((d) => `site:${d}`).join(" OR ");
  const query = `"${keyword}" ("entry level" OR junior OR graduate OR "0-3 years" OR neolaureat*) (${sites})`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function initRadarForm() {
  const form = document.getElementById("radar-form");
  const input = document.getElementById("radar-input");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const keyword = (input.value || activeKeyword || "").trim();
    if (!keyword) {
      input.focus();
      return;
    }
    window.open(buildCrossSearchUrl(keyword), "_blank", "noopener,noreferrer");
  });
}

/* ---------------------------------------------------------------------
 * Bootstrap
 * ------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  animateFlapTitle();
  renderBoard();
  renderKeywordChips();
  initRadarForm();
  await loadJobsData();
});
