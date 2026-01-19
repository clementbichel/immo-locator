/**
 * Mock Chrome Extension APIs for testing
 */

const mockTabs = [
  { id: 1, url: 'https://www.leboncoin.fr/ventes_immobilieres/1234567890.htm', active: true }
];

const mockScriptingResults = {
  default: [{
    result: {
      surface: '120 m²',
      terrain: '500 m²',
      dpe: 'D',
      ges: 'E',
      date_diag: '15/03/2024',
      conso_prim: '250 kWh/m²/an',
      conso_fin: '180 kWh/m²/an',
      city: 'Paris',
      zipcode: '75001',
      debugLog: ['Found __NEXT_DATA__', 'Parsed JSON', 'Found ad object']
    }
  }]
};

const chrome = {
  tabs: {
    query: vi.fn((queryInfo, callback) => {
      callback(mockTabs);
    })
  },
  scripting: {
    executeScript: vi.fn((details, callback) => {
      callback(mockScriptingResults.default);
    })
  },
  runtime: {
    lastError: null
  }
};

// Set global mocks
globalThis.chrome = chrome;
globalThis.browser = chrome;

// Export for test manipulation
export { chrome, mockTabs, mockScriptingResults };

// Reset function for tests
export function resetChromeMocks() {
  chrome.tabs.query.mockClear();
  chrome.scripting.executeScript.mockClear();
  chrome.runtime.lastError = null;
}

// Set custom scripting result for specific tests
export function setScriptingResult(result) {
  mockScriptingResults.custom = result;
  chrome.scripting.executeScript.mockImplementation((details, callback) => {
    callback(result);
  });
}

// Set lastError for error testing
export function setLastError(message) {
  chrome.runtime.lastError = { message };
}
