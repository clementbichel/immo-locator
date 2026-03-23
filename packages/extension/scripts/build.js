import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function build() {
  console.log('Building popup.js...');

  try {
    // Bundle src/popup.js into a single file
    const result = await esbuild.build({
      entryPoints: [join(rootDir, 'src/popup.js')],
      bundle: true,
      format: 'iife',
      outfile: join(rootDir, 'popup.js'),
      target: ['chrome90', 'firefox90'],
      minify: false, // Keep readable for debugging
      sourcemap: false,
      // Chrome extensions don't support ES modules in content scripts
      // so we bundle everything into an IIFE
    });

    if (result.errors.length > 0) {
      console.error('Build errors:', result.errors);
      process.exit(1);
    }

    console.log('Build successful!');

    // Read the built file and add the browser compatibility line at the top
    const outputPath = join(rootDir, 'popup.js');
    const content = readFileSync(outputPath, 'utf-8');

    // Add eslint-disable + browser compatibility line at the top
    const prefix =
      "/* eslint-disable */\n// Cross-browser compatibility: use 'browser' if available, otherwise 'chrome'\nglobalThis.browser ??= globalThis.chrome;\n\n";

    if (!content.startsWith('/* eslint-disable */')) {
      writeFileSync(outputPath, prefix + content);
    }

    // Show output stats
    const stats = await esbuild.build({
      entryPoints: [join(rootDir, 'src/popup.js')],
      bundle: true,
      format: 'iife',
      write: false,
      metafile: true,
    });

    const text = await esbuild.analyzeMetafile(stats.metafile);
    console.log('\nBundle analysis:');
    console.log(text);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Watch mode if --watch flag is passed
if (process.argv.includes('--watch')) {
  console.log('Watching for changes...');

  const ctx = await esbuild.context({
    entryPoints: [join(rootDir, 'src/popup.js')],
    bundle: true,
    format: 'iife',
    outfile: join(rootDir, 'popup.js'),
    target: ['chrome90', 'firefox90'],
    minify: false,
    sourcemap: false,
  });

  await ctx.watch();
  console.log('Watching... Press Ctrl+C to stop.');
} else {
  build();
}
