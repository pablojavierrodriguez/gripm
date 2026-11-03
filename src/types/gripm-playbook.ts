/**
 * src/types/gripm-playbook.d.ts
 *
 * Ambient type declarations for @gripm/playbook package exports.
 * @gripm/playbook ships plain ESM/CJS without bundled .d.ts files.
 * auditService.ts wraps and re-types the engine output internally,
 * so these declarations use permissive types to avoid double-typing.
 */

declare module '@gripm/playbook/audit-engine' {
  // Engine returns a raw object; auditService.ts handles the mapping.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function scanCodebase(rootDir?: string, options?: any): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function detectTests(rootDir?: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function computeHealthScore(params: any): number;
  export function runCli(args?: string[]): Promise<void>;
}

declare module '@gripm/playbook/check-loc' {
  export const DEFAULT_MAX_LINES: number;
  export const DEFAULT_EXTENSIONS: Set<string>;
  export const DEFAULT_IGNORED_DIRS: Set<string>;

  export function countFileLines(filePath: string): number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function isIgnored(relPath: string, isDir: boolean, ignoreRules: any, ignoredDirs?: any): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function parseIgnoreFile(filePath: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function parseIgnoreLines(lines: string[]): any;
  export function runCli(args?: string[]): Promise<void>;
}

declare module '@gripm/playbook/validate-commit' {
  export function validateCommitMessage(message: string): { valid: boolean; errors: string[] };
}
