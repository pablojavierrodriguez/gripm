export type LocStatus = 'warning' | 'error';
export type TodoType = 'TODO' | 'FIXME' | 'HACK' | 'BUG';

export interface LocViolation {
  file: string;
  lines: number;
  status: LocStatus;
}

export interface CodeQualitySuppression {
  file: string;
  line: number;
  type: string;
  snippet: string;
}

export interface CodeTodoItem {
  id: string;
  file: string;
  line: number;
  type: TodoType;
  text: string;
  snippet: string;
}

export interface TestDetection {
  detected: boolean;
  framework: string | null;
  verifyCommand: string | null;
  hasTests: boolean;
}

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
    violations: LocViolation[];
  };
  quality: {
    suppressions: CodeQualitySuppression[];
  };
  todos: CodeTodoItem[];
  tests: TestDetection;
}

export interface TodoImportItem {
  file: string;
  line?: number;
  type?: string;
  text: string;
  snippet?: string;
}

export interface ImportTodosResult {
  ok: boolean;
  importedCount: number;
  taskIds: string[];
}
