import { describe, it, expect } from 'vitest';
import { extractFromSelogerState } from '../../src/extractors/seloger-extractor.js';
import buyFixture from '../fixtures/seloger-state-buy.json';
import rentFixture from '../fixtures/seloger-state-rent.json';

describe('seloger-extractor', () => {
  describe('extractFromSelogerState — buy listing fixture', () => {
    it('should extract city and zipcode from location.address', () => {
      const { data } = extractFromSelogerState(buyFixture);
      expect(data.city).toBe('Bordeaux');
      expect(data.zipcode).toBe('33800');
    });

    it('should extract surface as formatted string from legacyTracking.products[0].space', () => {
      const { data } = extractFromSelogerState(buyFixture);
      expect(data.surface).toBe('104 m²');
    });

    it('should extract DPE letter from FR_ENERGY scale efficiencyClass.rating', () => {
      const { data } = extractFromSelogerState(buyFixture);
      expect(data.dpe).toBe('C');
    });

    it('should extract GES letter from FR_GHG scale efficiencyClass.rating', () => {
      const { data } = extractFromSelogerState(buyFixture);
      expect(data.ges).toBe('C');
    });

    it('should extract conso_prim raw string from FR_ENERGY scale values', () => {
      const { data } = extractFromSelogerState(buyFixture);
      expect(data.conso_prim).toBe('140 kWh/m².an');
    });

    it('should leave conso_fin null (SeLoger does not expose final energy)', () => {
      const { data } = extractFromSelogerState(buyFixture);
      expect(data.conso_fin).toBeNull();
    });
  });

  describe('extractFromSelogerState — rent listing fixture', () => {
    it('should extract location for rent listing', () => {
      const { data } = extractFromSelogerState(rentFixture);
      expect(data.city).toBe('Bordeaux');
      expect(data.zipcode).toBe('33800');
    });

    it('should extract surface 28 m² for rent listing', () => {
      const { data } = extractFromSelogerState(rentFixture);
      expect(data.surface).toBe('28 m²');
    });

    it('should extract DPE=E and GES=C (different letters proves separate scales)', () => {
      const { data } = extractFromSelogerState(rentFixture);
      expect(data.dpe).toBe('E');
      expect(data.ges).toBe('C');
    });

    it('should extract conso_prim 331 kWh/m².an for rent listing', () => {
      const { data } = extractFromSelogerState(rentFixture);
      expect(data.conso_prim).toBe('331 kWh/m².an');
    });
  });

  describe('extractFromSelogerState — date_diag (best-effort regex)', () => {
    it('should extract date_diag from mainDescription.description when present', () => {
      const { data } = extractFromSelogerState(buyFixture);
      // Buy fixture description contains: "Date du diagnostic énergétique : 24/05/2023."
      expect(data.date_diag).toBe('24/05/2023');
    });

    it('should leave date_diag null when no date in description', () => {
      const { data } = extractFromSelogerState(rentFixture);
      expect(data.date_diag).toBeNull();
    });
  });

  describe('extractFromSelogerState — edge cases', () => {
    it('should return all-null data and a debug message when state is null', () => {
      const { data, debug } = extractFromSelogerState(null);
      expect(data.city).toBeNull();
      expect(data.dpe).toBeNull();
      expect(debug).toContain('No classified object in state');
    });

    it('should not crash when classified is missing', () => {
      const { data, debug } = extractFromSelogerState({ app_cldp: { data: {} } });
      expect(data.city).toBeNull();
      expect(debug).toContain('No classified object in state');
    });

    it('should not crash when sections.energy is missing', () => {
      const { data } = extractFromSelogerState({
        app_cldp: { data: { classified: { sections: {} } } },
      });
      expect(data.dpe).toBeNull();
      expect(data.ges).toBeNull();
    });

    it('should pick GES from FR_GHG scale even if it appears before FR_ENERGY in scales array', () => {
      // Synthetic state with reversed scale order to prove type-based filtering
      const reversed = {
        app_cldp: {
          data: {
            classified: {
              sections: {
                energy: {
                  certificates: [
                    {
                      scales: [
                        {
                          type: 'FR_GHG_AFTER_2021',
                          efficiencyClass: { rating: 'A' },
                          values: [{ value: '5 kg CO₂/m².an', label: 'Émissions' }],
                        },
                        {
                          type: 'FR_ENERGY_AFTER_2021',
                          efficiencyClass: { rating: 'B' },
                          values: [
                            { value: '90 kWh/m².an', label: 'Consommation (énergie primaire)' },
                            { value: '5 kg CO₂/m².an', label: 'Émissions' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      };
      const { data } = extractFromSelogerState(reversed);
      expect(data.dpe).toBe('B');
      expect(data.ges).toBe('A');
      expect(data.conso_prim).toBe('90 kWh/m².an');
    });
  });
});
