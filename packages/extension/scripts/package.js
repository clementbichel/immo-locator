import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const stageDir = join(distDir, 'staging');

// Whitelist of files shipped in the packaged extension.
// Anything not listed here is excluded from the zip uploaded to the stores.
const INCLUDE = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'LICENSE',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function main() {
  // 1. Build popup.js to make sure the bundle is up to date.
  // Pass --skip-build to skip this step (e.g. when iterating on the package script).
  const skipBuild = process.argv.includes('--skip-build');
  if (skipBuild) {
    console.log('Skipping build (--skip-build).');
  } else {
    console.log('Building popup.js...');
    run('node scripts/build.js', rootDir);
  }

  // 2. Read version from manifest (single source of truth).
  const manifest = JSON.parse(readFileSync(join(rootDir, 'manifest.json'), 'utf-8'));
  const { version } = manifest;
  const zipName = `immo-locator-${version}.zip`;
  const zipPath = join(distDir, zipName);

  // 3. Clean dist and recreate a fresh staging directory.
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });

  // 4. Copy whitelisted files to staging.
  console.log('\nStaging files:');
  for (const file of INCLUDE) {
    const src = join(rootDir, file);
    if (!existsSync(src)) {
      console.error(`  ✗ Missing: ${file}`);
      process.exit(1);
    }
    const dest = join(stageDir, file);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    console.log(`  + ${file}`);
  }

  // 5. Create zip from staging contents (flat, no wrapper directory).
  console.log(`\nCreating ${zipName}...`);
  run(`zip -rq ../${zipName} .`, stageDir);

  // 6. Remove staging, keep only the zip.
  rmSync(stageDir, { recursive: true, force: true });

  // 7. Report size.
  const { size } = statSync(zipPath);
  const kb = (size / 1024).toFixed(1);
  console.log(`\n✓ ${zipName} — ${kb} KB`);
  console.log(`  ${zipPath}`);
}

main();
