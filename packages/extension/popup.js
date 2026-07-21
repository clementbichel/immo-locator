/* eslint-disable */
// Cross-browser compatibility: use 'browser' if available, otherwise 'chrome'
globalThis.browser ??= globalThis.chrome;

(() => {
  // src/utils/score-calculator.js
  var CONFIDENT_SCORE = 80;
  function getScoreColor(score) {
    if (typeof score !== 'number' || isNaN(score)) return 'gray';
    if (score >= CONFIDENT_SCORE) return 'green';
    if (score >= 50) return 'orange';
    return 'red';
  }

  // src/utils/parsers.js
  function parseFrenchDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      return null;
    }
    const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      return null;
    }
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  }
  function formatDateISO(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // src/services/dpe-service.js
  function parseISODateLocal(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }
  var MATCH_CONFIG = {
    surface: { weight: 4, maxDeviation: 0.15 },
    date: { weight: 3, maxDays: 14 },
    conso_fin: { weight: 2, maxDeviation: 0.15 },
    conso_prim: { weight: 1, maxDeviation: 0.3 },
  };
  var MIN_SCORE_THRESHOLD = 50;
  var MAX_RESULTS = 5;
  function percentFieldMatch(actual, expected, maxDeviation) {
    if (expected === 0) return actual === 0 ? 1 : 0;
    const diff = Math.abs(actual - expected) / Math.abs(expected);
    return Math.max(0, 1 - (diff / maxDeviation) ** 2);
  }
  function dateFieldMatch(diffDays, maxDays) {
    return Math.max(0, 1 - (diffDays / maxDays) ** 2);
  }
  function calculateMatchScore(adData, ademeItem) {
    let totalWeight = 0;
    let weightedSum = 0;
    if (
      adData.surface !== null &&
      adData.surface !== void 0 &&
      ademeItem.surface_habitable_logement !== null &&
      ademeItem.surface_habitable_logement !== void 0
    ) {
      const { weight, maxDeviation } = MATCH_CONFIG.surface;
      totalWeight += weight;
      weightedSum +=
        weight *
        percentFieldMatch(ademeItem.surface_habitable_logement, adData.surface, maxDeviation);
    }
    const dateAd = parseFrenchDate(adData.date_diag);
    const dateItem = parseISODateLocal(ademeItem.date_etablissement_dpe);
    if (dateAd && dateItem) {
      const diffDays = Math.round(
        Math.abs(dateAd.getTime() - dateItem.getTime()) / (1e3 * 60 * 60 * 24)
      );
      const { weight, maxDays } = MATCH_CONFIG.date;
      totalWeight += weight;
      weightedSum += weight * dateFieldMatch(diffDays, maxDays);
    }
    if (
      adData.conso_fin !== null &&
      adData.conso_fin !== void 0 &&
      ademeItem.conso_5_usages_par_m2_ef !== null &&
      ademeItem.conso_5_usages_par_m2_ef !== void 0
    ) {
      const { weight, maxDeviation } = MATCH_CONFIG.conso_fin;
      totalWeight += weight;
      weightedSum +=
        weight *
        percentFieldMatch(ademeItem.conso_5_usages_par_m2_ef, adData.conso_fin, maxDeviation);
    }
    if (
      adData.conso_prim !== null &&
      adData.conso_prim !== void 0 &&
      ademeItem.conso_5_usages_par_m2_ep !== null &&
      ademeItem.conso_5_usages_par_m2_ep !== void 0
    ) {
      const { weight, maxDeviation } = MATCH_CONFIG.conso_prim;
      totalWeight += weight;
      weightedSum +=
        weight *
        percentFieldMatch(ademeItem.conso_5_usages_par_m2_ep, adData.conso_prim, maxDeviation);
    }
    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / totalWeight) * 100);
  }
  function processResults(adData, ademeResults) {
    const scored = ademeResults
      .map((item) => ({
        address: item.adresse_ban || item.nom_commune_ban || 'Adresse inconnue',
        city: item.nom_commune_ban || '',
        dpe: item.etiquette_dpe || '',
        ges: item.etiquette_ges || '',
        surface: item.surface_habitable_logement,
        diagnosis_date: item.date_etablissement_dpe || '',
        primary_energy: item.conso_5_usages_par_m2_ep,
        final_energy: item.conso_5_usages_par_m2_ef,
        score: calculateMatchScore(adData, item),
      }))
      .sort((a, b) => b.score - a.score);
    return scored.filter((r) => r.score >= MIN_SCORE_THRESHOLD).slice(0, MAX_RESULTS);
  }

  // src/api/ademe-client.js
  var ADEME_API_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';
  function buildAdemeParams(data) {
    const params = new URLSearchParams();
    if (data.zipcode) {
      params.append('code_postal_ban_eq', data.zipcode);
    } else if (data.city) {
      params.append('nom_commune_ban_eq', data.city);
    }
    if (data.dpe) params.append('etiquette_dpe_eq', data.dpe);
    if (data.ges) params.append('etiquette_ges_eq', data.ges);
    if (data.surface !== null && data.surface !== void 0) {
      const dev = MATCH_CONFIG.surface.maxDeviation;
      params.append('surface_habitable_logement_gte', String(Math.floor(data.surface * (1 - dev))));
      params.append('surface_habitable_logement_lte', String(Math.ceil(data.surface * (1 + dev))));
    }
    const diagDate = parseFrenchDate(data.date_diag);
    if (diagDate) {
      const days = MATCH_CONFIG.date.maxDays;
      const minDate = new Date(diagDate);
      minDate.setDate(diagDate.getDate() - days);
      const maxDate = new Date(diagDate);
      maxDate.setDate(diagDate.getDate() + days);
      params.append('date_etablissement_dpe_gte', formatDateISO(minDate));
      params.append('date_etablissement_dpe_lte', formatDateISO(maxDate));
    }
    if (data.conso_prim !== null && data.conso_prim !== void 0) {
      const dev = MATCH_CONFIG.conso_prim.maxDeviation;
      params.append(
        'conso_5_usages_par_m2_ep_gte',
        String(Math.round(data.conso_prim * (1 - dev)))
      );
      params.append(
        'conso_5_usages_par_m2_ep_lte',
        String(Math.round(data.conso_prim * (1 + dev)))
      );
    }
    if (data.conso_fin !== null && data.conso_fin !== void 0) {
      const dev = MATCH_CONFIG.conso_fin.maxDeviation;
      params.append('conso_5_usages_par_m2_ef_gte', String(Math.round(data.conso_fin * (1 - dev))));
      params.append('conso_5_usages_par_m2_ef_lte', String(Math.round(data.conso_fin * (1 + dev))));
    }
    params.append(
      'select',
      'adresse_ban,etiquette_dpe,etiquette_ges,date_etablissement_dpe,surface_habitable_logement,nom_commune_ban,conso_5_usages_par_m2_ep,conso_5_usages_par_m2_ef'
    );
    return params;
  }
  function buildAdemeUrl(data) {
    const params = buildAdemeParams(data);
    return `${ADEME_API_URL}?${params.toString()}`;
  }

  // src/utils/error-messages.js
  var ERROR_CODES = {
    // Network errors
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_ERROR: 'API_ERROR',
    // Data extraction errors
    INVALID_PAGE: 'INVALID_PAGE',
    DATA_NOT_FOUND: 'DATA_NOT_FOUND',
    MISSING_FIELDS: 'MISSING_FIELDS',
    // Extension errors
    TAB_ACCESS_ERROR: 'TAB_ACCESS_ERROR',
    SCRIPT_INJECTION_ERROR: 'SCRIPT_INJECTION_ERROR',
    // Validation errors
    INVALID_ZIPCODE: 'INVALID_ZIPCODE',
    INVALID_DPE: 'INVALID_DPE',
    INVALID_GES: 'INVALID_GES',
    INVALID_SURFACE: 'INVALID_SURFACE',
    INVALID_DATE: 'INVALID_DATE',
  };
  var ERROR_MESSAGES = {
    // Network errors
    [ERROR_CODES.NETWORK_TIMEOUT]:
      'La connexion a expir\xE9. V\xE9rifiez votre connexion internet et r\xE9essayez.',
    [ERROR_CODES.NETWORK_ERROR]: 'Erreur de connexion. V\xE9rifiez votre connexion internet.',
    [ERROR_CODES.API_ERROR]: "Erreur lors de la communication avec l'API.",
    // Data extraction errors
    [ERROR_CODES.INVALID_PAGE]:
      'Cette extension ne fonctionne que pour les ventes immobili\xE8res et les locations.',
    [ERROR_CODES.DATA_NOT_FOUND]: 'Donn\xE9es non trouv\xE9es sur cette page.',
    [ERROR_CODES.MISSING_FIELDS]: 'Informations manquantes pour effectuer la recherche.',
    // Extension errors
    [ERROR_CODES.TAB_ACCESS_ERROR]: "Impossible d'acc\xE9der \xE0 l'onglet actif.",
    [ERROR_CODES.SCRIPT_INJECTION_ERROR]: "Erreur lors de l'injection du script.",
    // Validation errors
    [ERROR_CODES.INVALID_ZIPCODE]: 'Code postal invalide.',
    [ERROR_CODES.INVALID_DPE]: 'Classe DPE invalide (doit \xEAtre entre A et G).',
    [ERROR_CODES.INVALID_GES]: 'Classe GES invalide (doit \xEAtre entre A et G).',
    [ERROR_CODES.INVALID_SURFACE]: 'Surface invalide.',
    [ERROR_CODES.INVALID_DATE]: 'Date de diagnostic invalide.',
  };
  function getErrorMessage(code, fallback = 'Une erreur inattendue est survenue.') {
    return ERROR_MESSAGES[code] || fallback;
  }
  var MISSING = 'Non trouv\xE9';
  function explainNoResult(data = {}) {
    const isMissing = (v) => !v || v === MISSING;
    if (isMissing(data.date_diag)) {
      return "L'annonce ne donne pas la date du diagnostic : c'est le crit\xE8re le plus discriminant, sans lui la recherche aboutit rarement.";
    }
    if (isMissing(data.surface)) {
      return "L'annonce ne donne pas la surface habitable, impossible de d\xE9partager les logements du secteur.";
    }
    if (isMissing(data.zipcode)) {
      return "L'annonce ne donne pas le code postal, la recherche a port\xE9 sur toute la commune.";
    }
    return "Le DPE de ce logement n'est peut-\xEAtre pas encore publi\xE9, ou l'annonce affiche des valeurs mises \xE0 jour depuis le diagnostic.";
  }

  // src/api/location-client.js
  function validateSearchData(data) {
    const missing = [];
    const warnings = [];
    const hasLocation =
      (data.zipcode && data.zipcode !== 'Non trouv\xE9') ||
      (data.city && data.city !== 'Non trouv\xE9');
    if (!hasLocation) missing.push('Localisation');
    if (!data.dpe || data.dpe === 'Non trouv\xE9') missing.push('DPE');
    if (!data.ges || data.ges === 'Non trouv\xE9') missing.push('GES');
    if (!data.surface || data.surface === 'Non trouv\xE9') missing.push('Surface');
    if (!data.date_diag || data.date_diag === 'Non trouv\xE9') warnings.push('Date de diagnostic');
    return { isValid: missing.length === 0, missing, warnings };
  }
  function parseNumeric(value) {
    if (!value || value === 'Non trouv\xE9') return null;
    if (typeof value === 'number') return value;
    const cleaned = String(value)
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  function buildSearchPayload(data) {
    return {
      zipcode: data.zipcode !== 'Non trouv\xE9' ? data.zipcode : null,
      city: data.city !== 'Non trouv\xE9' ? data.city : null,
      dpe: data.dpe !== 'Non trouv\xE9' ? data.dpe : null,
      ges: data.ges !== 'Non trouv\xE9' ? data.ges : null,
      surface: parseNumeric(data.surface),
      date_diag: data.date_diag !== 'Non trouv\xE9' ? data.date_diag : null,
      conso_prim: parseNumeric(data.conso_prim),
      conso_fin: parseNumeric(data.conso_fin) || null,
    };
  }
  function validateSearchResponse(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.results)) return false;
    return data.results.every(
      (item) => typeof item.address === 'string' && typeof item.score === 'number'
    );
  }
  var BROADEN = { ges: null, conso_prim: null, conso_fin: null };
  async function fetchAdeme(payload) {
    let response;
    try {
      response = await fetch(buildAdemeUrl(payload), { signal: AbortSignal.timeout(1e4) });
    } catch (e) {
      const err = new Error('Erreur de connexion \xE0 la base ADEME.');
      err.code =
        (e == null ? void 0 : e.name) === 'TimeoutError'
          ? ERROR_CODES.NETWORK_TIMEOUT
          : ERROR_CODES.NETWORK_ERROR;
      throw err;
    }
    if (!response.ok) {
      const err = new Error(`Erreur ADEME (${response.status}).`);
      err.code = ERROR_CODES.API_ERROR;
      throw err;
    }
    const body = await response.json().catch(() => ({}));
    return Array.isArray(body.results) ? body.results : [];
  }
  async function searchLocation(data) {
    const payload = buildSearchPayload(data);
    let results = processResults(payload, await fetchAdeme(payload));
    let broadened = false;
    if (results.length === 0) {
      broadened = true;
      results = processResults(payload, await fetchAdeme({ ...payload, ...BROADEN }));
    }
    const result = { results, count: results.length, broadened };
    if (!validateSearchResponse(result)) {
      throw new Error('R\xE9ponse inattendue de la base ADEME.');
    }
    return result;
  }
  function getGoogleMapsLink(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  // src/utils/dom-helpers.js
  function createElement(tag, text = '', attrs = {}) {
    const el = document.createElement(tag);
    if (text) {
      el.textContent = text;
    }
    Object.entries(attrs).forEach(([key, value]) => {
      if (key.startsWith('on')) return;
      if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('data-')) {
        el.dataset[key.slice(5)] = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    return el;
  }
  function createLink(href, text, attrs = {}) {
    return createElement('a', text, { href, rel: 'noopener noreferrer', ...attrs });
  }
  function createMessage(text, color = null) {
    const attrs = {};
    if (color) {
      attrs.style = { color };
    }
    return createElement('p', text, attrs);
  }
  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
  function createLocationResultItem(item, mapsLink, scoreColor) {
    const li = createElement('li', '', {
      style: {
        marginBottom: '12px',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px',
      },
    });
    const header = createElement('div', '', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
    });
    const address = item.address || 'Adresse inconnue';
    const addressEl = createElement('strong', address);
    const scoreEl = createElement('span', `${item.score}%`, {
      style: {
        background: scoreColor,
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.8em',
        fontWeight: 'bold',
      },
    });
    header.appendChild(addressEl);
    header.appendChild(scoreEl);
    const link = createLink(mapsLink, '\u{1F4CD} Voir sur Google Maps', {
      target: '_blank',
      style: {
        display: 'inline-block',
        marginTop: '4px',
        fontSize: '0.85em',
        color: '#3498db',
        textDecoration: 'none',
      },
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const browserApi = globalThis.browser || globalThis.chrome;
      browserApi.tabs.create({ url: mapsLink });
      window.close();
    });
    li.appendChild(header);
    li.appendChild(link);
    return li;
  }
  function createLocationResultsList(results, getMapsLink, getScoreColor2, broadened = false) {
    var _a;
    const container = document.createDocumentFragment();
    const confident =
      !broadened && ((_a = results[0]) == null ? void 0 : _a.score) >= CONFIDENT_SCORE;
    const title = createElement('p');
    const strong = createElement(
      'strong',
      confident ? 'Adresses trouv\xE9es :' : 'Pistes possibles :'
    );
    title.appendChild(strong);
    container.appendChild(title);
    if (!confident) {
      container.appendChild(
        createElement(
          'p',
          broadened
            ? 'Recherche \xE9largie : le GES et les consommations ont \xE9t\xE9 ignor\xE9s faute de correspondance exacte. V\xE9rifiez la surface et la date du diagnostic.'
            : 'Correspondance incertaine : v\xE9rifiez la surface et la date du diagnostic avant de vous fier \xE0 ces adresses.',
          { class: 'confidence-warning' }
        )
      );
    }
    const ul = createElement('ul', '', {
      style: {
        paddingLeft: '20px',
        marginTop: '5px',
      },
    });
    results.forEach((item) => {
      const address = item.address || 'Adresse inconnue';
      const mapsLink = getMapsLink(address);
      const scoreColor = getScoreColor2(item.score);
      const li = createLocationResultItem(item, mapsLink, scoreColor);
      ul.appendChild(li);
    });
    container.appendChild(ul);
    return container;
  }

  // src/utils/url-validator.js
  var LEBONCOIN_HOSTNAMES = ['www.leboncoin.fr', 'leboncoin.fr'];
  var SELOGER_HOSTNAMES = ['www.seloger.com', 'seloger.com'];
  function parseLeboncoinUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url);
      if (!LEBONCOIN_HOSTNAMES.includes(parsed.hostname)) return null;
      return parsed;
    } catch {
      return null;
    }
  }
  function parseSelogerUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url);
      if (!SELOGER_HOSTNAMES.includes(parsed.hostname)) return null;
      return parsed;
    } catch {
      return null;
    }
  }
  var LEBONCOIN_SALE_RE = /^\/(?:ad\/)?ventes_immobilieres\//;
  var LEBONCOIN_RENTAL_RE = /^\/(?:ad\/)?locations\//;
  function isValidLeboncoinRealEstateUrl(url) {
    const parsed = parseLeboncoinUrl(url);
    if (!parsed) return false;
    return LEBONCOIN_SALE_RE.test(parsed.pathname) || LEBONCOIN_RENTAL_RE.test(parsed.pathname);
  }
  var SELOGER_DETAIL_RE = /^\/\d+\/detail\.htm$/;
  function isValidSelogerRealEstateUrl(url) {
    const parsed = parseSelogerUrl(url);
    if (!parsed) return false;
    return (
      parsed.pathname.startsWith('/annonces/achat/') ||
      parsed.pathname.startsWith('/annonces/locations/') ||
      SELOGER_DETAIL_RE.test(parsed.pathname)
    );
  }
  function getSite(url) {
    if (isValidLeboncoinRealEstateUrl(url)) return 'leboncoin';
    if (isValidSelogerRealEstateUrl(url)) return 'seloger';
    return null;
  }

  // src/utils/rate-prompt.js
  var COUNT_KEY = 'il_search_count';
  var DONE_KEY = 'il_rate_done';
  var TRIGGER_AT = 6;
  var STORE_URLS = {
    chrome:
      'https://chromewebstore.google.com/detail/immo-locator/okglkdgbdbnikojffmjpodmakgjmlpda/reviews',
    firefox: 'https://addons.mozilla.org/fr/firefox/addon/immo-locator/reviews/',
  };
  function getStoreReviewUrl() {
    var _a;
    const browserApi = globalThis.browser || globalThis.chrome;
    const isFirefox =
      (_a = browserApi == null ? void 0 : browserApi.runtime) == null
        ? void 0
        : _a.getURL('').startsWith('moz-extension://');
    return isFirefox ? STORE_URLS.firefox : STORE_URLS.chrome;
  }
  function shouldAskForRating() {
    try {
      if (localStorage.getItem(DONE_KEY)) return false;
      const count = Number(localStorage.getItem(COUNT_KEY) || 0) + 1;
      localStorage.setItem(COUNT_KEY, String(count));
      return count >= TRIGGER_AT;
    } catch {
      return false;
    }
  }
  function dismiss() {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch {}
  }
  function createRatePrompt() {
    const box = document.createElement('div');
    box.className = 'rate-prompt';
    const text = document.createElement('span');
    text.textContent = 'Vous aimez notre extension ? Donnez-nous 5 \xE9toiles \u2B50';
    const link = document.createElement('a');
    link.href = getStoreReviewUrl();
    link.textContent = 'Noter';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      dismiss();
      const browserApi = globalThis.browser || globalThis.chrome;
      browserApi.tabs.create({ url: link.href });
      window.close();
    });
    const close = document.createElement('button');
    close.className = 'rate-prompt-close';
    close.type = 'button';
    close.textContent = '\u2715';
    close.setAttribute('aria-label', 'Ne plus afficher');
    close.addEventListener('click', () => {
      dismiss();
      box.remove();
    });
    box.append(text, link, close);
    return box;
  }

  // src/popup.js
  globalThis.browser ??= globalThis.chrome;
  document.addEventListener('DOMContentLoaded', () => {
    const errorPage = document.getElementById('error-page');
    const errorCta = document.getElementById('error-cta');
    function showErrorPage(message) {
      document.body.classList.add('show-error-page');
      const detailEl = document.getElementById('error-page-detail');
      if (detailEl && message) {
        detailEl.textContent = message;
      }
    }
    if (errorCta) {
      errorCta.addEventListener('click', (e) => {
        e.preventDefault();
        const browserApi = globalThis.browser || globalThis.chrome;
        browserApi.tabs.create({ url: errorCta.href });
        window.close();
      });
    }
    async function extractRealEstateData() {
      var _a, _b, _c, _d, _e, _f;
      if (
        !window.location.href.includes('/ventes_immobilieres/') &&
        !window.location.href.includes('/locations/')
      ) {
        return {
          error:
            'Cette extension ne fonctionne que pour les ventes immobili\xE8res et les locations.',
        };
      }
      const data = {
        surface: 'Non trouv\xE9',
        terrain: 'Non trouv\xE9',
        dpe: 'Non trouv\xE9',
        ges: 'Non trouv\xE9',
        date_diag: 'Non trouv\xE9',
        conso_prim: 'Non trouv\xE9',
        conso_fin: 'Non trouv\xE9',
        city: 'Non trouv\xE9',
        zipcode: 'Non trouv\xE9',
      };
      const debug = [];
      try {
        const nextDataScript = document.getElementById('__NEXT_DATA__');
        if (nextDataScript) {
          debug.push('Found __NEXT_DATA__');
          const jsonData = JSON.parse(nextDataScript.textContent);
          debug.push('Parsed JSON');
          const pageProps =
            (_a = jsonData == null ? void 0 : jsonData.props) == null ? void 0 : _a.pageProps;
          if (!pageProps) debug.push('No pageProps');
          const ad = pageProps == null ? void 0 : pageProps.ad;
          if (ad) {
            debug.push('Found ad object');
            if (ad.location) {
              debug.push('Found location obj');
              if (ad.location.city) data.city = ad.location.city;
              if (ad.location.zipcode) data.zipcode = ad.location.zipcode;
            } else {
              debug.push('No location inside ad');
            }
            if (ad.attributes) {
              const attributes = ad.attributes;
              const findAttr = (key, labelPart) => {
                return attributes.find((a) => {
                  if (a.key === key) return true;
                  const label = (a.key_label || a.label || '').toLowerCase();
                  return label.includes(labelPart);
                });
              };
              const surfaceAttr = findAttr('square', 'habitable');
              if (surfaceAttr)
                data.surface = surfaceAttr.value_label || surfaceAttr.value + ' m\xB2';
              const terrainAttr = findAttr('land_plot_surface', 'terrain');
              if (terrainAttr)
                data.terrain = terrainAttr.value_label || terrainAttr.value + ' m\xB2';
              const dpeAttr = findAttr('energy_rate', '\xE9nergie');
              if (dpeAttr) data.dpe = (dpeAttr.value_label || dpeAttr.value).toUpperCase();
              const gesAttr = attributes.find((a) => {
                if (a.key === 'ges' || a.key === 'ges_rate') return true;
                const label = (a.key_label || a.label || '').toLowerCase();
                return label === 'ges' || label.includes('gaz \xE0 effet de serre');
              });
              if (gesAttr) data.ges = (gesAttr.value_label || gesAttr.value).toUpperCase();
              const dateAttr = attributes.find((a) => {
                const label = a.key_label || a.label || '';
                return label.includes('Date de r\xE9alisation');
              });
              if (dateAttr) data.date_diag = dateAttr.value_label || dateAttr.value;
              const primAttr = attributes.find((a) => {
                const label = a.key_label || a.label || '';
                return label.includes('primaire');
              });
              if (primAttr) data.conso_prim = primAttr.value_label || primAttr.value;
              const finAttr = attributes.find((a) => {
                const label = a.key_label || a.label || '';
                return label.includes('finale');
              });
              if (finAttr) data.conso_fin = finAttr.value_label || finAttr.value;
            }
          } else {
            debug.push('No ad object in pageProps');
            if (pageProps) debug.push('pageProps keys: ' + Object.keys(pageProps).join(', '));
          }
        } else {
          debug.push('No __NEXT_DATA__ script found');
        }
      } catch (e) {
        debug.push('Error parsing __NEXT_DATA__: ' + e.message);
        debug.push('Error: ' + e.message);
      }
      data.debugLog = debug;
      const missingData = Object.values(data).some((v) => v === 'Non trouv\xE9');
      if (missingData) {
        let seeMoreBtn = document.querySelector(
          'button[data-qa-id="adview_description_expand_button"]'
        );
        if (!seeMoreBtn) {
          const buttons = Array.from(
            document.querySelectorAll('button, div[role="button"], span[role="button"]')
          );
          seeMoreBtn = buttons.find((b) => {
            const text = b.innerText.toLowerCase();
            return (
              text.includes('voir plus') ||
              text.includes('afficher plus') ||
              text.includes('lire la suite')
            );
          });
        }
        if (seeMoreBtn) {
          seeMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise((r) => setTimeout(r, 100));
          seeMoreBtn.click();
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
      }
      if (data.surface === 'Non trouv\xE9') {
        const bodyText = document.body.innerText;
        const surfaceMatch = bodyText.match(/Surface habitable\s*[:\n]?\s*(\d+(?:[.,]\d+)?\s*m²)/i);
        if (surfaceMatch) data.surface = surfaceMatch[1];
        const terrainMatch = bodyText.match(
          /Surface totale du terrain\s*[:\n]?\s*(\d+(?:[.,]\d+)?\s*m²)/i
        );
        if (terrainMatch) data.terrain = terrainMatch[1];
      }
      if (data.zipcode === 'Non trouv\xE9' || data.city === 'Non trouv\xE9') {
        try {
          const routerComponents =
            (_c = (_b = window.next) == null ? void 0 : _b.router) == null ? void 0 : _c.components;
          if (routerComponents) {
            for (const comp of Object.values(routerComponents)) {
              const location =
                (_f =
                  (_e =
                    (_d = comp == null ? void 0 : comp.props) == null ? void 0 : _d.pageProps) ==
                  null
                    ? void 0
                    : _e.ad) == null
                  ? void 0
                  : _f.location;
              if (location) {
                if (location.city && data.city === 'Non trouv\xE9') data.city = location.city;
                if (location.zipcode && data.zipcode === 'Non trouv\xE9') {
                  data.zipcode = location.zipcode;
                }
                debug.push('Location from Next.js router cache');
                break;
              }
            }
          }
        } catch (e) {
          debug.push('Router cache error: ' + e.message);
        }
      }
      if (data.zipcode === 'Non trouv\xE9' || data.city === 'Non trouv\xE9') {
        const locationTitle = document.querySelector('[data-test-id="location-map-title"]');
        if (locationTitle) {
          const match = locationTitle.innerText.match(
            /([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s-]+?)\s*\((\d{5})\)/
          );
          if (match) {
            if (data.city === 'Non trouv\xE9') data.city = match[1].trim();
            if (data.zipcode === 'Non trouv\xE9') data.zipcode = match[2];
          }
        }
        if (data.city === 'Non trouv\xE9' || data.zipcode === 'Non trouv\xE9') {
          const mapLink = document.querySelector('a[href$="#map"][aria-label]');
          if (mapLink) {
            const match = mapLink.getAttribute('aria-label').match(/^(.+?)\s+(\d{5})/);
            if (match) {
              if (data.city === 'Non trouv\xE9') data.city = match[1].trim();
              if (data.zipcode === 'Non trouv\xE9') data.zipcode = match[2];
            }
          }
        }
        if (data.city === 'Non trouv\xE9' || data.zipcode === 'Non trouv\xE9') {
          const locationEl = document.querySelector('[data-qa-id="adview_location_container"]');
          if (locationEl) {
            const text = locationEl.innerText;
            const zipMatch = text.match(/\b\d{5}\b/);
            if (zipMatch) {
              if (data.zipcode === 'Non trouv\xE9') data.zipcode = zipMatch[0];
              const parts = text.split(zipMatch[0]);
              if (parts[0] && data.city === 'Non trouv\xE9') data.city = parts[0].trim();
            }
          }
        }
      }
      const descriptionEl =
        document.querySelector('[data-qa-id="adview_description_container"]') || document.body;
      const descText = descriptionEl.innerText;
      if (data.date_diag === 'Non trouv\xE9') {
        const dateMatch = descText.match(
          /Date de réalisation du diagnostic(?: énergétique)?\s*:\s*(\d{2}\/\d{2}\/\d{4})/i
        );
        if (dateMatch) data.date_diag = dateMatch[1];
      }
      if (data.conso_prim === 'Non trouv\xE9') {
        const primMatch = descText.match(
          /Consommation énergie primaire\s*:?\s*([\d\s,.]+\s*kWh\/m²\/an)/i
        );
        if (primMatch) data.conso_prim = primMatch[1].trim();
      }
      if (data.conso_fin === 'Non trouv\xE9') {
        const finMatch = descText.match(
          /Consommation énergie finale\s*:?\s*([\d\s,.]+\s*kWh\/m²\/an)/i
        );
        if (finMatch) data.conso_fin = finMatch[1].trim();
      }
      if (data.dpe === 'Non trouv\xE9') {
        const dpeBadge = document.querySelector(
          '[aria-label*="Diagnostic \xE9nerg\xE9tique"], [aria-label*="Classe \xE9nergie"]'
        );
        if (dpeBadge) {
          const match = dpeBadge
            .getAttribute('aria-label')
            .match(/(?:Diagnostic énergétique|Classe énergie)\s*:\s*([A-G])/i);
          if (match) data.dpe = match[1].toUpperCase();
        } else {
          const dpeMatch = document.body.innerText.match(/Classe énergie\s*([A-G])(?!\s*[A-G])/i);
          if (dpeMatch) data.dpe = dpeMatch[1].toUpperCase();
        }
      }
      if (data.ges === 'Non trouv\xE9') {
        const gesBadge = document.querySelector(
          '[aria-label*="Indice \xE9mission de gaz \xE0 effet de serre"], [aria-label*="GES"]'
        );
        if (gesBadge) {
          const match = gesBadge
            .getAttribute('aria-label')
            .match(/(?:Indice émission de gaz à effet de serre|GES)\s*:\s*([A-G])/i);
          if (match) data.ges = match[1].toUpperCase();
        } else {
          const gesMatch = document.body.innerText.match(/GES\s*[:]?\s*([A-G])\b/i);
          if (gesMatch) {
            const index = gesMatch.index + gesMatch[0].length;
            const nextChars = document.body.innerText.substring(index, index + 5);
            if (!/^\s*[A-G]\b/.test(nextChars)) {
              data.ges = gesMatch[1].toUpperCase();
            }
          }
        }
      }
      function findValueFromVisualScale(labelPart) {
        const allElements = Array.from(document.querySelectorAll('div, p, span, h3, h4'));
        const labelEl = allElements.find(
          (el) => el.innerText.includes(labelPart) && el.innerText.length < 50
        );
        if (!labelEl) return null;
        let container = labelEl.parentElement;
        let letters = [];
        let attempts = 0;
        while (container && attempts < 4) {
          const candidates = Array.from(container.querySelectorAll('div, span, p'));
          letters = candidates.filter((el) => {
            return (
              /^[A-G]$/.test(el.innerText.trim()) &&
              labelEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
            );
          });
          if (letters.length >= 5) {
            if (letters.length > 7) {
              letters = letters.slice(0, 7);
            }
            break;
          }
          container = container.parentElement;
          attempts++;
        }
        if (letters.length < 5) return null;
        const metrics = letters.map((el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            el,
            height: rect.height,
            width: rect.width,
            fontWeight: parseInt(style.fontWeight) || 400,
            fontSize: parseFloat(style.fontSize) || 12,
          };
        });
        const findOutlier = (items, key) => {
          if (items.length < 3) return null;
          const counts = {};
          items.forEach((i) => {
            const val = Math.round(i[key] * 10) / 10;
            counts[val] = (counts[val] || 0) + 1;
          });
          const commonVal = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
          return items.find((i) => {
            const val = Math.round(i[key] * 10) / 10;
            return val > parseFloat(commonVal) * 1.1;
          });
        };
        let active = findOutlier(metrics, 'height');
        if (!active) active = findOutlier(metrics, 'width');
        if (!active) active = findOutlier(metrics, 'fontSize');
        if (!active) active = findOutlier(metrics, 'fontWeight');
        if (active) {
          return active.el.innerText.trim();
        }
        return null;
      }
      if (data.dpe === 'Non trouv\xE9') {
        const visualDpe =
          findValueFromVisualScale('Classe \xE9nergie') ||
          findValueFromVisualScale('Diagnostic \xE9nerg\xE9tique');
        if (visualDpe) data.dpe = visualDpe;
      }
      if (data.ges === 'Non trouv\xE9') {
        const visualGes =
          findValueFromVisualScale('GES') || findValueFromVisualScale('Gaz \xE0 effet de serre');
        if (visualGes) data.ges = visualGes;
      }
      return data;
    }
    function extractSelogerData() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
      const path = window.location.pathname;
      const isSelogerAd =
        path.startsWith('/annonces/achat/') ||
        path.startsWith('/annonces/locations/') ||
        /^\/\d+\/detail\.htm$/.test(path);
      if (!isSelogerAd) {
        return {
          error:
            'Cette extension ne fonctionne que sur les pages d\u2019annonces SeLoger (achat ou location).',
        };
      }
      const data = {
        surface: 'Non trouv\xE9',
        terrain: 'Non trouv\xE9',
        dpe: 'Non trouv\xE9',
        ges: 'Non trouv\xE9',
        date_diag: 'Non trouv\xE9',
        conso_prim: 'Non trouv\xE9',
        conso_fin: 'Non trouv\xE9',
        city: 'Non trouv\xE9',
        zipcode: 'Non trouv\xE9',
      };
      const debug = [];
      try {
        const el = document.getElementById('__UFRN_LIFECYCLE_SERVERREQUEST__');
        if (!el) {
          debug.push('No __UFRN_LIFECYCLE_SERVERREQUEST__ script found');
          data.debugLog = debug;
          return data;
        }
        const m = el.textContent.match(/JSON\.parse\((".+")\);?\s*$/s);
        if (!m) {
          debug.push('UFRN script regex did not match');
          data.debugLog = debug;
          return data;
        }
        const inner = JSON.parse(m[1]);
        const state = JSON.parse(inner);
        const classified =
          (_b = (_a = state == null ? void 0 : state.app_cldp) == null ? void 0 : _a.data) == null
            ? void 0
            : _b.classified;
        if (!classified) {
          debug.push('No classified in UFRN state');
          data.debugLog = debug;
          return data;
        }
        debug.push('Found classified');
        const sections = classified.sections || {};
        const location =
          ((_c = sections.location) == null ? void 0 : _c.address) || sections.location;
        if (location) {
          if (location.city) data.city = location.city;
          if (location.zipCode) data.zipcode = location.zipCode;
        }
        const facts = (_d = sections.hardFacts) == null ? void 0 : _d.facts;
        if (Array.isArray(facts)) {
          const living = facts.find((f) =>
            /^(livingSpace|surface)$/i.test((f == null ? void 0 : f.type) || '')
          );
          const plot = facts.find((f) => (f == null ? void 0 : f.type) === 'plotSpace');
          if (living == null ? void 0 : living.splitValue)
            data.surface = living.splitValue + ' m\xB2';
          if (plot == null ? void 0 : plot.splitValue) data.terrain = plot.splitValue + ' m\xB2';
        } else {
          const space =
            (_g =
              (_f = (_e = classified.legacyTracking) == null ? void 0 : _e.products) == null
                ? void 0
                : _f[0]) == null
              ? void 0
              : _g.space;
          if (typeof space === 'number') data.surface = space + ' m\xB2';
        }
        const scales =
          (_j =
            (_i = (_h = sections.energy) == null ? void 0 : _h.certificates) == null
              ? void 0
              : _i[0]) == null
            ? void 0
            : _j.scales;
        if (Array.isArray(scales)) {
          const energyScale = scales.find((s) =>
            /^FR_ENERGY/.test((s == null ? void 0 : s.type) || '')
          );
          const ghgScale = scales.find((s) => /^FR_GHG/.test((s == null ? void 0 : s.type) || ''));
          if (
            (_k = energyScale == null ? void 0 : energyScale.efficiencyClass) == null
              ? void 0
              : _k.rating
          ) {
            data.dpe = String(energyScale.efficiencyClass.rating).toUpperCase();
          }
          if (
            (_l = ghgScale == null ? void 0 : ghgScale.efficiencyClass) == null ? void 0 : _l.rating
          ) {
            data.ges = String(ghgScale.efficiencyClass.rating).toUpperCase();
          }
          if (Array.isArray(energyScale == null ? void 0 : energyScale.values)) {
            const consoEntry = energyScale.values.find((v) =>
              /consommation/i.test((v == null ? void 0 : v.label) || '')
            );
            if (consoEntry == null ? void 0 : consoEntry.value) data.conso_prim = consoEntry.value;
          }
        }
        const description = (_m = sections.mainDescription) == null ? void 0 : _m.description;
        if (typeof description === 'string') {
          const dateMatch = description.match(
            /Date\s+du\s+diagnostic(?:\s+énergétique)?\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
          );
          if (dateMatch) data.date_diag = dateMatch[1];
        }
        debug.push('Extraction OK');
      } catch (e) {
        debug.push('SeLoger extractor error: ' + e.message);
      }
      data.debugLog = debug;
      return data;
    }
    function prepareLocationSearch(data) {
      const searchBtn = document.getElementById('search-location-btn');
      const locationResults = document.getElementById('location-results');
      clearElement(locationResults);
      searchBtn.style.display = 'none';
      const validation = validateSearchData(data);
      if (!validation.isValid) {
        const msg = createMessage(
          `Recherche non disponible : ${validation.missing.join(', ')} manquant(s).`,
          '#999'
        );
        msg.style.fontSize = '12px';
        locationResults.appendChild(msg);
        return;
      }
      if (validation.warnings.length > 0) {
        const msg = createMessage(
          `\u26A0\uFE0F ${validation.warnings.join(', ')} manquant(e) \u2014 les r\xE9sultats seront moins pr\xE9cis.`,
          '#b45309'
        );
        msg.style.fontSize = '12px';
        locationResults.appendChild(msg);
      }
      searchBtn.style.display = 'block';
      searchBtn.onclick = () => executeLocationSearch(data);
    }
    async function executeLocationSearch(data) {
      const locationLoading = document.getElementById('location-loading');
      const locationResults = document.getElementById('location-results');
      const searchBtn = document.getElementById('search-location-btn');
      searchBtn.disabled = true;
      searchBtn.textContent = 'Recherche en cours...';
      locationLoading.style.display = 'block';
      clearElement(locationResults);
      try {
        const result = await searchLocation(data);
        locationLoading.style.display = 'none';
        searchBtn.textContent = 'Lancer la recherche';
        searchBtn.disabled = false;
        if (result.results && result.results.length > 0) {
          const resultsList = createLocationResultsList(
            result.results,
            getGoogleMapsLink,
            getScoreColor,
            result.broadened
          );
          locationResults.appendChild(resultsList);
          if (shouldAskForRating()) {
            locationResults.appendChild(createRatePrompt());
          }
        } else {
          locationResults.appendChild(createMessage('Aucune correspondance fiable.'));
          const why = createMessage(explainNoResult(data), '#6b7280');
          why.style.fontSize = '11.5px';
          locationResults.appendChild(why);
        }
      } catch (error) {
        console.error('API Error:', error);
        locationLoading.style.display = 'none';
        searchBtn.textContent = 'Lancer la recherche';
        searchBtn.disabled = false;
        clearElement(locationResults);
        const errorMessage =
          error.code && ERROR_CODES[error.code]
            ? getErrorMessage(error.code)
            : error.message || 'Erreur lors de la recherche.';
        locationResults.appendChild(createMessage(errorMessage, 'red'));
      }
    }
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) {
        showErrorPage("Impossible d'acc\xE9der \xE0 l'onglet actif.");
        return;
      }
      const tabUrl = tabs[0].url || '';
      const site = getSite(tabUrl);
      if (!site) {
        showErrorPage(
          "Cette extension fonctionne sur Leboncoin et SeLoger. Rendez-vous sur une annonce de vente ou de location pour l'utiliser."
        );
        return;
      }
      const extractFn = site === 'seloger' ? extractSelogerData : extractRealEstateData;
      browser.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: extractFn,
        },
        (results) => {
          if (browser.runtime.lastError) {
            showErrorPage(
              "Impossible d'acc\xE9der \xE0 cette page. V\xE9rifiez que vous \xEAtes sur une annonce immobili\xE8re Leboncoin ou SeLoger."
            );
            return;
          }
          if (results && results[0] && results[0].result) {
            const res = results[0].result;
            if (res.error) {
              showErrorPage(res.error);
              return;
            }
            const fields = [
              'city',
              'zipcode',
              'surface',
              'terrain',
              'date_diag',
              'conso_prim',
              'conso_fin',
            ];
            let foundCount = 0;
            const totalFields = fields.length + 2;
            fields.forEach((field) => {
              const el = document.getElementById(field);
              if (el) {
                const value = res[field] || 'Non trouv\xE9';
                el.textContent = value === 'Non trouv\xE9' ? '\u2014' : value;
                el.classList.remove('loading', 'not-found');
                if (value === 'Non trouv\xE9' || value === '--' || value === '\u2014') {
                  el.classList.add('not-found');
                } else {
                  foundCount++;
                }
              }
            });
            ['dpe', 'ges'].forEach((field) => {
              const el = document.getElementById(field);
              if (el) {
                const value = res[field];
                el.classList.remove(
                  'not-found',
                  'energy-A',
                  'energy-B',
                  'energy-C',
                  'energy-D',
                  'energy-E',
                  'energy-F',
                  'energy-G'
                );
                if (value && value !== 'Non trouv\xE9' && /^[A-G]$/i.test(value)) {
                  el.textContent = value.toUpperCase();
                  el.classList.add(`energy-${value.toUpperCase()}`);
                  foundCount++;
                } else {
                  el.textContent = '\u2014';
                  el.classList.add('not-found');
                }
              }
            });
            const dataStatusEl = document.getElementById('data-status');
            if (dataStatusEl) {
              const ratio = foundCount / totalFields;
              if (ratio >= 0.8) {
                dataStatusEl.textContent = 'Complet';
                dataStatusEl.className = 'card-badge success';
              } else if (ratio >= 0.5) {
                dataStatusEl.textContent = 'Partiel';
                dataStatusEl.className = 'card-badge warning';
              } else {
                dataStatusEl.textContent = 'Incomplet';
                dataStatusEl.className = 'card-badge warning';
              }
              dataStatusEl.style.display = 'inline-block';
            }
            prepareLocationSearch(res);
          } else {
            showErrorPage(
              "Donn\xE9es non trouv\xE9es sur cette page. Assurez-vous d'\xEAtre sur une annonce immobili\xE8re."
            );
          }
        }
      );
    });
  });
})();
