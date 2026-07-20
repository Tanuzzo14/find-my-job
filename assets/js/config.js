/**
 * config.js
 * -----------------------------------------------------------------------
 * Tutti i dati "editabili" del tabellone vivono qui: le 7 aziende con il
 * link di ricerca già filtrato, e la lista di parole chiave pre-sales /
 * tech sales entry-level da usare nel radar di ricerca incrociata.
 *
 * Per aggiungere un'azienda: copia un oggetto in COMPANIES e cambia i
 * campi. Per aggiungere parole chiave: aggiungi una stringa a KEYWORDS.
 * Nessun'altra parte del sito va toccata.
 * -----------------------------------------------------------------------
 */

const COMPANIES = [
  {
    id: "ibm",
    code: "IBM",
    name: "IBM",
    color: "#5B8DEF",
    filters: "Sales · Consulting · Entry Level · ES/DK/LU/NO/SI/DE/RO/CH/PL",
    url: "https://www.ibm.com/careers/search?field_keyword_08[0]=Sales&field_keyword_08[1]=Consulting&field_keyword_18[0]=Entry%20Level&field_keyword_05[0]=Spain&field_keyword_05[1]=Denmark&field_keyword_05[2]=Luxembourg&field_keyword_05[3]=Norway&field_keyword_05[4]=Slovenia&field_keyword_05[5]=Germany&field_keyword_05[6]=Romania&field_keyword_05[7]=Switzerland&field_keyword_05[8]=Poland",
    live: false,
  },
  {
    id: "meta",
    code: "MET",
    name: "Meta",
    color: "#6E9BF7",
    filters: "Dublino · Milano · Roma · Parigi · Zurigo · Full time",
    url: "https://www.metacareers.com/jobsearch/?offices[0]=Dublin%2C%20Ireland&offices[1]=Milan%2C%20Italy&offices[2]=Rome%2C%20Italy&offices[3]=Paris%2C%20France&offices[4]=Zurich%2C%20Switzerland&roles[0]=Full%20time%20employment",
    live: false,
  },
  {
    id: "microsoft",
    code: "MSF",
    name: "Microsoft",
    color: "#66C0F4",
    filters: "Dublino (160km) · Sales/Consulting/Finance/Ops · Entry",
    url: "https://apply.careers.microsoft.com/careers?start=0&location=Dublin%2C++D%2C++Ireland&pid=1970393556887861&sort_by=match&filter_distance=160&filter_include_remote=1&filter_profession=technology+sales%2Cconsulting+services%2Cdigital+sales+and+solutions%2Cbusiness+operations%2Cfinance%2Csales+enablement%2Ccorporate+technology+support&filter_seniority=Entry",
    live: false,
  },
  {
    id: "google",
    code: "GOO",
    name: "Google",
    color: "#FFB347",
    filters: "Dublino · Italia · Early career · Full time",
    url: "https://www.google.com/about/careers/applications/u/2/jobs/results?pageId=none&target_level=EARLY&employment_type=FULL_TIME&jlo=en-US&location=Dublin%2C%20Ireland&location=Italy",
    live: true,
  },
  {
    id: "amazon",
    code: "AMZ",
    name: "Amazon",
    color: "#FFCB6B",
    filters: "Dublino (24km) · 1-3 anni · IT/Ops/Business/Finance",
    url: "https://www.amazon.jobs/it/search?offset=0&result_limit=10&sort=relevant&category%5B%5D=operations-it-support-engineering&category%5B%5D=solutions-architect&category%5B%5D=business-merchant-development&category%5B%5D=finance-accounting&category%5B%5D=leadership-development-training&category%5B%5D=project-program-product-management-non-tech&job_type%5B%5D=Full-Time&distanceType=Mi&radius=24km&industry_experience=one_to_three_years&latitude=53.34807&longitude=-6.24827&loc_query=Dublino%2C%20Irlanda&city=Dublino&country=IRL&region=&county=Contea%20di%20Dublino",
    live: false,
  },
  {
    id: "ebay",
    code: "EBY",
    name: "eBay",
    color: "#FF8A80",
    filters: "Nessun filtro preimpostato dal sito eBay",
    url: "https://jobs.ebayinc.com/us/en/search-results",
    live: false,
  },
  {
    id: "netflix",
    code: "NFX",
    name: "Netflix",
    color: "#FF6B6B",
    filters: "EMEA · ordinate per rilevanza",
    url: "https://explore.jobs.netflix.net/careers?pid=790316757236&Region=emea&domain=netflix.com&sort_by=relevance&triggerGoButton=false",
    live: true,
  },
];

// Parole chiave pre-sales / tech sales / IT consulting entry-level,
// incluse quelle richieste esplicitamente più altre affini che vale la
// pena provare (Solutions Consultant, Business Support Engineer, ecc.)
const KEYWORDS = [
  "Solutions Consultant",
  "Pre-Sales Consultant",
  "Technical Sales",
  "Sales Engineer",
  "Business Development Representative",
  "Sales Development Representative",
  "Customer Engineer",
  "Partner Solutions Engineer",
  "Technical Account Manager",
  "Client Solutions Manager",
  "Business Support Engineer",
  "IT Specialist",
  "Technical Specialist",
  "Associate Solutions Architect",
  "Graduate Program",
  "Junior Consultant",
  "Account Strategist",
  "Cloud Support Associate",
  "Accounting Analyst",
];

// Domini usati per costruire la ricerca incrociata "cerca ovunque"
// (operatore site: su Google, nessuna API richiesta).
const SEARCH_DOMAINS = [
  "ibm.com/careers",
  "metacareers.com",
  "apply.careers.microsoft.com",
  "google.com/about/careers",
  "amazon.jobs",
  "jobs.ebayinc.com",
  "explore.jobs.netflix.net",
];
