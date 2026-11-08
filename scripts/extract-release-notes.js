#!/usr/bin/env node

/**
 * scripts/extract-release-notes.js
 *
 * Deterministic Release Notes Extractor (DEV-368)
 *
 * Extracts release title and release notes from backlog/releases.json
 * for a target version, normalizes line breaks, and sanitizes em-dashes
 * to standard hyphen with spaces (' - ') adhering to the Anti-Em-Dash rule.
 *
 * Usage:
 *   node scripts/extract-release-notes.js [version]
 *   node scripts/extract-release-notes.js 1.11.0
 *   node scripts/extract-release-notes.js v1.11.0 --title-file path/to/title.txt --notes-file path/to/notes.txt
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Sanitizes em-dashes and en-dashes to standard hyphen with spaces.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeAntiEmDash(text) {
  if (!text) return '';
  return String(text)
    .replace(/^(\s*)[\u2014\u2013]\s*/gm, '$1- ')
    .replace(/\s*[\u2014\u2013]\s*/g, ' - ');
}

/**
 * Normalizes newlines and unescapes literal escaped linebreaks.
 * @param {string} text
 * @returns {string}
 */
export function normalizeLineBreaks(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\r\\n|\\n/g, '\n')
    .replace(/\r\n/g, '\n');
}

/**
 * Resolves target version from options, CLI arguments, environment, or package.json.
 * @param {string} [requestedVersion]
 * @param {string} [rootDir]
 * @returns {string}
 */
export function resolveTargetVersion(requestedVersion, rootDir = ROOT_DIR) {
  if (requestedVersion && typeof requestedVersion === 'string' && requestedVersion.trim()) {
    return requestedVersion.trim();
  }
  if (process.env.RELEASE_VERSION && process.env.RELEASE_VERSION.trim()) {
    return process.env.RELEASE_VERSION.trim();
  }
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) return String(pkg.version).trim();
    } catch {
      // Fallback below
    }
  }
  return '0.0.0';
}

/**
 * Extracts title and notes for a specified version.
 * @param {object} options
 * @param {string} [options.version]
 * @param {string} [options.rootDir]
 * @param {string} [options.titleFile]
 * @param {string} [options.notesFile]
 * @returns {{ version: string, tag: string, title: string, notes: string, titleFile: string, notesFile: string, foundInReleasesJson: boolean }}
 */
export function extractReleaseNotes(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const rawVersion = resolveTargetVersion(options.version, rootDir);
  const cleanVersion = rawVersion.replace(/^v/, '').trim();
  const tag = `v${cleanVersion}`;

  const releasesPath = path.join(rootDir, 'backlog', 'releases.json');
  let releaseEntry = null;

  if (fs.existsSync(releasesPath)) {
    try {
      const releasesData = JSON.parse(fs.readFileSync(releasesPath, 'utf8'));
      const list = Array.isArray(releasesData) ? releasesData : (releasesData.releases || []);
      const slugId = `rel-${cleanVersion.replace(/\./g, '-')}`;

      releaseEntry = list.find((r) => {
        if (!r) return false;
        const v = String(r.version || '').replace(/^v/, '').trim();
        return v === cleanVersion || r.version === tag || r.id === tag || r.id === slugId;
      }) || null;
    } catch (err) {
      console.warn(`[extract-release-notes] Warning: Failed to parse ${releasesPath}: ${err.message}`);
    }
  }

  let rawTitle = '';
  let rawNotes = '';
  let foundInReleasesJson = false;

  if (releaseEntry) {
    foundInReleasesJson = true;
    rawTitle = releaseEntry.title || (releaseEntry.name ? `${tag} - ${releaseEntry.name}` : tag);
    rawNotes = releaseEntry.markdownContent || releaseEntry.summary || releaseEntry.notes || `Release oficial ${tag}`;
  } else {
    console.warn(`[extract-release-notes] Notice: Version ${cleanVersion} not found in releases.json. Using fallback title and notes.`);
    rawTitle = tag;
    rawNotes = `Release oficial ${tag}`;
  }

  const sanitizedTitle = sanitizeAntiEmDash(rawTitle).replace(/\s+/g, ' ').trim();
  const normalizedNotes = sanitizeAntiEmDash(normalizeLineBreaks(rawNotes)).trim() + '\n';

  const titleFile = options.titleFile || path.join(process.cwd(), 'release-title.txt');
  const notesFile = options.notesFile || path.join(process.cwd(), 'release-notes.txt');

  fs.writeFileSync(titleFile, sanitizedTitle, 'utf8');
  fs.writeFileSync(notesFile, normalizedNotes, 'utf8');

  return {
    version: cleanVersion,
    tag,
    title: sanitizedTitle,
    notes: normalizedNotes,
    titleFile,
    notesFile,
    foundInReleasesJson
  };
}

/**
 * CLI runner
 */
export function runCli(argv = process.argv.slice(2)) {
  let version = '';
  let titleFile = '';
  let notesFile = '';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--title-file' && argv[i + 1]) {
      titleFile = argv[++i];
    } else if (arg === '--notes-file' && argv[i + 1]) {
      notesFile = argv[++i];
    } else if (!arg.startsWith('-') && !version) {
      version = arg;
    }
  }

  const result = extractReleaseNotes({ version, titleFile, notesFile });

  console.log(`[extract-release-notes] Target version: ${result.tag}`);
  console.log(`[extract-release-notes] Release title:  ${result.title}`);
  console.log(`[extract-release-notes] Wrote title:    ${result.titleFile}`);
  console.log(`[extract-release-notes] Wrote notes:    ${result.notesFile} (${result.notes.length} bytes)`);
}

// Execute when invoked directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runCli();
}
