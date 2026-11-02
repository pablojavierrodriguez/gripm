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
} from '../../scripts/audit-engine.mjs';

export interface RepoHealthReport {
  score: number; // 0 to 100
  summary: {
    totalFilesScanned: number;
    locViolationsCount: number;
    suppressionsCount: number;
    todosCount: number;
    testFramework: string | null;
    verifyCommand: string | null;
  };
  loc: {
    maxLines: number;
    warnLines: number;
    violations: Array<{ file: string; lines: number; status: 'warning' | 'error' }>;
  };
  quality: {
    suppressions: Array<{ file: string; line: number; type: string; snippet: string }>;
  };
  todos: Array<{ id: string; file: string; line: number; type: 'TODO' | 'FIXME' | 'HACK' | 'BUG'; text: string; snippet: string }>;
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
  cwd?: string;
  root?: string;
}

export interface TestDetectionResult {
  detected: boolean;
  framework: string | null;
  verifyCommand: string | null;
  hasTests: boolean;
}

/**
 * Headless static analysis of a codebase or file path.
 */
export async function scanCodebase(
  targetPath?: string,
  options?: AuditOptions
): Promise<RepoHealthReport> {
  const result = await scanCodebaseEngine(targetPath, options);
  return result as unknown as RepoHealthReport;
}

/**
 * Detects test runner and suggested verify command.
 */
export function detectTests(rootPath?: string): TestDetectionResult {
  return detectTestsEngine(rootPath) as TestDetectionResult;
}

/**
 * Calculates deterministic health score (0 - 100).
 */
export function computeHealthScore(params: {
  totalFilesScanned?: number;
  locViolations?: Array<{ status: 'warning' | 'error' }>;
  suppressions?: Array<{ file: string; line: number; type: string; snippet: string }>;
  todos?: Array<{ type: 'TODO' | 'FIXME' | 'HACK' | 'BUG' }>;
  tests?: { detected: boolean; hasTests: boolean };
}): number {
  return (computeHealthScoreEngine as (args: any) => number)(params);
}
