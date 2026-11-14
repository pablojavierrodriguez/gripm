/**
 * scripts/backlogMdSerializer.ts
 *
 * Serialization and markdown generation for individual tasks and monolithic BACKLOG.md.
 */

import {
  type BacklogMdTask,
  type CanonicalStatus,
  formatStatusForMd,
  formatPriorityForMd,
  escapeSectionMarkers,
} from './backlogMdSections.ts';

export function serializeBacklogMd(task: BacklogMdTask): string {
  const frontmatterLines: string[] = ['---'];

  const cleanId = (task.id || '').replace(/[\r\n]+/g, '').trim();
  frontmatterLines.push(`id: ${cleanId}`);
  frontmatterLines.push(`title: ${JSON.stringify(task.title || 'Sin título')}`);
  frontmatterLines.push(`status: ${formatStatusForMd(task.status)}`);
  
  if (task.assignees && task.assignees.length > 0) {
    frontmatterLines.push('assignee:');
    task.assignees.forEach(a => frontmatterLines.push(`  - ${JSON.stringify(a)}`));
  }

  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const cleanCreated = (task.createdDate || nowStr).replace(/[\r\n']+/g, '').trim();
  const cleanUpdated = (task.updatedDate || nowStr).replace(/[\r\n']+/g, '').trim();
  frontmatterLines.push(`created_date: '${cleanCreated}'`);
  frontmatterLines.push(`updated_date: '${cleanUpdated}'`);

  if (task.labels && task.labels.length > 0) {
    frontmatterLines.push('labels:');
    task.labels.forEach(l => frontmatterLines.push(`  - ${JSON.stringify(l)}`));
  } else {
    frontmatterLines.push('labels: []');
  }

  if (task.dependencies && task.dependencies.length > 0) {
    frontmatterLines.push('dependencies:');
    task.dependencies.forEach(d => frontmatterLines.push(`  - ${JSON.stringify(d)}`));
  } else {
    frontmatterLines.push('dependencies: []');
  }

  frontmatterLines.push(`priority: ${formatPriorityForMd(task.priority || 'p2')}`);

  if (task.type) {
    const cleanType = String(task.type).replace(/[\r\n]+/g, '').trim();
    if (/^[a-zA-Z0-9_-]+$/.test(cleanType)) {
      frontmatterLines.push(`type: ${cleanType}`);
    } else {
      frontmatterLines.push(`type: ${JSON.stringify(cleanType)}`);
    }
  }

  if (task.milestone) {
    frontmatterLines.push(`milestone: ${JSON.stringify(task.milestone)}`);
  }

  if (task.targetSprint) {
    frontmatterLines.push(`target_sprint: ${JSON.stringify(task.targetSprint)}`);
  } else if (task.sprint) {
    frontmatterLines.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }

  if (task.estimate !== undefined && task.estimate !== null && task.estimate !== '') {
    if (typeof task.estimate === 'number') {
      frontmatterLines.push(`estimate: ${task.estimate}`);
    } else {
      const cleanEst = String(task.estimate).replace(/[\r\n]+/g, '').trim();
      if (!isNaN(Number(cleanEst))) {
        frontmatterLines.push(`estimate: ${Number(cleanEst)}`);
      } else {
        frontmatterLines.push(`estimate: ${JSON.stringify(cleanEst)}`);
      }
    }
  }

  if (task.parentId) {
    frontmatterLines.push(`parent: ${JSON.stringify(task.parentId)}`);
  }

  if (task.blocks && task.blocks.length > 0) {
    frontmatterLines.push('blocks:');
    task.blocks.forEach(b => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }

  if (task.blockedBy && task.blockedBy.length > 0) {
    frontmatterLines.push('blocked_by:');
    task.blockedBy.forEach(b => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }

  if (task.blockedReason) {
    frontmatterLines.push(`blocked_reason: ${JSON.stringify(task.blockedReason)}`);
  }

  if (task.dismissedReason) {
    frontmatterLines.push(`dismissed_reason: ${JSON.stringify(task.dismissedReason)}`);
  }

  if (task.relatedTo && task.relatedTo.length > 0) {
    frontmatterLines.push('related_to:');
    task.relatedTo.forEach(r => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }

  const isInvalidSprint = (s: string | undefined | null) => {
    if (!s) return true;
    const clean = s.trim().toLowerCase();
    return clean === 'backlog-futuro' || clean === 'sin-sprint' || clean === 'sin sprint' || clean === 'backlog' || clean === 'none' || clean === 'null';
  };

  if (task.sprints && task.sprints.length > 0) {
    const validSprints = task.sprints.filter(s => !isInvalidSprint(s));
    if (validSprints.length > 0) {
      frontmatterLines.push('sprints:');
      validSprints.forEach(s => frontmatterLines.push(`  - ${JSON.stringify(s)}`));
    }
  }

  if (task.releases && task.releases.length > 0) {
    frontmatterLines.push('releases:');
    task.releases.forEach(r => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }

  if (task.sprint && !isInvalidSprint(task.sprint)) {
    frontmatterLines.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }

  if (task.targetSprint && task.targetSprint !== task.sprint && !isInvalidSprint(task.targetSprint)) {
    frontmatterLines.push(`targetSprint: ${JSON.stringify(task.targetSprint)}`);
  }

  if (task.isDeleted) {
    frontmatterLines.push('isDeleted: true');
    if (task.deletedAt) {
      frontmatterLines.push(`deletedAt: ${JSON.stringify(task.deletedAt)}`);
    }
    if (task.previousStatus) {
      frontmatterLines.push(`previousStatus: ${JSON.stringify(task.previousStatus)}`);
    }
  }

  if (task.estimate !== undefined && task.estimate !== null && task.estimate !== '') {
    if (typeof task.estimate === 'number') {
      frontmatterLines.push(`estimate: ${task.estimate}`);
    } else {
      frontmatterLines.push(`estimate: ${JSON.stringify(task.estimate)}`);
    }
  }

  if (task.startDate) {
    frontmatterLines.push(`start_date: ${JSON.stringify(task.startDate)}`);
  }

  if (task.dueDate) {
    frontmatterLines.push(`due_date: ${JSON.stringify(task.dueDate)}`);
  }

  if (task.module) frontmatterLines.push(`module: ${JSON.stringify(task.module)}`);
  if (task.epic) frontmatterLines.push(`epic: ${JSON.stringify(task.epic)}`);
  if (task.category) frontmatterLines.push(`category: ${JSON.stringify(task.category)}`);
  if (task.impactedFile) frontmatterLines.push(`impacted_file: ${JSON.stringify(task.impactedFile)}`);
  if (task.risk) frontmatterLines.push(`risk: ${JSON.stringify(task.risk)}`);
  if (task.fix) frontmatterLines.push(`fix: ${JSON.stringify(task.fix)}`);

  if (task.rawStatus) frontmatterLines.push(`raw_status: ${JSON.stringify(task.rawStatus)}`);
  if (task.previousStatus && !task.isDeleted) frontmatterLines.push(`previous_status: ${JSON.stringify(task.previousStatus)}`);

  if (task.rawExtraFrontmatter) {
    for (const [k, v] of Object.entries(task.rawExtraFrontmatter)) {
      // DEV-300: Validar clave contra /^[a-zA-Z0-9_-]+$/ para impedir inyecciones de saltos de línea o directivas no autorizadas
      if (!/^[a-zA-Z0-9_-]+$/.test(k)) {
        continue;
      }
      if (!['id', 'title', 'status', 'assignee', 'assignees', 'created_date', 'updated_date', 'labels', 'dependencies', 'priority', 'type', 'milestone', 'parent', 'parentid', 'blocks', 'blocked_by', 'blockedby', 'blocked_reason', 'blockedreason', 'dismissed_reason', 'dismissedreason', 'related_to', 'relatedto', 'sprints', 'releases', 'sprint', 'targetsprint', 'isdeleted', 'deletedat', 'previousstatus', 'estimate', 'estimation', 'points', 'story_points', 'storypoints', 'start_date', 'startdate', 'due_date', 'duedate', 'target_date', 'targetdate'].includes(k.toLowerCase())) {
        if (v === undefined || v === null) {
          continue;
        }
        if (Array.isArray(v)) {
          if (v.length === 0) {
            frontmatterLines.push(`${k}: []`);
          } else {
            frontmatterLines.push(`${k}:`);
            v.forEach(item => frontmatterLines.push(`  - ${JSON.stringify(item)}`));
          }
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          frontmatterLines.push(`${k}: ${v}`);
        } else {
          frontmatterLines.push(`${k}: ${JSON.stringify(v)}`);
        }
      }
    }
  }

  frontmatterLines.push('---');
  frontmatterLines.push('');

  // Cuerpo Markdown con secciones delimitadas
  const bodySections: string[] = [];

  // 1. Description
  // DEV-127: NUNCA fabricar contenido que el usuario no escribió. El .md de cada
  // tarea es la fuente de verdad, se commitea en git y lo leen agentes de IA: si
  // escribimos aquí un relleno, ese texto pasa a ser indistinguible de lo que el
  // autor redactó realmente, y además desactiva el Plan Guard (que detecta "tiene
  // plan o ACs" para bloquear el paso a Doing). La sección se escribe vacía.
  // DEV-132: Escapamos marcadores literales dentro de texto libre para no propagar corrupciones.
  bodySections.push('## Description\n');
  bodySections.push('<!-- SECTION:DESCRIPTION:BEGIN -->');
  bodySections.push(escapeSectionMarkers(task.description || ''));
  bodySections.push('<!-- SECTION:DESCRIPTION:END -->\n');

  // 2. Acceptance Criteria
  // DEV-127: sin ACs, la sección queda vacía (no se inyecta un AC de relleno).
  bodySections.push('## Acceptance Criteria\n');
  bodySections.push('<!-- AC:BEGIN -->');
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    task.acceptanceCriteria.forEach((ac, i) => {
      const idx = ac.index || (i + 1);
      const mark = ac.checked ? 'x' : ' ';
      bodySections.push(`- [${mark}] #${idx} ${escapeSectionMarkers(ac.text)}`);
    });
  }
  bodySections.push('<!-- AC:END -->\n');

  // 3. Implementation Plan
  // DEV-127: sin plan, la sección queda vacía (no se inyecta un plan genérico).
  bodySections.push('## Implementation Plan\n');
  bodySections.push('<!-- SECTION:PLAN:BEGIN -->');
  if (task.implementationPlan) {
    bodySections.push(escapeSectionMarkers(task.implementationPlan));
  }
  bodySections.push('<!-- SECTION:PLAN:END -->\n');

  // 4. Implementation Notes (si existen)
  if (task.implementationNotes) {
    bodySections.push('## Implementation Notes\n');
    bodySections.push('<!-- SECTION:NOTES:BEGIN -->');
    bodySections.push(escapeSectionMarkers(task.implementationNotes));
    bodySections.push('<!-- SECTION:NOTES:END -->\n');
  }

  // 5. Final Summary (si existe)
  if (task.finalSummary) {
    bodySections.push('## Final Summary\n');
    bodySections.push('<!-- SECTION:FINAL_SUMMARY:BEGIN -->');
    bodySections.push(escapeSectionMarkers(task.finalSummary));
    bodySections.push('<!-- SECTION:FINAL_SUMMARY:END -->\n');
  }

  return `${frontmatterLines.join('\n')}\n${bodySections.join('\n')}`;
}

/**
 * Genera el nombre estándar canónico de archivo para una tarea Backlog.md
 */
export function generateTaskFilename(id: string, title: string): string {
  const sanitizedId = (id || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/--+/g, '-')
    .trim()
    .toUpperCase();
  const cleanId = sanitizedId || 'TASK';

  let cleanTitle = (title || 'Task')
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\.\.+/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanTitle.length > 200) {
    cleanTitle = cleanTitle.slice(0, 200).trim();
  }

  return `${cleanId} - ${cleanTitle || 'Task'}.md`;
}

/**
 * Genera un archivo Markdown unificado consolidado (BACKLOG.md) a partir de una lista de tareas.
 */
export function generateMonolithicBacklogMd(projectName: string, items: BacklogMdTask[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# Backlog: ${projectName}`,
    `> Consolidado generado el ${now} por gripm`,
    '',
    '## Resumen de Estados',
    ''
  ];

  const statuses: CanonicalStatus[] = ['ideas', 'doing', 'blocked', 'review', 'ready', 'draft', 'done', 'dismissed', 'cancelled'];
  const grouped: Record<CanonicalStatus, BacklogMdTask[]> = {
    ideas: [],
    doing: [],
    blocked: [],
    review: [],
    ready: [],
    draft: [],
    done: [],
    dismissed: [],
    cancelled: []
  };

  for (const item of items) {
    const s = item.status || 'draft';
    if (grouped[s]) grouped[s].push(item);
    else grouped.draft.push(item);
  }

  for (const s of statuses) {
    const list = grouped[s];
    if (list.length === 0) continue;

    const titleMap: Record<string, string> = {
      ideas: '💡 Ideas / Discovery',
      doing: '⚡ In Progress / Doing',
      review: '🔍 Review & QA',
      ready: '🚀 Ready for Deploy',
      draft: '📋 Backlog / Draft',
      done: '✅ Done / Deployed',
      dismissed: '📦 Archivadas / Descartadas',
      cancelled: '🚫 Canceladas / Cancelled'
    };

    lines.push(`### ${titleMap[s] || s.toUpperCase()} (${list.length})`);
    lines.push('');

    for (const item of list) {
      lines.push(`#### [${item.id}] ${item.title}`);
      lines.push(`- **Prioridad**: \`${item.priority || 'p2'}\` | **Tipo**: \`${item.type || 'feature'}\``);
      if (item.milestone) lines.push(`- **Sprint / Milestone**: ${item.milestone}`);
      if (item.description) lines.push(`\n${item.description}\n`);

      if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0) {
        lines.push('**Criterios de Aceptación:**');
        item.acceptanceCriteria.forEach(ac => {
          lines.push(`- [${ac.checked ? 'x' : ' '}] #${ac.index} ${ac.text}`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}
