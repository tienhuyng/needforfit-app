#!/usr/bin/env node
/**
 * Clone or update the Vercel admin template into temp/vercel-template.
 * Cross-platform (macOS, Windows, Linux).
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO =
  'https://github.com/vercel/nextjs-postgres-nextauth-tailwindcss-template.git';
const TEMP_DIR = join(process.cwd(), 'temp');
const TARGET = join(TEMP_DIR, 'vercel-template');

mkdirSync(TEMP_DIR, { recursive: true });

try {
  if (existsSync(join(TARGET, '.git'))) {
    console.log('→ Updating temp/vercel-template...');
    execSync('git fetch --depth 1 origin main', { cwd: TARGET, stdio: 'inherit' });
    execSync('git checkout main', { cwd: TARGET, stdio: 'inherit' });
    execSync('git reset --hard origin/main', { cwd: TARGET, stdio: 'inherit' });
  } else {
    console.log('→ Cloning Vercel template to temp/vercel-template...');
    execSync(`git clone --depth 1 --branch main ${REPO} "${TARGET}"`, {
      stdio: 'inherit',
    });
  }

  console.log('');
  console.log('✓ Template ready at temp/vercel-template');
  console.log('  UI components : temp/vercel-template/components/ui/');
  console.log('  App examples  : temp/vercel-template/app/');
  console.log('');
  console.log('Next: copy components to frontend/src/components/ui/ and remove Next.js deps.');
} catch {
  console.error('✗ Failed to clone/update Vercel template.');
  process.exit(1);
}
