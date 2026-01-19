import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  extractFromNextData,
  findAttribute,
  findGesAttribute,
  findAttributeByLabel,
  getAttributeValue
} from '../../src/extractors/next-data-extractor.js';
import leboncoinNextData from '../fixtures/leboncoin-next-data.json';

describe('next-data-extractor', () => {
  describe('findAttribute', () => {
    const attributes = [
      { key: 'square', label: 'Surface habitable', value: 120, value_label: '120 m²' },
      { key: 'energy_rate', label: 'Classe énergie', value: 'D', value_label: 'D' },
      { key: 'rooms', label: 'Pièces', value: 6, value_label: '6' }
    ];

    it('should find attribute by key', () => {
      const attr = findAttribute(attributes, 'square', 'surface');
      expect(attr).toBeDefined();
      expect(attr.value).toBe(120);
    });

    it('should find attribute by label part', () => {
      const attr = findAttribute(attributes, 'unknown', 'habitable');
      expect(attr).toBeDefined();
      expect(attr.key).toBe('square');
    });

    it('should return undefined if not found', () => {
      const attr = findAttribute(attributes, 'unknown', 'unknown');
      expect(attr).toBeUndefined();
    });

    it('should return undefined for non-array', () => {
      expect(findAttribute(null, 'key', 'label')).toBeUndefined();
      expect(findAttribute('not array', 'key', 'label')).toBeUndefined();
    });
  });

  describe('findGesAttribute', () => {
    it('should find by ges_rate key', () => {
      const attributes = [
        { key: 'ges_rate', label: 'GES', value: 'D' }
      ];
      const attr = findGesAttribute(attributes);
      expect(attr).toBeDefined();
      expect(attr.value).toBe('D');
    });

    it('should find by label "ges"', () => {
      const attributes = [
        { key: 'other', label: 'ges', value: 'E' }
      ];
      const attr = findGesAttribute(attributes);
      expect(attr).toBeDefined();
    });

    it('should find by label containing "gaz à effet de serre"', () => {
      const attributes = [
        { key: 'other', label: 'Indice gaz à effet de serre', value: 'C' }
      ];
      const attr = findGesAttribute(attributes);
      expect(attr).toBeDefined();
    });

    it('should return undefined for non-array', () => {
      expect(findGesAttribute(null)).toBeUndefined();
    });
  });

  describe('findAttributeByLabel', () => {
    const attributes = [
      { key: 'diag_date', label: 'Date de réalisation du DPE', value: '15/01/2024' },
      { key: 'primary_energy', label: 'Consommation énergie primaire', value: 185 }
    ];

    it('should find attribute containing label part', () => {
      const attr = findAttributeByLabel(attributes, 'Date de réalisation');
      expect(attr).toBeDefined();
      expect(attr.key).toBe('diag_date');
    });

    it('should return undefined if not found', () => {
      expect(findAttributeByLabel(attributes, 'unknown')).toBeUndefined();
    });
  });

  describe('getAttributeValue', () => {
    it('should return value_label if present', () => {
      const attr = { value: 120, value_label: '120 m²' };
      expect(getAttributeValue(attr)).toBe('120 m²');
    });

    it('should return value with suffix if no value_label', () => {
      const attr = { value: 120 };
      expect(getAttributeValue(attr, ' m²')).toBe('120 m²');
    });

    it('should return null for null attr', () => {
      expect(getAttributeValue(null)).toBeNull();
    });
  });

  describe('extractFromNextData', () => {
    it('should extract all data from valid JSON', () => {
      const { data, debug } = extractFromNextData(leboncoinNextData);

      expect(data.city).toBe('Lyon');
      expect(data.zipcode).toBe('69003');
      expect(data.surface).toBe('150 m²');
      expect(data.terrain).toBe('800 m²');
      expect(data.dpe).toBe('C');
      expect(data.ges).toBe('D');
    });

    it('should return debug log', () => {
      const { debug } = extractFromNextData(leboncoinNextData);
      expect(debug).toContain('Found ad object');
    });

    it('should handle missing pageProps', () => {
      const { data, debug } = extractFromNextData({ props: {} });
      expect(data.city).toBeNull();
      expect(debug).toContain('No pageProps found');
    });

    it('should handle missing ad', () => {
      const { data, debug } = extractFromNextData({ props: { pageProps: {} } });
      expect(data.city).toBeNull();
      expect(debug).toContain('No ad object in pageProps');
    });

    it('should handle null input', () => {
      const { data, debug } = extractFromNextData(null);
      expect(data.city).toBeNull();
      expect(debug).toContain('No JSON data provided');
    });

    it('should handle missing location', () => {
      const jsonData = {
        props: {
          pageProps: {
            ad: {
              attributes: []
            }
          }
        }
      };
      const { data, debug } = extractFromNextData(jsonData);
      expect(data.city).toBeNull();
      expect(debug).toContain('No location inside ad');
    });
  });
});

describe('DOM extraction integration', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
            ${JSON.stringify(leboncoinNextData)}
          </script>
          <div data-qa-id="adview_location_container">
            Lyon 69003
          </div>
          <div data-qa-id="adview_description_container">
            Surface habitable : 150 m²
            Date de réalisation du diagnostic : 15/01/2024
            Consommation énergie primaire : 185 kWh/m²/an
            Classe énergie C
            GES D
          </div>
        </body>
      </html>
    `, { url: 'https://www.leboncoin.fr/ventes_immobilieres/1234567890.htm' });
    document = dom.window.document;
  });

  afterEach(() => {
    dom = null;
    document = null;
  });

  it('should find __NEXT_DATA__ script', () => {
    const script = document.getElementById('__NEXT_DATA__');
    expect(script).not.toBeNull();

    const jsonData = JSON.parse(script.textContent);
    expect(jsonData.props.pageProps.ad).toBeDefined();
  });

  it('should extract location from DOM fallback', () => {
    const locationEl = document.querySelector('[data-qa-id="adview_location_container"]');
    expect(locationEl).not.toBeNull();

    // JSDOM uses textContent, not innerText
    const text = locationEl.textContent;
    const zipMatch = text.match(/\b\d{5}\b/);
    expect(zipMatch[0]).toBe('69003');
  });

  it('should extract data from description text', () => {
    const descEl = document.querySelector('[data-qa-id="adview_description_container"]');
    const text = descEl.textContent;

    expect(text).toContain('Surface habitable');
    expect(text).toContain('150 m²');
    expect(text).toContain('Classe énergie C');
  });
});
