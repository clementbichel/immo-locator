/**
 * Extract real estate data from a SeLoger UFRN SSR state object.
 * The state is the parsed content of the script tag
 * `<script id="__UFRN_LIFECYCLE_SERVERREQUEST__">window["__UFRN_LIFECYCLE_SERVERREQUEST__"]=JSON.parse("...")</script>`
 *
 * @param {Object} state - Parsed UFRN state object (top-level: app_cldp.data.classified)
 * @returns {{ data: Object, debug: string[] }}
 */
export function extractFromSelogerState(state) {
  const data = {
    surface: null,
    terrain: null,
    dpe: null,
    ges: null,
    date_diag: null,
    conso_prim: null,
    conso_fin: null,
    city: null,
    zipcode: null,
  };

  const debug = [];

  const classified = state?.app_cldp?.data?.classified;
  if (!classified) {
    debug.push('No classified object in state');
    return { data, debug };
  }
  debug.push('Found classified object');

  const sections = classified.sections || {};

  // Location
  const address = sections.location?.address;
  if (address) {
    if (address.city) data.city = address.city;
    if (address.zipCode) data.zipcode = address.zipCode;
    debug.push('Extracted location');
  } else {
    debug.push('No address in sections.location');
  }

  // Surface (from legacyTracking — pre-parsed numeric)
  const product = classified.legacyTracking?.products?.[0];
  if (product) {
    if (typeof product.space === 'number') {
      data.surface = `${product.space} m²`;
    }
    debug.push('Extracted product tracking');
  } else {
    debug.push('No legacyTracking.products[0]');
  }

  // Energy (DPE + GES from certificates[0].scales[])
  // CRITICAL: filter scales by `type` not by index — order is not guaranteed,
  // and the same value (e.g. emissions kg CO₂) appears in both scales.
  const scales = sections.energy?.certificates?.[0]?.scales;
  if (Array.isArray(scales)) {
    const energyScale = scales.find((s) => /^FR_ENERGY/.test(s?.type || ''));
    const ghgScale = scales.find((s) => /^FR_GHG/.test(s?.type || ''));

    if (energyScale?.efficiencyClass?.rating) {
      data.dpe = String(energyScale.efficiencyClass.rating).toUpperCase();
      debug.push('Extracted DPE from FR_ENERGY scale');
    }
    if (ghgScale?.efficiencyClass?.rating) {
      data.ges = String(ghgScale.efficiencyClass.rating).toUpperCase();
      debug.push('Extracted GES from FR_GHG scale');
    }

    // Primary energy consumption — from FR_ENERGY scale values[label~Consommation]
    if (Array.isArray(energyScale?.values)) {
      const consoEntry = energyScale.values.find((v) => /consommation/i.test(v?.label || ''));
      if (consoEntry?.value) {
        data.conso_prim = consoEntry.value;
        debug.push('Extracted conso_prim from FR_ENERGY values');
      }
    }
  } else {
    debug.push('No energy.certificates[0].scales array');
  }

  // Date du diagnostic — best-effort regex on free-text description.
  // SeLoger does not expose this in structured fields; agents sometimes
  // write it inline like "Date du diagnostic énergétique : 24/05/2023".
  const description = sections.mainDescription?.description;
  if (typeof description === 'string') {
    const dateMatch = description.match(
      /Date\s+du\s+diagnostic(?:\s+énergétique)?\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
    );
    if (dateMatch) {
      data.date_diag = dateMatch[1];
      debug.push('Extracted date_diag from description regex');
    }
  }

  return { data, debug };
}
