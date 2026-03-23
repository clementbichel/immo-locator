# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] - 2026-03-13

### Fixed

- Fixed attribute extraction using `key_label` field instead of `label` to match real Leboncoin data structure
- Fixed GES detection: accept `ges` key in addition to `ges_rate`
- Updated test fixtures to match real Leboncoin `__NEXT_DATA__` format

## [1.0.4] - 2026-03-10

### Added

- **Code Quality Tooling**
  - ESLint configuration with recommended rules
  - Prettier for consistent code formatting
  - Husky pre-commit hooks with lint-staged
  - New npm scripts: `lint`, `lint:fix`, `format`, `format:check`

- **CI/CD Pipeline**
  - GitHub Actions workflow for CI (lint → test → build)
  - GitHub Actions workflow for releases on version tags
  - Automatic artifact upload for extension builds

- **Error Handling**
  - Centralized error messages in French (`src/utils/error-messages.js`)
  - Error codes for categorizing errors (network, validation, etc.)
  - `fetchWithTimeout()` function with configurable timeout (default 10s)
  - Structured errors with code and details properties

- **Security**
  - Content Security Policy (CSP) in manifest.json
  - Secure DOM helpers (`src/utils/dom-helpers.js`) to avoid innerHTML XSS
  - Safe element creation, link creation, and message display functions
  - `clearElement()` and `setTextContent()` utilities

- **Validation**
  - Validation constants (`src/utils/validation-constants.js`)
  - DPE/GES letter validation (A-G)
  - Surface and terrain bounds checking
  - Energy consumption bounds (0-1000 kWh/m²/an)
  - Diagnostic date validation (2006 to present)
  - French zipcode validation (5 digits)
  - Strict parsing functions: `parseSurfaceStrict()`, `parseEnergyValueStrict()`, etc.

- **Testing**
  - Unit tests for error messages
  - Integration tests for DOM helpers
  - Tests for fetchWithTimeout and network errors
  - Validation constants tests
  - Increased test count from 145 to 205

### Changed

- Replaced `innerHTML` usage in popup.js with safe DOM APIs
- Updated ADEME client to use centralized error messages
- Test assertions updated to use French error messages

### Fixed

- Removed duplicate `<body>` tag in popup.html
- Fixed unused variable warnings throughout codebase
- Removed unused imports from src/popup.js

## [1.0.0] - 2024

### Added

- Initial release of Leboncoin real estate data extractor
- Chrome extension (Manifest V3) for Leboncoin listings
- `__NEXT_DATA__` JSON parsing for structured data extraction
- DOM scraping fallback for missing data
- Visual extraction for DPE/GES badges using computed styles
- ADEME API integration for energy diagnostic cross-reference
- Search parameters: location, DPE/GES, surface (±10%), date (±7 days)
- Match scoring algorithm for search results
- Google Maps integration for addresses
- Modular architecture with separate extractors, utils, and API modules
- Comprehensive test suite (unit, integration, e2e)
- Cross-browser compatibility (Chrome and Firefox)
- esbuild-based build system

[Unreleased]: https://github.com/clementbichel/immo-locator/compare/v1.0.5...HEAD
[1.0.5]: https://github.com/clementbichel/immo-locator/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/clementbichel/immo-locator/compare/v1.0.0...v1.0.4
[1.0.0]: https://github.com/clementbichel/immo-locator/releases/tag/v1.0.0
