/**
 * server/services/auditService.ts
 *
 * Core static analysis and codebase health service (DEV-353).
 * Exposes scanCodebase() with strict TypeScript typing and delegates
 * to the headless audit-engine.
 */

import {
  scanCodebase as scanCodebaseEngine,
  detectTests as detectTestsEngine,
  computeHealthScore as computeHealthScoreEngine
} from '@gripm/playbook/audit-engine';

export interface RepoHealthReport {
  score: number; // 0 to 100
  stack?: string[];
  summary: {
    totalFilesScanned: number;
    locViolationsCount: number;
    suppressionsCount: number;
    todosCount: number;
    testFramework: string | null;
    verifyCommand: string | null;
    stack?: string | null;
  };
  rules?: {
    loc?: boolean;
    suppressions?: boolean;
    debtMarkers?: boolean;
    consoleLog?: boolean;
    testRunner?: boolean;
  };
  loc: {
    maxLines: number;
    warnLines: number;
    violations: Array<{ file: string; lines: number; status: 'warning' | 'error' }>;
  };
  quality: {
    suppressions: Array<{ file: string; line: number; type: string; snippet: string }>;
  };
  todos: Array<{ id: string; file: string; line: number; type: 'TODO' | 'FIXME' | 'HACK' | 'BUG' | 'XXX'; text: string; snippet: string }>;
  tests: {
    detected: boolean;
    framework: string | null;
    verifyCommand: string | null;
    hasTests: boolean;
  };
}

export interface AuditOptions {
  maxLines?: number;
  warnLines?: number;
  extensions?: string[] | Set<string>;
  ignoredDirs?: string[] | Set<string>;
  exclude?: string[] | string;
  rules?: {
    loc?: boolean;
    suppressions?: boolean;
    debtMarkers?: boolean;
    consoleLog?: boolean;
    testRunner?: boolean;
  };
  thresholds?: {
    maxLines?: number;
    warnLines?: number;
  };
  cwd?: string;
  root?: string;
  includeConsoleLog?: boolean;
}

export interface TestDetectionResult {
  detected: boolean;
  framework: string | null;
  verifyCommand: string | null;
  hasTests: boolean;
}

export interface HealthScoreParams {
  totalFilesScanned?: number;
  locViolations?: Array<{ status: 'warning' | 'error' }>;
  suppressions?: Array<{ file?: string; line?: number; type: string; snippet?: string }>;
  todos?: Array<{ type: 'TODO' | 'FIXME' | 'HACK' | 'BUG' | 'XXX' }>;
  tests?: { detected: boolean; hasTests: boolean };
  rules?: {
    loc?: boolean;
    suppressions?: boolean;
    debtMarkers?: boolean;
    consoleLog?: boolean;
    testRunner?: boolean;
  };
}

/**
 * Headless static analysis of a codebase or file path.
 */
export async function scanCodebase(
  targetPath?: string,
  options?: AuditOptions
): Promise<RepoHealthReport> {
  const result = await scanCodebaseEngine(targetPath, options);
  const violations: RepoHealthReport['loc']['violations'] = (result.loc?.violations || []).map(
    (v: { file: string; lines: number; status: string }) => ({
      file: v.file,
      lines: v.lines,
      status: v.status === 'error' ? 'error' : 'warning'
    })
  );

  const todos: RepoHealthReport['todos'] = (result.todos || []).map(
    (t: { id: string; file: string; line: number; type: string; text: string; snippet: string }) => ({
      id: t.id,
      file: t.file,
      line: t.line,
      type:
        t.type === 'FIXME' || t.type === 'HACK' || t.type === 'BUG' || t.type === 'XXX'
          ? t.type
          : 'TODO',
      text: t.text,
      snippet: t.snippet
    })
  );

  return {
    score: result.score,
    ...(Array.isArray(result.stack) ? { stack: result.stack } : {}),
    summary: {
      totalFilesScanned: result.summary.totalFilesScanned,
      locViolationsCount: result.summary.locViolationsCount,
      suppressionsCount: result.summary.suppressionsCount,
      todosCount: result.summary.todosCount,
      testFramework: result.summary.testFramework ?? null,
      verifyCommand: result.summary.verifyCommand ?? null,
      ...(result.summary.stack !== undefined ? { stack: result.summary.stack } : {})
    },
    rules: result.rules,
    loc: {
      maxLines: result.loc.maxLines,
      warnLines: result.loc.warnLines,
      violations
    },
    quality: {
      suppressions: result.quality.suppressions || []
    },
    todos,
    tests: {
      detected: Boolean(result.tests.detected),
      framework: result.tests.framework ?? null,
      verifyCommand: result.tests.verifyCommand ?? null,
      hasTests: Boolean(result.tests.hasTests)
    }
  };
}

/**
 * Detects test runner and suggested verify command.
 */
export function detectTests(rootPath?: string): TestDetectionResult {
  const res = detectTestsEngine(rootPath);
  return {
    detected: Boolean(res.detected),
    framework: res.framework ?? null,
    verifyCommand: res.verifyCommand ?? null,
    hasTests: Boolean(res.hasTests)
  };
}

/**
 * Calculates deterministic health score (0 - 100).
 */
export function computeHealthScore(params: HealthScoreParams): number {
  const computeFn: (args: HealthScoreParams) => number = computeHealthScoreEngine;
  return computeFn(params);
}
