# Tabellone Partenze — Career Control Board

Una dashboard statica in stile tabellone aeroportuale che raccoglie in un'unica pagina le ricerche di lavoro **già filtrate** per 7 aziende (IBM, Meta, Microsoft, Google, Amazon, eBay, Netflix), così non devi più aprire dieci schede a mano.

## Come funziona (importante, leggi qui prima)

Un sito su GitHub Pages è **statico**: gira solo nel browser, non ha un server. Questo ha una conseguenza tecnica precisa:

- **Google e Netflix** restituiscono i risultati della ricerca già "dentro" alla pagina HTML quando viene caricata (dati lato server). Per queste due il sito mostra un badge **LIVE**: una GitHub Action gira ogni giorno, scarica quella pagina, estrae le posizioni aperte e le salva in `data/jobs.json`, che il sito legge e mostra come lista cliccabile direttamente nel tabellone.
- **IBM, Meta, Microsoft, Amazon ed eBay** costruiscono la lista risultati via JavaScript *dopo* il caricamento della pagina, chiamando le proprie API interne. Un sito statico (e anche una richiesta HTTP semplice da un server) non riesce a leggerle in modo affidabile senza un vero browser automatizzato — e comunque cambiano struttura spesso. Per queste il badge è **RICERCA DIRETTA**: il pulsante "Apri ricerca →" porta dritto alla pagina dei risultati con **tutti i filtri già impostati** (gli stessi che avevi costruito tu, invariati).

Risultato pratico: un solo posto dove vedere lo stato di tutte e 7, un click per ciascuna, zero digitazione ripetuta di filtri.

## Il radar delle parole chiave

In fondo alla pagina trovi una serie di ruoli entry-level pre-sales / tech sales che forse non avevi considerato (Solutions Consultant, Business Support Engineer, Technical Account Manager, Customer Engineer, Sales/Business Development Representative, ecc. — modificabili in `assets/js/config.js`). Cliccandone uno:

1. Filtra al volo le posizioni **live** (Google, Netflix) già mostrate nel tabellone.
2. Il pulsante "Cerca su tutte le aziende ↗" apre una ricerca Google con `site:` sui domini carriere di tutte e 7 le aziende insieme, senza bisogno di conoscere il formato dei filtri di ciascuna — funziona sempre, anche per le aziende senza dati live.

## Pubblicazione su GitHub Pages

1. Crea un repository nuovo (anche privato o pubblico, a tua scelta) su GitHub.
2. Carica **tutti** i file di questo pacchetto mantenendo la struttura delle cartelle (`assets/`, `data/`, `scripts/`, `.github/`, `index.html`, `.nojekyll`, questo `README.md`).
3. Vai su **Settings → Actions → General → Workflow permissions** e seleziona **"Read and write permissions"**. Serve perché la Action deve poter salvare `data/jobs.json` aggiornato.
4. Vai su **Settings → Pages**, alla voce **Source** scegli **"Deploy from a branch"**, branch **main**, cartella **/ (root)**. Salva.
5. Dopo un paio di minuti il sito sarà live su `https://<tuo-utente>.github.io/<nome-repo>/`.
6. (Facoltativo, consigliato) Vai su **Actions → Aggiorna offerte di lavoro → Run workflow** per popolare subito `data/jobs.json` senza aspettare il primo giro schedulato delle 06:00 UTC.

## Modificare filtri, aziende o parole chiave

Tutto quello che ti serve modificare è in **`assets/js/config.js`**:

- `COMPANIES`: cambia `url` per aggiornare i filtri di un'azienda (basta sostituire il link con uno nuovo copiato dal sito), o `live: true/false` se in futuro scopri che un'altra azienda espone dati leggibili.
- `KEYWORDS`: aggiungi o rimuovi ruoli dal radar.

Nessun'altra parte del codice va toccata per queste modifiche.

## Limiti onesti

- Se IBM, Meta, Microsoft, Amazon o eBay cambiano i parametri della loro pagina di ricerca, il link diretto potrebbe restare valido lo stesso (i parametri URL tendono a essere più stabili del resto del sito) ma non è garantito nel tempo: se un giorno un gate non applica più i filtri, vai sul sito dell'azienda e ricostruisci l'URL, poi incollalo in `config.js`.
- L'estrazione dei titoli per Google si basa sull'URL della posizione (che contiene sempre un identificativo leggibile), non su selettori CSS: è una scelta deliberata per essere più resistente ai frequenti restyling del sito, ma il titolo mostrato è una ricostruzione dall'URL e potrebbe differire leggermente dal titolo esatto mostrato sul sito Google.
- Questo progetto legge solo pagine pubbliche di ricerca lavoro, alla frequenza di una volta al giorno: un uso personale e a basso volume come questo.
