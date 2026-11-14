#!/usr/bin/env node

/**
 * scripts/test-extract-release-notes.js
 *
 * Test suite for scripts/extract-release-notes.js (DEV-368).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  extractReleaseNotes,
  sanitizeAntiEmDash,
  normalizeLineBreaks,
  resolveTargetVersion
} from './extract-release-notes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🧪 Testing extract-release-notes.js...');

// Test 1: sanitizeAntiEmDash replaces em-dash and en-dash with standard hyphen
{
  const input = 'Feature \u2014 Great update \u2013 and improvements';
  const expected = 'Feature - Great update - and improvements';
  assert.equal(sanitizeAntiEmDash(input), expected, 'Em-dash and en-dash should be sanitized to standard hyphen');
  assert.equal(sanitizeAntiEmDash(''), '', 'Empty string handled safely');
  assert.equal(sanitizeAntiEmDash(null), '', 'Null input handled safely');
}

// Test 2: normalizeLineBreaks unescapes literal \n and normalizes CRLF
{
  const input = 'Line 1\\nLine 2\\r\\nLine 3\r\nLine 4';
  const expected = 'Line 1\nLine 2\nLine 3\nLine 4';
  assert.equal(normalizeLineBreaks(input), expected, 'Line breaks should be normalized to LF');
}

// Test 3: resolveTargetVersion priority
{
  assert.equal(resolveTargetVersion('1.2.3'), '1.2.3', 'Explicit argument takes top priority');
  assert.equal(resolveTargetVersion(' v2.0.0 '), 'v2.0.0', 'Whitespace is trimmed');
}

// Test 4: extractReleaseNotes with existing release (1.11.0)
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-notes-test-'));
  const titleFile = path.join(tmpDir, 'title.txt');
  const notesFile = path.join(tmpDir, 'notes.txt');

  try {
    const res = extractReleaseNotes({
      version: '1.11.0',
      rootDir: ROOT_DIR,
      titleFile,
      notesFile
    });

    assert.equal(res.version, '1.11.0');
    assert.equal(res.tag, 'v1.11.0');
    assert.equal(res.foundInReleasesJson, true);
    assert.ok(res.title.includes('v1.11.0'), 'Title must contain v1.11.0');
    assert.ok(!res.title.includes('\u2014') && !res.title.includes('\u2013'), 'Title must not contain em-dashes');
    assert.ok(!res.notes.includes('\u2014') && !res.notes.includes('\u2013'), 'Notes must not contain em-dashes');

    assert.ok(fs.existsSync(titleFile), 'titleFile must be written');
    assert.ok(fs.existsSync(notesFile), 'notesFile must be written');

    const readTitle = fs.readFileSync(titleFile, 'utf8');
    const readNotes = fs.readFileSync(notesFile, 'utf8');
    assert.equal(readTitle, res.title);
    assert.equal(readNotes, res.notes);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 5: extractReleaseNotes with nonexistent fallback version
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-notes-test-fallback-'));
  const titleFile = path.join(tmpDir, 'fallback-title.txt');
  const notesFile = path.join(tmpDir, 'fallback-notes.txt');

  try {
    const res = extractReleaseNotes({
      version: '99.99.99',
      rootDir: ROOT_DIR,
      titleFile,
      notesFile
    });

    assert.equal(res.version, '99.99.99');
    assert.equal(res.tag, 'v99.99.99');
    assert.equal(res.foundInReleasesJson, false);
    assert.equal(res.title, 'v99.99.99');
    assert.equal(res.notes, 'Release oficial v99.99.99\n');

    assert.ok(fs.existsSync(titleFile));
    assert.ok(fs.existsSync(notesFile));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Test 6: CLI execution via subprocess
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-notes-cli-test-'));
  const titleFile = path.join(tmpDir, 'cli-title.txt');
  const notesFile = path.join(tmpDir, 'cli-notes.txt');

  try {
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'extract-release-notes.js');
    execFileSync('node', [scriptPath, '1.11.0', '--title-file', titleFile, '--notes-file', notesFile], {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    });

    assert.ok(fs.existsSync(titleFile));
    assert.ok(fs.existsSync(notesFile));
    const title = fs.readFileSync(titleFile, 'utf8');
    assert.ok(title.includes('v1.11.0'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('✅ All extract-release-notes.js tests passed successfully.');
