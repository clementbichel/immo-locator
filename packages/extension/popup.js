/* eslint-disable */
// Cross-browser compatibility: use 'browser' if available, otherwise 'chrome'
globalThis.browser ??= globalThis.chrome;

(() => {
  // src/utils/score-calculator.js
  function getScoreColor(score) {
    if (typeof score !== 'number' || isNaN(score)) return 'gray';
    if (score >= 80) return 'green';
    if (score >= 50) return 'orange';
    return 'red';
  }

  // src/api/location-client.js
  var API_BASE_URL = 'https://api.immolocator.fr';
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
  async function searchLocation(data) {
    const payload = buildSearchPayload(data);
    const response = await fetch(`${API_BASE_URL}/api/location/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1e4),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const err = new Error(errorBody.message || 'Erreur lors de la recherche.');
      err.code = errorBody.error;
      err.missing = errorBody.missing;
      throw err;
    }
    const result = await response.json();
    if (!validateSearchResponse(result)) {
      throw new Error('R\xE9ponse inattendue du serveur.');
    }
    return result;
  }
  function getGoogleMapsLink(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  async function sendReport(tabUrl, extracted) {
    const NUMERIC_FIELDS = ['surface', 'terrain', 'conso_prim', 'conso_fin'];
    const cleaned = Object.fromEntries(
      Object.entries(extracted)
        .filter(([, v]) => v !== null && v !== void 0 && v !== 'Non trouv\xE9')
        .map(([k, v]) => {
          if (NUMERIC_FIELDS.includes(k)) {
            const match = String(v).match(/(\d+(?:[.,]\d+)?)/);
            return match ? [k, match[1].replace(',', '.')] : [k, v];
          }
          return [k, v];
        })
    );
    const payload = {
      url: tabUrl,
      extracted: cleaned,
    };
    const response = await fetch(`${API_BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1e4),
    });
    if (!response.ok) {
      throw new Error("Erreur lors de l'envoi du rapport.");
    }
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
  function createLocationResultsList(results, getMapsLink, getScoreColor2) {
    const container = document.createDocumentFragment();
    const title = createElement('p');
    const strong = createElement('strong', 'Adresses trouv\xE9es :');
    title.appendChild(strong);
    container.appendChild(title);
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
  function isValidSelogerRealEstateUrl(url) {
    const parsed = parseSelogerUrl(url);
    if (!parsed) return false;
    return (
      parsed.pathname.startsWith('/annonces/achat/') ||
      parsed.pathname.startsWith('/annonces/locations/')
    );
  }
  function getSite(url) {
    if (isValidLeboncoinRealEstateUrl(url)) return 'leboncoin';
    if (isValidSelogerRealEstateUrl(url)) return 'seloger';
    return null;
  }

  // src/popup.js
  globalThis.browser ??= globalThis.chrome;
  document.addEventListener('DOMContentLoaded', () => {
    const errorMsg = document.getElementById('error-msg');
    const errorPage = document.getElementById('error-page');
    const errorCta = document.getElementById('error-cta');
    const reportBtn = document.getElementById('report-btn');
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
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
      const url = window.location.href;
      if (!url.includes('/annonces/achat/') && !url.includes('/annonces/locations/')) {
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
        const address = (_c = sections.location) == null ? void 0 : _c.address;
        if (address) {
          if (address.city) data.city = address.city;
          if (address.zipCode) data.zipcode = address.zipCode;
        }
        const product =
          (_e = (_d = classified.legacyTracking) == null ? void 0 : _d.products) == null
            ? void 0
            : _e[0];
        if (product && typeof product.space === 'number') {
          data.surface = product.space + ' m\xB2';
        }
        const scales =
          (_h =
            (_g = (_f = sections.energy) == null ? void 0 : _f.certificates) == null
              ? void 0
              : _g[0]) == null
            ? void 0
            : _h.scales;
        if (Array.isArray(scales)) {
          const energyScale = scales.find((s) =>
            /^FR_ENERGY/.test((s == null ? void 0 : s.type) || '')
          );
          const ghgScale = scales.find((s) => /^FR_GHG/.test((s == null ? void 0 : s.type) || ''));
          if (
            (_i = energyScale == null ? void 0 : energyScale.efficiencyClass) == null
              ? void 0
              : _i.rating
          ) {
            data.dpe = String(energyScale.efficiencyClass.rating).toUpperCase();
          }
          if (
            (_j = ghgScale == null ? void 0 : ghgScale.efficiencyClass) == null ? void 0 : _j.rating
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
        const description = (_k = sections.mainDescription) == null ? void 0 : _k.description;
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
            getScoreColor
          );
          locationResults.appendChild(resultsList);
        } else {
          locationResults.appendChild(
            createMessage('Aucune adresse trouv\xE9e avec ces crit\xE8res stricts.')
          );
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
            reportBtn.style.display = 'block';
            reportBtn.onclick = async () => {
              reportBtn.disabled = true;
              reportBtn.textContent = 'Envoi...';
              try {
                const { debugLog: _unusedDebug, ...extractedData } = res;
                await sendReport(tabUrl, extractedData);
                reportBtn.textContent = '\u2713 Rapport envoy\xE9';
                setTimeout(() => {
                  reportBtn.textContent = 'Signaler une erreur';
                  reportBtn.disabled = false;
                }, 2e3);
              } catch {
                reportBtn.textContent = 'Signaler une erreur';
                reportBtn.disabled = false;
                errorMsg.textContent = "Impossible d'envoyer le rapport.";
                errorMsg.style.display = 'block';
                setTimeout(() => {
                  errorMsg.style.display = 'none';
                }, 3e3);
              }
            };
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
