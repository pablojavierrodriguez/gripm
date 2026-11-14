import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { ActiveTab, BoardData, FilterState, GripmConfig, ViewMode } from '../types';
import { fetchBoardData, fetchSettings, saveSettings, subscribeToBoardEvents, setActiveProjectApi } from '../api';
import { getStoredItem, setStoredItem, STORAGE_KEYS } from '../utils/storage';
import type { ToastMessage } from '../components/Toast';
import type { Language } from '../utils/i18n';

export function useAppState(
  t: (key: any, params?: any) => string,
  setLanguage: (lang: Language) => void
) {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const saved = getStoredItem(STORAGE_KEYS.ACTIVE_TAB) as ActiveTab | null;
      if (saved === 'archive') return 'trash';
      if (saved === 'kanban' || saved === 'sprint' || saved === 'release' || saved === 'trash' || saved === 'settings' || saved === 'timeline' || saved === 'metrics') return saved;
    } catch {}
    return 'kanban';
  });
  const [viewMode, setViewMode] = useState<ViewMode>('simplificada');

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = getStoredItem(STORAGE_KEYS.THEME);
    return saved ? saved !== 'light' : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    setStoredItem(STORAGE_KEYS.THEME, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Config / Settings
  const [config, setConfig] = useState<GripmConfig>({});

  const handleToggleTheme = useCallback(() => {
    const applyThemeToggle = () => {
      setIsDarkMode((prev) => {
        const nextDark = !prev;
        setConfig((prevCfg) => prevCfg ? { ...prevCfg, theme: nextDark ? 'dark' : 'light' } : prevCfg);
        return nextDark;
      });
    };

    const prefersReducedMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      applyThemeToggle();
      return;
    }

    const root = typeof document !== 'undefined' ? document.documentElement : null;
    const doc = typeof document !== 'undefined'
      ? (document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } })
      : null;

    if (doc?.startViewTransition) {
      root?.classList.add('theme-animating');
      const transition = doc.startViewTransition(() => {
        flushSync(() => {
          applyThemeToggle();
        });
      });
      transition.finished
        .catch(() => {})
        .finally(() => root?.classList.remove('theme-animating'));
    } else {
      root?.classList.add('theme-transitioning');
      window.setTimeout(() => {
        root?.classList.remove('theme-transitioning');
      }, 350);
      applyThemeToggle();
    }
  }, []);

  // Filters
  const [filters, setFilters] = useState<FilterState>(() => {
    let initialIdeas = false;
    try {
      const stored = getStoredItem(STORAGE_KEYS.KANBAN_SHOW_IDEAS);
      if (stored !== null) initialIdeas = JSON.parse(stored);
    } catch {}
    return {
      search: '',
      type: 'all',
      types: [],
      priority: 'all',
      priorities: [],
      statuses: [],
      includeIdeas: initialIdeas,
      includePreviousDone: false,
      includeDismissedCancelled: false,
      module: 'all',
      modules: [],
      sprint: 'all',
      sprints: [],
      release: 'all',
      releases: [],
    };
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load Settings
  const loadSettings = useCallback(async (projId?: string) => {
    try {
      const cfg = await fetchSettings(projId && projId !== 'all' ? projId : undefined);
      if (cfg.theme) {
        const userChoice = getStoredItem(STORAGE_KEYS.THEME);
        if (userChoice !== 'dark' && userChoice !== 'light') {
          setIsDarkMode(cfg.theme === 'dark');
        } else {
          cfg.theme = userChoice as 'dark' | 'light';
        }
      }
      setConfig(cfg);
      if (cfg.locale && (cfg.locale === 'es' || cfg.locale === 'en')) {
        setLanguage(cfg.locale);
      }
    } catch (err: any) {
      console.warn('[gripm] Failed to load config:', err.message);
    }
  }, [setLanguage]);

  const handleSaveConfig = useCallback(async (newConfig: GripmConfig) => {
    const saved = await saveSettings(
      newConfig, 
      selectedProjectId !== 'all' ? selectedProjectId : undefined
    );
    setConfig(saved);
    if (saved.locale && (saved.locale === 'es' || saved.locale === 'en')) {
      setLanguage(saved.locale);
    }
    if (saved.theme) {
      if (saved.theme === 'system') {
        const systemDark = typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
        setIsDarkMode(systemDark);
      } else if (saved.theme === 'dark' || saved.theme === 'light') {
        setIsDarkMode(saved.theme === 'dark');
      }
    }
  }, [selectedProjectId, setLanguage]);

  const [liveConnected, setLiveConnected] = useState<boolean>(false);

  // Initial & Live Load
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchBoardData();
      setBoardData(data);
      if (data.projects.length > 0) {
        if (data.singleProject || data.projects.length <= 1) {
          const activeId = data.activeProjectId || data.projects[0].id;
          setSelectedProjectId(activeId);
          setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, activeId);
        } else {
          const savedLocal = getStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
          if (selectedProjectId === 'all') {
            setSelectedProjectId('all');
          } else {
            const candidate = (selectedProjectId && selectedProjectId !== 'all')
              ? selectedProjectId
              : (savedLocal || data.activeProjectId || data.projects[0]?.id || '');
            if (candidate === 'all') {
              setSelectedProjectId('all');
            } else {
              const exists = candidate && data.projects.some((p) => p.id === candidate);
              const fallback = exists 
                ? candidate 
                : (data.activeProjectId && data.projects.some(p => p.id === data.activeProjectId) ? data.activeProjectId : (data.projects[0]?.id || ''));
              setSelectedProjectId(fallback);
              if (fallback && fallback !== 'all') {
                setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, fallback);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (!silent) showToast(t('app.loadDataError', { error: err.message }), 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedProjectId, showToast, t]);

  // Project switch effect
  useEffect(() => {
    let cancelled = false;
    const switchProjectAndLoad = async () => {
      if (selectedProjectId && selectedProjectId !== 'all' && !boardData?.singleProject) {
        setStoredItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, selectedProjectId);
        try {
          await setActiveProjectApi(selectedProjectId);
        } catch {}
      }
      if (!cancelled) {
        await loadData();
        await loadSettings(selectedProjectId);
      }
    };
    switchProjectAndLoad();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  // Live SSE connection
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;
  const loadSettingsRef = useRef(loadSettings);
  loadSettingsRef.current = loadSettings;
  const selectedProjectIdRef = useRef(selectedProjectId);
  selectedProjectIdRef.current = selectedProjectId;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    const unsubscribe = subscribeToBoardEvents((event) => {
      if (event.type === 'connected') {
        setLiveConnected(true);
      } else if (event.type === 'disconnected') {
        setLiveConnected(false);
      } else if (event.type === 'backlog_changed') {
        loadDataRef.current(true);
        showToastRef.current(t('app.boardSyncDisk'), 'info');
      } else if (event.type === 'settings_changed') {
        loadSettingsRef.current(selectedProjectIdRef.current);
        loadDataRef.current(true);
        showToastRef.current(t('app.configSyncDisk'), 'info');
      }
    });

    return unsubscribe;
  }, [t]);

  return {
    boardData,
    setBoardData,
    loading,
    selectedProjectId,
    setSelectedProjectId,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    isDarkMode,
    handleToggleTheme,
    config,
    setConfig,
    loadSettings,
    handleSaveConfig,
    filters,
    setFilters,
    toasts,
    showToast,
    dismissToast,
    liveConnected,
    loadData
  };
}
