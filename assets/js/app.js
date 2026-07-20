const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const JOBS_DATA_URL = "data/jobs.json";
const DEDUPE_KEY_SEPARATOR = "::";

let jobsData = { generated_at: null, sources: {} };
let activeKeyword = "";
let activePreset = "";

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

function renderBoard() {
  const body = document.getElementById("board-body");
  body.innerHTML = "";

  COMPANIES.forEach((company, index) => {
    const row = document.createElement("div");
    row.className = "board__row";
    row.style.setProperty("--company-color", company.color);
    row.style.setProperty("--row-delay", `${index * 60}ms`);

    row.innerHTML = `
      <span class="col col--code"><span class="code-badge">${escapeHtml(company.code)}</span></span>
      <span class="col col--company">${escapeHtml(company.name)}</span>
      <span class="col col--filters">${escapeHtml(company.filters)}</span>
      <span class="col col--status">
        ${
          company.live
            ? `<span class="status status--live"><i class="status-dot"></i>LIVE</span>`
            : `<span class="status status--shortlist">SHORTLIST</span>`
        }
      </span>
      <span class="col col--gate">
        <button type="button" class="btn btn--ghost" data-toggle="${escapeHtml(company.id)}" aria-expanded="false">Vedi shortlist ▾</button>
        <a class="btn btn--gate" href="${company.url}" target="_blank" rel="noopener noreferrer">Apri ricerca →</a>
      </span>
    `;

    body.appendChild(row);

    const panel = document.createElement("div");
    panel.className = "live-details";
    panel.id = `panel-${company.id}`;
    panel.hidden = true;
    panel.innerHTML = `<div class="live-details__inner" data-jobs-for="${company.id}"></div>`;
    body.appendChild(panel);
  });

  body.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => toggleJobPanel(btn.dataset.toggle, btn));
  });
}

function toggleJobPanel(companyId, btn) {
  const panel = document.getElementById(`panel-${companyId}`);
  const willOpen = panel.hidden;
  panel.hidden = !willOpen;
  btn.setAttribute("aria-expanded", String(willOpen));
  btn.textContent = willOpen ? "Nascondi shortlist ▴" : "Vedi shortlist ▾";

  if (willOpen) {
    renderCompanyJobs(companyId);
  }
}

async function loadJobsData() {
  try {
    const res = await fetch(JOBS_DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    jobsData = await res.json();
  } catch (err) {
    jobsData = { generated_at: null, sources: {} };
  }
  updateLastUpdated();
  updateHeroMetrics();
}

function updateLastUpdated() {
  const el = document.getElementById("last-updated");
  if (!jobsData.generated_at) {
    el.textContent = "shortlist client-side pronta, in attesa del primo aggiornamento live";
    return;
  }

  const date = new Date(jobsData.generated_at);
  el.textContent = `dati live aggiornati il ${date.toLocaleDateString("it-IT")} alle ${date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function updateHeroMetrics() {
  const liveCount = COMPANIES.filter((company) => company.live).reduce((total, company) => {
    const jobs = getCompanyJobs(company).filter(matchesTargetProfile);
    return total + jobs.length;
  }, 0);

  document.getElementById("metric-companies").textContent = String(COMPANIES.length);
  document.getElementById("metric-live").textContent = String(liveCount);
  document.getElementById("metric-focus").textContent = "Entry · 0-3 · Pre-sales";
}

function renderCompanyJobs(companyId) {
  const company = COMPANIES.find((entry) => entry.id === companyId);
  const container = document.querySelector(`[data-jobs-for="${companyId}"]`);
  if (!company || !container) return;

  const jobs = getVisibleJobs(company);

  if (jobs.length === 0) {
    container.innerHTML = emptyState(
      "Nessuna posizione coerente con il focus attuale.",
      "Rimuovi un filtro oppure usa «Apri ricerca →» per consultare la pagina completa già preimpostata."
    );
    return;
  }

  container.innerHTML = `
    <div class="job-list__summary">
      <span class="job-list__summary-title">Top ${Math.min(3, jobs.length)} ${company.live ? "ruoli live + shortlist" : "ruoli shortlist"} per ${escapeHtml(company.name)}</span>
      <span class="job-list__summary-meta">Solo ruoli entry level / 0-3 anni in ambito pre-sales, consulting, business support o IT specialist.</span>
    </div>
    <ul class="job-list">
      ${jobs
        .slice(0, 3)
        .map(
          (job) => `
            <li class="job-list__item">
              <div class="job-list__content">
                <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="job-list__title">${escapeHtml(job.title)}</a>
                <div class="job-list__meta-wrap">
                  ${job.location ? `<span class="job-list__meta">${escapeHtml(job.location)}</span>` : ""}
                  ${job.department ? `<span class="job-list__meta job-list__meta--muted">${escapeHtml(job.department)}</span>` : ""}
                  ${job.experience ? `<span class="job-list__meta">${escapeHtml(job.experience)}</span>` : ""}
                  ${job.workMode ? `<span class="job-list__meta">${escapeHtml(job.workMode)}</span>` : ""}
                </div>
                <div class="job-tags">
                  ${job.keywords.slice(0, 4).map((keyword) => `<span class="tag">${escapeHtml(keyword)}</span>`).join("")}
                </div>
              </div>
              <span class="status ${job.sourceType === "live" ? "status--live" : "status--shortlist"}">${job.sourceType === "live" ? "LIVE" : "SHORTLIST"}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function getVisibleJobs(company) {
  return getCompanyJobs(company)
    .filter(matchesTargetProfile)
    .filter((job) => matchesKeyword(job, activeKeyword))
    .filter((job) => matchesPreset(job, activePreset));
}

function getCompanyJobs(company) {
  const liveSource = jobsData.sources && jobsData.sources[company.id];
  const liveJobs =
    company.live && liveSource && liveSource.ok
      ? (liveSource.jobs || []).map((job) => normalizeJob(company, job, "live"))
      : [];
  const catalogJobs = (JOB_CATALOG[company.id] || []).map((job) => normalizeJob(company, job, "shortlist"));

  return dedupeJobs([...liveJobs, ...catalogJobs]);
}

function normalizeJob(company, job, sourceType) {
  const keywords = Array.isArray(job.keywords) && job.keywords.length ? job.keywords : extractKeywords(job.title || "");
  const tags = Array.isArray(job.tags) ? job.tags : [];
  const location = job.location || "Europa / focus tech";
  const department = job.department || company.name;

  return {
    companyId: company.id,
    title: job.title || "Posizione senza titolo",
    department,
    location,
    url: job.url || company.url,
    keywords,
    tags,
    experience: job.experience || inferExperience(job.title || ""),
    workMode: job.workMode || inferWorkMode(location),
    sourceType,
  };
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = `${job.title.toLowerCase()}${DEDUPE_KEY_SEPARATOR}${job.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractKeywords(title) {
  const lowerTitle = String(title || "").toLowerCase();
  const matches = ORDERED_KEYWORDS.filter((keyword) => lowerTitle.includes(keyword.toLowerCase()));
  return matches.length ? matches : DEFAULT_KEYWORDS;
}

function inferExperience(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("1-3") || lowerTitle.includes("0-3")) return "0-3 anni";
  if (lowerTitle.includes("early")) return "Early career";
  if (lowerTitle.includes("graduate") || lowerTitle.includes("junior") || lowerTitle.includes("associate")) return "Entry level";
  return "Entry / 0-3 anni";
}

function inferWorkMode(location) {
  const lowerLocation = String(location || "").toLowerCase();
  if (lowerLocation.includes("remote") || lowerLocation.includes("virtual") || lowerLocation.includes("smart working")) return "Remote";
  if (lowerLocation.includes("hybrid")) return "Hybrid";
  return "Hybrid / On-site";
}

function matchesTargetProfile(job) {
  const haystack = buildHaystack(job);
  const hasRoleMatch = TARGET_ROLE_TERMS.some((term) => haystack.includes(term));
  const hasExperienceMatch = EXPERIENCE_TERMS.some((term) => haystack.includes(term));
  return hasRoleMatch && hasExperienceMatch;
}

function matchesKeyword(job, keyword) {
  if (!keyword) return true;
  return buildHaystack(job).includes(keyword.toLowerCase());
}

function matchesPreset(job, presetId) {
  if (!presetId) return true;
  const preset = FILTER_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) return true;
  const haystack = buildHaystack(job);
  return preset.terms.some((term) => haystack.includes(term));
}

function buildHaystack(job) {
  return [
    job.title,
    job.department,
    job.location,
    job.experience,
    job.workMode,
    ...(job.keywords || []),
    ...(job.tags || []),
  ]
    .join(" ")
    .toLowerCase();
}

function emptyState(title, detail) {
  return `<div class="empty-state"><p class="empty-state__title">${escapeHtml(title)}</p><p class="empty-state__detail">${escapeHtml(detail)}</p></div>`;
}

function renderPresetChips() {
  const wrap = document.getElementById("preset-chips");
  wrap.innerHTML = FILTER_PRESETS.map((preset) => `<button type="button" class="chip" data-preset="${preset.id}">${escapeHtml(preset.label)}</button>`).join("");

  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const presetId = chip.dataset.preset;
      const isActive = chip.classList.contains("chip--active");
      wrap.querySelectorAll(".chip").forEach((entry) => entry.classList.remove("chip--active"));
      activePreset = isActive ? "" : presetId;
      if (activePreset) chip.classList.add("chip--active");
      rerenderOpenPanels();
    });
  });
}

function renderKeywordChips() {
  const wrap = document.getElementById("keyword-chips");
  wrap.innerHTML = KEYWORDS.map((keyword) => `<button type="button" class="chip" data-keyword="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>`).join("");

  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const keyword = chip.dataset.keyword;
      const isActive = chip.classList.contains("chip--active");
      wrap.querySelectorAll(".chip").forEach((entry) => entry.classList.remove("chip--active"));
      activeKeyword = isActive ? "" : keyword;
      if (activeKeyword) chip.classList.add("chip--active");
      document.getElementById("radar-input").value = activeKeyword;
      rerenderOpenPanels();
    });
  });
}

function rerenderOpenPanels() {
  COMPANIES.forEach((company) => {
    const panel = document.getElementById(`panel-${company.id}`);
    if (panel && !panel.hidden) renderCompanyJobs(company.id);
  });
}

function buildCrossSearchUrl(keyword) {
  const sites = SEARCH_DOMAINS.map((domain) => `site:${domain}`).join(" OR ");
  const query = `"${keyword}" ("entry level" OR junior OR graduate OR associate OR "0-3 years" OR "1-3 years") (${sites})`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function initRadarForm() {
  const form = document.getElementById("radar-form");
  const input = document.getElementById("radar-input");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = (input.value || activeKeyword).trim();
    if (!keyword) {
      input.focus();
      return;
    }
    window.open(buildCrossSearchUrl(keyword), "_blank", "noopener,noreferrer");
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", async () => {
  animateFlapTitle();
  renderBoard();
  renderPresetChips();
  renderKeywordChips();
  initRadarForm();
  await loadJobsData();
});
