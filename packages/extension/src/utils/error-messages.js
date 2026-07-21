/**
 * Centralized error messages in French for user-facing errors
 */

export const ERROR_CODES = {
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

export const ERROR_MESSAGES = {
  // Network errors
  [ERROR_CODES.NETWORK_TIMEOUT]:
    'La connexion a expiré. Vérifiez votre connexion internet et réessayez.',
  [ERROR_CODES.NETWORK_ERROR]: 'Erreur de connexion. Vérifiez votre connexion internet.',
  [ERROR_CODES.API_ERROR]: "Erreur lors de la communication avec l'API.",

  // Data extraction errors
  [ERROR_CODES.INVALID_PAGE]:
    'Cette extension ne fonctionne que pour les ventes immobilières et les locations.',
  [ERROR_CODES.DATA_NOT_FOUND]: 'Données non trouvées sur cette page.',
  [ERROR_CODES.MISSING_FIELDS]: 'Informations manquantes pour effectuer la recherche.',

  // Extension errors
  [ERROR_CODES.TAB_ACCESS_ERROR]: "Impossible d'accéder à l'onglet actif.",
  [ERROR_CODES.SCRIPT_INJECTION_ERROR]: "Erreur lors de l'injection du script.",

  // Validation errors
  [ERROR_CODES.INVALID_ZIPCODE]: 'Code postal invalide.',
  [ERROR_CODES.INVALID_DPE]: 'Classe DPE invalide (doit être entre A et G).',
  [ERROR_CODES.INVALID_GES]: 'Classe GES invalide (doit être entre A et G).',
  [ERROR_CODES.INVALID_SURFACE]: 'Surface invalide.',
  [ERROR_CODES.INVALID_DATE]: 'Date de diagnostic invalide.',
};

/**
 * Get user-friendly error message
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} [fallback] - Fallback message if code not found
 * @returns {string} User-friendly error message in French
 */
export function getErrorMessage(code, fallback = 'Une erreur inattendue est survenue.') {
  return ERROR_MESSAGES[code] || fallback;
}

const MISSING = 'Non trouvé';

/**
 * Explain why a search came back empty, en pointant le champ le plus probable.
 * L'ordre compte : on cite la cause la plus fréquente en premier.
 * @param {Object} data - Données extraites de l'annonce (valeurs brutes)
 * @returns {string} Phrase d'explication à afficher sous le message d'échec
 */
export function explainNoResult(data = {}) {
  const isMissing = (v) => !v || v === MISSING;

  if (isMissing(data.date_diag)) {
    return "L'annonce ne donne pas la date du diagnostic : c'est le critère le plus discriminant, sans lui la recherche aboutit rarement.";
  }
  if (isMissing(data.surface)) {
    return "L'annonce ne donne pas la surface habitable, impossible de départager les logements du secteur.";
  }
  if (isMissing(data.zipcode)) {
    return "L'annonce ne donne pas le code postal, la recherche a porté sur toute la commune.";
  }
  return "Le DPE de ce logement n'est peut-être pas encore publié, ou l'annonce affiche des valeurs mises à jour depuis le diagnostic.";
}
