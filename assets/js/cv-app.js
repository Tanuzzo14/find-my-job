const JOBS_DATA_URL = "data/jobs.json";

let rawJobsData = { sources: {} };
let userCvText = "";
let selectedJob = null;
let lastFocusedElement = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadJobsData();
  setupEvents();
});

async function loadJobsData() {
  try {
    const response = await fetch(JOBS_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rawJobsData = await response.json();
  } catch (error) {
    rawJobsData = { sources: {} };
  }
}

function setupEvents() {
  const fileInput = document.getElementById("cv-file-input");
  const dropzone = document.getElementById("dropzone");
  const btnAnalyze = document.getElementById("btn-analyze");
  const modal = document.getElementById("tailor-modal");

  fileInput?.addEventListener("change", handleFileSelect);

  dropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dropzone--active");
  });

  dropzone?.addEventListener("dragleave", () => {
    dropzone.classList.remove("dropzone--active");
  });

  dropzone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dropzone--active");
    if (!event.dataTransfer.files.length) return;
    fileInput.files = event.dataTransfer.files;
    handleFileSelect();
  });

  btnAnalyze?.addEventListener("click", analyzeCVAndMatch);
  document.getElementById("btn-close-modal")?.addEventListener("click", closeModal);
  document.getElementById("tab-cv")?.addEventListener("click", () => switchTab("cv"));
  document.getElementById("tab-cover")?.addEventListener("click", () => switchTab("cover"));
  document.getElementById("btn-download-cv")?.addEventListener("click", () => downloadCurrentDocument("cv"));
  document.getElementById("btn-download-cover")?.addEventListener("click", () => downloadCurrentDocument("cover"));
  document.getElementById("btn-open-job")?.addEventListener("click", openSelectedJob);

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeModal();
    }
  });
}

async function handleFileSelect() {
  const fileInput = document.getElementById("cv-file-input");
  const file = fileInput?.files?.[0];
  if (!file) return;

  const extension = getFileExtension(file.name);
  if (!["txt", "md"].includes(extension)) {
    showStatus("Per mantenere tutto 100% client-side senza dipendenze esterne, carica un file .txt/.md oppure incolla il testo del CV qui sotto.", "warning");
    fileInput.value = "";
    return;
  }

  try {
    const text = await file.text();
    document.getElementById("cv-text-input").value = text;
    showStatus(`CV caricato: ${file.name}. Ora puoi analizzarlo e trovare fino a 3 annunci per ogni azienda.`, "success");
  } catch (error) {
    showStatus("Non sono riuscito a leggere il file. Incolla il testo del CV e riprova.", "error");
  }
}

function analyzeCVAndMatch() {
  userCvText = document.getElementById("cv-text-input").value.trim();
  if (!userCvText) {
    showStatus("Inserisci o incolla il testo del tuo CV prima di avviare il matching.", "error");
    return;
  }

  const resultsSection = document.getElementById("matching-results-section");
  const container = document.getElementById("company-matches-grid");
  container.innerHTML = "";

  COMPANIES.forEach((company) => {
    const matchedJobs = getTopJobsForCompany(company);
    renderCompanyCard(company, matchedJobs, container);
  });

  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  showStatus("Shortlist aggiornata: ogni card mostra massimo 3 annunci coerenti con il tuo CV e con il focus pre-sales / entry level.", "success");
}

function getTopJobsForCompany(company) {
  const jobs = getCompanyJobs(company)
    .filter(matchesTargetProfile)
    .map((job) => ({ ...job, score: scoreJob(job, userCvText) }))
    .sort((left, right) => right.score - left.score);

  return jobs.slice(0, 3);
}

function getCompanyJobs(company) {
  const liveSource = rawJobsData.sources?.[company.id];
  const liveJobs =
    company.live && liveSource?.ok
      ? (liveSource.jobs || []).map((job) => normalizeJob(company, job, "live"))
      : [];
  const catalogJobs = (JOB_CATALOG[company.id] || []).map((job) => normalizeJob(company, job, "shortlist"));
  return dedupeJobs([...liveJobs, ...catalogJobs]);
}

function normalizeJob(company, job, sourceType) {
  const keywords = Array.isArray(job.keywords) && job.keywords.length ? job.keywords : extractKeywords(job.title || "");
  const location = job.location || "Europa / focus tech";
  return {
    companyId: company.id,
    companyName: company.name,
    companyCode: company.code,
    title: job.title || "Posizione senza titolo",
    department: job.department || company.name,
    location,
    url: job.url || company.url,
    keywords,
    tags: Array.isArray(job.tags) ? job.tags : [],
    experience: job.experience || inferExperience(job.title || ""),
    workMode: job.workMode || inferWorkMode(location),
    sourceType,
  };
}

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = `${job.title.toLowerCase()}::${job.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreJob(job, cvText) {
  const cvLower = cvText.toLowerCase();
  const haystack = buildHaystack(job);
  let score = 0;

  KEYWORDS.forEach((keyword) => {
    if (cvLower.includes(keyword.toLowerCase()) && haystack.includes(keyword.toLowerCase())) {
      score += 5;
    }
  });

  job.keywords.forEach((keyword) => {
    if (cvLower.includes(keyword.toLowerCase())) score += 3;
  });

  TARGET_ROLE_TERMS.forEach((term) => {
    if (cvLower.includes(term) && haystack.includes(term)) score += 2;
  });

  if (job.sourceType === "live") score += 1;
  return score;
}

function renderCompanyCard(company, jobs, container) {
  const card = document.createElement("section");
  card.className = "company-match-card";
  card.style.borderLeft = `4px solid ${company.color}`;

  const jobsMarkup = jobs.length
    ? jobs
        .map(
          (job, index) => `
            <button type="button" class="job-match-item" data-company-id="${company.id}" data-job-index="${index}">
              <div class="job-match-item__header">
                <span class="job-match-item__title">${escapeHtml(job.title)}</span>
                <span class="btn btn--gate btn--small">Ottimizza CV & Cover ↗</span>
              </div>
              <div class="job-match-item__meta">📍 ${escapeHtml(job.location)} · 🏢 ${escapeHtml(job.department)}</div>
              <div class="job-tags">
                <span class="tag">${escapeHtml(job.experience)}</span>
                <span class="tag">${escapeHtml(job.workMode)}</span>
                ${job.keywords.slice(0, 3).map((keyword) => `<span class="tag">${escapeHtml(keyword)}</span>`).join("")}
              </div>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state empty-state--card"><p class="empty-state__title">Nessun match utile.</p><p class="empty-state__detail">Per questa azienda non ci sono ruoli pertinenti con il focus attuale.</p></div>`;

  card.innerHTML = `
    <div class="company-match-card__header">
      <span class="code-badge" style="background:${company.color}22; color:${company.color}">${escapeHtml(company.code)}</span>
      <div>
        <h3>${escapeHtml(company.name)}</h3>
        <p class="company-match-card__subtitle">${escapeHtml(company.filters)}</p>
      </div>
    </div>
    <div class="company-match-card__body">${jobsMarkup}</div>
  `;

  card.jobsData = jobs;
  card.querySelectorAll(".job-match-item").forEach((button) => {
    button.addEventListener("click", () => {
      openTailorModal(card.jobsData[Number(button.dataset.jobIndex)]);
    });
  });

  container.appendChild(card);
}

function openTailorModal(job) {
  if (!job) return;

  lastFocusedElement = document.activeElement;
  selectedJob = job;

  document.getElementById("modal-company-code").textContent = job.companyCode;
  document.getElementById("modal-job-title").textContent = job.title;
  document.getElementById("modal-job-link").textContent = `${job.companyName} · Apri annuncio originale`;
  document.getElementById("modal-job-link").href = job.url;

  const keywordsContainer = document.getElementById("modal-keywords-chips");
  keywordsContainer.innerHTML = job.keywords.map((keyword) => `<span class="chip chip--active">${escapeHtml(keyword)}</span>`).join("");

  document.getElementById("cv-output-text").value = buildTailoredCV(userCvText, job);
  document.getElementById("cover-output-text").value = buildCoverLetter(job);
  document.getElementById("tailor-modal").hidden = false;
  switchTab("cv");
  document.getElementById("btn-close-modal").focus();
}

function buildTailoredCV(originalCv, job) {
  const tailoredIntro = buildTailoredIntro(job);
  return replaceIntroBlock(originalCv, tailoredIntro);
}

function buildTailoredIntro(job) {
  const keywordsList = job.keywords.join(", ");
  return [
    `Profilo professionale orientato a ${job.title} con focus su ${job.companyName}.`,
    `Background in ambito pre-sales, business support e consulenza IT con attenzione a ${keywordsList}.`,
    `Disponibilità a contribuire su attività customer-facing, discovery, supporto tecnico e coordinamento con stakeholder mantenendo un taglio entry level / 0-3 anni.`,
  ].join(" ");
}

function replaceIntroBlock(originalCv, tailoredIntro) {
  const normalized = originalCv.replace(/\r\n/g, "\n").trim();
  if (!normalized) return tailoredIntro;

  const blocks = normalized.split(/\n\s*\n/);
  if (!blocks.length) return tailoredIntro;

  if (blocks[0].length <= 900) {
    blocks[0] = tailoredIntro;
    return blocks.join("\n\n");
  }

  return `${tailoredIntro}\n\n${normalized}`;
}

function buildCoverLetter(job) {
  const keywordsList = job.keywords.join(", ");
  return `Oggetto: Candidatura per ${job.title} - ${job.companyName}

Gentile Team di Selezione di ${job.companyName},

desidero candidarmi per la posizione di ${job.title}. Il ruolo unisce consulenza, relazione con il cliente e capacità di tradurre esigenze business in soluzioni concrete: aree in cui desidero crescere e portare valore fin da subito.

Nel mio percorso ho sviluppato interesse e competenze su ${keywordsList}. Questo mi permette di contribuire con un approccio strutturato, orientato al cliente e coerente con contesti entry level / early career in ambito pre-sales, supporto business e IT.

Mi motiva in particolare la possibilità di contribuire al team ${job.department} in ${job.companyName}, collaborando su attività di analisi, supporto, coordinamento e valorizzazione delle soluzioni proposte.

In allegato trasmetto il mio CV personalizzato per il ruolo. Rimango volentieri a disposizione per un colloquio conoscitivo.

Cordiali saluti,

[Nome Cognome]
[Telefono]
[Email]
[LinkedIn]`;
}

function closeModal() {
  const modal = document.getElementById("tailor-modal");
  modal.hidden = true;
  document.getElementById("cv-output-text").value = "";
  document.getElementById("cover-output-text").value = "";
  selectedJob = null;
  lastFocusedElement?.focus?.();
}

function switchTab(tab) {
  const isCv = tab === "cv";
  document.getElementById("tab-cv").classList.toggle("tab-btn--active", isCv);
  document.getElementById("tab-cover").classList.toggle("tab-btn--active", !isCv);
  document.getElementById("preview-cv-panel").hidden = !isCv;
  document.getElementById("preview-cover-panel").hidden = isCv;
}

function downloadCurrentDocument(type) {
  if (!selectedJob) return;

  const filenameBase = `${selectedJob.companyCode}-${slugify(selectedJob.title)}`;
  if (type === "cv") {
    downloadFile(`${filenameBase}-cv-ats.txt`, document.getElementById("cv-output-text").value);
    return;
  }

  downloadFile(`${filenameBase}-cover-letter.txt`, document.getElementById("cover-output-text").value);
}

function openSelectedJob() {
  if (!selectedJob) return;
  window.open(selectedJob.url, "_blank", "noopener,noreferrer");
}

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function matchesTargetProfile(job) {
  const haystack = buildHaystack(job);
  const hasRoleMatch = TARGET_ROLE_TERMS.some((term) => haystack.includes(term));
  const hasExperienceMatch = EXPERIENCE_TERMS.some((term) => haystack.includes(term));
  return hasRoleMatch && hasExperienceMatch;
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

function extractKeywords(title) {
  const lowerTitle = String(title || "").toLowerCase();
  const matches = KEYWORDS.filter((keyword) => lowerTitle.includes(keyword.toLowerCase()));
  return matches.length ? matches : ["Technical Sales", "Pre-Sales", "Consulting", "Business Support"];
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getFileExtension(filename) {
  const parts = String(filename || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function showStatus(message, tone) {
  const box = document.getElementById("cv-status");
  box.hidden = false;
  box.textContent = message;
  box.className = `inline-status inline-status--${tone}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
