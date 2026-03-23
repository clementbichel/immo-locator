/**
 * Find an attribute in the ad attributes array
 * @param {Array} attributes - Array of ad attributes
 * @param {string} key - Key to match
 * @param {string} labelPart - Label part to match (lowercase)
 * @returns {Object | undefined} - Found attribute or undefined
 */
export function findAttribute(attributes, key, labelPart) {
  if (!Array.isArray(attributes)) {
    return undefined;
  }

  return attributes.find((a) => {
    if (a.key === key) return true;
    const label = (a.key_label || a.label || '').toLowerCase();
    return label.includes(labelPart);
  });
}

/**
 * Find GES attribute with special matching logic
 * @param {Array} attributes - Array of ad attributes
 * @returns {Object | undefined} - Found attribute or undefined
 */
export function findGesAttribute(attributes) {
  if (!Array.isArray(attributes)) {
    return undefined;
  }

  return attributes.find((a) => {
    if (a.key === 'ges' || a.key === 'ges_rate') return true;
    const label = (a.key_label || a.label || '').toLowerCase();
    return label === 'ges' || label.includes('gaz à effet de serre');
  });
}

/**
 * Find attribute by exact label match
 * @param {Array} attributes - Array of ad attributes
 * @param {string} labelPart - Label part to match
 * @returns {Object | undefined} - Found attribute or undefined
 */
export function findAttributeByLabel(attributes, labelPart) {
  if (!Array.isArray(attributes)) {
    return undefined;
  }

  return attributes.find((a) => {
    const label = a.key_label || a.label || '';
    return label.includes(labelPart);
  });
}

/**
 * Extract real estate data from __NEXT_DATA__ JSON
 * @param {Object} jsonData - Parsed JSON from __NEXT_DATA__
 * @returns {Object} - Extracted data with debug log
 */
export function extractFromNextData(jsonData) {
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

  if (!jsonData) {
    debug.push('No JSON data provided');
    return { data, debug };
  }

  // Navigate safely to ad
  const pageProps = jsonData?.props?.pageProps;
  if (!pageProps) {
    debug.push('No pageProps found');
    return { data, debug };
  }

  const ad = pageProps?.ad;
  if (!ad) {
    debug.push('No ad object in pageProps');
    debug.push('pageProps keys: ' + Object.keys(pageProps).join(', '));
    return { data, debug };
  }

  debug.push('Found ad object');

  // Extract Location
  if (ad.location) {
    debug.push('Found location obj');
    if (ad.location.city) data.city = ad.location.city;
    if (ad.location.zipcode) data.zipcode = ad.location.zipcode;
  } else {
    debug.push('No location inside ad');
  }

  // Extract Attributes
  if (ad.attributes) {
    const attributes = ad.attributes;

    // Surface
    const surfaceAttr = findAttribute(attributes, 'square', 'habitable');
    if (surfaceAttr) {
      data.surface = surfaceAttr.value_label || surfaceAttr.value + ' m²';
    }

    // Terrain
    const terrainAttr = findAttribute(attributes, 'land_plot_surface', 'terrain');
    if (terrainAttr) {
      data.terrain = terrainAttr.value_label || terrainAttr.value + ' m²';
    }

    // DPE
    const dpeAttr = findAttribute(attributes, 'energy_rate', 'énergie');
    if (dpeAttr) {
      data.dpe = (dpeAttr.value_label || dpeAttr.value).toUpperCase();
    }

    // GES
    const gesAttr = findGesAttribute(attributes);
    if (gesAttr) {
      data.ges = (gesAttr.value_label || gesAttr.value).toUpperCase();
    }

    // Diagnostic Date
    const dateAttr = findAttributeByLabel(attributes, 'Date de réalisation');
    if (dateAttr) {
      data.date_diag = dateAttr.value_label || dateAttr.value;
    }

    // Primary Energy
    const primAttr = findAttributeByLabel(attributes, 'primaire');
    if (primAttr) {
      data.conso_prim = primAttr.value_label || primAttr.value;
    }

    // Final Energy
    const finAttr = findAttributeByLabel(attributes, 'finale');
    if (finAttr) {
      data.conso_fin = finAttr.value_label || finAttr.value;
    }
  }

  return { data, debug };
}

/**
 * Get attribute value with fallback to value + suffix
 * @param {Object} attr - Attribute object
 * @param {string} suffix - Suffix to add if value_label is missing
 * @returns {string | null} - Attribute value or null
 */
export function getAttributeValue(attr, suffix = '') {
  if (!attr) return null;
  return attr.value_label || attr.value + suffix;
}
