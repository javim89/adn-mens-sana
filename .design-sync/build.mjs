#!/usr/bin/env node
// Builds a synthetic "package" for the Claude Design sync from app/components/ui:
//   .ds-sync/pkg/index.ts      barrel of the UI kit (+ lucide icons as `Icons`)
//   .ds-sync/pkg/types/        .d.ts tree (tsc) - the converter's component list + props
//   .ds-sync/pkg/styles.css    compiled Tailwind v4 CSS (cfg.cssEntry)
//   .ds-sync/pkg/fonts.css     self-hosted Inter/Oswald (cfg.extraFonts)
// Run from the repo root: node .design-sync/build.mjs
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const ROOT = process.cwd();
const UI = 'app/components/ui';
const PKG = resolve('.ds-sync/pkg');
rmSync(PKG, { recursive: true, force: true });
mkdirSync(PKG, { recursive: true });

const files = readdirSync(UI).filter((f) => f.endsWith('.tsx')).sort();
writeFileSync(join(PKG, 'package.json'), JSON.stringify({
  name: 'adn-mens-sana-ui',
  version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  module: 'index.ts',
  types: 'types/.ds-sync/pkg/index.d.ts',
}, null, 2));
writeFileSync(join(PKG, 'index.ts'),
  files.map((f) => `export * from '../../${UI}/${f.replace(/\.tsx$/, '')}';`).join('\n') +
  `\nexport * as Icons from 'lucide-react';\n`);

// Declarations for the barrel's closure (rootDir = repo, so the tree mirrors it).
writeFileSync(join(PKG, 'tsconfig.json'), JSON.stringify({
  extends: '../../tsconfig.json',
  compilerOptions: {
    noEmit: false, declaration: true, emitDeclarationOnly: true, incremental: false,
    rootDir: '../..', outDir: 'types', baseUrl: '../..', paths: { '@/*': ['./*'] },
  },
  include: ['index.ts'], exclude: [],
}, null, 2));
execFileSync(resolve('node_modules/.bin/tsc'), ['-p', join(PKG, 'tsconfig.json')], { stdio: 'inherit' });

const entry = resolve('.design-sync/ds.css');
const out = await postcss([tailwind({ base: ROOT })]).process(readFileSync(entry, 'utf8'), { from: entry });
writeFileSync(join(PKG, 'styles.css'), out.css);
cpSync('.design-sync/fonts', join(PKG, 'fonts'), { recursive: true });
console.error(`ds pkg: ${files.length} ui files, styles.css ${(out.css.length / 1024).toFixed(0)}KB`);
