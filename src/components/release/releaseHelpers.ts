import type { BacklogItem } from '../../types';

export const DEFAULT_PROJECT_ID = 'gripm';

export const resolveReleaseProjectId = (
  explicit: string | undefined,
  projectId: string,
  items: BacklogItem[]
): string => {
  if (explicit) return explicit;
  if (projectId !== 'all') return projectId;
  return items[0]?.projectId || DEFAULT_PROJECT_ID;
};

export const generateChangelogForTasks = (
  versionStr: string,
  titleStr: string,
  summaryStr: string,
  itemCodeList: string[],
  items: BacklogItem[],
  todayStr: string,
  t: (key: any, params?: any) => string
): string => {
  const selectedItems = items.filter((it) => itemCodeList.includes(it.code));
  const features = selectedItems.filter((i) => i.type === 'feature');
  const bugs = selectedItems.filter((i) => i.type === 'bug');
  const tech = selectedItems.filter((i) => i.type === 'tech_debt');
  const ux = selectedItems.filter((i) => i.type === 'ux');

  let md = `## [${versionStr}] - ${todayStr} 🚀 ${titleStr}\n\n`;
  md += `${t('release.changelogResumen')}\n*${summaryStr || t('release.changelogSummary')}*\n\n`;

  if (features.length > 0) {
    md += `${t('release.changelogFeatures')}\n`;
    features.forEach((item) => {
      md += `- **${item.title} (${item.code}):**\n`;
      const desc = item.description || item.title;
      md += `  - ${desc.split('\n')[0]}\n`;
    });
    md += `\n`;
  }

  if (bugs.length > 0) {
    md += `${t('release.changelogBugs')}\n`;
    bugs.forEach((item) => {
      md += `- **${item.title} (${item.code}):**\n`;
      if (item.impactedFile) {
        md += `  - ${t('release.changelogImpacted')}: \`${item.impactedFile}\`\n`;
      }
      if (item.fix) {
        md += `  - ${t('release.changelogFix')}: ${item.fix.split('\n')[0]}\n`;
      } else {
        md += `  - ${item.description.split('\n')[0]}\n`;
      }
    });
    md += `\n`;
  }

  if (tech.length > 0) {
    md += `${t('release.changelogTech')}\n`;
    tech.forEach((item) => {
      md += `- **${item.title} (${item.code}):**\n`;
      md += `  - ${item.description.split('\n')[0]}\n`;
    });
    md += `\n`;
  }

  if (ux.length > 0) {
    md += `${t('release.changelogUx')}\n`;
    ux.forEach((item) => {
      md += `- **${item.title} (${item.code}):**\n`;
      md += `  - ${item.description.split('\n')[0]}\n`;
    });
    md += `\n`;
  }

  return md;
};
