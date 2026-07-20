/**
 * cv-app.js
 * -----------------------------------------------------------------------
 * Gestisce l'analisi del CV, il matching intelligente con le offerte
 * (max 3 per azienda), l'iniezione delle parole chiave nell'introduzione
 * e il download del CV e della Cover Letter.
 * -----------------------------------------------------------------------
 */

const JOBS_DATA_URL = "data/jobs.json";
let rawJobsData = null;
let userCvText = "";
let selectedJob = null;

// Target Roles predefiniti per formare le offerte se data/jobs.json non contiene dati per alcune aziende
const FALLBACK_JOBS_CATALOG = {
  linkedin: [
    { title: "Solutions Consultant - Tech Sales", department: "Presales & Consulting", location: "Milano / Remote", keywords: ["Solutions Consultant", "Tech Sales", "SaaS", "Client Engagement", "Demo"] },
    { title: "Enterprise Account Executive - Cloud", department: "Commercial Sales", location: "Roma / Hybrid", keywords: ["Account Executive", "Cloud Solutions", "B2B Sales", "Deal Strategy"] },
    { title: "Business Development Representative", department: "Sales Development", location: "Dublin, Ireland", keywords: ["Lead Generation", "Outreach", "Pipeline", "CRM", "Tech Sales"] }
  ],
  ibm: [
    { title: "Junior Technology Consultant", department: "IBM Consulting", location: "Milano / Roma", keywords: ["Consulting", "Cloud Architecture", "Digital Transformation", "Client Support"] },
    { title: "Pre-Sales Specialist - Data & AI", department: "Technology Sales", location: "Smart Working", keywords: ["Data & AI", "Pre-Sales", "Proof of Concept", "Technical Sales"] },
    { title: "Associate Solution Engineer", department: "Technical Sales", location: "Madrid / Virtual", keywords: ["Solution Architecture", "API Integration", "Enterprise IT"] }
  ],
  meta: [
    { title: "Client Solutions Manager", department: "Global Business Group", location: "Dublin, Ireland", keywords: ["Account Management", "Digital Strategy", "Analytics", "Growth"] },
    { title: "Partner Solutions Engineer", department: "Engineering & Partnerships", location: "Zurich, Switzerland", keywords: ["API", "Partner Integration", "Technical Consulting", "SDK"] },
    { title: "Business Development Associate", department: "Meta for Work", location: "Paris, France", keywords: ["B2B Sales", "Workplace Solutions", "Customer Acquisition"] }
  ],
  microsoft: [
    { title: "Technology Specialist - Early Career", department: "Microsoft Solutions", location: "Dublin, Ireland", keywords: ["Azure", "Digital Sales", "Cloud Infrastructure", "Customer Success"] },
    { title: "Digital Sales Representative", department: "Corporate Sales", location: "Dublin / Hybrid", keywords: ["B2B Sales", "Microsoft 365", "Pipeline Management", "Consulting"] },
    { title: "Solutions Architect - Associate", department: "Customer Success", location: "Milano, Italy", keywords: ["Architecture", "Azure Cloud", "Technical Presales"] }
  ],
  google: [
    { title: "Customer Engineer - Early Career", department: "Google Cloud", location: "Dublin, Ireland", keywords: ["Google Cloud Platform", "Kubernetes", "Technical Sales", "Demos"] },
    { title: "Associate Account Strategist", department: "Google Customer Solutions", location: "Milan, Italy", keywords: ["Digital Marketing", "Consulting", "Account Management"] },
    { title: "Partner Sales Specialist", department: "Cloud Partnerships", location: "Rome, Italy", keywords: ["Partnerships", "Cloud Solutions", "Business Strategy"] }
  ],
  amazon: [
    { title: "Solutions Architect Associate", department: "AWS Sales & Marketing", location: "Dublino, Irlanda", keywords: ["AWS", "Cloud Computing", "Presales", "Infrastructure"] },
    { title: "Business Support Engineer - 1-3 Yrs", department: "Operations IT", location: "Milan, Italy", keywords: ["Troubleshooting", "IT Support", "Customer Facing", "Linux"] },
    { title: "Technical Account Manager", department: "AWS Enterprise Support", location: "Dublin, Ireland", keywords: ["Account Management", "Cloud Support", "Stakeholder Engagement"] }
  ],
  ebay: [
    { title: "Technical Account Specialist", department: "Seller Solutions", location: "Remote / Europe", keywords: ["E-commerce", "APIs", "Technical Integration", "Account Management"] },
    { title: "Business Analyst - Commercial", department: "Strategy & Ops", location: "International", keywords: ["SQL", "Data Analytics", "Commercial Growth"] }
  ],
  netflix: [
    { title: "Partner Solutions Coordinator", department: "EMEA Partnerships", location: "Amsterdam / EMEA", keywords: ["Partner Operations", "Streaming Tech", "Project Management"] },
    { title: "Technical Operations Specialist", department: "Content Delivery", location: "EMEA Regional", keywords: ["CDN", "Video Encoding", "Operations", "Tech Support"] }
  ]
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadJobsData();
  setupEvents();
});

async function loadJobsData() {
  try {
    const res = await fetch(JOBS_DATA_URL, { cache: "no-store" });
    if (res.ok) {
      rawJobsData = await res.json();
    }
  } catch (err) {
    rawJobsData = { sources: {} };
  }
}

function setupEvents() {
  const fileInput = document.getElementById("cv-file-input");
  const dropzone = document.getElementById("dropzone");
  const btnAnalyze = document.getElementById("btn-analyze");

  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelect);
  }

  if (dropzone) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dropzone--active");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dropzone--active"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dropzone--active");
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
      }
    });
  }

  if (btnAnalyze) {
    btnAnalyze.addEventListener("click", analyzeCVAndMatch);
  }

  // Modal actions
  document.getElementById("btn-close-modal")?.addEventListener("click", closeModal);
  document.getElementById("tab-cv")?.addEventListener("click", () => switchTab("cv"));
  document.getElementById("tab-cover")?.addEventListener("click", () => switchTab("cover"));
  document.getElementById("btn-download-cv")?.addEventListener("click", () => downloadFile("CV_ATS_Optimized.txt", document.getElementById("cv-output-text").value));
  document.getElementById("btn-download-cover")?.addEventListener("click", () => downloadFile("Cover_Letter.txt", document.getElementById("cover-output-text").value));
}

function handleFileSelect() {
  const fileInput = document.getElementById("cv-file-input");
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("cv-text-input").value = e.target.result;
  };
  reader.readAsText(file);
}

function analyzeCVAndMatch() {
  userCvText = document.getElementById("cv-text-input").value.trim();
  if (!userCvText) {
    alert("Per favore, inserisci o carica prima il testo del tuo Curriculum Vitae.");
    return;
  }

  const resultsSection = document.getElementById("matching-results-section");
  const container = document.getElementById("company-matches-grid");
  container.innerHTML = "";
  resultsSection.hidden = false;

  COMPANIES.forEach((company) => {
    const matchedJobs = getTop3JobsForCompany(company);
    renderCompanyCard(company, matchedJobs, container);
  });

  resultsSection.scrollIntoView({ behavior: "smooth" });
}

function getTop3JobsForCompany(company) {
  let list = [];

  // Se ci sono dati live scritti dalla GitHub Action
  if (rawJobsData && rawJobsData.sources && rawJobsData.sources[company.id] && rawJobsData.sources[company.id].ok) {
    list = rawJobsData.sources[company.id].jobs.map((j) => ({
      title: j.title,
      department: j.department || company.name,
      location: j.location || "Location da bando",
      url: j.url || company.url,
      keywords: extractKeywordsFromTitle(j.title)
    }));
  }

  // Fallback se le posizioni live sono poche o assenti
  if (list.length < 3) {
    const fallbacks = FALLBACK_JOBS_CATALOG[company.id] || [];
    fallbacks.forEach((fb) => {
      if (list.length < 3) {
        list.push({
          title: fb.title,
          department: fb.department,
          location: fb.location,
          url: company.url,
          keywords: fb.keywords
        });
      }
    });
  }

  // Calcola Score di pertinenza e ordina
  const scored = list.map((job) => {
    let score = 0;
    job.keywords.forEach((kw) => {
      if (userCvText.toLowerCase().includes(kw.toLowerCase())) {
        score += 2;
      }
    });
    return { ...job, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3); // MAX 3 posizioni per azienda
}

function extractKeywordsFromTitle(title) {
  const found = [];
  KEYWORDS.forEach((kw) => {
    if (title.toLowerCase().includes(kw.toLowerCase())) {
      found.push(kw);
    }
  });
  if (found.length === 0) {
    found.push("Technical Sales", "Pre-Sales", "Consulting", "Client Engagement");
  }
  return [...new Set(found)];
}

function renderCompanyCard(company, jobs, container) {
  const card = document.createElement("div");
  card.className = "company-match-card";
  card.style.borderLeft = `4px solid ${company.color}`;

  let jobsHtml = jobs
    .map(
      (job, index) => `
    <div class="job-match-item" onclick="openTailorModal('${company.id}', ${index})">
      <div class="job-match-item__header">
        <span class="job-match-item__title">${escapeHtml(job.title)}</span>
        <span class="btn btn--gate btn--small">Ottimizza CV & Cover ↗</span>
      </div>
      <div class="job-match-item__meta">
        📍 ${escapeHtml(job.location)} · 🏢 ${escapeHtml(job.department)}
      </div>
      <div class="job-match-item__keywords">
        ${job.keywords.map((k) => `<span class="tag">${escapeHtml(k)}</span>`).join("")}
      </div>
    </div>
  `
    )
    .join("");

  card.innerHTML = `
    <div class="company-match-card__header">
      <span class="code-badge" style="background:${company.color}22; color:${company.color}">${company.code}</span>
      <h3>${company.name}</h3>
    </div>
    <div class="company-match-card__body">
      ${jobsHtml}
    </div>
  `;

  // Salva temporaneamente i dati nel DOM per aprirli nel modal
  card.dataset.companyId = company.id;
  card.jobsData = jobs;

  container.appendChild(card);
}

window.openTailorModal = function (companyId, jobIndex) {
  const cards = Array.from(document.querySelectorAll(".company-match-card"));
  const targetCard = cards.find((c) => c.dataset.companyId === companyId);
  if (!targetCard) return;

  const job = targetCard.jobsData[jobIndex];
  const company = COMPANIES.find((c) => c.id === companyId);
  selectedJob = { ...job, companyName: company.name, companyCode: company.code };

  document.getElementById("modal-company-code").textContent = company.code;
  document.getElementById("modal-job-title").textContent = job.title;

  // Keywords
  const kwContainer = document.getElementById("modal-keywords-chips");
  kwContainer.innerHTML = job.keywords.map((kw) => `<span class="chip chip--active">${escapeHtml(kw)}</span>`).join("");

  // Genera CV ottimizzato (Iniettando parole chiave nell'introduzione)
  const tailoredCV = buildTailoredCV(userCvText, job, company.name);
  document.getElementById("cv-output-text").value = tailoredCV;

  // Genera Cover Letter
  const coverLetter = buildCoverLetter(job, company.name);
  document.getElementById("cover-output-text").value = coverLetter;

  document.getElementById("tailor-modal").hidden = false;
};

function buildTailoredCV(originalCv, job, companyName) {
  const keywordsList = job.keywords.join(", ");
  const atsHeader = `===================================================================
PROFILO PROFESSIONALE (OTTIMIZZATO ATS PER: ${job.title.toUpperCase()} @ ${companyName.toUpperCase()})
COMPETENZE CHIAVE IN EVIDENZA: ${keywordsList}
===================================================================\n\n`;

  // Se il CV ha già un'introduzione o profilo, aggiungiamo il blocco in cima mantenendo intatto il resto del curriculum
  return atsHeader + originalCv;
}

function buildCoverLetter(job, companyName) {
  const keywordsList = job.keywords.join(", ");
  return `Oggetto: Candidatura per la posizione di ${job.title} - ${companyName}

Gentile Team di Selezione di ${companyName},

Desidero sottoporre alla Vostra attenzione la mia candidatura per la posizione di ${job.title}. Seguo da tempo l'innovazione portata sul mercato da ${companyName} e ritengo che il mio background sia in forte sinergia con i requisiti del ruolo.

Nel corso delle mie esperienze ed attività di formazione, ho sviluppato ed affinato competenze chiave inerenti a ${keywordsList}. Sono abituato/a a coniugare analisi tecnica, visione strategica di business e gestione della relazione con gli stakeholder.

L'opportunità di contribuire ai progetti di ${companyName} nell'ambito ${job.department || "Tech & Sales"} rappresenta per me il contesto ideale in cui portare valore aggiunto immediato.

In allegato trasmetto il mio Curriculum Vitae aggiornato ed ottimizzato con le competenze specifiche per il ruolo. Resto a disposizione per un colloquio conoscitivo.

Cordiali saluti,

[Il Tuo Nome e Cognome]
[Telefono | Email | Profilo LinkedIn]`;
}

function closeModal() {
  document.getElementById("tailor-modal").hidden = true;
}

function switchTab(tab) {
  const isCv = tab === "cv";
  document.getElementById("tab-cv").classList.toggle("tab-btn--active", isCv);
  document.getElementById("tab-cover").classList.toggle("tab-btn--active", !isCv);
  document.getElementById("preview-cv-panel").hidden = !isCv;
  document.getElementById("preview-cover-panel").hidden = isCv;
}

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
