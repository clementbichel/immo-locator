import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  createElement,
  createLink,
  createMessage,
  clearElement,
  setTextContent,
  createLocationResultItem,
  createLocationResultsList,
} from '../../src/utils/dom-helpers.js';

describe('dom-helpers', () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    global.document = document;
  });

  afterEach(() => {
    dom = null;
    document = null;
    delete global.document;
  });

  describe('createElement', () => {
    it('should create an element with the specified tag', () => {
      const el = createElement('div');
      expect(el.tagName).toBe('DIV');
    });

    it('should set text content', () => {
      const el = createElement('p', 'Hello World');
      expect(el.textContent).toBe('Hello World');
    });

    it('should set attributes', () => {
      const el = createElement('input', '', { type: 'text', id: 'myInput' });
      expect(el.getAttribute('type')).toBe('text');
      expect(el.getAttribute('id')).toBe('myInput');
    });

    it('should set style object', () => {
      const el = createElement('div', '', { style: { color: 'red', fontSize: '14px' } });
      expect(el.style.color).toBe('red');
      expect(el.style.fontSize).toBe('14px');
    });

    it('should set data attributes', () => {
      const el = createElement('div', '', { 'data-id': '123', 'data-name': 'test' });
      expect(el.dataset.id).toBe('123');
      expect(el.dataset.name).toBe('test');
    });
  });

  describe('createLink', () => {
    it('should create an anchor element', () => {
      const link = createLink('https://example.com', 'Click me');
      expect(link.tagName).toBe('A');
      expect(link.href).toBe('https://example.com/');
      expect(link.textContent).toBe('Click me');
    });

    it('should set additional attributes', () => {
      const link = createLink('https://example.com', 'Click', { target: '_blank' });
      expect(link.getAttribute('target')).toBe('_blank');
    });
  });

  describe('createMessage', () => {
    it('should create a paragraph element', () => {
      const msg = createMessage('Test message');
      expect(msg.tagName).toBe('P');
      expect(msg.textContent).toBe('Test message');
    });

    it('should set color when provided', () => {
      const msg = createMessage('Error', 'red');
      expect(msg.style.color).toBe('red');
    });

    it('should not set color when not provided', () => {
      const msg = createMessage('Info');
      expect(msg.style.color).toBe('');
    });
  });

  describe('clearElement', () => {
    it('should remove all children', () => {
      const parent = document.createElement('div');
      parent.appendChild(document.createElement('span'));
      parent.appendChild(document.createElement('p'));
      parent.appendChild(document.createTextNode('text'));

      expect(parent.childNodes.length).toBe(3);
      clearElement(parent);
      expect(parent.childNodes.length).toBe(0);
    });

    it('should handle empty elements', () => {
      const parent = document.createElement('div');
      clearElement(parent);
      expect(parent.childNodes.length).toBe(0);
    });
  });

  describe('setTextContent', () => {
    it('should set text and clear existing content', () => {
      const el = document.createElement('div');
      el.appendChild(document.createElement('span'));
      el.appendChild(document.createTextNode('old'));

      setTextContent(el, 'new text');
      expect(el.textContent).toBe('new text');
      expect(el.childNodes.length).toBe(1);
    });
  });

  describe('createLocationResultItem', () => {
    it('should create a list item with address and score', () => {
      const item = {
        address: '15 Rue Test, 75001 Paris',
        score: 85,
      };
      const mapsLink = 'https://maps.google.com/?q=test';
      const scoreColor = 'green';

      const li = createLocationResultItem(item, mapsLink, scoreColor);

      expect(li.tagName).toBe('LI');
      expect(li.textContent).toContain('15 Rue Test, 75001 Paris');
      expect(li.textContent).toContain('85%');
      expect(li.querySelector('a').href).toBe('https://maps.google.com/?q=test');
    });

    it('should use address field from backend response', () => {
      const item = {
        address: 'Paris',
        score: 70,
      };

      const li = createLocationResultItem(item, 'https://maps.google.com', 'orange');
      expect(li.textContent).toContain('Paris');
    });

    it('should show "Adresse inconnue" when no address is available', () => {
      const item = { score: 50 };
      const li = createLocationResultItem(item, 'https://maps.google.com', 'red');
      expect(li.textContent).toContain('Adresse inconnue');
    });
  });

  describe('createLocationResultsList', () => {
    it('should create a results list', () => {
      const results = [
        { address: 'Address 1', score: 90 },
        { address: 'Address 2', score: 75 },
      ];
      const getMapsLink = (addr) => `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
      const getScoreColor = (score) => (score >= 80 ? 'green' : 'orange');

      const fragment = createLocationResultsList(results, getMapsLink, getScoreColor);

      // Append to document to query
      const container = document.createElement('div');
      container.appendChild(fragment);

      expect(container.querySelector('strong').textContent).toBe('Adresses trouvées :');
      expect(container.querySelectorAll('li').length).toBe(2);
    });

    it('should handle empty results', () => {
      const fragment = createLocationResultsList(
        [],
        () => '',
        () => 'gray'
      );
      const container = document.createElement('div');
      container.appendChild(fragment);

      expect(container.querySelectorAll('li').length).toBe(0);
    });
  });
});
