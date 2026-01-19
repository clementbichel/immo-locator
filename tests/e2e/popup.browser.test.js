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
      runScripts: 'outside-only'
    });
    document = dom.window.document;
  });

  describe('Initial Page Load', () => {
    it('should display the page title', () => {
      const title = document.querySelector('h1');
      expect(title).not.toBeNull();
      expect(title.textContent).toContain("Détails de l'annonce");
    });

    it('should display all data fields', () => {
      const labels = document.querySelectorAll('.label');
      const labelTexts = Array.from(labels).map(l => l.textContent);

      expect(labelTexts).toContain('Ville');
      expect(labelTexts).toContain('Code Postal');
      expect(labelTexts).toContain('Surface');
      expect(labelTexts).toContain('Terrain');
      expect(labelTexts).toContain('DPE');
      expect(labelTexts).toContain('GES');
      expect(labelTexts).toContain('Date Diag');
      expect(labelTexts).toContain('Conso. Primaire');
      expect(labelTexts).toContain('Conso. Finale');
    });

    it('should show loading state for city', () => {
      const cityValue = document.getElementById('city');
      expect(cityValue).not.toBeNull();
      expect(cityValue.textContent).toBe('Chargement...');
    });

    it('should have search button initially hidden', () => {
      const searchBtn = document.getElementById('search-ademe-btn');
      expect(searchBtn).not.toBeNull();
      expect(searchBtn.style.display).toBe('none');
    });

    it('should have ADEME params initially hidden', () => {
      const params = document.getElementById('ademe-params');
      expect(params).not.toBeNull();
      expect(params.style.display).toBe('none');
    });

    it('should have error message hidden', () => {
      const errorMsg = document.getElementById('error-msg');
      expect(errorMsg).not.toBeNull();
      expect(errorMsg.style.display).toBe('none');
    });
  });

  describe('Page Structure', () => {
    it('should have correct number of data rows', () => {
      const dataRows = document.querySelectorAll('.data-row');
      expect(dataRows.length).toBe(9);
    });

    it('should have data container', () => {
      const container = document.getElementById('data-container');
      expect(container).not.toBeNull();
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

  describe('UI Elements', () => {
    it('should have button with correct text', () => {
      const button = document.getElementById('search-ademe-btn');
      expect(button).not.toBeNull();
      expect(button.textContent).toContain('Lancer la recherche');
    });

    it('should have loading indicator with correct text', () => {
      const loading = document.getElementById('ademe-loading');
      expect(loading).not.toBeNull();
      expect(loading.textContent).toBe('Recherche en cours...');
    });

    it('should have script tag for popup.js', () => {
      const scripts = document.querySelectorAll('script');
      const popupScript = Array.from(scripts).find(s => s.src?.includes('popup.js') || s.getAttribute('src') === 'popup.js');
      expect(popupScript).not.toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have labels for all data values', () => {
      const labels = document.querySelectorAll('.label');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have values elements', () => {
      const values = document.querySelectorAll('.value');
      expect(values.length).toBeGreaterThan(0);
    });

    it('should have matching labels and values', () => {
      const labels = document.querySelectorAll('.label');
      const values = document.querySelectorAll('.value');
      expect(labels.length).toBe(values.length);
    });

    it('should have proper document structure', () => {
      expect(document.doctype).not.toBeNull();
      expect(document.documentElement.tagName).toBe('HTML');
    });
  });

  describe('Styling', () => {
    it('should have style tag with CSS rules', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag).not.toBeNull();
      expect(styleTag.textContent).toContain('body');
      expect(styleTag.textContent).toContain('.data-row');
    });

    it('should set correct body width in CSS', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('width: 400px');
    });

    it('should have Leboncoin orange color for button', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('#ec5a13');
    });
  });
});
