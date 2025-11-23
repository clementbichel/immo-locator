document.addEventListener('DOMContentLoaded', () => {
    const surfaceEl = document.getElementById('surface');
    const terrainEl = document.getElementById('terrain');
    const dpeEl = document.getElementById('dpe');
    const gesEl = document.getElementById('ges');
    const dateDiagEl = document.getElementById('date_diag');
    const consoPrimEl = document.getElementById('conso_prim');
    const consoFinEl = document.getElementById('conso_fin');

    const errorMsg = document.getElementById('error-msg');
    const copyBtn = document.getElementById('copy-btn');

    // Function to be injected into the page
    async function extractRealEstateData() {
        // Check if we are in the correct category
        // URL check is fast and effective for Leboncoin
        if (!window.location.href.includes('/ventes_immobilieres/')) {
            return { error: "Cette extension ne fonctionne que pour les ventes immobilières." };
        }

        const data = {
            surface: 'Non trouvé',
            terrain: 'Non trouvé',
            dpe: 'Non trouvé',
            ges: 'Non trouvé',
            date_diag: 'Non trouvé',
            conso_prim: 'Non trouvé',
            conso_fin: 'Non trouvé'
        };

        // Helper to clean text
        const clean = (text) => text ? text.trim() : null;

        // Strategy 1: __NEXT_DATA__ (Best source)
        try {
            const nextDataScript = document.getElementById('__NEXT_DATA__');
            if (nextDataScript) {
                const jsonData = JSON.parse(nextDataScript.textContent);
                const ad = jsonData?.props?.pageProps?.ad;

                if (ad && ad.attributes) {
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
            }
        } catch (e) {
            console.log('Error parsing __NEXT_DATA__:', e);
        }

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

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].id) {
            errorMsg.textContent = "Erreur : Impossible d'accéder à l'onglet actif.";
            errorMsg.style.display = 'block';
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: extractRealEstateData,
        }, (results) => {
            if (chrome.runtime.lastError) {
                errorMsg.textContent = "Erreur : " + chrome.runtime.lastError.message;
                errorMsg.style.display = 'block';
                return;
            }

            if (results && results[0] && results[0].result) {
                const res = results[0].result;

                if (res.error) {
                    errorMsg.textContent = res.error;
                    errorMsg.style.display = 'block';
                    // Hide content
                    document.getElementById('content').style.display = 'none';
                    copyBtn.style.display = 'none';
                    return;
                }

                surfaceEl.textContent = res.surface;
                terrainEl.textContent = res.terrain;
                dpeEl.textContent = res.dpe;
                gesEl.textContent = res.ges;
                dateDiagEl.textContent = res.date_diag;
                consoPrimEl.textContent = res.conso_prim;
                consoFinEl.textContent = res.conso_fin;
            } else {
                errorMsg.textContent = "Données non trouvées.";
                errorMsg.style.display = 'block';
            }
        });
    });

    copyBtn.addEventListener('click', () => {
        const text = `Surface: ${surfaceEl.textContent}
Terrain: ${terrainEl.textContent}
DPE: ${dpeEl.textContent}
GES: ${gesEl.textContent}
Date: ${dateDiagEl.textContent}
Conso Primaire: ${consoPrimEl.textContent}
Conso Finale: ${consoFinEl.textContent}`;

        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copié !";
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 1500);
        });
    });
});
