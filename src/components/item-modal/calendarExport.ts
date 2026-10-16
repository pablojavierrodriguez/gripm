import type { BacklogItem, AcceptanceCriterion, Sprint } from '../../types';

interface CalendarExportParams {
  item: BacklogItem | null;
  code: string;
  title: string;
  status: string;
  priority: string;
  sprint: string;
  description: string;
  acceptanceCriteriaList: AcceptanceCriterion[];
  sprints: Sprint[];
}

export function exportToGoogleCalendar({
  item,
  code,
  title,
  status,
  priority,
  sprint,
  description,
  acceptanceCriteriaList,
  sprints,
}: CalendarExportParams) {
  if (!item) return;
  const taskTitle = `[${item.code || code}] ${title}`;
  let desc = `Status: ${status} | Priority: ${priority}\n`;
  if (sprint) desc += `Sprint: ${sprint}\n`;
  if (description) desc += `\n${description}\n`;
  if (acceptanceCriteriaList.length > 0) {
    desc +=
      `\nCriterios de Aceptación:\n` +
      acceptanceCriteriaList.map((c) => `- [${c.checked ? 'x' : ' '}] ${c.text}`).join('\n');
  }

  const matchedSprint = sprints.find((s) => s.name === sprint);
  let datesParam = '';
  if (matchedSprint?.startDate && matchedSprint?.endDate) {
    const s = matchedSprint.startDate.replace(/-/g, '');
    const e = matchedSprint.endDate.replace(/-/g, '');
    datesParam = `&dates=${s}/${e}`;
  }

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    taskTitle
  )}&details=${encodeURIComponent(desc)}${datesParam}`;
  window.open(gcalUrl, '_blank', 'noopener,noreferrer');
}

export function downloadIcsFile({
  item,
  code,
  title,
  status,
  priority,
  sprint,
  description,
  acceptanceCriteriaList,
  sprints,
}: CalendarExportParams) {
  if (!item) return;
  const taskTitle = `[${item.code || code}] ${title}`;
  let desc = `Status: ${status} | Priority: ${priority}\\n`;
  if (sprint) desc += `Sprint: ${sprint}\\n`;
  if (description) desc += `\\n${description.replace(/\n/g, '\\n')}\\n`;
  if (acceptanceCriteriaList.length > 0) {
    desc +=
      `\\nCriterios de Aceptacion:\\n` +
      acceptanceCriteriaList.map((c) => `- [${c.checked ? 'x' : ' '}] ${c.text.replace(/\n/g, ' ')}`).join('\\n');
  }

  const matchedSprint = sprints.find((s) => s.name === sprint);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatIcsDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
      d.getUTCMinutes()
    )}${pad(d.getUTCSeconds())}Z`;

  let dtStart = formatIcsDate(new Date(now.getTime() + 24 * 3600 * 1000));
  let dtEnd = formatIcsDate(new Date(now.getTime() + 25 * 3600 * 1000));

  if (matchedSprint?.startDate) {
    const startParts = matchedSprint.startDate.split('-').map(Number);
    if (startParts.length === 3) {
      const sd = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 9, 0, 0));
      dtStart = formatIcsDate(sd);
      if (matchedSprint.endDate) {
        const endParts = matchedSprint.endDate.split('-').map(Number);
        if (endParts.length === 3) {
          const ed = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 18, 0, 0));
          dtEnd = formatIcsDate(ed);
        }
      }
    }
  }

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gripm//NONSGML Gripm Agile Board//EN',
    'BEGIN:VEVENT',
    `UID:${item.code || item.id || Date.now()}@gripm.local`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${taskTitle.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${desc}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.code || 'task'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
