/**
 * Secure DOM manipulation helpers to avoid innerHTML XSS vulnerabilities
 */

/**
 * Create an element with text content
 * @param {string} tag - HTML tag name
 * @param {string} text - Text content
 * @param {Object} [attrs] - Attributes to set
 * @returns {HTMLElement}
 */
export function createElement(tag, text = '', attrs = {}) {
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

/**
 * Create a link element
 * @param {string} href - Link URL
 * @param {string} text - Link text
 * @param {Object} [attrs] - Additional attributes
 * @returns {HTMLAnchorElement}
 */
export function createLink(href, text, attrs = {}) {
  return createElement('a', text, { href, ...attrs });
}

/**
 * Create a styled paragraph for messages
 * @param {string} text - Message text
 * @param {string} [color] - Text color
 * @returns {HTMLParagraphElement}
 */
export function createMessage(text, color = null) {
  const attrs = {};
  if (color) {
    attrs.style = { color };
  }
  return createElement('p', text, attrs);
}

/**
 * Clear all children of an element
 * @param {HTMLElement} element
 */
export function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Set text content safely, clearing any existing content
 * @param {HTMLElement} element
 * @param {string} text
 */
export function setTextContent(element, text) {
  clearElement(element);
  element.textContent = text;
}

/**
 * Create an ADEME result item element
 * @param {Object} item - ADEME result item
 * @param {string} mapsLink - Google Maps link
 * @param {string} scoreColor - Score badge color
 * @returns {HTMLLIElement}
 */
export function createAdemeResultItem(item, mapsLink, scoreColor) {
  const li = createElement('li', '', {
    style: {
      marginBottom: '12px',
      borderBottom: '1px solid #eee',
      paddingBottom: '8px',
    },
  });

  // Header with address and score
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

  // Maps link
  const link = createLink(mapsLink, '📍 Voir sur Google Maps', {
    target: '_blank',
    style: {
      display: 'inline-block',
      marginTop: '4px',
      fontSize: '0.85em',
      color: '#3498db',
      textDecoration: 'none',
    },
  });

  // Firefox doesn't auto-close popup on external link click, handle manually
  link.addEventListener('click', (e) => {
    e.preventDefault();
    // Cross-browser: use browser if available, otherwise chrome
    const browserApi = globalThis.browser || globalThis.chrome;
    browserApi.tabs.create({ url: mapsLink });
    window.close();
  });

  li.appendChild(header);
  li.appendChild(link);

  return li;
}

/**
 * Create the ADEME results list
 * @param {Array} results - Array of ADEME results with scores
 * @param {Function} getMapsLink - Function to get Google Maps link
 * @param {Function} getScoreColor - Function to get score color
 * @returns {HTMLElement}
 */
export function createAdemeResultsList(results, getMapsLink, getScoreColor) {
  const container = document.createDocumentFragment();

  const title = createElement('p');
  const strong = createElement('strong', 'Correspondances trouvées :');
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
    const scoreColor = getScoreColor(item.score);
    const li = createAdemeResultItem(item, mapsLink, scoreColor);
    ul.appendChild(li);
  });

  container.appendChild(ul);
  return container;
}
