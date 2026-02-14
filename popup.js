(() => {
  // src/utils/score-calculator.js
  function getScoreColor(score) {
    if (typeof score !== 'number' || isNaN(score)) return 'gray';
    if (score >= 80) return 'green';
    if (score >= 50) return 'orange';
    return 'red';
  }

  // src/api/ademe-client.js
  var API_BASE_URL = 'http://vps-9f0f5451.vps.ovh.net';
  function validateSearchData(data) {
    const missing = [];
    const hasLocation =
      (data.zipcode && data.zipcode !== 'Non trouv\xE9') ||
      (data.city && data.city !== 'Non trouv\xE9');
    if (!hasLocation) missing.push('Localisation');
    if (!data.date_diag || data.date_diag === 'Non trouv\xE9') missing.push('Date');
    if (!data.dpe || data.dpe === 'Non trouv\xE9') missing.push('DPE');
    if (!data.ges || data.ges === 'Non trouv\xE9') missing.push('GES');
    if (!data.surface || data.surface === 'Non trouv\xE9') missing.push('Surface');
    return { isValid: missing.length === 0, missing };
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
      conso_fin: parseNumeric(data.conso_fin),
    };
  }
  async function searchLocation(data) {
    const payload = buildSearchPayload(data);
    const response = await fetch(`${API_BASE_URL}/api/location/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const err = new Error(errorBody.message || 'Erreur lors de la recherche.');
      err.code = errorBody.error;
      err.missing = errorBody.missing;
      throw err;
    }
    return response.json();
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
    return createElement('a', text, { href, ...attrs });
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
  function createAdemeResultItem(item, mapsLink, scoreColor) {
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
  function createAdemeResultsList(results, getMapsLink, getScoreColor2) {
    const container = document.createDocumentFragment();
    const title = createElement('p');
    const strong = createElement('strong', 'Correspondances trouv\xE9es :');
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
      const li = createAdemeResultItem(item, mapsLink, scoreColor);
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
    [ERROR_CODES.API_ERROR]: "Erreur lors de la communication avec l'API ADEME.",
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

  // src/popup.js
  globalThis.browser ??= globalThis.chrome;
  document.addEventListener('DOMContentLoaded', () => {
    const errorMsg = document.getElementById('error-msg');
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
      var _a;
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
                return attributes.find(
                  (a) => a.key === key || (a.label && a.label.toLowerCase().includes(labelPart))
                );
              };
              const surfaceAttr = findAttr('square', 'habitable');
              if (surfaceAttr)
                data.surface = surfaceAttr.value_label || surfaceAttr.value + ' m\xB2';
              const terrainAttr = findAttr('land_plot_surface', 'terrain');
              if (terrainAttr)
                data.terrain = terrainAttr.value_label || terrainAttr.value + ' m\xB2';
              const dpeAttr = findAttr('energy_rate', '\xE9nergie');
              if (dpeAttr) data.dpe = (dpeAttr.value_label || dpeAttr.value).toUpperCase();
              const gesAttr = attributes.find(
                (a) =>
                  a.key === 'ges_rate' ||
                  (a.label &&
                    (a.label.toLowerCase() === 'ges' ||
                      a.label.toLowerCase().includes('gaz \xE0 effet de serre')))
              );
              if (gesAttr) data.ges = (gesAttr.value_label || gesAttr.value).toUpperCase();
              const dateAttr = attributes.find(
                (a) => a.label && a.label.includes('Date de r\xE9alisation')
              );
              if (dateAttr) data.date_diag = dateAttr.value_label || dateAttr.value;
              const primAttr = attributes.find((a) => a.label && a.label.includes('primaire'));
              if (primAttr) data.conso_prim = primAttr.value_label || primAttr.value;
              const finAttr = attributes.find((a) => a.label && a.label.includes('finale'));
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
        console.log('Error parsing __NEXT_DATA__:', e);
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
        const locationEl = document.querySelector('[data-qa-id="adview_location_container"]');
        if (locationEl) {
          const text = locationEl.innerText;
          const zipMatch = text.match(/\b\d{5}\b/);
          if (zipMatch) data.zipcode = zipMatch[0];
          if (zipMatch) {
            const parts = text.split(zipMatch[0]);
            if (parts[0]) data.city = parts[0].trim();
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
          /Consommation énergie primaire\s*:\s*([\d\s]+kWh\/m²\/an)/i
        );
        if (primMatch) data.conso_prim = primMatch[1];
      }
      if (data.conso_fin === 'Non trouv\xE9') {
        const finMatch = descText.match(/Consommation énergie finale\s*:\s*([^.\n]+)/i);
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
    function prepareAdemeSearch(data) {
      const searchBtn = document.getElementById('search-ademe-btn');
      const ademeResults = document.getElementById('ademe-results');
      clearElement(ademeResults);
      searchBtn.style.display = 'none';
      const validation = validateSearchData(data);
      if (!validation.isValid) {
        const msg = createMessage(
          `Recherche non disponible : ${validation.missing.join(', ')} manquant(s).`,
          '#999'
        );
        msg.style.fontSize = '12px';
        ademeResults.appendChild(msg);
        return;
      }
      searchBtn.style.display = 'block';
      searchBtn.onclick = () => executeAdemeSearch(data);
    }
    async function executeAdemeSearch(data) {
      const ademeLoading = document.getElementById('ademe-loading');
      const ademeResults = document.getElementById('ademe-results');
      const searchBtn = document.getElementById('search-ademe-btn');
      searchBtn.disabled = true;
      searchBtn.textContent = 'Recherche en cours...';
      ademeLoading.style.display = 'block';
      clearElement(ademeResults);
      try {
        const result = await searchLocation(data);
        ademeLoading.style.display = 'none';
        searchBtn.textContent = 'Lancer la recherche';
        searchBtn.disabled = false;
        if (result.results && result.results.length > 0) {
          const resultsList = createAdemeResultsList(
            result.results,
            getGoogleMapsLink,
            getScoreColor
          );
          ademeResults.appendChild(resultsList);
        } else {
          ademeResults.appendChild(
            createMessage('Aucun DPE correspondant trouv\xE9 avec ces crit\xE8res stricts.')
          );
        }
      } catch (error) {
        console.error('API Error:', error);
        ademeLoading.style.display = 'none';
        searchBtn.textContent = 'Lancer la recherche';
        searchBtn.disabled = false;
        clearElement(ademeResults);
        const errorMessage =
          error.code && ERROR_CODES[error.code]
            ? getErrorMessage(error.code)
            : error.message || 'Erreur lors de la recherche.';
        ademeResults.appendChild(createMessage(errorMessage, 'red'));
      }
    }
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) {
        showErrorPage("Impossible d'acc\xE9der \xE0 l'onglet actif.");
        return;
      }
      const tabUrl = tabs[0].url || '';
      if (!tabUrl.includes('leboncoin.fr')) {
        showErrorPage(
          "Cette extension fonctionne uniquement sur Leboncoin. Rendez-vous sur une annonce de vente ou de location pour l'utiliser."
        );
        return;
      }
      browser.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: extractRealEstateData,
        },
        (results) => {
          if (browser.runtime.lastError) {
            showErrorPage(
              "Impossible d'acc\xE9der \xE0 cette page. V\xE9rifiez que vous \xEAtes sur une annonce Leboncoin."
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
            prepareAdemeSearch(res);
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
