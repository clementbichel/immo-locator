import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the popup.html file
const popupHtmlPath = join(__dirname, '../../popup.html');
const popupHtml = readFileSync(popupHtmlPath, 'utf-8');

describe('Popup UI E2E Tests', () => {
  let dom;
  let document;

  beforeAll(() => {
    // Create a JSDOM instance with the popup HTML
    dom = new JSDOM(popupHtml, {
      url: 'chrome-extension://test/popup.html',
      runScripts: 'outside-only',
    });
    document = dom.window.document;
  });

  describe('Initial Page Load', () => {
    it('should display the page title', () => {
      const title = document.querySelector('h1');
      expect(title).not.toBeNull();
      expect(title.textContent).toContain('Annonce Immo Locator');
    });

    it('should display all data fields', () => {
      // Check that all required IDs exist
      const requiredIds = [
        'city',
        'zipcode',
        'surface',
        'terrain',
        'dpe',
        'ges',
        'date_diag',
        'conso_prim',
        'conso_fin',
      ];
      requiredIds.forEach((id) => {
        const el = document.getElementById(id);
        expect(el, `Element with id "${id}" should exist`).not.toBeNull();
      });
    });

    it('should show loading state for city', () => {
      const cityValue = document.getElementById('city');
      expect(cityValue).not.toBeNull();
      expect(cityValue.textContent).toBe('Chargement...');
    });

    it('should have search button initially hidden via CSS', () => {
      const searchBtn = document.getElementById('search-ademe-btn');
      expect(searchBtn).not.toBeNull();
      // Check CSS class or computed style
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('#search-ademe-btn');
      expect(styleTag.textContent).toContain('display: none');
    });

    it('should have ADEME params initially hidden via CSS', () => {
      const params = document.getElementById('ademe-params');
      expect(params).not.toBeNull();
      // Hidden via CSS class
      expect(params.classList.contains('ademe-params')).toBe(true);
    });

    it('should have error message element', () => {
      const errorMsg = document.getElementById('error-msg');
      expect(errorMsg).not.toBeNull();
      expect(errorMsg.classList.contains('error')).toBe(true);
    });
  });

  describe('Page Structure', () => {
    it('should have cards for each section', () => {
      const cards = document.querySelectorAll('.card');
      expect(cards.length).toBe(3); // Property info, Energy, ADEME
    });

    it('should have header with title', () => {
      const header = document.querySelector('.header');
      expect(header).not.toBeNull();
      const title = header.querySelector('h1');
      expect(title).not.toBeNull();
    });

    it('should have ADEME section', () => {
      const section = document.getElementById('ademe-section');
      expect(section).not.toBeNull();
    });

    it('should have params list element', () => {
      const paramsList = document.getElementById('params-list');
      expect(paramsList).not.toBeNull();
    });

    it('should have results container', () => {
      const results = document.getElementById('ademe-results');
      expect(results).not.toBeNull();
    });
  });

  describe('Energy Badges', () => {
    it('should have DPE badge', () => {
      const dpeBadge = document.getElementById('dpe');
      expect(dpeBadge).not.toBeNull();
      expect(dpeBadge.classList.contains('energy-badge-value')).toBe(true);
    });

    it('should have GES badge', () => {
      const gesBadge = document.getElementById('ges');
      expect(gesBadge).not.toBeNull();
      expect(gesBadge.classList.contains('energy-badge-value')).toBe(true);
    });

    it('should have energy color classes defined in CSS', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('.energy-A');
      expect(styleTag.textContent).toContain('.energy-G');
    });
  });

  describe('UI Elements', () => {
    it('should have button with correct text', () => {
      const button = document.getElementById('search-ademe-btn');
      expect(button).not.toBeNull();
      expect(button.textContent).toContain('Rechercher dans la base ADEME');
    });

    it('should have loading indicator with spinner', () => {
      const loading = document.getElementById('ademe-loading');
      expect(loading).not.toBeNull();
      expect(loading.textContent).toContain('Recherche en cours...');
      const spinner = loading.querySelector('.loading-spinner');
      expect(spinner).not.toBeNull();
    });

    it('should have script tag for popup.js', () => {
      const scripts = document.querySelectorAll('script');
      const popupScript = Array.from(scripts).find(
        (s) => s.src?.includes('popup.js') || s.getAttribute('src') === 'popup.js'
      );
      expect(popupScript).not.toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have labels for data values', () => {
      const labels = document.querySelectorAll('.label');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have values elements', () => {
      const values = document.querySelectorAll('.value');
      expect(values.length).toBeGreaterThan(0);
    });

    it('should have proper document structure', () => {
      expect(document.doctype).not.toBeNull();
      expect(document.documentElement.tagName).toBe('HTML');
    });

    it('should have card titles for sections', () => {
      const cardTitles = document.querySelectorAll('.card-title');
      expect(cardTitles.length).toBe(3);
    });
  });

  describe('Styling', () => {
    it('should have style tag with CSS rules', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag).not.toBeNull();
      expect(styleTag.textContent).toContain('body');
      expect(styleTag.textContent).toContain('.card');
    });

    it('should set correct body width in CSS', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('width: 360px');
    });

    it('should have gradient background for body', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('linear-gradient');
      expect(styleTag.textContent).toContain('#667eea');
    });

    it('should have button styles with gradient', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('.btn-primary');
    });
  });
});
