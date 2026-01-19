# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) for extracting real estate data from Leboncoin listings and cross-referencing them with the French ADEME energy performance database.

**Purpose**: Extract property details (surface, DPE, GES, location, energy consumption) from Leboncoin real estate ads and find corresponding official energy diagnostics in the ADEME public database.

## Architecture

The extension consists of three files:

- `manifest.json` - Chrome extension manifest (V3)
- `popup.html` - Extension popup UI
- `popup.js` - All logic for data extraction and ADEME API integration

### Data Extraction Flow (popup.js)

1. **Primary Strategy**: Parse `__NEXT_DATA__` JSON embedded in Leboncoin pages to extract structured ad data
2. **DOM Scraping Fallback**: If data is missing, scrape the page using selectors and regex
3. **Visual Extraction**: For DPE/GES badges, analyze computed styles to find the "active" letter by comparing element sizes

### ADEME Integration

The extension queries `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines` with filters:

- Location (zipcode or city)
- DPE/GES ratings (exact match)
- Surface (+/- 10%)
- Diagnosis date (+/- 7 days)
- Primary energy consumption (+/- 10%, optional)

Results are scored based on deviation from ad data.

## Development

### Loading the Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

### Testing

No automated tests. Manual testing on Leboncoin listing pages (`/ventes_immobilieres/` or `/locations/` URLs).

## Key Implementation Details

- Extension only activates on Leboncoin real estate pages (URL check in `extractRealEstateData`)
- Uses `chrome.scripting.executeScript` to inject extraction logic into the active tab
- French locale throughout (labels, error messages)
