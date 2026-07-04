/**
 * Copies root Genkit sources into functions/src/genkit for deploy builds.
 * Relative imports (../../genkit.config.js) stay valid in the copied tree.
 */
import { cpSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destRoot = join(root, 'functions', 'src', 'genkit');

rmSync(destRoot, { recursive: true, force: true });
mkdirSync(destRoot, { recursive: true });
cpSync(join(root, 'genkit.config.ts'), join(destRoot, 'genkit.config.ts'));
cpSync(join(root, 'src'), join(destRoot, 'src'), { recursive: true });

console.log('Synced Genkit sources to functions/src/genkit');
