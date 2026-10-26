#!/usr/bin/env node

/**
 * scripts/validate-commit-msg.js
 * DEV-339: Mechanical guardrail validating Conventional Commits in technical English.
 *
 * Rules:
 * 1. Conventional Commits format: <type>(<optional-scope>)?: <imperative subject>
 *    Allowed types: feat, fix, chore, refactor, docs, style, test, perf, build, ci, revert
 * 2. Imperative technical English:
 *    - Rejects Spanish verb prefixes (agrega, actualiza, corrige, etc.)
 *    - Rejects Spanish prepositions/articles (para, de, del, por, el, la, etc.)
 *    - Rejects accented Spanish characters (á, é, í, ó, ú, ñ, etc.)
 * 3. Anti-Em-Dash: Rejects em-dash and en-dash characters; standard hyphens '-' only.
 * 4. Pass-through for Git-generated merge, revert, and squash/fixup commits.
 */

import fs from 'node:fs';
import path from 'node:path';

export const CONVENTIONAL_REGEX =
  /^(feat|fix|chore|refactor|docs|style|test|perf|build|ci|revert)(\([a-zA-Z0-9_\-\./#]+\))?!?: (.+)$/;

export const SPANISH_START_WORDS =
  /^(agrega|agregado|agregar|agrego|agregó|añade|añadido|añadir|añado|añadió|anade|anadido|anadir|actualiza|actualizado|actualizar|actualizo|actualizó|cambia|cambiado|cambiar|cambio|cambió|corrige|corregido|corregir|corrijo|corrigió|arregla|arreglado|arreglar|arreglo|arregló|elimina|eliminado|eliminar|elimino|eliminó|borra|borrado|borrar|borro|borró|modifica|modificado|modificar|modifico|modificó|implementa|implementado|implementar|implemento|implementó|crea|creado|crear|creo|creó|resuelve|resuelto|resolver|resuelvo|resolvió|saneamiento|soporte|nuevo|nueva|nuevos|nuevas|ajuste|ajustes)\b/i;

export const SPANISH_INDICATOR_WORDS =
  /\b(para|del|de|por|el|la|los|las|una|unos|unas|al|tarea|tareas|guardar|hacia|sobre|mediante|segun|según)\b/i;

export const SPANISH_ACCENTS = /[áéíóúñÁÉÍÓÚÑ¿¡]/;

export const EM_DASH_REGEX = /[\u2013\u2014]/;

/**
 * Validates a commit message string.
 * @param {string} rawMessage
 * @returns {{ valid: boolean; reason?: string }}
 */
export function validateCommitMessage(rawMessage) {
  if (typeof rawMessage !== 'string') {
    return { valid: false, reason: 'Commit message must be a string' };
  }

  // Strip git comments (#) and trim
  const lines = rawMessage
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (lines.length === 0) {
    // Empty commit message; let git handle empty abort
    return { valid: true };
  }

  const header = lines[0];

  // 1. Pass-through Git automated commits
  if (
    /^Merge (branch|tag|remote-tracking branch|pull request) /i.test(header) ||
    /^Revert "/.test(header) ||
    /^(fixup!|squash!|amend!)/.test(header)
  ) {
    return { valid: true };
  }

  // 2. Anti-Em-Dash check
  if (EM_DASH_REGEX.test(header)) {
    return {
      valid: false,
      reason: "Commit header contains em-dash or en-dash. Use standard hyphen '-' with spaces (' - ').",
    };
  }

  // 3. Conventional Commits format
  const match = header.match(CONVENTIONAL_REGEX);
  if (!match) {
    return {
      valid: false,
      reason:
        "Invalid Conventional Commits format. Expected '<type>(<scope>): <subject>' (allowed types: feat, fix, chore, refactor, docs, style, test, perf, build, ci, revert).",
    };
  }

  const subject = match[3].trim();
  if (!subject) {
    return { valid: false, reason: 'Commit subject cannot be empty.' };
  }

  // 4. Spanish detection
  if (SPANISH_ACCENTS.test(subject)) {
    return {
      valid: false,
      reason:
        'Commit subject appears to be in Spanish (contains accented characters). Commit messages must be in technical English.',
    };
  }

  if (SPANISH_START_WORDS.test(subject)) {
    return {
      valid: false,
      reason:
        "Commit subject starts with a Spanish verb/term. Must use imperative English (e.g. 'add ...', 'fix ...', 'update ...').",
    };
  }

  if (SPANISH_INDICATOR_WORDS.test(subject)) {
    return {
      valid: false,
      reason:
        'Commit subject appears to be in Spanish (detected Spanish keywords). Commit messages must be in technical English.',
    };
  }

  return { valid: true };
}

// CLI execution (invoked by git hook or manually)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const arg = process.argv[2];
  if (!arg) {
    console.error('❌ [commit-msg] Missing commit message argument or file path.');
    process.exit(1);
  }

  let message = arg;
  if (fs.existsSync(arg)) {
    message = fs.readFileSync(arg, 'utf8');
  }

  const result = validateCommitMessage(message);
  if (!result.valid) {
    const header = message.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith('#')) || '';
    console.error('\n❌ [commit-msg] Commit message rejected.');
    console.error(`   Reason: ${result.reason}`);
    console.error(`   Header: "${header}"\n`);
    console.error('   Examples of valid Conventional Commits in technical English:');
    console.error('     feat(DEV-339): sanitize exceptions in BacklogService');
    console.error('     fix(DEV-017): resolve optimistic locking conflict');
    console.error('     chore(deps): update vite configuration\n');
    process.exit(1);
  }

  process.exit(0);
}
