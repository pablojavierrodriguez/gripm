#!/usr/bin/env node

/**
 * scripts/verify-status-contrast.js
 * Verifies the contrast of the status badges in src/utils/statusMeta.ts (DEV-173).
 *
 * Reads the real classes out of the source instead of duplicating them here, so
 * the check cannot drift from the styles it is meant to verify.
 *
 * Method: WCAG 2.1 relative luminance ratio between the badge text color and the
 * effective background. The background is not the raw token: every badge paints
 * its own token over the surface at partial alpha, so the effective color is
 * composited first. Badges are rendered at 10-11px, which is small text, so the
 * threshold is 4.5:1 (WCAG AA), not 3:1.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'src', 'utils', 'statusMeta.ts');

/** Tailwind v3 default palette, limited to the families the badges use. */
const PALETTE = {
  slate: { 100: '#f1f5f9', 200: '#e2e8f0', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 900: '#0f172a', 950: '#020617' },
  gray: { 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151' },
  red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  rose: { 100: '#ffe4e6', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337', 950: '#4c0519' },
  orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
  amber: { 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207' },
  green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
  emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857' },
  teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
  cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490' },
  sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' },
  blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
  violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
  purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
  pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d' },
  fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf' },
};

/** Surfaces the badges actually sit on, per theme. */
const LIGHT_SURFACE = '#ffffff';
const DARK_SURFACE = '#0f172a';

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const linearize = (channel) => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

/** Flattens a translucent token over an opaque surface. */
const composite = (token, alpha, surface) => {
  const fg = toRgb(token);
  const bg = toRgb(surface);
  return `#${fg
    .map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)).toString(16).padStart(2, '0'))
    .join('')}`;
};

const resolveToken = (spec) => {
  const match = /^([a-z]+)-(\d+)$/.exec(spec);
  if (!match) throw new Error(`Unexpected color token: ${spec}`);
  const [, family, tone] = match;
  const hex = PALETTE[family]?.[tone];
  if (!hex) throw new Error(`Color token out of the known palette: ${spec}`);
  return hex;
};

/** Parses `bg-fam-tone/alpha`, treating a missing alpha as fully opaque. */
const parsePaint = (raw) => {
  const m = /^(?:dark:)?bg-([a-z]+-\d+)(?:\/([\d.]+))?$/.exec(raw);
  if (!m) return null;
  // Tailwind slash syntax is a percentage: /10 means 10%, not 10.
  const alpha = m[2] === undefined ? 1 : Number(m[2]) / 100;
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1) {
    throw new Error(`Alpha out of range in "${raw}"`);
  }
  return { spec: m[1], alpha };
};

const textToken = (classes, { dark }) => {
  const pattern = dark ? /(?:^|\s)dark:text-([a-z]+-\d+)(?:\s|$)/ : /(?:^|\s)text-([a-z]+-\d+)(?:\s|$)/;
  const match = pattern.exec(` ${classes} `);
  if (!match) throw new Error(`No ${dark ? 'dark ' : ''}text-* token in: ${classes}`);
  return match[1];
};

const source = fs.readFileSync(SOURCE, 'utf8');
const blockPattern = /(\w+):\s*\{\s*\n\s*dot:[^\n]*\n\s*bg:[^\n]*\n\s*border:[^\n]*\n\s*color:\s*'([^']+)'/g;

const badges = [];
let match;
while ((match = blockPattern.exec(source)) !== null) {
  const [, status, colorClasses] = match;
  const tokens = colorClasses.split(/\s+/);
  const light = parsePaint(tokens.find((t) => /^bg-/.test(t)));
  // Most badges declare one translucent background and rely on the surface behind
  // it; only the ones with a real dark surface override it with `dark:bg-*`.
  const dark = parsePaint(tokens.find((t) => t.startsWith('dark:bg-'))) ?? light;
  if (!light) throw new Error(`${status}: could not resolve the badge background`);

  badges.push({
    status,
    light: { fg: textToken(colorClasses, { dark: false }), bg: light },
    dark: { fg: textToken(colorClasses, { dark: true }), bg: dark },
  });
}

if (badges.length === 0) throw new Error('No status badges parsed from statusMeta.ts');

const THRESHOLD = 4.5;
const results = [];
for (const badge of badges) {
  for (const theme of ['light', 'dark']) {
    const { fg, bg } = badge[theme];
    const surface = theme === 'light' ? LIGHT_SURFACE : DARK_SURFACE;
    const effectiveBg = composite(resolveToken(bg.spec), bg.alpha, surface);
    const ratio = contrast(resolveToken(fg), effectiveBg);
    results.push({ status: badge.status, theme, ratio, fg, effectiveBg });
  }
}

let failures = 0;
for (const r of results) {
  const ok = r.ratio >= THRESHOLD;
  if (!ok) failures += 1;
  const flag = ok ? '  ok  ' : ' FALLA';
  console.log(`${flag}  ${r.status.padEnd(10)}${r.theme.padEnd(8)}${r.ratio.toFixed(2)}:1   ${r.fg} sobre ${r.effectiveBg}`);
}

console.log('');
console.log(`Badges: ${badges.length} · combinaciones: ${results.length} · bajo ${THRESHOLD}:1 -> ${failures}`);

if (failures > 0) {
  console.error('');
  console.error('DEV-173 AC #5: los badges de estado deben alcanzar 4.5:1 en tema claro y oscuro.');
  console.error('Los badges se renderizan a 10-11px, asi que aplica el umbral de texto pequeno (WCAG AA).');
  process.exit(1);
}

console.log('✅ Contraste de badges de estado: todas las combinaciones alcanzan 4.5:1');