# Career Control Board — GitHub Pages Ready

Dashboard statica pensata per GitHub Pages che ti mostra solo le aziende target e solo i ruoli coerenti con il tuo focus:

- **entry level / early career**
- **massimo 3 anni di esperienza**
- **pre-sales / tech sales / solution consulting / business support / IT specialist**
- filtro extra aggiunto: **Hybrid / Remote**

Il progetto resta **100% client-side**: nessuna API AI lato server.

## Cosa fa adesso

### 1. Tabellone principale

- Mostra **8 aziende target** in un'unica UI.
- Per ogni azienda puoi aprire una **shortlist interna** senza aprire 10 tab.
- Le shortlist mostrano solo ruoli coerenti con il focus desiderato.
- Per **Google** e **Netflix** integra dati live salvati in `data/jobs.json`.
- Per le altre aziende usa shortlist curate + link alla ricerca già filtrata.

### 2. CV Matcher & ATS Tailor

- Caricamento client-side di file **`.txt` / `.md`** oppure incolla manuale del testo CV.
- Matching di **massimo 3 annunci per azienda**.
- Click sull'annuncio = apertura preview con:
  - **CV personalizzato**
  - **cover letter personalizzata**
  - **link all'annuncio originale**
- Il CV viene adattato **solo nell'introduzione/profilo iniziale**, lasciando invariato il resto.

## File da caricare su GitHub per avere il sito pronto

Carica l'intero repository mantenendo la struttura:

- `/index.html`
- `/cv-matcher.html`
- `/.nojekyll`
- `/assets/css/style.css`
- `/assets/js/config.js`
- `/assets/js/app.js`
- `/assets/js/cv-app.js`
- `/data/jobs.json`
- `/.github/workflows/update-jobs.yml`
- `/scripts/fetch-jobs.mjs`

## Pubblicazione su GitHub Pages

1. Crea o aggiorna il repository su GitHub.
2. Carica i file sopra mantenendo le cartelle.
3. In **Settings → Actions → General → Workflow permissions** abilita **Read and write permissions**.
4. In **Settings → Pages** scegli **Deploy from a branch**, branch `main`, cartella `/ (root)`.
5. Salva e attendi la pubblicazione.
6. Facoltativo: esegui manualmente la workflow **Aggiorna offerte di lavoro** per aggiornare subito `data/jobs.json`.

## Dove aggiornare i filtri

Tutta la configurazione si trova in:

- `/assets/js/config.js`

Qui puoi modificare:

- aziende e URL già filtrati
- keyword dei ruoli
- filtri focus
- shortlist curate per azienda

## Nota importante

Su GitHub Pages statico non è possibile leggere in modo affidabile tutti i career site che costruiscono i risultati via JavaScript senza un backend o un browser automation completo. Per questo:

- **Google / Netflix** = dati live se disponibili
- **altre aziende** = esperienza client-side con shortlist + link di ricerca pronti

Questa scelta mantiene il sito leggero, deployabile e pronto all'uso anche senza backend.
