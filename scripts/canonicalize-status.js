#!/usr/bin/env node
/**
 * DEV-134: Migración que canonicaliza el campo status del frontmatter a minúscula.
 *
 * El write path histórico persistía estados con mayúsculas iniciales (e.g. `Done`, `Draft`).
 * Este script normaliza quirúrgicamente el campo status en backlog/tasks/*.md
 * preservando intacto cualquier otro campo del frontmatter y el contenido de las secciones.
 *
 * Uso:
 *   node scripts/canonicalize-status.js                 # aplica los cambios
 *   node scripts/canonicalize-status.js --dry-run       # sólo informa
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { formatStatusForMd } from './backlogMdParser.ts';

const TASKS_DIR = join(process.cwd(), 'backlog/tasks');
const DRY_RUN = process.argv.includes('--dry-run');

let scanned = 0;
let modified = 0;

for (const entry of readdirSync(TASKS_DIR)) {
  if (!entry.endsWith('.md')) continue;
  const fullPath = join(TASKS_DIR, entry);
  if (statSync(fullPath).isDirectory()) continue;

  scanned++;
  const content = readFileSync(fullPath, 'utf8');

  // Asegurar que procesamos sólo el frontmatter delimitado por ---
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;

  const frontmatter = match[1];
  const statusMatch = frontmatter.match(/^status:\s*(.+)$/m);
  if (!statusMatch) continue;

  const currentStatusRaw = statusMatch[1].trim().replace(/^['"]|['"]$/g, '');
  const canonicalStatus = formatStatusForMd(currentStatusRaw);

  if (currentStatusRaw !== canonicalStatus) {
    const updatedFrontmatter = frontmatter.replace(
      /^status:\s*.+$/m,
      `status: ${canonicalStatus}`
    );
    const newContent = content.replace(frontmatter, updatedFrontmatter);

    if (!DRY_RUN) {
      writeFileSync(fullPath, newContent, 'utf8');
    }
    modified++;
    console.log(`  ${DRY_RUN ? '[DRY-RUN] ' : ''}Normalizado: ${entry} -> status: ${canonicalStatus} (era: ${currentStatusRaw})`);
  }
}

console.log(`\nResumen DEV-134: ${scanned} tareas analizadas, ${modified} tareas ${DRY_RUN ? 'a normalizar' : 'normalizadas'}.`);
