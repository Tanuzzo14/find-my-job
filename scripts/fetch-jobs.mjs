/**
 * scripts/fetch-jobs.mjs
 * -----------------------------------------------------------------------
 * Gira dentro la GitHub Action (Node 20+, fetch nativo, zero dipendenze).
 * Scarica le pagine di ricerca di Google e Netflix — le uniche due, tra le
 * 7 aziende, che restituiscono dati reali già nell'HTML della richiesta
 * server-side — ed estrae le posizioni aperte in data/jobs.json.
 *
 * Le altre 5 aziende (IBM, Meta, Microsoft, Amazon, eBay) caricano i
 * risultati via JavaScript lato client dopo il primo render, quindi non
 * sono leggibili con una semplice richiesta HTTP: per quelle il sito usa
 * il link di ricerca diretto già filtrato (vedi assets/js/config.js).
 *
 * Se una fonte cambia struttura e l'estrazione fallisce, lo script non si
 * blocca: scrive ok:false per quella fonte e il sito mostra comunque il
 * pulsante "Apri ricerca" come fallback.
 * -----------------------------------------------------------------------
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "data", "jobs.json");

const SOURCES = {
  netflix: {
    url: "https://explore.jobs.netflix.net/careers?pid=790316757236&Region=emea&domain=netflix.com&sort_by=relevance",
    parser: parseNetflix,
  },
  google: {
    url: "https://www.google.com/about/careers/applications/jobs/results?target_level=EARLY&employment_type=FULL_TIME&jlo=en-US&location=Dublin%2C+Ireland&location=Italy",
    parser: parseGoogle,
  },
};

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; personal-job-board-tracker/1.0; +https://github.com)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  return await res.text();
}

/** Estrae un array JSON bilanciando le parentesi quadre, senza assumere
 *  nulla sulla formattazione interna: robusto a minimi cambi di struttura. */
function extractBalancedArray(text, key) {
  const marker = `"${key}":[`;
  const start = text.indexOf(marker);
  if (start === -1) return [];
  let depth = 0;
  let end = -1;
  for (let i = start + marker.length - 1; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return [];
  const raw = text.slice(start + marker.length - 1, end + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function parseNetflix(html) {
  const positions = extractBalancedArray(html, "positions");
  return positions.map((p) => ({
    title: p.name || p.posting_name || "Posizione senza titolo",
    location: Array.isArray(p.locations) ? p.locations.join(", ") : p.location || null,
    department: p.department || null,
    url: p.canonicalPositionUrl || null,
    updated: p.t_update ? new Date(p.t_update * 1000).toISOString() : null,
  }));
}

/** Google usa nomi di classe generati dinamicamente (non stabili da usare
 *  come selettori), ma ogni annuncio ha un URL con id + slug leggibile:
 *  .../jobs/results/<id>-<slug-del-titolo>. Ricaviamo il titolo dallo slug
 *  invece di affidarci a selettori CSS fragili. */
function parseGoogle(html) {
  const re = /jobs\/results\/(\d+)-([a-z0-9-]+)/gi;
  const seen = new Map();
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, id, slug] = m;
    if (seen.has(id)) continue;
    seen.set(id, {
      title: slugToTitle(slug),
      location: null,
      department: null,
      url: `https://www.google.com/about/careers/applications/jobs/results/${id}-${slug}`,
      updated: null,
    });
  }
  return Array.from(seen.values());
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function run() {
  const result = { generated_at: new Date().toISOString(), sources: {} };

  for (const [key, { url, parser }] of Object.entries(SOURCES)) {
    try {
      const html = await fetchText(url);
      const jobs = parser(html);
      result.sources[key] = { ok: true, count: jobs.length, jobs };
      console.log(`[${key}] ${jobs.length} posizioni trovate`);
    } catch (err) {
      result.sources[key] = { ok: false, error: String((err && err.message) || err), jobs: [] };
      console.error(`[${key}] errore:`, err);
    }
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2) + "\n", "utf-8");
  console.log("data/jobs.json aggiornato:", result.generated_at);
}

run();
