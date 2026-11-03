/**
 * scripts/mcpToolSchemas.ts
 *
 * Canonical tool definitions and JSON schemas for the Gripm MCP server.
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export const CANONICAL_TOOLS: McpToolDefinition[] = [
  {
    name: 'gripm_list_projects',
    description: 'Lists registered projects in the gripm cockpit, their repository paths and storage engine (Markdown vs JSON).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'gripm_list_tasks',
    description: 'Lists backlog tasks with optional filters (openOnly, search, limit, compact format for minimal token usage).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        status: { 
          type: 'string', 
          description: 'Filter by status: "draft", "doing", "review", "ready", "done", "dismissed", "cancelled".' 
        },
        openOnly: {
          type: 'boolean',
          description: 'If true, excludes closed/done/dismissed tasks, returning only active or backlog tasks.'
        },
        priority: { type: 'string', description: 'Filter by priority: "urgent", "high", "medium", "low".' },
        sprint: { type: 'string', description: 'Filter by assigned sprint (e.g. "Sprint 8").' },
        milestone: { type: 'string', description: 'Filter by milestone or release version.' },
        search: { type: 'string', description: 'Search term to match against task title, code, or labels.' },
        prefix: { type: 'string', description: 'Filter by task code prefix (e.g. "DEV-", "FEAT-").' },
        taskIds: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Explicit list of task IDs to query (e.g. ["DEV-001", "DEV-002"]).' 
        },
        limit: { type: 'number', description: 'Maximum number of tasks to return (recommended to prevent token saturation).' },
        offset: { type: 'number', description: 'Pagination offset (defaults to 0).' },
        format: { 
          type: 'string', 
          enum: ['detailed', 'compact'], 
          description: 'Output format. "compact" returns a 1-line summary per task (saves ~90% tokens).' 
        }
      }
    }
  },
  {
    name: 'gripm_get_stats',
    description: 'Calculates aggregate backlog metrics: total tasks, open, closed, completion percentage, status/priority breakdown, and code prefix breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, analyzes active project.' }
      }
    }
  },
  {
    name: 'gripm_bulk_update_tasks',
    description: 'Performs atomic batch updates across multiple tasks simultaneously (by taskIds list or prefix/status filter).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' },
        taskIds: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Explicit list of task IDs to update (e.g. ["DEV-001", "DEV-002"]).' 
        },
        filterPrefix: { 
          type: 'string', 
          description: 'Code prefix to match for bulk update (e.g. "FEAT-", "BUG-").' 
        },
        filterStatus: {
          type: 'string',
          description: 'Filter by current status before applying update (e.g. "draft").'
        },
        updates: {
          type: 'object',
          description: 'Fields to update across all matching tasks.',
          properties: {
            status: { type: 'string', enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'] },
            priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
            milestone: { type: 'string' },
            sprint: { type: 'string', description: 'Sprint to assign to matching tasks.' },
            implementationNotes: { type: 'string' },
            labels: { type: 'array', items: { type: 'string' } },
            estimate: { description: 'Estimation value (story points number or T-shirt size string).' }
          }
        }
      },
      required: ['updates']
    }
  },
  {
    name: 'gripm_get_task',
    description: 'Retrieves complete details of a task including Acceptance Criteria (AC), Implementation Plan, and Notes.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID or code (e.g. "DEV-001").' },
        projectId: { type: 'string', description: 'Project ID (optional if task code is unique).' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'gripm_create_task',
    description: 'Creates a new task in the backlog, generating an individual Markdown file in backlog/tasks/.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' },
        title: { type: 'string', description: 'Descriptive title for the task.' },
        description: { type: 'string', description: 'Technical description or detailed requirements.' },
        type: { type: 'string', enum: ['feature', 'bug', 'tech_debt', 'ux'], description: 'Item type.' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'], description: 'Priority level.' },
        status: { type: 'string', enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'], description: 'Initial status.' },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Plain-text list of acceptance criteria.'
        },
        implementationPlan: { type: 'string', description: 'Step-by-step technical implementation plan.' },
        milestone: { type: 'string', description: 'Assigned sprint or milestone.' },
        estimate: { description: 'Estimation value (story points number or T-shirt size string).' }
      },
      required: ['title']
    }
  },
  {
    name: 'gripm_update_task',
    description: 'Updates task status (draft, doing, review, ready, done), acceptance criteria checkboxes, priority, or implementation plan.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID or code to update.' },
        projectId: { type: 'string', description: 'Project ID.' },
        status: { 
          type: 'string', 
          enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'],
          description: 'Task status (canonical top-level field).'
        },
        updates: {
          type: 'object',
          description: 'Optional update object (supports status, title, description, priority, etc.).',
          properties: {
            status: { type: 'string', enum: ['draft', 'doing', 'review', 'ready', 'done', 'dismissed', 'cancelled', 'ideas'] },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
            implementationPlan: { type: 'string' },
            milestone: { type: 'string' },
            sprint: { type: 'string' },
            estimate: { description: 'Estimation value (story points number or T-shirt size string).' },
            checkAllAcs: { type: 'boolean' }
          }
        },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        implementationPlan: { type: 'string', description: 'Technical plan update.' },
        sprint: { type: 'string', description: 'Sprint name to assign (e.g. "Sprint 8").' },
        estimate: { description: 'Estimation value (story points number or T-shirt size string).' },
        toggleAcIndex: { type: 'number', description: 'AC index (1-indexed) to toggle checked/unchecked.' },
        checkAllAcs: { type: 'boolean', description: 'If true, checks all ACs. If false, unchecks all ACs.' },
        verifyCommand: { type: 'string', description: 'Verification command to execute before certifying transition to ready/done.' },
        force: { type: 'boolean', description: 'Force transition bypassing Gatekeeper checks (requires explicit authorization).' },
        milestone: { type: 'string' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'gripm_export_backlog',
    description: 'Generates or updates the consolidated BACKLOG.md document at the repository root.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID to consolidate.' }
      }
    }
  },
  {
    name: 'gripm_list_releases',
    description: 'Lists all project releases, versions, changelog notes, and linked tasks (both released and in preparation).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        version: { type: 'string', description: 'Specific version to query (e.g. "v1.0.0"). If omitted, returns all.' }
      }
    }
  },
  {
    name: 'gripm_sync_backlog',
    description: 'Audits and automatically reconciles tasks with acceptance criteria and regenerates BACKLOG.md without shell commands.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        autoFix: { type: 'boolean', description: 'If true, auto-promotes completed tasks to Done and reconciles ACs.' }
      }
    }
  },
  {
    name: 'gripm_create_retro',
    description: 'Records and persists a structured sprint retrospective in Markdown inside backlog/retros/sprint-N-retro.md.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID. If omitted, uses active project.' },
        sprintId: { type: 'string', description: 'Sprint ID or number (e.g. "sprint-8").' },
        sprintName: { type: 'string', description: 'Human-readable sprint name (e.g. "Sprint 8").' },
        whatWentWell: { type: 'string', description: 'Strengths: What worked well and should be repeated?' },
        whatWentWrong: { type: 'string', description: 'Issues: What failed or took longer than expected?' },
        whatToImprove: { type: 'string', description: 'Efficiency: What could be improved for next iterations?' },
        actions: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Concrete action items for subsequent sprints.' 
        }
      },
      required: ['sprintId']
    }
  },
  {
    name: 'gripm_list_retros',
    description: 'Lists saved sprint retrospectives in backlog/retros/ with summaries and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' }
      }
    }
  },
  {
    name: 'gripm_get_repo_health',
    description: 'Returns static architecture and code health diagnostic (LOC budgets, suppressions, test framework, and TODOs)',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'loc', 'quality', 'suppressions', 'tests', 'todos'],
          description: 'Category of health data to retrieve'
        },
        limit: {
          type: 'number',
          description: 'Limit of items to return in lists'
        },
        projectId: {
          type: 'string',
          description: 'Project ID or code to inspect (optional, defaults to active project).'
        }
      }
    }
  }
];
