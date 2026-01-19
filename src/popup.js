// Cross-browser compatibility: use 'browser' if available, otherwise 'chrome'
globalThis.browser ??= globalThis.chrome;

import { isValidLeboncoinRealEstateUrl } from './utils/url-validator.js';
import {
  extractSurfaceFromText,
  extractTerrainFromText,
  extractDiagnosticDateFromText,
  extractPrimaryEnergyFromText,
  extractFinalEnergyFromText,
  extractDpeFromText,
  extractGesFromText,
  extractZipcodeFromText,
  parseSurface,
  parseFrenchDate,
  formatDateISO,
  parseEnergyValue
} from './utils/parsers.js';
import { calculateMatchScore, findOutlier, getScoreColor, sortResultsByScore } from './utils/score-calculator.js';
import { extractFromNextData } from './extractors/next-data-extractor.js';
import { validateAdemeSearchData, buildAdemeParams, buildAdemeUrl, getGoogleMapsLink } from './api/ademe-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const errorMsg = document.getElementById('error-msg');

  // Function to be injected into the page
  async function extractRealEstateData() {
    // Check if we are in the correct category
    // URL check is fast and effective for Leboncoin
    if (!window.location.href.includes('/ventes_immobilieres/') && !window.location.href.includes('/locations/')) {
      return { error: "Cette extension ne fonctionne que pour les ventes immobilières et les locations." };
    }

    const data = {
      surface: 'Non trouvé',
      terrain: 'Non trouvé',
      dpe: 'Non trouvé',
      ges: 'Non trouvé',
      date_diag: 'Non trouvé',
      conso_prim: 'Non trouvé',
      conso_fin: 'Non trouvé',
      city: 'Non trouvé',
      zipcode: 'Non trouvé'
    };

    // Helper to clean text
    const clean = (text) => text ? text.trim() : null;

    const debug = [];

    // Strategy 1: __NEXT_DATA__ (Best source)
    try {
      const nextDataScript = document.getElementById('__NEXT_DATA__');
      if (nextDataScript) {
        debug.push("Found __NEXT_DATA__");
        const jsonData = JSON.parse(nextDataScript.textContent);
        debug.push("Parsed JSON");

        // Navigate safely to ad
        const pageProps = jsonData?.props?.pageProps;
        if (!pageProps) debug.push("No pageProps");

        const ad = pageProps?.ad;

        if (ad) {
          debug.push("Found ad object");
          // Extract Location
          if (ad.location) {
            debug.push("Found location obj");
            if (ad.location.city) data.city = ad.location.city;
            if (ad.location.zipcode) data.zipcode = ad.location.zipcode;
          } else {
            debug.push("No location inside ad");
          }

          if (ad.attributes) {
            const attributes = ad.attributes;

            // Helper to find attribute by key or label
            const findAttr = (key, labelPart) => {
              return attributes.find(a =>
                a.key === key ||
                (a.label && a.label.toLowerCase().includes(labelPart))
              );
            };

            const surfaceAttr = findAttr('square', 'habitable');
            if (surfaceAttr) data.surface = surfaceAttr.value_label || surfaceAttr.value + ' m²';

            const terrainAttr = findAttr('land_plot_surface', 'terrain');
            if (terrainAttr) data.terrain = terrainAttr.value_label || terrainAttr.value + ' m²';

            const dpeAttr = findAttr('energy_rate', 'énergie');
            if (dpeAttr) data.dpe = (dpeAttr.value_label || dpeAttr.value).toUpperCase();

            const gesAttr = attributes.find(a =>
              a.key === 'ges_rate' ||
              (a.label && (
                a.label.toLowerCase() === 'ges' ||
                a.label.toLowerCase().includes('gaz à effet de serre')
              ))
            );
            if (gesAttr) data.ges = (gesAttr.value_label || gesAttr.value).toUpperCase();

            const dateAttr = attributes.find(a => a.label && a.label.includes('Date de réalisation'));
            if (dateAttr) data.date_diag = dateAttr.value_label || dateAttr.value;

            const primAttr = attributes.find(a => a.label && a.label.includes('primaire'));
            if (primAttr) data.conso_prim = primAttr.value_label || primAttr.value;

            const finAttr = attributes.find(a => a.label && a.label.includes('finale'));
            if (finAttr) data.conso_fin = finAttr.value_label || finAttr.value;
          }
        } else {
          debug.push("No ad object in pageProps");
          // Inspect keys to see what we have
          if (pageProps) debug.push("pageProps keys: " + Object.keys(pageProps).join(', '));
        }
      } else {
        debug.push("No __NEXT_DATA__ script found");
      }
    } catch (e) {
      console.log('Error parsing __NEXT_DATA__:', e);
      debug.push("Error: " + e.message);
    }

    data.debugLog = debug;

    // Check if we are missing data, if so, try to expand description
    const missingData = Object.values(data).some(v => v === 'Non trouvé');

    if (missingData) {
      // Try to find "Voir plus" button
      // 1. Try specific QA ID
      let seeMoreBtn = document.querySelector('button[data-qa-id="adview_description_expand_button"]');

      // 2. Try by text content if not found
      if (!seeMoreBtn) {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
        seeMoreBtn = buttons.find(b => {
          const text = b.innerText.toLowerCase();
          return text.includes('voir plus') || text.includes('afficher plus') || text.includes('lire la suite');
        });
      }

      if (seeMoreBtn) {
        // Scroll to button to ensure it's interactive
        seeMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Small delay for scroll
        await new Promise(r => setTimeout(r, 100));
        seeMoreBtn.click();
        // Wait for expansion (increased delay)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Strategy 2: DOM Scraping (Fallback & Supplement)
    // We scan all elements with text content matching our labels
    const allDivs = document.querySelectorAll('div, p, span');

    if (data.surface === 'Non trouvé') {
      const bodyText = document.body.innerText;
      const surfaceMatch = bodyText.match(/Surface habitable\s*[:\n]?\s*(\d+(?:[.,]\d+)?\s*m²)/i);
      if (surfaceMatch) data.surface = surfaceMatch[1];

      const terrainMatch = bodyText.match(/Surface totale du terrain\s*[:\n]?\s*(\d+(?:[.,]\d+)?\s*m²)/i);
      if (terrainMatch) data.terrain = terrainMatch[1];
    }

    // Fallback for location
    if (data.zipcode === 'Non trouvé' || data.city === 'Non trouvé') {
      const locationEl = document.querySelector('[data-qa-id="adview_location_container"]');
      if (locationEl) {
        const text = locationEl.innerText;
        const zipMatch = text.match(/\b\d{5}\b/);
        if (zipMatch) data.zipcode = zipMatch[0];

        // City is usually before the zipcode
        if (zipMatch) {
          const parts = text.split(zipMatch[0]);
          if (parts[0]) data.city = parts[0].trim();
        }
      }
    }

    // Regex on Description Text (now expanded)
    const descriptionEl = document.querySelector('[data-qa-id="adview_description_container"]') || document.body;
    const descText = descriptionEl.innerText;

    if (data.date_diag === 'Non trouvé') {
      const dateMatch = descText.match(/Date de réalisation du diagnostic(?: énergétique)?\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (dateMatch) data.date_diag = dateMatch[1];
    }

    if (data.conso_prim === 'Non trouvé') {
      const primMatch = descText.match(/Consommation énergie primaire\s*:\s*([\d\s]+kWh\/m²\/an)/i);
      if (primMatch) data.conso_prim = primMatch[1];
    }

    if (data.conso_fin === 'Non trouvé') {
      const finMatch = descText.match(/Consommation énergie finale\s*:\s*([^.\n]+)/i);
      if (finMatch) data.conso_fin = finMatch[1].trim();
    }

    // DPE/GES from badges if not found
    if (data.dpe === 'Non trouvé') {
      const dpeBadge = document.querySelector('[aria-label*="Diagnostic énergétique"], [aria-label*="Classe énergie"]');
      if (dpeBadge) {
        const match = dpeBadge.getAttribute('aria-label').match(/(?:Diagnostic énergétique|Classe énergie)\s*:\s*([A-G])/i);
        if (match) data.dpe = match[1].toUpperCase();
      } else {
        const dpeMatch = document.body.innerText.match(/Classe énergie\s*([A-G])(?!\s*[A-G])/i);
        if (dpeMatch) data.dpe = dpeMatch[1].toUpperCase();
      }
    }

    if (data.ges === 'Non trouvé') {
      const gesBadge = document.querySelector('[aria-label*="Indice émission de gaz à effet de serre"], [aria-label*="GES"]');
      if (gesBadge) {
        const match = gesBadge.getAttribute('aria-label').match(/(?:Indice émission de gaz à effet de serre|GES)\s*:\s*([A-G])/i);
        if (match) data.ges = match[1].toUpperCase();
      } else {
        // Fallback regex
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

    // Strategy 3: Visual Extraction (Computed Style)
    // This is powerful for the "Diagnostics" section where the value is indicated by a colored badge
    function findValueFromVisualScale(labelPart) {
      // Find all elements containing the label
      const allElements = Array.from(document.querySelectorAll('div, p, span, h3, h4'));
      const labelEl = allElements.find(el => el.innerText.includes(labelPart) && el.innerText.length < 50); // Ensure it's a short label

      if (!labelEl) return null;

      // Traverse up to find the container row (usually the parent or grandparent)
      // We look for a container that has multiple children with single letters
      let container = labelEl.parentElement;
      let letters = [];
      let attempts = 0;

      while (container && attempts < 4) {
        // Find potential scale letters
        const candidates = Array.from(container.querySelectorAll('div, span, p'));

        // CRITICAL FIX: Only consider letters that are AFTER the label in the DOM
        // This prevents GES from picking up DPE letters if they share a parent
        // and ensures DPE picks up its own letters (closest following)
        letters = candidates.filter(el => {
          return /^[A-G]$/.test(el.innerText.trim()) &&
            (labelEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
        });

        if (letters.length >= 5) { // Found the scale!
          // If we found too many (e.g. both DPE and GES scales), take the first 7 (A-G)
          // This assumes the closest scale is the correct one
          if (letters.length > 7) {
            letters = letters.slice(0, 7);
          }
          break;
        }
        container = container.parentElement;
        attempts++;
      }

      if (letters.length < 5) return null;

      // Now find the "active" letter
      // Since all letters might have different colors (A=Green, G=Red), we can't rely on unique background color.
      // Instead, we look for the one that is LARGER or BOLDER.

      const metrics = letters.map(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          el,
          height: rect.height,
          width: rect.width,
          fontWeight: parseInt(style.fontWeight) || 400,
          fontSize: parseFloat(style.fontSize) || 12
        };
      });

      // Helper to find outlier
      const findOutlier = (items, key) => {
        if (items.length < 3) return null;
        // Calculate mode (most common value)
        const counts = {};
        items.forEach(i => {
          const val = Math.round(i[key] * 10) / 10; // Round to avoid float precision issues
          counts[val] = (counts[val] || 0) + 1;
        });

        // Find the value that appears most often (the "normal" size)
        const commonVal = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

        // Find an item that is significantly larger than commonVal
        return items.find(i => {
          const val = Math.round(i[key] * 10) / 10;
          return val > parseFloat(commonVal) * 1.1; // 10% larger
        });
      };

      // Try height, then width, then font size
      let active = findOutlier(metrics, 'height');
      if (!active) active = findOutlier(metrics, 'width');
      if (!active) active = findOutlier(metrics, 'fontSize');
      if (!active) active = findOutlier(metrics, 'fontWeight');

      if (active) {
        return active.el.innerText.trim();
      }

      return null;
    }

    if (data.dpe === 'Non trouvé') {
      const visualDpe = findValueFromVisualScale('Classe énergie') || findValueFromVisualScale('Diagnostic énergétique');
      if (visualDpe) data.dpe = visualDpe;
    }

    if (data.ges === 'Non trouvé') {
      const visualGes = findValueFromVisualScale('GES') || findValueFromVisualScale('Gaz à effet de serre');
      if (visualGes) data.ges = visualGes;
    }

    return data;
  }

  // Function to prepare ADEME Search (Manual Trigger)
  function prepareAdemeSearch(data) {
    const ademeParams = document.getElementById('ademe-params');
    const paramsList = document.getElementById('params-list');
    const searchBtn = document.getElementById('search-ademe-btn');
    const ademeResults = document.getElementById('ademe-results');

    // Reset
    ademeResults.innerHTML = '';
    paramsList.innerHTML = '';
    ademeParams.style.display = 'none';
    searchBtn.style.display = 'none';

    // Validate data
    const validation = validateAdemeSearchData(data);
    if (!validation.isValid) {
      ademeResults.innerHTML = `<p style="color: #999; font-size: 0.8em;">Recherche ADEME non disponible : informations manquantes (${validation.missing.join(', ')}).</p>`;
      return;
    }

    // Show Parameters
    ademeParams.style.display = 'block';

    const liLoc = document.createElement('li');
    liLoc.textContent = `Localisation : ${data.zipcode !== 'Non trouvé' ? data.zipcode : data.city}`;
    paramsList.appendChild(liLoc);

    const liDate = document.createElement('li');
    liDate.textContent = `Date : ${data.date_diag} (+/- 7 jours)`;
    paramsList.appendChild(liDate);

    const liDpe = document.createElement('li');
    liDpe.textContent = `DPE : ${data.dpe}`;
    paramsList.appendChild(liDpe);

    const liGes = document.createElement('li');
    liGes.textContent = `GES : ${data.ges}`;
    paramsList.appendChild(liGes);

    const liSurf = document.createElement('li');
    liSurf.textContent = `Surface : ${data.surface} (+/- 10%)`;
    paramsList.appendChild(liSurf);

    if (data.conso_prim && data.conso_prim !== 'Non trouvé') {
      const liPrim = document.createElement('li');
      liPrim.textContent = `Conso. Primaire : ${data.conso_prim} (+/- 10%)`;
      paramsList.appendChild(liPrim);
    }

    // Show Button
    searchBtn.style.display = 'block';
    searchBtn.onclick = () => executeAdemeSearch(data);
  }

  // Function to execute ADEME API Search
  async function executeAdemeSearch(data) {
    const ademeLoading = document.getElementById('ademe-loading');
    const ademeResults = document.getElementById('ademe-results');
    const searchBtn = document.getElementById('search-ademe-btn');

    searchBtn.disabled = true;
    searchBtn.textContent = "Recherche en cours...";
    ademeLoading.style.display = 'block';
    ademeResults.innerHTML = '';

    try {
      const url = buildAdemeUrl(data);
      const response = await fetch(url);
      const result = await response.json();

      ademeLoading.style.display = 'none';
      searchBtn.textContent = "Lancer la recherche";
      searchBtn.disabled = false;

      if (result.results && result.results.length > 0) {
        // Calculate scores
        const scoredResults = result.results.map(item => ({
          ...item,
          score: calculateMatchScore(data, item)
        }));

        // Sort by score descending
        const sortedResults = sortResultsByScore(scoredResults);

        let html = '<p><strong>Correspondances trouvées :</strong></p><ul style="padding-left: 20px; margin-top: 5px;">';
        sortedResults.forEach(item => {
          const date = item.date_etablissement_dpe ? new Date(item.date_etablissement_dpe).toLocaleDateString() : 'N/A';
          const address = item.adresse_ban || item.nom_commune_ban || 'Adresse inconnue';
          const mapsLink = getGoogleMapsLink(address);

          // Color code score
          const scoreColor = getScoreColor(item.score);

          html += `<li style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${address}</strong>
              <span style="background: ${scoreColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">${item.score}%</span>
            </div>
            <a href="${mapsLink}" target="_blank" style="display: inline-block; margin-top: 4px; font-size: 0.85em; color: #3498db; text-decoration: none;">📍 Voir sur Google Maps</a>
          </li>`;
        });
        html += '</ul>';
        ademeResults.innerHTML = html;
      } else {
        ademeResults.innerHTML = '<p>Aucun DPE correspondant trouvé avec ces critères stricts.</p>';
      }

      if (!data.zipcode || data.zipcode === 'Non trouvé') {
        ademeResults.innerHTML = '<p style="color: orange;">Code postal non trouvé, impossible de chercher dans la base.</p>';
        return;
      }

      // New condition: only proceed if diagnostic date is found
      if (!data.date_diag || data.date_diag === 'Non trouvé') {
        ademeResults.innerHTML = '<p style="color: orange;">Date du diagnostic non trouvée, recherche annulée.</p>';
        return;
      }

    } catch (error) {
      console.error('API Error:', error);
      ademeLoading.style.display = 'none';
      searchBtn.textContent = "Lancer la recherche";
      searchBtn.disabled = false;
      ademeResults.innerHTML = '<p style="color: red;">Erreur lors de la recherche.</p>';
    }
  }

  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].id) {
      errorMsg.textContent = "Erreur : Impossible d'accéder à l'onglet actif.";
      errorMsg.style.display = 'block';
      return;
    }

    browser.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: extractRealEstateData,
    }, (results) => {
      if (browser.runtime.lastError) {
        errorMsg.textContent = "Erreur : " + browser.runtime.lastError.message;
        errorMsg.style.display = 'block';
        return;
      }

      if (results && results[0] && results[0].result) {
        const res = results[0].result;

        if (res.error) {
          errorMsg.textContent = res.error;
          errorMsg.style.display = 'block';
          return;
        }

        // Display Results
        const fields = ['city', 'zipcode', 'surface', 'terrain', 'dpe', 'ges', 'date_diag', 'conso_prim', 'conso_fin'];
        fields.forEach(field => {
          const el = document.getElementById(field);
          if (el) {
            el.textContent = res[field] || 'Non trouvé';
            if (res[field] === 'Non trouvé') el.style.color = '#999';
            else el.style.color = '#1a1a1a';
          }
        });



        // Prepare ADEME Search (Manual)
        prepareAdemeSearch(res);

      } else {
        errorMsg.textContent = "Données non trouvées.";
        errorMsg.style.display = 'block';
      }
    });
  });
});
