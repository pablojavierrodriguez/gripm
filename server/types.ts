export interface ProjectMeta {
  id: string;
  name: string;
  codePrefix: string;
  repoPath?: string;
  description?: string;
  isDemo?: boolean;
  storageType?: 'json' | 'markdown';
  backlogDir?: string;
  docsPath?: string;
  hasDocs?: boolean;
  createdAt: string;
  error?: string;
}

export interface ProjectBacklog {
  project: ProjectMeta;
  items: any[];
  releases: any[];
  sprints?: any[];
  lastUpdated: string;
}
