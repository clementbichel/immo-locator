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
      expect(title.textContent).toContain('Immo Locator');
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

    it('should show loading state for city with shimmer animation', () => {
      const cityValue = document.getElementById('city');
      expect(cityValue).not.toBeNull();
      expect(cityValue.classList.contains('loading')).toBe(true);
    });

    it('should have search button initially hidden via CSS', () => {
      const searchBtn = document.getElementById('search-location-btn');
      expect(searchBtn).not.toBeNull();
      // Check CSS class or computed style
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('#search-location-btn');
      expect(styleTag.textContent).toContain('display: none');
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
      expect(cards.length).toBe(2); // Property info, Energy
    });

    it('should have header with title', () => {
      const header = document.querySelector('.header');
      expect(header).not.toBeNull();
      const title = header.querySelector('h1');
      expect(title).not.toBeNull();
    });

    it('should have Location section', () => {
      const section = document.getElementById('location-section');
      expect(section).not.toBeNull();
    });

    it('should have results container', () => {
      const results = document.getElementById('location-results');
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
      const button = document.getElementById('search-location-btn');
      expect(button).not.toBeNull();
      expect(button.textContent).toContain('Rechercher les adresses correspondantes');
    });

    it('should have loading indicator with spinner', () => {
      const loading = document.getElementById('location-loading');
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

    it('should have data status badge element', () => {
      const dataStatus = document.getElementById('data-status');
      expect(dataStatus).not.toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have labels for data values', () => {
      const labels = document.querySelectorAll('.data-label');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have values elements', () => {
      const values = document.querySelectorAll('.data-value');
      expect(values.length).toBeGreaterThan(0);
    });

    it('should have proper document structure', () => {
      expect(document.doctype).not.toBeNull();
      expect(document.documentElement.tagName).toBe('HTML');
    });

    it('should have card titles for sections', () => {
      const cardTitles = document.querySelectorAll('.card-title');
      expect(cardTitles.length).toBe(2);
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
      expect(styleTag.textContent).toContain('width: 380px');
    });

    it('should use CSS custom properties for theming', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain(':root');
      expect(styleTag.textContent).toContain('--bg');
      expect(styleTag.textContent).toContain('--text-primary');
    });

    it('should have button styles', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('.btn-primary');
    });

    it('should have shimmer animation for loading state', () => {
      const styleTag = document.querySelector('style');
      expect(styleTag.textContent).toContain('@keyframes shimmer');
    });
  });

  describe('Error Page', () => {
    it('should have error page element', () => {
      const errorPage = document.getElementById('error-page');
      expect(errorPage).not.toBeNull();
    });

    it('should have error CTA link', () => {
      const errorCta = document.getElementById('error-cta');
      expect(errorCta).not.toBeNull();
      expect(errorCta.href).toContain('leboncoin.fr');
    });

    it('should have accepted pages badges', () => {
      const badges = document.querySelectorAll('.page-badge');
      expect(badges.length).toBe(2); // Ventes and Locations
    });
  });
});
