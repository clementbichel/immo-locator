# Build instructions (for AMO / Firefox reviewers)

The `popup.js` file shipped in the add-on package is **bundled from ES modules with
[esbuild](https://esbuild.github.io/)** (no minification, no obfuscation). These steps
reproduce that exact file from the source in this archive.

## Environment

- **Node.js 20.x** (the release was built with 20.20.2)
- **npm 10.x**
- Any OS (macOS / Linux / Windows). No network access is needed _during_ the build
  itself (only for `npm install`).

## Steps

From the root of this source archive (the folder that contains `manifest.json`):

```bash
npm ci          # installs exact versions from package-lock.json
# (or: npm install — if you prefer to resolve from package.json)

npm run build   # runs `node scripts/build.js`
```

`npm run build` bundles `src/popup.js` together with its local imports
(`src/api/`, `src/services/`, `src/utils/`) into a single IIFE `popup.js` via esbuild:

- `format: 'iife'`, `target: ['chrome90', 'firefox90']`, `minify: false`, `sourcemap: false`
- a small cross-browser shim (`globalThis.browser ??= globalThis.chrome;`) is prepended

The generated `popup.js` is identical to the one in the submitted package.

## Notes

- The **only build dependency is `esbuild`** (`^0.24`). The other devDependencies
  (`vitest`, `@vitest/*`, `playwright`, `jsdom`) are used **for tests only** and are not
  required to produce `popup.js`. You can run the test suite with `npm test`.
- **No remote or minified runtime code.** The extension queries the public ADEME open-data
  API (`https://data.ademe.fr`) directly from the popup; all logic is in this source tree.
- Entry point: `src/popup.js`. The page-context extractors are intentionally inlined in
  `src/popup.js` because `chrome.scripting.executeScript({ func })` cannot resolve imports.
