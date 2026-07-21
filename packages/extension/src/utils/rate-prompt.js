// ponytail: localStorage plutôt que chrome.storage — le popup est une page d'extension,
// ça persiste et ça évite d'ajouter la permission "storage" (donc pas de re-prompt utilisateur).

const COUNT_KEY = 'il_search_count';
const DONE_KEY = 'il_rate_done';
const TRIGGER_AT = 6; // « plus de 5 recherches » → la 6e

const STORE_URLS = {
  chrome:
    'https://chromewebstore.google.com/detail/immo-locator/okglkdgbdbnikojffmjpodmakgjmlpda/reviews',
  firefox: 'https://addons.mozilla.org/fr/firefox/addon/immo-locator/reviews/',
};

/** @returns {string} URL de la page d'avis du store courant */
export function getStoreReviewUrl() {
  const browserApi = globalThis.browser || globalThis.chrome;
  const isFirefox = browserApi?.runtime?.getURL('').startsWith('moz-extension://');
  return isFirefox ? STORE_URLS.firefox : STORE_URLS.chrome;
}

/**
 * Incrémente le compteur de recherches réussies et indique s'il faut demander une note.
 * @returns {boolean}
 */
export function shouldAskForRating() {
  try {
    if (localStorage.getItem(DONE_KEY)) return false;
    const count = Number(localStorage.getItem(COUNT_KEY) || 0) + 1;
    localStorage.setItem(COUNT_KEY, String(count));
    return count >= TRIGGER_AT;
  } catch {
    return false; // localStorage indisponible (mode strict / stockage bloqué)
  }
}

function dismiss() {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Construit l'encart de notation.
 * @returns {HTMLElement}
 */
export function createRatePrompt() {
  const box = document.createElement('div');
  box.className = 'rate-prompt';

  const text = document.createElement('span');
  text.textContent = 'Vous aimez notre extension ? Donnez-nous 5 étoiles ⭐';

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
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Ne plus afficher');
  close.addEventListener('click', () => {
    dismiss();
    box.remove();
  });

  box.append(text, link, close);
  return box;
}
