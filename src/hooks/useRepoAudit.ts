import { useState, useEffect, useCallback, useRef } from 'react';
import type { RepoHealthReport, TodoImportItem, ImportTodosResult } from '../types';
import { fetchAudit, refreshAudit, importTodos as apiImportTodos } from '../api';

const auditReportMemoryCache = new Map<string, RepoHealthReport>();

export interface UseRepoAuditOptions {
  projectId?: string;
  autoFetch?: boolean;
  onTodosImported?: (count: number, taskIds: string[]) => void;
}

export interface UseRepoAuditReturn {
  report: RepoHealthReport | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isImporting: boolean;
  error: string | null;
  refresh: () => Promise<RepoHealthReport | null>;
  importTodos: (items: TodoImportItem[]) => Promise<ImportTodosResult | null>;
  reload: () => Promise<void>;
}

export function useRepoAudit({
  projectId,
  autoFetch = true,
  onTodosImported,
}: UseRepoAuditOptions = {}): UseRepoAuditReturn {
  const cacheKey = projectId || 'default';
  const initialCached = auditReportMemoryCache.get(cacheKey) || null;

  const [report, setReport] = useState<RepoHealthReport | null>(initialCached);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCached && autoFetch);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAuditData = useCallback(async (isSilent = false) => {
    if (!isSilent && !auditReportMemoryCache.has(cacheKey)) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await fetchAudit(projectId);
      if (isMountedRef.current) {
        setReport(data);
        auditReportMemoryCache.set(cacheKey, data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al cargar reporte de salud');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [projectId, cacheKey]);

  useEffect(() => {
    if (autoFetch) {
      const cached = auditReportMemoryCache.get(cacheKey);
      if (cached) {
        setReport(cached);
        // Background revalidation
        loadAuditData(true);
      } else {
        loadAuditData(false);
      }
    }
  }, [autoFetch, cacheKey, loadAuditData]);

  const refresh = useCallback(async (): Promise<RepoHealthReport | null> => {
    setIsRefreshing(true);
    setError(null);
    try {
      const freshReport = await refreshAudit(projectId);
      if (isMountedRef.current) {
        setReport(freshReport);
        auditReportMemoryCache.set(cacheKey, freshReport);
      }
      return freshReport;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al actualizar el escaneo de código');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [projectId, cacheKey]);

  const handleImportTodos = useCallback(async (items: TodoImportItem[]): Promise<ImportTodosResult | null> => {
    if (!items.length) return null;
    setIsImporting(true);
    setError(null);
    try {
      const result = await apiImportTodos(items, projectId);
      if (result.ok) {
        onTodosImported?.(result.importedCount, result.taskIds);
        // Refresh audit report immediately after importing
        const updated = await refreshAudit(projectId).catch(() => null);
        if (updated && isMountedRef.current) {
          setReport(updated);
          auditReportMemoryCache.set(cacheKey, updated);
        }
      }
      return result;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error al importar TODOs como tareas');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsImporting(false);
      }
    }
  }, [projectId, cacheKey, onTodosImported]);

  return {
    report,
    isLoading,
    isRefreshing,
    isImporting,
    error,
    refresh,
    importTodos: handleImportTodos,
    reload: () => loadAuditData(false),
  };
}
