#!/usr/bin/env node

// scripts/gripm-cli.ts
import fs6 from "node:fs";
import path6 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { execSync as execSync2, execFileSync, spawnSync } from "node:child_process";

// scripts/backlogMdParser.ts
function normalizeStatus(raw) {
  if (!raw) return "draft";
  const clean = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  switch (clean) {
    case "ideas":
    case "idea":
    case "discovery":
      return "ideas";
    case "draft":
    case "drafts":
    case "backlog":
    case "todo":
    case "open":
      return "draft";
    case "doing":
    case "inprogress":
    case "wip":
    case "inprog":
    case "active":
    case "started":
      return "doing";
    case "blocked":
    case "impediment":
    case "block":
    case "hold":
    case "onhold":
      return "blocked";
    case "review":
    case "testing":
    case "testingqa":
    case "qa":
    case "test":
    case "inreview":
      return "review";
    case "ready":
    case "finish":
    case "readyfordeploy":
    case "staged":
    case "resolved":
      return "ready";
    case "done":
    case "deployed":
    case "closed":
    case "completed":
    case "shipped":
      return "done";
    case "dismissed":
    case "cancelled":
    case "canceled":
    case "abandoned":
    case "archived":
    case "archive":
      return "dismissed";
    default:
      return "draft";
  }
}
function formatStatusForMd(status) {
  const norm = normalizeStatus(status);
  switch (norm) {
    case "ideas":
      return "ideas";
    case "draft":
      return "draft";
    case "doing":
      return "doing";
    case "blocked":
      return "blocked";
    case "review":
      return "review";
    case "ready":
      return "ready";
    case "done":
      return "done";
    case "dismissed":
      return "dismissed";
    default:
      return "draft";
  }
}
function normalizePriority(raw) {
  if (!raw) return "p2";
  const clean = raw.trim().toLowerCase();
  if (clean === "p0" || clean === "urgent" || clean === "critical") return "p0";
  if (clean === "p1" || clean === "high") return "p1";
  if (clean === "p2" || clean === "medium" || clean === "med") return "p2";
  if (clean === "p3" || clean === "low") return "p3";
  return "p2";
}
function formatPriorityForMd(p) {
  if (p === "p0") return "urgent";
  if (p === "p1") return "high";
  if (p === "p2") return "medium";
  if (p === "p3") return "low";
  return p || "medium";
}
function normalizeType(raw) {
  if (!raw) return "feature";
  const clean = raw.trim().toLowerCase();
  if (clean === "bugfix" || clean === "defect" || clean === "fix") return "bug";
  return clean;
}
function escapeSectionMarkers(text) {
  if (!text) return text;
  return text.replace(/<!--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, "<!\\-- $1 -->");
}
function unescapeSectionMarkers(text) {
  if (!text) return text;
  return text.replace(/<!\\--\s*(\/?(?:AC|SECTION:[A-Za-z0-9_-]+):(BEGIN|END))\s*-->/gi, "<!-- $1 -->");
}
function getCodeFenceRanges(text) {
  const ranges = [];
  if (!text) return ranges;
  const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
  let match;
  let inFence = false;
  let fenceChar = "";
  let fenceLength = 0;
  let fenceStart = -1;
  while ((match = lineRegex.exec(text)) !== null) {
    const line = match[1];
    const lineStart = match.index;
    const lineEnd = match.index + match[0].length;
    if (match[0].length === 0 && lineStart >= text.length) {
      break;
    }
    if (!inFence) {
      const openMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})/);
      if (openMatch) {
        const char = openMatch[1][0];
        const restOfLine = line.slice(openMatch.index + openMatch[0].length);
        if (char === "`" && restOfLine.includes("`")) {
          continue;
        }
        inFence = true;
        fenceChar = char;
        fenceLength = openMatch[1].length;
        fenceStart = lineStart;
      }
    } else {
      const closeMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})\s*$/);
      if (closeMatch && closeMatch[1][0] === fenceChar && closeMatch[1].length >= fenceLength) {
        ranges.push({ start: fenceStart, end: lineEnd });
        inFence = false;
        fenceChar = "";
        fenceLength = 0;
        fenceStart = -1;
      }
    }
  }
  if (inFence && fenceStart !== -1) {
    ranges.push({ start: fenceStart, end: text.length });
  }
  return ranges;
}
function isOffsetInFence(offset, fenceRanges) {
  for (const range of fenceRanges) {
    if (offset >= range.start && offset < range.end) {
      return true;
    }
  }
  return false;
}
function extractMarkerContent(text, beginMarkerName, endMarkerName) {
  if (!text) return null;
  const fenceRanges = getCodeFenceRanges(text);
  const beginRegex = new RegExp(`<!--\\s*${beginMarkerName}\\s*-->`, "gi");
  const endRegex = new RegExp(`<!--\\s*${endMarkerName}\\s*-->`, "gi");
  let beginMatch = null;
  while ((beginMatch = beginRegex.exec(text)) !== null) {
    if (!isOffsetInFence(beginMatch.index, fenceRanges)) {
      break;
    }
  }
  if (!beginMatch) {
    return null;
  }
  const payloadStart = beginMatch.index + beginMatch[0].length;
  endRegex.lastIndex = payloadStart;
  let endMatch = null;
  while ((endMatch = endRegex.exec(text)) !== null) {
    if (!isOffsetInFence(endMatch.index, fenceRanges)) {
      break;
    }
  }
  if (!endMatch) {
    return text.slice(payloadStart);
  }
  return text.slice(payloadStart, endMatch.index);
}
function extractSectionBlock(body, headerName) {
  if (!body) return "";
  const fenceRanges = getCodeFenceRanges(body);
  const escapedHeader = headerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const targetHeaderRegex = new RegExp(`^[ ]{0,3}##\\s+${escapedHeader}\\b[^\r
]*`, "i");
  const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
  let match;
  let sectionFound = false;
  let startIndex = -1;
  let endIndex = body.length;
  while ((match = lineRegex.exec(body)) !== null) {
    const line = match[1];
    const lineStart = match.index;
    const lineEnd = match.index + match[0].length;
    if (match[0].length === 0 && lineStart >= body.length) {
      break;
    }
    if (!isOffsetInFence(lineStart, fenceRanges)) {
      const isH2 = /^[ ]{0,3}##\s+[^\r\n]*/.test(line);
      if (isH2) {
        if (!sectionFound) {
          if (targetHeaderRegex.test(line)) {
            sectionFound = true;
            startIndex = lineEnd;
          }
        } else {
          endIndex = lineStart;
          break;
        }
      }
    }
  }
  if (!sectionFound || startIndex === -1) {
    return "";
  }
  return body.slice(startIndex, endIndex);
}
function unquoteYamlScalar(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "	");
    }
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}
function cleanItem(val) {
  return unquoteYamlScalar(val);
}
function parseInlineList(raw) {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  const items = [];
  let currentToken = "";
  let inQuote = null;
  let escaped = false;
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (escaped) {
      currentToken += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      currentToken += char;
      continue;
    }
    if (inQuote) {
      currentToken += char;
      if (char === inQuote) {
        inQuote = null;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = char;
        currentToken += char;
      } else if (char === ",") {
        const item = cleanItem(currentToken);
        if (item) items.push(item);
        currentToken = "";
      } else {
        currentToken += char;
      }
    }
  }
  const lastItem = cleanItem(currentToken);
  if (lastItem) items.push(lastItem);
  return items;
}
function parseBacklogMd(content, defaultId = "") {
  const result = {
    id: defaultId,
    title: "Sin t\xEDtulo",
    status: "draft",
    type: "feature",
    priority: "p2",
    assignees: [],
    labels: [],
    dependencies: [],
    acceptanceCriteria: [],
    rawExtraFrontmatter: {}
  };
  if (!content) return result;
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 65279) {
    cleanContent = cleanContent.slice(1);
  }
  let bodyContent = cleanContent;
  const frontmatterMatch = cleanContent.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/);
  if (frontmatterMatch) {
    const rawFm = frontmatterMatch[1];
    bodyContent = frontmatterMatch[2] || "";
    const lines = rawFm.split(/\r?\n/);
    let currentKey = "";
    let currentList = [];
    let inList = false;
    const finalizeList = () => {
      if (inList && currentKey) {
        if (currentKey === "labels") result.labels = currentList;
        else if (currentKey === "assignee" || currentKey === "assignees") result.assignees = currentList;
        else if (currentKey === "dependencies") result.dependencies = currentList;
        else if (currentKey === "blocks") result.blocks = currentList;
        else if (currentKey === "blocked_by" || currentKey === "blockedby") result.blockedBy = currentList;
        else if (currentKey === "related_to" || currentKey === "relatedto") result.relatedTo = currentList;
        else if (currentKey === "sprints") {
          result.sprints = currentList;
          if (currentList.length > 0 && !result.sprint) {
            result.sprint = currentList[currentList.length - 1];
            result.targetSprint = currentList[currentList.length - 1];
          }
        } else if (currentKey === "releases" || currentKey === "release") result.releases = currentList;
        else {
          if (!result.rawExtraFrontmatter) result.rawExtraFrontmatter = {};
          result.rawExtraFrontmatter[currentKey] = currentList;
        }
      }
      inList = false;
      currentList = [];
    };
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("- ")) {
        const itemVal = unquoteYamlScalar(trimmed.replace(/^- /, ""));
        currentList.push(itemVal);
        continue;
      }
      if (inList && !line.startsWith(" ") && !line.startsWith("	")) {
        finalizeList();
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const rawKey = line.slice(0, colonIdx).trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(rawKey)) {
          continue;
        }
        const key = rawKey.toLowerCase();
        const rawVal = line.slice(colonIdx + 1).trim();
        const cleanVal = unquoteYamlScalar(rawVal);
        currentKey = key;
        if (!rawVal) {
          inList = true;
          currentList = [];
          continue;
        }
        if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
          const items = parseInlineList(rawVal);
          if (key === "labels") result.labels = items;
          else if (key === "assignee" || key === "assignees") result.assignees = items;
          else if (key === "dependencies") result.dependencies = items;
          else if (key === "blocks") result.blocks = items;
          else if (key === "blocked_by" || key === "blockedby") result.blockedBy = items;
          else if (key === "related_to" || key === "relatedto") result.relatedTo = items;
          else if (key === "sprints") {
            result.sprints = items;
            if (items.length > 0 && !result.sprint) {
              result.sprint = items[items.length - 1];
              result.targetSprint = items[items.length - 1];
            }
          } else if (key === "releases" || key === "release") result.releases = items;
          else {
            if (!result.rawExtraFrontmatter) result.rawExtraFrontmatter = {};
            result.rawExtraFrontmatter[key] = items;
          }
          continue;
        }
        switch (key) {
          case "id":
            result.id = cleanVal;
            break;
          case "title":
            result.title = cleanVal;
            break;
          case "status":
            result.rawStatus = cleanVal;
            result.status = normalizeStatus(cleanVal);
            break;
          case "type":
            result.type = normalizeType(cleanVal);
            break;
          case "priority":
            result.priority = cleanVal;
            break;
          case "milestone":
            result.milestone = cleanVal;
            break;
          case "module":
            result.module = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.module = cleanVal;
            break;
          case "epic":
            result.epic = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.epic = cleanVal;
            break;
          case "category":
            result.category = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.category = cleanVal;
            break;
          case "impactedfile":
            result.impactedFile = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.impactedFile = cleanVal;
            break;
          case "risk":
            result.risk = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.risk = cleanVal;
            break;
          case "fix":
            result.fix = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.fix = cleanVal;
            break;
          case "parent":
          case "parentid":
            result.parentId = cleanVal;
            break;
          case "blocks":
            result.blocks = [cleanVal];
            break;
          case "blocked_by":
          case "blockedby":
            result.blockedBy = [cleanVal];
            break;
          case "blocked_reason":
          case "blockedreason":
            result.blockedReason = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.blocked_reason = cleanVal;
            break;
          case "dismissed_reason":
          case "dismissedreason":
            result.dismissedReason = cleanVal;
            if (result.rawExtraFrontmatter) result.rawExtraFrontmatter.dismissed_reason = cleanVal;
            break;
          case "related_to":
          case "relatedto":
            result.relatedTo = [cleanVal];
            break;
          case "sprints":
            result.sprints = [cleanVal];
            break;
          case "releases":
            result.releases = [cleanVal];
            break;
          case "sprint":
          case "targetsprint":
            result.sprint = cleanVal;
            result.targetSprint = cleanVal;
            if (!result.sprints || result.sprints.length === 0) {
              result.sprints = [cleanVal];
            }
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.sprint = cleanVal;
              result.rawExtraFrontmatter.targetSprint = cleanVal;
            }
            break;
          case "release":
          case "targetrelease":
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.release = cleanVal;
              result.rawExtraFrontmatter.targetRelease = cleanVal;
            }
            break;
          case "created_date":
          case "createdat":
            result.createdDate = cleanVal;
            break;
          case "updated_date":
          case "updatedat":
            result.updatedDate = cleanVal;
            break;
          case "start_date":
          case "startdate":
            result.startDate = cleanVal;
            break;
          case "due_date":
          case "duedate":
          case "target_date":
          case "targetdate":
            result.dueDate = cleanVal;
            break;
          case "assignee":
            result.assignees = [cleanVal];
            break;
          case "isdeleted":
            result.isDeleted = cleanVal.toLowerCase() === "true";
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case "deletedat":
            result.deletedAt = cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case "previousstatus":
            result.previousStatus = cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
            }
            break;
          case "estimate":
          case "estimation":
          case "points":
          case "story_points":
          case "storypoints": {
            const num = Number(cleanVal);
            result.estimate = !isNaN(num) && cleanVal !== "" && !cleanVal.includes(" ") ? num : cleanVal;
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter.estimate = cleanVal;
            }
            break;
          }
          default:
            if (result.rawExtraFrontmatter) {
              if (rawVal === "true") {
                result.rawExtraFrontmatter[key] = true;
              } else if (rawVal === "false") {
                result.rawExtraFrontmatter[key] = false;
              } else if (/^-?\d+(?:\.\d+)?$/.test(rawVal)) {
                result.rawExtraFrontmatter[key] = Number(rawVal);
              } else {
                result.rawExtraFrontmatter[key] = cleanVal;
              }
            }
            break;
        }
      }
    }
    finalizeList();
    if (result.sprints && result.sprints.length > 0 && !result.sprint) {
      result.sprint = result.sprints[result.sprints.length - 1];
      result.targetSprint = result.sprint;
    }
  }
  const descBlock = extractSectionBlock(bodyContent, "Description");
  const descMarker = extractMarkerContent(descBlock || bodyContent, "SECTION:DESCRIPTION:BEGIN", "SECTION:DESCRIPTION:END");
  if (descMarker !== null) {
    result.description = unescapeSectionMarkers(descMarker.trim());
  } else if (descBlock) {
    result.description = unescapeSectionMarkers(descBlock.trim());
  }
  const acBlock = extractSectionBlock(bodyContent, "Acceptance Criteria");
  const acMarker = extractMarkerContent(acBlock || bodyContent, "AC:BEGIN", "AC:END");
  let acText = "";
  if (acMarker !== null) {
    acText = acMarker;
  } else if (acBlock) {
    acText = acBlock;
  }
  if (acText) {
    const acFenceRanges = getCodeFenceRanges(acText);
    const lineRegex = /([^\r\n]*)(\r?\n|$)/g;
    let match;
    const parsedAC = [];
    let autoIndex = 1;
    while ((match = lineRegex.exec(acText)) !== null) {
      const line = match[1];
      const lineStart = match.index;
      if (match[0].length === 0 && lineStart >= acText.length) break;
      if (!isOffsetInFence(lineStart, acFenceRanges)) {
        const itemMatch = line.match(/^-\s*\[([ xX])\]\s*(?:#(\d+)\s+)?(.*)$/);
        if (itemMatch) {
          const checked = itemMatch[1].toLowerCase() === "x";
          const num = itemMatch[2] ? parseInt(itemMatch[2], 10) : autoIndex++;
          const text = unescapeSectionMarkers(itemMatch[3].trim());
          parsedAC.push({ index: num, text, checked });
        }
      }
    }
    result.acceptanceCriteria = parsedAC;
  }
  const planBlock = extractSectionBlock(bodyContent, "Implementation Plan");
  const planMarker = extractMarkerContent(planBlock || bodyContent, "SECTION:PLAN:BEGIN", "SECTION:PLAN:END");
  if (planMarker !== null) {
    result.implementationPlan = unescapeSectionMarkers(planMarker.trim());
  } else if (planBlock) {
    result.implementationPlan = unescapeSectionMarkers(planBlock.trim());
  }
  const notesBlock = extractSectionBlock(bodyContent, "Implementation Notes");
  const notesMarker = extractMarkerContent(notesBlock || bodyContent, "SECTION:NOTES:BEGIN", "SECTION:NOTES:END");
  if (notesMarker !== null) {
    result.implementationNotes = unescapeSectionMarkers(notesMarker.trim());
  } else if (notesBlock) {
    result.implementationNotes = unescapeSectionMarkers(notesBlock.trim());
  }
  const summaryBlock = extractSectionBlock(bodyContent, "Final Summary");
  const summaryMarker = extractMarkerContent(summaryBlock || bodyContent, "SECTION:FINAL_SUMMARY:BEGIN", "SECTION:FINAL_SUMMARY:END");
  if (summaryMarker !== null) {
    result.finalSummary = unescapeSectionMarkers(summaryMarker.trim());
  } else if (summaryBlock) {
    result.finalSummary = unescapeSectionMarkers(summaryBlock.trim());
  }
  return result;
}
function serializeBacklogMd(task) {
  const frontmatterLines = ["---"];
  const cleanId = (task.id || "").replace(/[\r\n]+/g, "").trim();
  frontmatterLines.push(`id: ${cleanId}`);
  frontmatterLines.push(`title: ${JSON.stringify(task.title || "Sin t\xEDtulo")}`);
  frontmatterLines.push(`status: ${formatStatusForMd(task.status)}`);
  if (task.assignees && task.assignees.length > 0) {
    frontmatterLines.push("assignee:");
    task.assignees.forEach((a) => frontmatterLines.push(`  - ${JSON.stringify(a)}`));
  }
  const nowStr = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
  const cleanCreated = (task.createdDate || nowStr).replace(/[\r\n']+/g, "").trim();
  const cleanUpdated = (task.updatedDate || nowStr).replace(/[\r\n']+/g, "").trim();
  frontmatterLines.push(`created_date: '${cleanCreated}'`);
  frontmatterLines.push(`updated_date: '${cleanUpdated}'`);
  if (task.labels && task.labels.length > 0) {
    frontmatterLines.push("labels:");
    task.labels.forEach((l) => frontmatterLines.push(`  - ${JSON.stringify(l)}`));
  } else {
    frontmatterLines.push("labels: []");
  }
  if (task.dependencies && task.dependencies.length > 0) {
    frontmatterLines.push("dependencies:");
    task.dependencies.forEach((d) => frontmatterLines.push(`  - ${JSON.stringify(d)}`));
  } else {
    frontmatterLines.push("dependencies: []");
  }
  frontmatterLines.push(`priority: ${formatPriorityForMd(task.priority || "p2")}`);
  if (task.type) {
    const cleanType = String(task.type).replace(/[\r\n]+/g, "").trim();
    if (/^[a-zA-Z0-9_-]+$/.test(cleanType)) {
      frontmatterLines.push(`type: ${cleanType}`);
    } else {
      frontmatterLines.push(`type: ${JSON.stringify(cleanType)}`);
    }
  }
  if (task.milestone) {
    frontmatterLines.push(`milestone: ${JSON.stringify(task.milestone)}`);
  }
  if (task.parentId) {
    frontmatterLines.push(`parent: ${JSON.stringify(task.parentId)}`);
  }
  if (task.blocks && task.blocks.length > 0) {
    frontmatterLines.push("blocks:");
    task.blocks.forEach((b) => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }
  if (task.blockedBy && task.blockedBy.length > 0) {
    frontmatterLines.push("blocked_by:");
    task.blockedBy.forEach((b) => frontmatterLines.push(`  - ${JSON.stringify(b)}`));
  }
  if (task.blockedReason) {
    frontmatterLines.push(`blocked_reason: ${JSON.stringify(task.blockedReason)}`);
  }
  if (task.dismissedReason) {
    frontmatterLines.push(`dismissed_reason: ${JSON.stringify(task.dismissedReason)}`);
  }
  if (task.relatedTo && task.relatedTo.length > 0) {
    frontmatterLines.push("related_to:");
    task.relatedTo.forEach((r) => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }
  const isInvalidSprint = (s) => {
    if (!s) return true;
    const clean = s.trim().toLowerCase();
    return clean === "backlog-futuro" || clean === "sin-sprint" || clean === "sin sprint" || clean === "backlog" || clean === "none" || clean === "null";
  };
  if (task.sprints && task.sprints.length > 0) {
    const validSprints = task.sprints.filter((s) => !isInvalidSprint(s));
    if (validSprints.length > 0) {
      frontmatterLines.push("sprints:");
      validSprints.forEach((s) => frontmatterLines.push(`  - ${JSON.stringify(s)}`));
    }
  }
  if (task.releases && task.releases.length > 0) {
    frontmatterLines.push("releases:");
    task.releases.forEach((r) => frontmatterLines.push(`  - ${JSON.stringify(r)}`));
  }
  if (task.sprint && !isInvalidSprint(task.sprint)) {
    frontmatterLines.push(`sprint: ${JSON.stringify(task.sprint)}`);
  }
  if (task.targetSprint && task.targetSprint !== task.sprint && !isInvalidSprint(task.targetSprint)) {
    frontmatterLines.push(`targetSprint: ${JSON.stringify(task.targetSprint)}`);
  }
  if (task.isDeleted) {
    frontmatterLines.push("isDeleted: true");
    if (task.deletedAt) {
      frontmatterLines.push(`deletedAt: ${JSON.stringify(task.deletedAt)}`);
    }
    if (task.previousStatus) {
      frontmatterLines.push(`previousStatus: ${JSON.stringify(task.previousStatus)}`);
    }
  }
  if (task.estimate !== void 0 && task.estimate !== null && task.estimate !== "") {
    if (typeof task.estimate === "number") {
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
  if (task.rawExtraFrontmatter) {
    for (const [k, v] of Object.entries(task.rawExtraFrontmatter)) {
      if (!/^[a-zA-Z0-9_-]+$/.test(k)) {
        continue;
      }
      if (!["id", "title", "status", "assignee", "assignees", "created_date", "updated_date", "labels", "dependencies", "priority", "type", "milestone", "parent", "parentid", "blocks", "blocked_by", "blockedby", "blocked_reason", "blockedreason", "dismissed_reason", "dismissedreason", "related_to", "relatedto", "sprints", "releases", "sprint", "targetsprint", "isdeleted", "deletedat", "previousstatus", "estimate", "estimation", "points", "story_points", "storypoints", "start_date", "startdate", "due_date", "duedate", "target_date", "targetdate"].includes(k.toLowerCase())) {
        if (v === void 0 || v === null) {
          continue;
        }
        if (Array.isArray(v)) {
          if (v.length === 0) {
            frontmatterLines.push(`${k}: []`);
          } else {
            frontmatterLines.push(`${k}:`);
            v.forEach((item) => frontmatterLines.push(`  - ${JSON.stringify(item)}`));
          }
        } else if (typeof v === "number" || typeof v === "boolean") {
          frontmatterLines.push(`${k}: ${v}`);
        } else {
          frontmatterLines.push(`${k}: ${JSON.stringify(v)}`);
        }
      }
    }
  }
  frontmatterLines.push("---");
  frontmatterLines.push("");
  const bodySections = [];
  bodySections.push("## Description\n");
  bodySections.push("<!-- SECTION:DESCRIPTION:BEGIN -->");
  bodySections.push(escapeSectionMarkers(task.description || ""));
  bodySections.push("<!-- SECTION:DESCRIPTION:END -->\n");
  bodySections.push("## Acceptance Criteria\n");
  bodySections.push("<!-- AC:BEGIN -->");
  if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
    task.acceptanceCriteria.forEach((ac, i) => {
      const idx = ac.index || i + 1;
      const mark = ac.checked ? "x" : " ";
      bodySections.push(`- [${mark}] #${idx} ${escapeSectionMarkers(ac.text)}`);
    });
  }
  bodySections.push("<!-- AC:END -->\n");
  bodySections.push("## Implementation Plan\n");
  bodySections.push("<!-- SECTION:PLAN:BEGIN -->");
  if (task.implementationPlan) {
    bodySections.push(escapeSectionMarkers(task.implementationPlan));
  }
  bodySections.push("<!-- SECTION:PLAN:END -->\n");
  if (task.implementationNotes) {
    bodySections.push("## Implementation Notes\n");
    bodySections.push("<!-- SECTION:NOTES:BEGIN -->");
    bodySections.push(escapeSectionMarkers(task.implementationNotes));
    bodySections.push("<!-- SECTION:NOTES:END -->\n");
  }
  if (task.finalSummary) {
    bodySections.push("## Final Summary\n");
    bodySections.push("<!-- SECTION:FINAL_SUMMARY:BEGIN -->");
    bodySections.push(escapeSectionMarkers(task.finalSummary));
    bodySections.push("<!-- SECTION:FINAL_SUMMARY:END -->\n");
  }
  return `${frontmatterLines.join("\n")}
${bodySections.join("\n")}`;
}
function generateTaskFilename(id, title) {
  const sanitizedId = (id || "").replace(/[^a-zA-Z0-9_-]/g, "").replace(/--+/g, "-").trim().toUpperCase();
  const cleanId = sanitizedId || "TASK";
  let cleanTitle = (title || "Task").replace(/[/\\:*?"<>|]/g, "").replace(/\.\.+/g, "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleanTitle.length > 200) {
    cleanTitle = cleanTitle.slice(0, 200).trim();
  }
  return `${cleanId} - ${cleanTitle || "Task"}.md`;
}
function generateMonolithicBacklogMd(projectName, items) {
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const lines = [
    `# Backlog: ${projectName}`,
    `> Consolidado generado el ${now} por gripm`,
    "",
    "## Resumen de Estados",
    ""
  ];
  const statuses = ["ideas", "doing", "blocked", "review", "ready", "draft", "done", "dismissed", "cancelled"];
  const grouped = {
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
    const s = item.status || "draft";
    if (grouped[s]) grouped[s].push(item);
    else grouped.draft.push(item);
  }
  for (const s of statuses) {
    const list = grouped[s];
    if (list.length === 0) continue;
    const titleMap = {
      ideas: "\u{1F4A1} Ideas / Discovery",
      doing: "\u26A1 In Progress / Doing",
      review: "\u{1F50D} Review & QA",
      ready: "\u{1F680} Ready for Deploy",
      draft: "\u{1F4CB} Backlog / Draft",
      done: "\u2705 Done / Deployed",
      dismissed: "\u{1F4E6} Archivadas / Descartadas",
      cancelled: "\u{1F6AB} Canceladas / Cancelled"
    };
    lines.push(`### ${titleMap[s] || s.toUpperCase()} (${list.length})`);
    lines.push("");
    for (const item of list) {
      lines.push(`#### [${item.id}] ${item.title}`);
      lines.push(`- **Prioridad**: \`${item.priority || "p2"}\` | **Tipo**: \`${item.type || "feature"}\``);
      if (item.milestone) lines.push(`- **Sprint / Milestone**: ${item.milestone}`);
      if (item.description) lines.push(`
${item.description}
`);
      if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0) {
        lines.push("**Criterios de Aceptaci\xF3n:**");
        item.acceptanceCriteria.forEach((ac) => {
          lines.push(`- [${ac.checked ? "x" : " "}] #${ac.index} ${ac.text}`);
        });
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    }
  }
  return lines.join("\n");
}

// scripts/registryConfig.js
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DEFAULT_PKG_ROOT = path.resolve(__dirname, "..");
function getGripmHomeDir() {
  if (process.env.GRIPM_HOME) {
    return path.resolve(process.env.GRIPM_HOME);
  }
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, "gripm");
  }
  return path.join(os.homedir(), ".gripm");
}
function getRegistryPath(pkgRoot = DEFAULT_PKG_ROOT) {
  if (process.env.GRIPM_REGISTRY_PATH) {
    return path.resolve(process.env.GRIPM_REGISTRY_PATH);
  }
  return path.join(getGripmHomeDir(), "registry.json");
}
function loadRegistryFile(pkgRoot = DEFAULT_PKG_ROOT) {
  const primaryPath = getRegistryPath(pkgRoot);
  try {
    if (primaryPath && fs.existsSync(primaryPath)) {
      const content = fs.readFileSync(primaryPath, "utf8");
      const data = JSON.parse(content);
      if (data && Array.isArray(data.projects) && data.projects.length > 0) {
        return data;
      }
    }
  } catch {
  }
  return { activeProjectId: "", projects: [] };
}
function resolveProjectIdentity(repoPath) {
  const normalized = path.resolve(repoPath);
  let name = "";
  let explicitId = null;
  let codePrefix = "";
  const gripmCfgPath = path.join(normalized, ".gripm", "config.json");
  if (fs.existsSync(gripmCfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(gripmCfgPath, "utf8"));
      if (cfg.projectName || cfg.name) {
        name = cfg.projectName || cfg.name;
      }
      if (cfg.projectId || cfg.id) {
        explicitId = cfg.projectId || cfg.id;
      }
      if (cfg.codePrefix) {
        codePrefix = cfg.codePrefix;
      }
    } catch {
    }
  }
  if (!name) {
    const pkgJsonPath = path.join(normalized, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const pkgName = pkg.productName || pkg.displayName || pkg.name;
        if (pkgName) {
          name = pkgName;
          if (!codePrefix) {
            codePrefix = (pkg.codePrefix || pkgName.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 4)).toUpperCase();
          }
        }
      } catch {
      }
    }
  }
  if (!name) {
    name = path.basename(normalized);
  }
  if (!codePrefix) {
    codePrefix = name.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "PROJ";
  }
  const id = explicitId || name.toLowerCase().replace(/^@[^/]+\//, "").replace(/[^a-z0-9_-]/g, "-");
  return {
    id,
    name,
    codePrefix
  };
}

// server/services/backlogService.ts
import fs5 from "node:fs";
import path5 from "node:path";
import { execSync } from "node:child_process";

// server/services/registry.ts
import fs3 from "node:fs";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// server/services/atomicWrite.ts
import fs2 from "node:fs";
import path2 from "node:path";
function parseOptions(options) {
  let encoding = "utf8";
  let mode = void 0;
  if (typeof options === "string") {
    encoding = options;
  } else if (options && typeof options === "object") {
    if ("encoding" in options && options.encoding) {
      encoding = options.encoding;
    }
    if ("mode" in options && typeof options.mode === "number") {
      mode = options.mode;
    }
  }
  return { encoding, mode };
}
function atomicWriteFileSync(filePath, content, options) {
  const resolvedPath = path2.resolve(filePath);
  const dir = path2.dirname(resolvedPath);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  const { encoding, mode } = parseOptions(options);
  const tempPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  let fd;
  let renamed = false;
  try {
    fd = fs2.openSync(tempPath, "w", mode);
    if (typeof content === "string") {
      fs2.writeFileSync(fd, content, { encoding });
    } else {
      fs2.writeFileSync(fd, content);
    }
    fs2.fsyncSync(fd);
    fs2.closeSync(fd);
    fd = void 0;
    let attempts = 0;
    while (!renamed) {
      try {
        fs2.renameSync(tempPath, resolvedPath);
        renamed = true;
      } catch (renameErr) {
        attempts++;
        if ((renameErr.code === "EPERM" || renameErr.code === "EACCES" || renameErr.code === "EBUSY") && attempts <= 5) {
          const end = Date.now() + 10;
          while (Date.now() < end) {
          }
          continue;
        }
        throw renameErr;
      }
    }
  } finally {
    if (fd !== void 0) {
      try {
        fs2.closeSync(fd);
      } catch {
      }
    }
    if (!renamed && fs2.existsSync(tempPath)) {
      try {
        fs2.unlinkSync(tempPath);
      } catch {
      }
    }
  }
}

// server/services/registry.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var PKG_ROOT = path3.resolve(__dirname2, "../../");
var DEMO_FILE = fs3.existsSync(path3.resolve(PKG_ROOT, "data/demo-backlog.json")) ? path3.resolve(PKG_ROOT, "data/demo-backlog.json") : path3.resolve(PKG_ROOT, "src/data/demo-backlog.json");
function detectProjectStorage(repoPath) {
  if (!repoPath) return { storageType: "json", backlogDir: "backlog" };
  const normalized = path3.normalize(repoPath.trim());
  try {
    if (fs3.existsSync(path3.join(normalized, "backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs3.existsSync(path3.join(normalized, ".backlog", "tasks"))) {
      return { storageType: "markdown", backlogDir: ".backlog" };
    }
    if (fs3.existsSync(path3.join(normalized, "backlog"))) {
      return { storageType: "markdown", backlogDir: "backlog" };
    }
    if (fs3.existsSync(path3.join(normalized, ".backlog"))) {
      return { storageType: "markdown", backlogDir: ".backlog" };
    }
  } catch {
  }
  return { storageType: "json", backlogDir: "backlog" };
}
function isBacklogMdProject(project) {
  if (project.isDemo) return false;
  if (project.storageType === "markdown") return true;
  if (project.storageType === "json") return false;
  if (project.repoPath) {
    return detectProjectStorage(project.repoPath).storageType === "markdown";
  }
  return false;
}

// server/utils/fs-lock.ts
import fs4 from "node:fs";
import path4 from "node:path";
function getLockFilePath(targetPath) {
  const resolved = path4.resolve(targetPath);
  return resolved.endsWith(".lock") ? resolved : `${resolved}.lock`;
}
function sleepSync(ms) {
  if (ms <= 0) return;
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) {
    }
  }
}
function calculateNextDelay(currentDelay, maxDelay) {
  const jitter = 0.8 + Math.random() * 0.4;
  const next = Math.min(Math.round(currentDelay * 1.5 * jitter), maxDelay);
  return Math.max(10, next);
}
function checkAndCleanStaleLock(lockFilePath, staleTimeoutMs) {
  try {
    const stat = fs4.statSync(lockFilePath);
    const age = Date.now() - stat.mtimeMs;
    let isStale = age > staleTimeoutMs;
    if (!isStale) {
      try {
        const content = fs4.readFileSync(lockFilePath, "utf8");
        const payload = JSON.parse(content);
        if (typeof payload.expiresAt === "number" && Date.now() > payload.expiresAt) {
          isStale = true;
        }
      } catch {
      }
    }
    if (isStale) {
      try {
        fs4.unlinkSync(lockFilePath);
        return true;
      } catch {
      }
    }
  } catch (statErr) {
    const err = statErr;
    if (err && err.code === "ENOENT") {
      return true;
    }
  }
  return false;
}
function acquireLockSync(targetPath, options) {
  const lockFilePath = getLockFilePath(targetPath);
  const timeoutMs = options?.timeoutMs ?? 1e4;
  const minDelay = options?.minRetryDelayMs ?? 25;
  const maxDelay = options?.maxRetryDelayMs ?? 250;
  const staleTimeoutMs = options?.staleTimeoutMs ?? 5e3;
  const dir = path4.dirname(lockFilePath);
  if (!fs4.existsSync(dir)) {
    fs4.mkdirSync(dir, { recursive: true });
  }
  const startTime = Date.now();
  let currentDelay = minDelay;
  while (true) {
    try {
      const fd = fs4.openSync(lockFilePath, "wx");
      const payload = {
        pid: process.pid,
        createdAt: Date.now(),
        expiresAt: Date.now() + staleTimeoutMs,
        metadata: options?.metadata
      };
      try {
        fs4.writeFileSync(fd, JSON.stringify(payload), "utf8");
      } finally {
        try {
          fs4.closeSync(fd);
        } catch {
        }
      }
      return {
        lockPath: lockFilePath,
        targetPath: path4.resolve(targetPath),
        acquiredAt: Date.now(),
        release: () => releaseLockSync(lockFilePath)
      };
    } catch (openErr) {
      const err = openErr;
      if (err && err.code === "EEXIST") {
        const cleaned = checkAndCleanStaleLock(lockFilePath, staleTimeoutMs);
        if (cleaned) {
          continue;
        }
        if (Date.now() - startTime >= timeoutMs) {
          throw new Error(`[fs-lock] Excedido timeout de ${timeoutMs}ms intentando adquirir lock: ${lockFilePath}`);
        }
        sleepSync(currentDelay);
        currentDelay = calculateNextDelay(currentDelay, maxDelay);
        continue;
      }
      throw openErr;
    }
  }
}
function releaseLockSync(targetPath) {
  const lockFilePath = getLockFilePath(targetPath);
  try {
    if (fs4.existsSync(lockFilePath)) {
      fs4.unlinkSync(lockFilePath);
    }
  } catch (unlinkErr) {
    const err = unlinkErr;
    if (err && err.code !== "ENOENT") {
    }
  }
}
function withFileLockSync(targetPath, fn, options) {
  const handle = acquireLockSync(targetPath, options);
  try {
    return fn();
  } finally {
    handle.release();
  }
}

// server/services/backlogService.ts
var ConflictError = class _ConflictError extends Error {
  conflict = true;
  currentMtime;
  currentItem;
  constructor(message, currentMtime, currentItem) {
    super(message);
    this.name = "ConflictError";
    this.currentMtime = currentMtime;
    this.currentItem = currentItem;
    Object.setPrototypeOf(this, _ConflictError.prototype);
  }
};
var DEMO_FILE2 = fs5.existsSync(path5.resolve(PKG_ROOT, "data/demo-backlog.json")) ? path5.resolve(PKG_ROOT, "data/demo-backlog.json") : path5.resolve(PKG_ROOT, "src/data/demo-backlog.json");
function resolveJsonBacklogPath(project) {
  if (project.isDemo) return DEMO_FILE2;
  if (project.repoPath) {
    return path5.join(project.repoPath, ".gripm/backlog.json");
  }
  return path5.join(PKG_ROOT, `data/${project.id}-backlog.json`);
}
function getProjectTasksDir(project) {
  if (!project.repoPath) return "";
  return path5.join(project.repoPath, project.backlogDir || "backlog", "tasks");
}
function getProjectSprintsPath(project) {
  if (!project.repoPath) return "";
  return path5.join(project.repoPath, project.backlogDir || "backlog", "sprints.json");
}
function getProjectReleasesPath(project) {
  if (!project.repoPath) return "";
  return path5.join(project.repoPath, project.backlogDir || "backlog", "releases.json");
}
function getProjectRetrospectivesPath(project) {
  if (!project.repoPath) return "";
  return path5.join(project.repoPath, project.backlogDir || "backlog", "retrospectives.json");
}
function getProjectTaskAllocationLockPath(project) {
  if (project.repoPath) {
    const baseDir = path5.join(project.repoPath, project.backlogDir || "backlog");
    return path5.join(baseDir, ".task-allocation.lock");
  }
  return path5.join(PKG_ROOT, `data/.${project.id}-task-allocation.lock`);
}
function validateVerifyCommand(cmd, repoPath) {
  if (!cmd || typeof cmd !== "string") {
    return { valid: false, reason: "El comando de verificaci\xF3n debe ser un texto no vac\xEDo." };
  }
  const trimmed = cmd.trim();
  if (!trimmed) {
    return { valid: false, reason: "El comando de verificaci\xF3n no puede estar vac\xEDo." };
  }
  const forbiddenChars = /[|&;`$()<>\n\r'"]/;
  if (forbiddenChars.test(trimmed)) {
    return {
      valid: false,
      reason: "Contiene metacaracteres o secuencias de encadenamiento de shell no permitidas ('|', '&', ';', '`', '$()', '<', '>', comillas)."
    };
  }
  const tokens = trimmed.split(/\s+/);
  const runner = tokens[0].toLowerCase();
  const tokenPattern = /^[a-zA-Z0-9_\-.:/\\=]+$/;
  for (const token of tokens) {
    if (!tokenPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' contiene caracteres no permitidos. Solo se permiten caracteres alfanum\xE9ricos y separadores est\xE1ndar (- _ . : / \\ =).`
      };
    }
  }
  const forbiddenFlagPattern = /^(--prefix|--config|-c|--script-shell|--eval|-e|--import|--loader)(?:=.*)?$/i;
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (forbiddenFlagPattern.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no est\xE1 permitido por el Gatekeeper (flags de configuraci\xF3n/evasi\xF3n prohibidas).`
      };
    }
    if (token.includes("..")) {
      return {
        valid: false,
        reason: `El argumento '${token}' no est\xE1 permitido por el Gatekeeper (secuencias relativas '..' prohibidas).`
      };
    }
    if (token.startsWith("/") || token.startsWith("\\") || /^[a-zA-Z]:[/\\]/.test(token)) {
      return {
        valid: false,
        reason: `El argumento '${token}' no est\xE1 permitido por el Gatekeeper (rutas absolutas prohibidas).`
      };
    }
  }
  let pkgScripts = {};
  let pkgDeps = /* @__PURE__ */ new Set();
  try {
    const pkgPath = path5.join(repoPath, "package.json");
    if (fs5.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs5.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts && typeof pkg.scripts === "object") {
        pkgScripts = pkg.scripts;
      }
      if (pkg.dependencies && typeof pkg.dependencies === "object") {
        Object.keys(pkg.dependencies).forEach((d) => pkgDeps.add(d));
      }
      if (pkg.devDependencies && typeof pkg.devDependencies === "object") {
        Object.keys(pkg.devDependencies).forEach((d) => pkgDeps.add(d));
      }
    }
  } catch {
  }
  if (["npm", "pnpm", "yarn"].includes(runner)) {
    const subCmd = tokens[1];
    if (!subCmd) {
      return {
        valid: false,
        reason: `Debe especificar un subcomando para ${runner} (ej: '${runner} test' o '${runner} run <script>').`
      };
    }
    if (subCmd === "test" || subCmd === "t") {
      if (!pkgScripts["test"]) {
        return {
          valid: false,
          reason: `El script 'test' no est\xE1 definido en el package.json de '${repoPath}'.`
        };
      }
      return { valid: true, command: trimmed };
    }
    if (subCmd === "run") {
      const scriptName = tokens[2];
      if (!scriptName) {
        return {
          valid: false,
          reason: `Debe especificar el nombre del script a ejecutar (ej: '${runner} run <script>').`
        };
      }
      if (!pkgScripts[scriptName]) {
        return {
          valid: false,
          reason: `El script '${scriptName}' no est\xE1 definido en los scripts de package.json.`
        };
      }
      return { valid: true, command: trimmed };
    }
    if ((runner === "yarn" || runner === "pnpm") && pkgScripts[subCmd]) {
      return { valid: true, command: trimmed };
    }
    return {
      valid: false,
      reason: `Subcomando '${subCmd}' no autorizado para ${runner}. Solo se permiten '${runner} test' o '${runner} run <script>'.`
    };
  }
  if (runner === "npx") {
    const tool = tokens[1];
    if (!tool) {
      return {
        valid: false,
        reason: "Debe especificar la herramienta a ejecutar con npx (ej: 'npx tsc --noEmit')."
      };
    }
    const safeToolsAllowlist = /* @__PURE__ */ new Set([
      "tsc",
      "eslint",
      "vitest",
      "jest",
      "playwright",
      "prettier",
      "biome"
    ]);
    if (!safeToolsAllowlist.has(tool) && !pkgDeps.has(tool)) {
      return {
        valid: false,
        reason: `La herramienta '${tool}' no est\xE1 permitida para ejecuci\xF3n con npx. Solo se permiten herramientas del stack de calidad (${Array.from(safeToolsAllowlist).join(", ")}) o dependencias declaradas en package.json.`
      };
    }
    return { valid: true, command: trimmed };
  }
  return {
    valid: false,
    reason: `El ejecutable '${runner}' no est\xE1 permitido en verifyCommand. Solo se permiten scripts de package.json ('npm test', 'npm run <script>') o herramientas de verificaci\xF3n ('npx <herramienta>').`
  };
}
function validateGatekeeperTransition(task, targetStatus, options, repoPath) {
  const normTarget = normalizeStatus(targetStatus);
  const isTransitionToTerminal = normTarget === "ready" || normTarget === "done";
  if (!options?.force && isTransitionToTerminal) {
    const acs = task.acceptanceCriteriaList || task.acceptanceCriteria || [];
    const unchecked = acs.filter((ac) => !ac.checked);
    if (unchecked.length > 0) {
      const taskId = task.code || task.id || "unknown";
      const uncheckedList = unchecked.map((ac) => ` - [ ] #${ac.index} ${ac.text}`).join("\n");
      throw new Error(
        `[MCP Gatekeeper] Transition rejected: Cannot move task '${taskId}' to '${normTarget}' because it has ${unchecked.length} uncompleted acceptance criteria:
${uncheckedList}

Corrective action: Complete the implementation of each pending criterion and mark it as completed (- [x]) before certifying the task as '${normTarget}'.`
      );
    }
    const verifyCmd = options?.verifyCommand;
    if (verifyCmd && typeof verifyCmd === "string") {
      const execCwd = repoPath || process.cwd();
      const validation = validateVerifyCommand(verifyCmd, execCwd);
      if (!validation.valid) {
        throw new Error(
          `[MCP Gatekeeper Security] Transition rejected: Verification command '${verifyCmd}' is not permitted when attempting to move '${task.code || task.id}' to '${normTarget}':
${validation.reason}

Corrective action: Use only scripts defined in package.json (e.g. 'npm test', 'npm run <script>') or authorized tools ('npx tsc --noEmit').`
        );
      }
      try {
        execSync(validation.command || verifyCmd, {
          cwd: execCwd,
          stdio: "pipe",
          encoding: "utf8",
          timeout: 15e3
        });
      } catch (execErr) {
        const outMsg = (execErr.stderr || execErr.stdout || execErr.message || "").toString().trim();
        throw new Error(
          `[MCP Gatekeeper] Transition rejected: Verification command '${verifyCmd}' failed when attempting to move '${task.code || task.id}' to '${normTarget}':
${outMsg}

Corrective action: Check the verification script errors, fix the issues, and retry certifying the task.`
        );
      }
    }
  }
}
function resolveLegibleSprint(project, val) {
  if (!val) return void 0;
  const clean = String(val).trim();
  if (!clean) return void 0;
  const lower = clean.toLowerCase();
  if (lower === "backlog-futuro" || lower === "backlog" || lower === "sin sprint" || lower === "sin-sprint" || lower === "none" || lower === "null") {
    return void 0;
  }
  if (!project.repoPath) return clean;
  const sprintsPath = getProjectSprintsPath(project);
  if (fs5.existsSync(sprintsPath)) {
    try {
      const registeredSprints = JSON.parse(fs5.readFileSync(sprintsPath, "utf8"));
      if (Array.isArray(registeredSprints) && registeredSprints.length > 0) {
        const matched = registeredSprints.find(
          (s) => s.id && s.id.toLowerCase() === lower || s.name && s.name.trim().toLowerCase() === lower
        );
        if (matched) {
          return matched.name || clean;
        }
      }
    } catch {
    }
  }
  if (lower.startsWith("sprint-") || lower.includes("backlog-futuro")) {
    return void 0;
  }
  return clean;
}
function parseReleaseNotesMd(repoPath, projectPrefix, knownItems = []) {
  if (!repoPath) return [];
  const possiblePaths = [
    path5.join(repoPath, "docs/RELEASE_NOTES.md"),
    path5.join(repoPath, "docs/releasenotes.md"),
    path5.join(repoPath, "RELEASE_NOTES.md"),
    path5.join(repoPath, "releasenotes.md"),
    path5.join(repoPath, "docs/CHANGELOG.md"),
    path5.join(repoPath, "CHANGELOG.md"),
    path5.join(repoPath, "changelog.md")
  ];
  let notesContent = "";
  for (const p of possiblePaths) {
    if (fs5.existsSync(p)) {
      try {
        notesContent = fs5.readFileSync(p, "utf8");
        break;
      } catch {
      }
    }
  }
  if (!notesContent.trim()) return [];
  const knownCodeSet = new Set(knownItems.map((it) => (it.code || it.id || "").toUpperCase()).filter(Boolean));
  const prefixUpper = (projectPrefix || "").toUpperCase().trim();
  const sections = notesContent.split(/(?=^##\s+)/m);
  const releases = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed.startsWith("##")) continue;
    const firstLineEnd = trimmed.indexOf("\n");
    const headerLine = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd) : trimmed;
    const bodyContent = firstLineEnd > 0 ? trimmed.substring(firstLineEnd + 1) : "";
    const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\] - - -]+)?)\]?/);
    if (!vMatch) continue;
    const rawVersion = vMatch[1].trim();
    const version = rawVersion.replace(/^v(?=\d)/i, "");
    const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const date = dateMatch ? dateMatch[1] : "";
    let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, "").trim();
    if (date) {
      title = title.replace(date, "").trim();
    }
    title = title.replace(/^[-:\u2014\u2013🚀 ]+/, "").trim();
    if (!title) title = `Release ${version}`;
    let summary = "";
    const summaryMatch = bodyContent.match(/###\s*(?:🎯\s*)?Resumen\s*\n+([^\n#]+)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].replace(/^\*+|\*+$/g, "").trim();
    }
    const itemCodesSet = /* @__PURE__ */ new Set();
    const codeCandidates = trimmed.match(/\b([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)\b/g) || [];
    for (const code of codeCandidates) {
      const upper = code.toUpperCase();
      if (knownCodeSet.has(upper)) {
        itemCodesSet.add(upper);
      } else if (prefixUpper && upper.startsWith(`${prefixUpper}-`)) {
        itemCodesSet.add(upper);
      }
    }
    for (const it of knownItems) {
      const m = (it.milestone || it.targetSprint || "").replace(/^v/i, "");
      if (m && m === version) {
        itemCodesSet.add(it.code || it.id);
      }
    }
    releases.push({
      id: `rel-${version.replace(/\./g, "-")}`,
      version,
      date,
      title,
      summary,
      status: "released",
      itemCodes: Array.from(itemCodesSet),
      markdownContent: trimmed
    });
  }
  return releases;
}
function findTaskFile(project, id) {
  if (!project.repoPath) return null;
  const tasksDir = getProjectTasksDir(project);
  if (!fs5.existsSync(tasksDir)) return null;
  const cleanId = id.toLowerCase();
  const files = fs5.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
  let found = files.find((f) => {
    const fLower = f.toLowerCase();
    return fLower.startsWith(`${cleanId} `) || fLower.startsWith(`${cleanId}-`) || fLower === `${cleanId}.md`;
  });
  if (!found) {
    for (const f of files) {
      try {
        const raw = fs5.readFileSync(path5.join(tasksDir, f), "utf8");
        const fallbackId = f.split("-")[0] || f.replace(/\.md$/, "");
        const parsed = parseBacklogMd(raw, fallbackId);
        if (parsed.id && parsed.id.toLowerCase() === cleanId) {
          found = f;
          break;
        }
      } catch {
      }
    }
  }
  if (!found) return null;
  const filePath = path5.join(tasksDir, found);
  try {
    const raw = fs5.readFileSync(filePath, "utf8");
    const fallbackId = found.split("-")[0] || found.replace(/\.md$/, "");
    const task = parseBacklogMd(raw, fallbackId);
    return { filePath, filename: found, task };
  } catch {
    return { filePath, filename: found, task: {} };
  }
}
function mapMarkdownTaskToCanonical(task, project, filename, fileStat) {
  const rawFm = task.rawExtraFrontmatter || {};
  const isDeletedRaw = task.isDeleted !== void 0 ? task.isDeleted : rawFm.isdeleted !== void 0 ? rawFm.isdeleted : rawFm.isDeleted;
  const isDeletedVal = isDeletedRaw === true || isDeletedRaw === "true";
  const deletedAtVal = task.deletedAt || rawFm.deletedat || rawFm.deletedAt || void 0;
  const previousStatusVal = task.previousStatus || rawFm.previousstatus || rawFm.previousStatus || void 0;
  const sprintVal = task.sprint || task.targetSprint || rawFm.sprint || rawFm.targetSprint || void 0;
  const releaseVal = task.milestone || rawFm.release || rawFm.targetRelease || rawFm.releases || void 0;
  const id = task.id || filename.split("-")[0] || filename.replace(/\.md$/, "");
  const mtime = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();
  const canonical = {
    id,
    code: id,
    projectId: project.id,
    title: task.title || "Sin t\xEDtulo",
    description: task.description || "",
    type: normalizeType(task.type || rawFm.type) || "feature",
    priority: normalizePriority(task.priority || rawFm.priority) || "p2",
    status: normalizeStatus(task.status),
    sprint: sprintVal,
    release: releaseVal,
    targetSprint: sprintVal,
    targetRelease: releaseVal,
    milestone: releaseVal,
    parentId: task.parentId || rawFm.parent || rawFm.parentId || void 0,
    blocks: task.blocks || (rawFm.blocks ? Array.isArray(rawFm.blocks) ? rawFm.blocks : [rawFm.blocks] : []),
    blockedBy: task.blockedBy || (rawFm.blocked_by ? Array.isArray(rawFm.blocked_by) ? rawFm.blocked_by : [rawFm.blocked_by] : []),
    blockedReason: task.blockedReason || rawFm.blocked_reason || rawFm.blockedReason || void 0,
    dismissedReason: task.dismissedReason || rawFm.dismissed_reason || rawFm.dismissedReason || void 0,
    relatedTo: task.relatedTo || (rawFm.related_to ? Array.isArray(rawFm.related_to) ? rawFm.related_to : [rawFm.related_to] : []),
    dependencies: task.dependencies || [],
    sprints: task.sprints && task.sprints.length > 0 ? task.sprints : sprintVal ? [sprintVal] : [],
    releases: task.releases && task.releases.length > 0 ? task.releases.filter((r) => !r.toLowerCase().includes("sprint")) : releaseVal ? [releaseVal] : [],
    module: task.module || rawFm.module || void 0,
    epic: task.epic || rawFm.epic || void 0,
    category: task.category || rawFm.category || void 0,
    impactedFile: task.impactedFile || rawFm.impactedfile || rawFm.impactedFile || void 0,
    risk: task.risk || rawFm.risk || void 0,
    fix: task.fix || rawFm.fix || void 0,
    acceptanceCriteriaList: task.acceptanceCriteria || [],
    acceptanceCriteria: task.acceptanceCriteria || [],
    implementationPlan: task.implementationPlan || "",
    notes: task.implementationNotes || task.fix || void 0,
    implementationNotes: task.implementationNotes || task.fix || void 0,
    finalSummary: task.finalSummary || rawFm.finalsummary || rawFm.finalSummary || void 0,
    assignees: task.assignees || [],
    labels: task.labels || [],
    estimate: task.estimate !== void 0 ? task.estimate : rawFm.estimate,
    startDate: task.startDate || rawFm.start_date || rawFm.startDate || void 0,
    dueDate: task.dueDate || rawFm.due_date || rawFm.dueDate || rawFm.target_date || rawFm.targetDate || void 0,
    order: rawFm.order !== void 0 ? Number(rawFm.order) : 0,
    isDeleted: isDeletedVal ? true : void 0,
    deletedAt: deletedAtVal,
    previousStatus: previousStatusVal,
    createdAt: task.createdDate ? task.createdDate.includes("T") ? task.createdDate : `${task.createdDate}T00:00:00.000Z` : (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: task.updatedDate ? task.updatedDate.includes("T") ? task.updatedDate : `${task.updatedDate}T00:00:00.000Z` : (/* @__PURE__ */ new Date()).toISOString(),
    mtime,
    _file: filename,
    _raw: task
  };
  return canonical;
}
function normalizeTaskUpdates(project, updates) {
  const u = updates || {};
  const inner = u.updates && typeof u.updates === "object" ? u.updates : null;
  const usedUpdatesObject = Boolean(inner && !u.status && inner.status);
  const rawStatus = u.status || inner?.status;
  const status = rawStatus ? normalizeStatus(rawStatus) : void 0;
  const title = u.title !== void 0 ? u.title : inner?.title;
  const description = u.description !== void 0 ? u.description : inner?.description;
  const rawPriority = u.priority || inner?.priority;
  const priority = rawPriority ? normalizePriority(rawPriority) : void 0;
  const rawType = u.type || inner?.type;
  const type = rawType ? normalizeType(rawType) : void 0;
  const implementationPlan = u.implementationPlan !== void 0 ? u.implementationPlan : inner?.implementationPlan;
  const implementationNotes = u.implementationNotes !== void 0 ? u.implementationNotes : u.notes !== void 0 ? u.notes : u.fix !== void 0 ? u.fix : inner?.implementationNotes;
  let sprint;
  let targetSprint;
  let sprints;
  let clearSprint = false;
  const rawSprint = u.sprint !== void 0 ? u.sprint : u.targetSprint !== void 0 ? u.targetSprint : inner?.sprint;
  if (rawSprint !== void 0) {
    const legSprint = resolveLegibleSprint(project, rawSprint);
    if (legSprint) {
      sprint = legSprint;
      targetSprint = legSprint;
      sprints = [legSprint];
    } else {
      clearSprint = true;
      sprint = void 0;
      targetSprint = void 0;
      sprints = [];
    }
  } else if (u.sprints !== void 0 || inner?.sprints !== void 0) {
    const explicitSprints = Array.isArray(u.sprints) ? u.sprints : Array.isArray(inner?.sprints) ? inner.sprints : [];
    sprints = explicitSprints;
    sprint = explicitSprints.length > 0 ? explicitSprints[0] : void 0;
    targetSprint = sprint;
  }
  let release;
  let targetRelease;
  let milestone;
  let releases;
  if (u.release !== void 0 || u.targetRelease !== void 0 || u.milestone !== void 0 || u.releases !== void 0 || inner?.release !== void 0 || inner?.targetRelease !== void 0 || inner?.milestone !== void 0 || inner?.releases !== void 0) {
    const rawRel = (u.release || u.targetRelease || u.milestone || inner?.release || inner?.targetRelease || inner?.milestone || (Array.isArray(u.releases) && u.releases.length > 0 ? u.releases[0] : "") || (Array.isArray(inner?.releases) && inner.releases.length > 0 ? inner.releases[0] : "") || "").trim();
    const rawRelArr = Array.isArray(u.releases) ? u.releases : Array.isArray(inner?.releases) ? inner.releases : rawRel ? [rawRel] : [];
    releases = rawRelArr.filter(Boolean).filter((r) => !r.toLowerCase().includes("sprint"));
    release = rawRel || void 0;
    targetRelease = rawRel || void 0;
    milestone = rawRel || void 0;
  }
  let estimate;
  const rawEstimate = u.estimate !== void 0 ? u.estimate : inner?.estimate;
  if (rawEstimate !== void 0) {
    if (rawEstimate === "" || rawEstimate === null) {
      estimate = null;
    } else {
      const num = Number(rawEstimate);
      estimate = !isNaN(num) && typeof rawEstimate !== "boolean" && !String(rawEstimate).includes(" ") ? num : rawEstimate;
    }
  }
  const labels = Array.isArray(u.labels) ? u.labels : Array.isArray(inner?.labels) ? inner.labels : void 0;
  const assignees = Array.isArray(u.assignees) ? u.assignees : Array.isArray(inner?.assignees) ? inner.assignees : void 0;
  const parentId = u.parentId !== void 0 ? u.parentId : inner?.parentId;
  const blocks = Array.isArray(u.blocks) ? u.blocks : Array.isArray(inner?.blocks) ? inner.blocks : void 0;
  const blockedBy = Array.isArray(u.blockedBy) ? u.blockedBy : Array.isArray(inner?.blockedBy) ? inner.blockedBy : void 0;
  const blockedReason = u.blockedReason !== void 0 ? u.blockedReason : inner?.blockedReason;
  const dismissedReason = u.dismissedReason !== void 0 ? u.dismissedReason : inner?.dismissedReason;
  const relatedTo = Array.isArray(u.relatedTo) ? u.relatedTo : Array.isArray(inner?.relatedTo) ? inner.relatedTo : void 0;
  const dependencies = Array.isArray(u.dependencies) ? u.dependencies : Array.isArray(inner?.dependencies) ? inner.dependencies : void 0;
  const module = u.module !== void 0 ? u.module : inner?.module;
  const epic = u.epic !== void 0 ? u.epic : inner?.epic;
  const category = u.category !== void 0 ? u.category : inner?.category;
  const impactedFile = u.impactedFile !== void 0 ? u.impactedFile : inner?.impactedFile;
  const risk = u.risk !== void 0 ? u.risk : inner?.risk;
  const checkAllAcs = u.checkAllAcs !== void 0 ? u.checkAllAcs : inner?.checkAllAcs;
  const toggleAcIndex = u.toggleAcIndex !== void 0 ? u.toggleAcIndex : inner?.toggleAcIndex;
  return {
    status,
    rawStatus,
    title,
    description,
    priority,
    type,
    implementationPlan,
    implementationNotes,
    milestone,
    release,
    targetRelease,
    releases,
    sprint,
    targetSprint,
    sprints,
    clearSprint,
    estimate,
    labels,
    assignees,
    parentId,
    blocks,
    blockedBy,
    blockedReason,
    dismissedReason,
    relatedTo,
    dependencies,
    module,
    epic,
    category,
    impactedFile,
    risk,
    checkAllAcs,
    toggleAcIndex,
    usedUpdatesObject
  };
}
var BacklogService = class _BacklogService {
  /**
   * Reads all tasks for a project with optional filters.
   * By default, soft-deleted tasks (isDeleted: true) are EXCLUDED (AC 6).
   */
  static listTasks(project, options) {
    let items = [];
    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (fs5.existsSync(tasksDir)) {
        const files = fs5.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
        files.sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
        let orderIdx = 1;
        for (const file of files) {
          try {
            const fullPath = path5.join(tasksDir, file);
            const raw = fs5.readFileSync(fullPath, "utf8");
            const fallbackId = file.split("-")[0] || file.replace(/\.md$/, "");
            const parsed = parseBacklogMd(raw, fallbackId);
            const stat = fs5.statSync(fullPath);
            const canonical = mapMarkdownTaskToCanonical(parsed, project, file, stat);
            if (canonical.order === 0) canonical.order = orderIdx++;
            items.push(canonical);
          } catch {
          }
        }
      }
    } else {
      const jsonPath = resolveJsonBacklogPath(project);
      if (fs5.existsSync(jsonPath)) {
        try {
          const raw = fs5.readFileSync(jsonPath, "utf8");
          const data = JSON.parse(raw);
          const jsonStat = fs5.statSync(jsonPath);
          const jsonMtime = Math.round(jsonStat.mtimeMs);
          items = (data.items || []).map((it) => ({
            ...it,
            code: it.code || it.id,
            projectId: it.projectId || project.id,
            status: normalizeStatus(it.status),
            priority: normalizePriority(it.priority),
            acceptanceCriteriaList: it.acceptanceCriteriaList || it.acceptanceCriteria || [],
            acceptanceCriteria: it.acceptanceCriteria || it.acceptanceCriteriaList || [],
            sprint: it.sprint || it.targetSprint,
            targetSprint: it.targetSprint || it.sprint,
            mtime: it.mtime || jsonMtime
          }));
        } catch {
        }
      }
    }
    const includeDeleted = options?.includeDeleted === true;
    if (!includeDeleted) {
      items = items.filter((it) => !it.isDeleted && it.isDeleted !== "true");
    }
    if (options?.openOnly) {
      const closed = ["done", "dismissed", "cancelled", "released"];
      items = items.filter((t) => !closed.includes(normalizeStatus(t.status)));
    }
    if (options?.status) {
      const sNorm = normalizeStatus(options.status);
      items = items.filter((t) => normalizeStatus(t.status) === sNorm);
    }
    if (options?.priority) {
      const pNorm = normalizePriority(options.priority);
      items = items.filter((t) => normalizePriority(t.priority) === pNorm);
    }
    if (options?.sprint) {
      const sp = String(options.sprint).toLowerCase();
      items = items.filter(
        (t) => t.sprint && String(t.sprint).toLowerCase() === sp || t.targetSprint && String(t.targetSprint).toLowerCase() === sp || Array.isArray(t.sprints) && t.sprints.some((s) => String(s).toLowerCase() === sp)
      );
    }
    if (options?.milestone) {
      const mLower = String(options.milestone).toLowerCase();
      items = items.filter(
        (t) => t.milestone && String(t.milestone).toLowerCase() === mLower || t.targetSprint && String(t.targetSprint).toLowerCase() === mLower || t.release && String(t.release).toLowerCase() === mLower || t.targetRelease && String(t.targetRelease).toLowerCase() === mLower
      );
    }
    if (options?.prefix) {
      const pfx = String(options.prefix).toLowerCase();
      items = items.filter(
        (t) => t.id && t.id.toLowerCase().startsWith(pfx) || t.code && t.code.toLowerCase().startsWith(pfx)
      );
    }
    if (Array.isArray(options?.taskIds) && options.taskIds.length > 0) {
      const idsSet = new Set(options.taskIds.map((id) => String(id).toLowerCase()));
      items = items.filter(
        (t) => t.id && idsSet.has(t.id.toLowerCase()) || t.code && idsSet.has(t.code.toLowerCase())
      );
    }
    if (options?.search) {
      const q = String(options.search).toLowerCase();
      items = items.filter(
        (t) => t.title && t.title.toLowerCase().includes(q) || t.id && t.id.toLowerCase().includes(q) || t.code && t.code.toLowerCase().includes(q) || t.labels && Array.isArray(t.labels) && t.labels.some((l) => l.toLowerCase().includes(q))
      );
    }
    const offset = options?.offset !== void 0 ? options.offset : 0;
    if (options?.limit !== void 0) {
      items = items.slice(offset, offset + options.limit);
    } else if (offset > 0) {
      items = items.slice(offset);
    }
    return items;
  }
  /**
   * Retrieves single task by ID.
   */
  static getTask(project, taskId, options) {
    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      throw new Error(`[Validation] Parameter 'taskId' is required and must be a non-empty string.`);
    }
    const cleanId = taskId.toLowerCase();
    const includeDeleted = options?.includeDeleted !== false;
    if (project) {
      const tasks = _BacklogService.listTasks(project, { includeDeleted: true });
      const match = tasks.find(
        (t) => t.id && t.id.toLowerCase() === cleanId || t.code && t.code.toLowerCase() === cleanId
      );
      if (match && (includeDeleted || !match.isDeleted)) {
        return {
          found: true,
          project: { id: project.id, name: project.name, storageType: project.storageType },
          task: match
        };
      }
    }
    throw new Error(`Task ${taskId} not found.`);
  }
  /**
   * Calculates dashboard / metrics statistics over active tasks (excluding isDeleted).
   */
  static getStats(project) {
    const tasks = _BacklogService.listTasks(project, { includeDeleted: false });
    const total = tasks.length;
    const closedStatuses = ["done", "dismissed", "cancelled", "released"];
    let openCount = 0;
    let doneCount = 0;
    const byStatus = {};
    const byPriority = {};
    const byPrefix = {};
    for (const t of tasks) {
      const s = normalizeStatus(t.status);
      const p = normalizePriority(t.priority);
      const isClosed = closedStatuses.includes(s);
      if (isClosed) doneCount++;
      else openCount++;
      byStatus[s] = (byStatus[s] || 0) + 1;
      byPriority[p] = (byPriority[p] || 0) + 1;
      const code = String(t.code || t.id || "");
      const parts = code.split("-");
      const prefix = parts.length > 2 ? `${parts[0]}-${parts[1]}` : parts[0] || "OTHER";
      if (!byPrefix[prefix]) {
        byPrefix[prefix] = { total: 0, open: 0, done: 0 };
      }
      byPrefix[prefix].total++;
      if (isClosed) byPrefix[prefix].done++;
      else byPrefix[prefix].open++;
    }
    const completionRate = `${total > 0 ? Math.round(doneCount / total * 100) : 0}%`;
    return {
      total,
      open: openCount,
      done: doneCount,
      completionRate,
      byStatus,
      byPriority,
      byPrefix
    };
  }
  /**
   * Inspects existing tasks in memory and on disk to compute the next correlative task ID.
   */
  static getNextTaskId(project, options) {
    if (options?.withoutLock) {
      return _BacklogService.computeNextTaskId(project);
    }
    const lockPath = getProjectTaskAllocationLockPath(project);
    return withFileLockSync(lockPath, () => {
      return _BacklogService.computeNextTaskId(project);
    });
  }
  static computeNextTaskId(project) {
    const cleanPrefix = (project.codePrefix || "DEV").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "DEV";
    const allTasks = _BacklogService.listTasks(project, { includeDeleted: true });
    let maxNum = 0;
    const regex = new RegExp(`^${cleanPrefix}-(\\d+)`, "i");
    for (const t of allTasks) {
      const m = (t.code || t.id || "").match(regex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (fs5.existsSync(tasksDir)) {
        const diskFiles = fs5.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
        for (const f of diskFiles) {
          const m = f.match(regex);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : allTasks.length > 0 ? allTasks.length + 1 : 1;
    return `${cleanPrefix}-${String(nextNum).padStart(3, "0")}`;
  }
  /**
   * Creates a new task in the project with correlative code generation under atomic lock.
   */
  static createTask(project, data) {
    const lockPath = getProjectTaskAllocationLockPath(project);
    return withFileLockSync(lockPath, () => {
      const allTasks = _BacklogService.listTasks(project, { includeDeleted: true });
      const code = typeof data.code === "string" && data.code.trim() ? data.code.trim() : _BacklogService.computeNextTaskId(project);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let acList = [];
      if (Array.isArray(data.acceptanceCriteria)) {
        acList = data.acceptanceCriteria.map((item, i) => {
          if (typeof item === "string") {
            return { index: i + 1, text: item, checked: false };
          }
          return { index: item.index || i + 1, text: item.text || "", checked: Boolean(item.checked) };
        });
      } else if (Array.isArray(data.acceptanceCriteriaList)) {
        acList = data.acceptanceCriteriaList.map((item, i) => ({
          index: item.index || i + 1,
          text: item.text || "",
          checked: Boolean(item.checked)
        }));
      }
      let initialEstimate;
      if (data.estimate !== void 0 && data.estimate !== null && data.estimate !== "") {
        const num = Number(data.estimate);
        initialEstimate = !isNaN(num) && typeof data.estimate !== "boolean" && !String(data.estimate).includes(" ") ? num : data.estimate;
      }
      const rawSprint = data.sprint || data.targetSprint;
      const legSprint = rawSprint ? resolveLegibleSprint(project, rawSprint) : void 0;
      const rawRel = (data.release || data.targetRelease || data.milestone || (Array.isArray(data.releases) && data.releases.length > 0 ? data.releases[0] : "") || "").trim();
      const relArr = Array.isArray(data.releases) ? data.releases.filter(Boolean).filter((r) => !r.toLowerCase().includes("sprint")) : rawRel ? [rawRel] : [];
      const normalizedSt = normalizeStatus(data.status || "draft");
      const taskData = {
        id: code,
        title: data.title || "Sin t\xEDtulo",
        status: normalizedSt,
        priority: normalizePriority(data.priority || "medium"),
        type: data.type || "feature",
        createdDate: today,
        updatedDate: today,
        startDate: data.startDate || data.start_date || void 0,
        dueDate: data.dueDate || data.due_date || data.targetDate || data.target_date || void 0,
        milestone: rawRel || void 0,
        sprint: legSprint || void 0,
        targetSprint: legSprint || void 0,
        sprints: legSprint ? [legSprint] : Array.isArray(data.sprints) ? data.sprints : [],
        releases: relArr,
        estimate: initialEstimate,
        description: data.description || "",
        acceptanceCriteria: acList,
        implementationPlan: data.implementationPlan || "",
        implementationNotes: data.implementationNotes || data.notes || data.fix,
        assignees: Array.isArray(data.assignees) ? data.assignees : [],
        labels: Array.isArray(data.labels) ? data.labels : [],
        dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
        parentId: data.parentId || void 0,
        blocks: Array.isArray(data.blocks) ? data.blocks : [],
        blockedBy: Array.isArray(data.blockedBy) ? data.blockedBy : [],
        blockedReason: data.blockedReason || void 0,
        dismissedReason: data.dismissedReason || void 0,
        relatedTo: Array.isArray(data.relatedTo) ? data.relatedTo : [],
        module: data.module || void 0,
        impactedFile: data.impactedFile || void 0,
        risk: data.risk || void 0,
        epic: data.epic || void 0,
        category: data.category || void 0,
        fix: data.fix || void 0
      };
      if (isBacklogMdProject(project) && project.repoPath) {
        const tasksDir = getProjectTasksDir(project);
        if (!fs5.existsSync(tasksDir)) fs5.mkdirSync(tasksDir, { recursive: true });
        const filename = generateTaskFilename(code, taskData.title);
        const filepath = path5.join(tasksDir, filename);
        const serialized = serializeBacklogMd(taskData);
        atomicWriteFileSync(filepath, serialized, "utf8");
        const fileStat = fs5.existsSync(filepath) ? fs5.statSync(filepath) : void 0;
        const canonical = mapMarkdownTaskToCanonical(taskData, project, filename, fileStat);
        return { ok: true, task: canonical, savedFile: filepath };
      }
      const jsonPath = resolveJsonBacklogPath(project);
      const newItem = {
        ...taskData,
        code,
        projectId: project.id,
        acceptanceCriteriaList: acList,
        order: typeof data.order === "number" ? data.order : allTasks.length + 1,
        createdAt: now,
        updatedAt: now,
        completedAt: normalizedSt === "done" ? now : void 0
      };
      let existingData = { project: { ...project, storageType: "json" }, items: [], releases: [], sprints: [] };
      if (fs5.existsSync(jsonPath)) {
        try {
          existingData = JSON.parse(fs5.readFileSync(jsonPath, "utf8"));
        } catch {
        }
      }
      if (!Array.isArray(existingData.items)) existingData.items = [];
      existingData.items.push(newItem);
      existingData.lastUpdated = now;
      atomicWriteFileSync(jsonPath, JSON.stringify(existingData, null, 2), "utf8");
      const jsonStat = fs5.existsSync(jsonPath) ? fs5.statSync(jsonPath) : void 0;
      newItem.mtime = jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
      return { ok: true, task: newItem, savedFile: jsonPath };
    });
  }
  /**
   * Updates an existing task by ID with Gatekeeper validation.
   */
  static updateTask(project, taskId, updates, options) {
    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      throw new Error(`[Validation] Parameter 'taskId' is required and must be a non-empty string.`);
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const norm = normalizeTaskUpdates(project, updates);
    if (isBacklogMdProject(project) && project.repoPath) {
      const fileInfo = findTaskFile(project, taskId);
      if (!fileInfo) {
        throw new Error(`Task ${taskId} not found to update.`);
      }
      const { filePath, filename, task: current2 } = fileInfo;
      const fileStat = fs5.existsSync(filePath) ? fs5.statSync(filePath) : void 0;
      const currentMtime2 = fileStat ? Math.round(fileStat.mtimeMs) : Date.now();
      if (!options?.force && typeof options?.expectedMtime === "number") {
        if (currentMtime2 > options.expectedMtime) {
          const canonicalCurrent = mapMarkdownTaskToCanonical(current2, project, filename, fileStat);
          throw new ConflictError(
            `Task "${current2.id}" was modified on disk by another process or agent.`,
            currentMtime2,
            canonicalCurrent
          );
        }
      }
      if (norm.status) current2.status = norm.status;
      if (norm.title !== void 0) current2.title = norm.title;
      if (norm.description !== void 0) current2.description = norm.description;
      if (norm.priority) current2.priority = norm.priority;
      if (norm.type) current2.type = norm.type;
      if (norm.implementationPlan !== void 0) current2.implementationPlan = norm.implementationPlan;
      if (norm.implementationNotes !== void 0) {
        current2.implementationNotes = norm.implementationNotes;
        if (!current2.rawExtraFrontmatter) current2.rawExtraFrontmatter = {};
        current2.rawExtraFrontmatter.fix = norm.implementationNotes;
      }
      if (norm.milestone !== void 0) current2.milestone = norm.milestone;
      if (norm.labels !== void 0) current2.labels = norm.labels;
      if (norm.assignees !== void 0) current2.assignees = norm.assignees;
      if (norm.parentId !== void 0) current2.parentId = norm.parentId || void 0;
      if (norm.blocks !== void 0) current2.blocks = norm.blocks;
      if (norm.blockedBy !== void 0) current2.blockedBy = norm.blockedBy;
      if (norm.blockedReason !== void 0) current2.blockedReason = norm.blockedReason || void 0;
      if (norm.dismissedReason !== void 0) current2.dismissedReason = norm.dismissedReason || void 0;
      if (norm.relatedTo !== void 0) current2.relatedTo = norm.relatedTo;
      if (norm.dependencies !== void 0) current2.dependencies = norm.dependencies;
      if (norm.module !== void 0) current2.module = norm.module || void 0;
      if (norm.epic !== void 0) current2.epic = norm.epic || void 0;
      if (norm.category !== void 0) current2.category = norm.category || void 0;
      if (norm.impactedFile !== void 0) current2.impactedFile = norm.impactedFile || void 0;
      if (norm.risk !== void 0) current2.risk = norm.risk || void 0;
      if (norm.clearSprint) {
        current2.sprint = void 0;
        current2.targetSprint = void 0;
        current2.sprints = [];
        if (current2.rawExtraFrontmatter) {
          delete current2.rawExtraFrontmatter.sprint;
          delete current2.rawExtraFrontmatter.targetSprint;
        }
      } else if (norm.sprint !== void 0) {
        current2.sprint = norm.sprint;
        current2.targetSprint = norm.sprint;
        current2.sprints = norm.sprints || [norm.sprint];
        if (!current2.rawExtraFrontmatter) current2.rawExtraFrontmatter = {};
        current2.rawExtraFrontmatter.sprint = norm.sprint;
        current2.rawExtraFrontmatter.targetSprint = norm.sprint;
      } else if (norm.sprints !== void 0) {
        current2.sprints = norm.sprints;
      }
      if (norm.estimate !== void 0) {
        if (norm.estimate === null) {
          current2.estimate = void 0;
          if (current2.rawExtraFrontmatter) delete current2.rawExtraFrontmatter.estimate;
        } else {
          current2.estimate = norm.estimate;
          if (current2.rawExtraFrontmatter) current2.rawExtraFrontmatter.estimate = String(norm.estimate);
        }
      }
      current2.updatedDate = today;
      if (norm.checkAllAcs !== void 0 && current2.acceptanceCriteria) {
        current2.acceptanceCriteria = current2.acceptanceCriteria.map((ac) => ({
          ...ac,
          checked: Boolean(norm.checkAllAcs)
        }));
      } else if (norm.toggleAcIndex !== void 0) {
        if (typeof norm.toggleAcIndex !== "number" || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
          throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
        }
        const acList = current2.acceptanceCriteria || [];
        const foundAc = acList.find((ac) => ac.index === norm.toggleAcIndex);
        if (!foundAc) {
          throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current2.id}'.`);
        }
        current2.acceptanceCriteria = acList.map(
          (ac) => ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
        );
      }
      const targetStatus2 = norm.status || current2.status;
      validateGatekeeperTransition(current2, targetStatus2, options, project.repoPath);
      if (current2.rawExtraFrontmatter) {
        delete current2.rawExtraFrontmatter.verifyCommand;
        delete current2.rawExtraFrontmatter.verify_command;
        delete current2.rawExtraFrontmatter.verifyCmd;
      }
      const serialized = serializeBacklogMd(current2);
      atomicWriteFileSync(filePath, serialized, "utf8");
      const freshStat = fs5.existsSync(filePath) ? fs5.statSync(filePath) : void 0;
      const canonical = mapMarkdownTaskToCanonical(current2, project, filename, freshStat);
      const resp2 = { ok: true, updatedTask: canonical, filePath };
      if (norm.usedUpdatesObject) {
        resp2.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
      }
      if (options?.force) {
        const forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current2.id}', bypassing Gatekeeper validations.`;
        resp2.warning = resp2.warning ? `${resp2.warning} ${forceWarning}` : forceWarning;
        resp2.audit = {
          bypassedGatekeeper: true,
          timestamp: now
        };
      }
      return resp2;
    }
    const jsonPath = resolveJsonBacklogPath(project);
    if (!fs5.existsSync(jsonPath)) {
      throw new Error(`JSON backlog file not found at ${jsonPath}.`);
    }
    const data = JSON.parse(fs5.readFileSync(jsonPath, "utf8"));
    const cleanId = String(taskId).toLowerCase();
    const idx = (data.items || []).findIndex(
      (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
    );
    if (idx < 0) {
      throw new Error(`Task ${taskId} not found to update.`);
    }
    const current = data.items[idx];
    const jsonStat = fs5.existsSync(jsonPath) ? fs5.statSync(jsonPath) : void 0;
    const currentMtime = typeof current.mtime === "number" ? current.mtime : jsonStat ? Math.round(jsonStat.mtimeMs) : Date.now();
    if (!options?.force && typeof options?.expectedMtime === "number") {
      if (currentMtime > options.expectedMtime) {
        throw new ConflictError(
          `Task "${current.code || current.id}" was modified on disk by another process or agent.`,
          currentMtime,
          current
        );
      }
    }
    const wasDone = current.status === "done";
    if (norm.status) current.status = norm.status;
    const isNowDone = current.status === "done";
    if (norm.title !== void 0) current.title = norm.title;
    if (norm.description !== void 0) current.description = norm.description;
    if (norm.priority) current.priority = norm.priority;
    if (norm.type) current.type = norm.type;
    if (norm.implementationPlan !== void 0) current.implementationPlan = norm.implementationPlan;
    if (norm.implementationNotes !== void 0) {
      current.implementationNotes = norm.implementationNotes;
      current.fix = norm.implementationNotes;
    }
    if (norm.milestone !== void 0) {
      current.milestone = norm.milestone;
      current.release = norm.release;
      current.targetRelease = norm.targetRelease;
      current.releases = norm.releases;
    }
    if (norm.labels !== void 0) current.labels = norm.labels;
    if (norm.assignees !== void 0) current.assignees = norm.assignees;
    if (norm.parentId !== void 0) current.parentId = norm.parentId || void 0;
    if (norm.blocks !== void 0) current.blocks = norm.blocks;
    if (norm.blockedBy !== void 0) current.blockedBy = norm.blockedBy;
    if (norm.blockedReason !== void 0) current.blockedReason = norm.blockedReason || void 0;
    if (norm.dismissedReason !== void 0) current.dismissedReason = norm.dismissedReason || void 0;
    if (norm.relatedTo !== void 0) current.relatedTo = norm.relatedTo;
    if (norm.dependencies !== void 0) current.dependencies = norm.dependencies;
    if (norm.module !== void 0) current.module = norm.module || void 0;
    if (norm.epic !== void 0) current.epic = norm.epic || void 0;
    if (norm.category !== void 0) current.category = norm.category || void 0;
    if (norm.impactedFile !== void 0) current.impactedFile = norm.impactedFile || void 0;
    if (norm.risk !== void 0) current.risk = norm.risk || void 0;
    if (norm.clearSprint) {
      current.sprint = void 0;
      current.targetSprint = void 0;
      current.sprints = [];
    } else if (norm.sprint !== void 0) {
      current.sprint = norm.sprint;
      current.targetSprint = norm.sprint;
      current.sprints = norm.sprints || [norm.sprint];
    } else if (norm.sprints !== void 0) {
      current.sprints = norm.sprints;
    }
    if (norm.estimate !== void 0) {
      current.estimate = norm.estimate === null ? void 0 : norm.estimate;
    }
    current.updatedAt = now;
    if (isNowDone && !wasDone) {
      current.completedAt = now;
    } else if (!isNowDone) {
      current.completedAt = void 0;
    }
    if (norm.checkAllAcs !== void 0 && current.acceptanceCriteriaList) {
      current.acceptanceCriteriaList = current.acceptanceCriteriaList.map((ac) => ({
        ...ac,
        checked: Boolean(norm.checkAllAcs)
      }));
    } else if (norm.toggleAcIndex !== void 0) {
      if (typeof norm.toggleAcIndex !== "number" || !Number.isInteger(norm.toggleAcIndex) || norm.toggleAcIndex < 1) {
        throw new Error(`[Validation] Invalid parameter 'toggleAcIndex': must be a positive integer (1-indexed), received '${norm.toggleAcIndex}'.`);
      }
      const acList = current.acceptanceCriteriaList || [];
      const foundAc = acList.find((ac) => ac.index === norm.toggleAcIndex);
      if (!foundAc) {
        throw new Error(`[Validation] Acceptance criterion #${norm.toggleAcIndex} not found in task '${current.id || current.code}'.`);
      }
      current.acceptanceCriteriaList = acList.map(
        (ac) => ac.index === norm.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
      );
    }
    const targetStatus = norm.status || current.status;
    validateGatekeeperTransition(current, targetStatus, options, project.repoPath);
    delete current.verifyCommand;
    data.items[idx] = current;
    data.lastUpdated = now;
    atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
    const freshJsonStat = fs5.existsSync(jsonPath) ? fs5.statSync(jsonPath) : void 0;
    current.mtime = freshJsonStat ? Math.round(freshJsonStat.mtimeMs) : Date.now();
    const resp = { ok: true, updatedTask: current, filePath: jsonPath };
    if (norm.usedUpdatesObject) {
      resp.warning = "Notice: Applied 'status' received inside 'updates' object. For maximum compatibility with AGENTS.md, passing 'status' as a top-level field is recommended.";
    }
    if (options?.force) {
      const forceWarning = `[MCP Gatekeeper Audit] Used 'force: true' to force update task '${current.id || current.code}', bypassing Gatekeeper validations.`;
      resp.warning = resp.warning ? `${resp.warning} ${forceWarning}` : forceWarning;
      resp.audit = {
        bypassedGatekeeper: true,
        timestamp: now
      };
    }
    return resp;
  }
  /**
   * Bulk updates tasks with Gatekeeper validation applied to ALL matching tasks (AC 3).
   */
  static bulkUpdateTasks(project, targetFilter, updates, options) {
    if (Array.isArray(targetFilter.items)) {
      const updatedIds2 = [];
      const failedUpdates2 = [];
      let updatedCount2 = 0;
      for (const patch of targetFilter.items) {
        if (!patch || !patch.id && !patch.code) continue;
        const targetId = patch.code || patch.id;
        try {
          const res = _BacklogService.updateTask(project, targetId, patch, options);
          if (res.ok) {
            updatedCount2++;
            updatedIds2.push(targetId);
          }
        } catch (err) {
          failedUpdates2.push({ id: targetId, error: err.message });
        }
      }
      const resp2 = {
        ok: failedUpdates2.length === 0,
        projectId: project.id,
        storageType: project.storageType || "markdown",
        updatedCount: updatedCount2,
        updatedIds: updatedIds2,
        ...failedUpdates2.length > 0 ? { failedUpdates: failedUpdates2, error: `${failedUpdates2.length} task(s) failed to update.` } : {}
      };
      if (options?.force) {
        resp2.warning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
        resp2.audit = {
          bypassedGatekeeper: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return resp2;
    }
    const cleanIds = Array.isArray(targetFilter.taskIds) ? new Set(targetFilter.taskIds.map((id) => String(id).toLowerCase())) : null;
    const pfxFilter = targetFilter.filterPrefix ? String(targetFilter.filterPrefix).toLowerCase() : null;
    const statusFilter = targetFilter.filterStatus ? normalizeStatus(targetFilter.filterStatus) : null;
    const allTasks = _BacklogService.listTasks(project, { includeDeleted: false });
    const matchedTasks = allTasks.filter((t) => {
      const taskId = String(t.id || t.code || "").toLowerCase();
      if (cleanIds && !cleanIds.has(taskId)) return false;
      if (pfxFilter && !taskId.startsWith(pfxFilter)) return false;
      if (statusFilter && normalizeStatus(t.status) !== statusFilter) return false;
      return true;
    });
    if (matchedTasks.length === 0) {
      return {
        ok: true,
        projectId: project.id,
        storageType: project.storageType || "markdown",
        updatedCount: 0,
        updatedIds: []
      };
    }
    const norm = normalizeTaskUpdates(project, updates);
    if (norm.status) {
      for (const t of matchedTasks) {
        validateGatekeeperTransition(t, norm.status, options, project.repoPath);
      }
    }
    const updatedIds = [];
    const failedUpdates = [];
    let updatedCount = 0;
    for (const t of matchedTasks) {
      try {
        const res = _BacklogService.updateTask(project, t.id || t.code, updates, options);
        if (res.ok) {
          updatedCount++;
          updatedIds.push(t.code || t.id);
        }
      } catch (err) {
        failedUpdates.push({ id: t.id || t.code, error: err.message });
      }
    }
    const resp = {
      ok: failedUpdates.length === 0,
      projectId: project.id,
      storageType: project.storageType || "markdown",
      updatedCount,
      updatedIds,
      ...failedUpdates.length > 0 ? { failedUpdates, error: `${failedUpdates.length} task(s) failed to update.` } : {}
    };
    if (options?.force) {
      resp.warning = `[MCP Gatekeeper Audit] Used 'force: true' to force bulk task updates, bypassing Gatekeeper validations.`;
      resp.audit = {
        bypassedGatekeeper: true,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    return resp;
  }
  /**
   * Soft deletes or purges a task. Protected done tasks cannot be soft-deleted.
   */
  static deleteTask(project, taskId, options) {
    const isPurge = options?.purge === true;
    if (isBacklogMdProject(project) && project.repoPath) {
      const fileInfo = findTaskFile(project, taskId);
      if (!fileInfo) return { ok: false, id: taskId };
      const { filePath, filename, task } = fileInfo;
      const currentStatus = (task.status || "").toLowerCase();
      if (!isPurge && currentStatus === "done") {
        throw new Error("Cannot soft-delete a done item. Done items are protected historical records.");
      }
      if (isPurge) {
        const archiveDir = path5.join(project.repoPath, project.backlogDir || "backlog", "archive");
        if (!fs5.existsSync(archiveDir)) fs5.mkdirSync(archiveDir, { recursive: true });
        fs5.renameSync(filePath, path5.join(archiveDir, filename));
        return { ok: true, id: taskId, purged: true };
      }
      const previousStatus = task.status || "draft";
      const raw = fs5.readFileSync(filePath, "utf8");
      let updated = raw;
      updated = updated.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, "");
      updated = updated.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, "");
      updated = updated.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, "");
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      if (/^status:.*$/m.test(updated)) {
        updated = updated.replace(/^(status:.*$)/m, `$1
isDeleted: true
deletedAt: "${nowIso}"
previousStatus: "${previousStatus}"`);
      } else {
        updated = updated.replace(/^---\r?\n/, `---
isDeleted: true
deletedAt: "${nowIso}"
previousStatus: "${previousStatus}"
`);
      }
      atomicWriteFileSync(filePath, updated, "utf8");
      return { ok: true, id: taskId, softDeleted: true };
    }
    const jsonPath = resolveJsonBacklogPath(project);
    if (!fs5.existsSync(jsonPath)) return { ok: false, id: taskId };
    const data = JSON.parse(fs5.readFileSync(jsonPath, "utf8"));
    const cleanId = taskId.toLowerCase();
    const idx = (data.items || []).findIndex(
      (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
    );
    if (idx < 0) return { ok: false, id: taskId };
    const item = data.items[idx];
    if (!isPurge && item.status === "done") {
      throw new Error("Cannot soft-delete a done item.");
    }
    if (isPurge) {
      data.items.splice(idx, 1);
    } else {
      item.previousStatus = item.status;
      item.isDeleted = true;
      item.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
      data.items[idx] = item;
    }
    data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
    return { ok: true, id: taskId, softDeleted: !isPurge, purged: isPurge };
  }
  /**
   * Restores a soft-deleted task to active state.
   */
  static restoreTask(project, taskId) {
    if (isBacklogMdProject(project) && project.repoPath) {
      const fileInfo = findTaskFile(project, taskId);
      if (!fileInfo) return false;
      const { filePath } = fileInfo;
      let raw = fs5.readFileSync(filePath, "utf8");
      const prevMatch = raw.match(/^[pP]revious[sS]tatus:\s*"?([^"\r\n]+)"?/m);
      const restoreStatus2 = prevMatch ? prevMatch[1].trim() : "draft";
      if (/^status:.*$/m.test(raw)) {
        raw = raw.replace(/^status:.*$/m, `status: ${restoreStatus2}`);
      }
      raw = raw.replace(/^[iI]s[dD]eleted:.*\r?\n?/gm, "");
      raw = raw.replace(/^[dD]eleted[aA]t:.*\r?\n?/gm, "");
      raw = raw.replace(/^[pP]revious[sS]tatus:.*\r?\n?/gm, "");
      atomicWriteFileSync(filePath, raw, "utf8");
      return true;
    }
    const jsonPath = resolveJsonBacklogPath(project);
    if (!fs5.existsSync(jsonPath)) return false;
    const data = JSON.parse(fs5.readFileSync(jsonPath, "utf8"));
    const cleanId = taskId.toLowerCase();
    const item = (data.items || []).find(
      (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
    );
    if (!item) return false;
    const restoreStatus = item.previousStatus || "draft";
    item.status = restoreStatus;
    delete item.isDeleted;
    delete item.deletedAt;
    delete item.previousStatus;
    data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    atomicWriteFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
    return true;
  }
  /**
   * Exports monolithic BACKLOG.md excluding soft-deleted items (AC 6).
   */
  static exportBacklogMd(project, options) {
    const tasks = _BacklogService.listTasks(project, { includeDeleted: false });
    const mdTasks = tasks.map((t) => ({
      id: t.code || t.id,
      title: t.title,
      status: normalizeStatus(t.status),
      type: t.type,
      priority: formatPriorityForMd(t.priority),
      milestone: t.milestone || t.targetSprint,
      description: t.description || "",
      acceptanceCriteria: t.acceptanceCriteriaList || t.acceptanceCriteria || []
    }));
    const content = generateMonolithicBacklogMd(project.name, mdTasks);
    let savedPath;
    if (options?.save !== false && project.repoPath) {
      savedPath = path5.join(project.repoPath, "BACKLOG.md");
      atomicWriteFileSync(savedPath, content, "utf8");
    }
    return {
      ok: true,
      content,
      savedPath,
      taskCount: tasks.length
    };
  }
  /**
   * Synchronizes backlog tasks and BACKLOG.md.
   * DEV-293 / AC 4: Does NOT auto-promote tasks to ready! Only emits quality warnings,
   * and writes BACKLOG.md strictly when real changes exist or autoFix is true.
   */
  static syncBacklog(project, options) {
    let fixedCount = 0;
    const errors = [];
    const warnings = [];
    const autoFix = options?.autoFix === true;
    if (isBacklogMdProject(project) && project.repoPath) {
      const tasksDir = getProjectTasksDir(project);
      if (fs5.existsSync(tasksDir)) {
        const files = fs5.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
        for (const file of files) {
          const filePath = path5.join(tasksDir, file);
          const content2 = fs5.readFileSync(filePath, "utf8");
          const fmMatch = content2.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (!fmMatch) continue;
          const fm = fmMatch[1];
          const statusMatch = fm.match(/^status:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
          const idMatch = fm.match(/^id:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
          const rawStatus = (statusMatch ? statusMatch[1] : "").toLowerCase();
          const taskId = idMatch ? idMatch[1] : file.split("-")[0];
          const acBlockMatch = content2.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
          if (!acBlockMatch) continue;
          const acBlock = acBlockMatch[1];
          const allAcs = acBlock.match(/^-\s*\[([ xX])\]/gm) || [];
          const checkedAcs = acBlock.match(/^-\s*\[[xX]\]/gm) || [];
          const totalAcs = allAcs.length;
          const totalChecked = checkedAcs.length;
          if (totalAcs > 0 && totalChecked === totalAcs && (rawStatus === "draft" || rawStatus === "doing")) {
            warnings.push(
              `${taskId}: Todos los AC completados (${totalChecked}/${totalAcs}) pero status es '${rawStatus}' (aviso de calidad: requiere certificaci\xF3n de QA para pasar a ready)`
            );
          }
          if (rawStatus === "done" && totalAcs > 0 && totalChecked < totalAcs) {
            errors.push(`${taskId}: Status es 'done' pero solo tiene ${totalChecked}/${totalAcs} ACs marcados`);
          }
        }
      }
    }
    const exportRes = _BacklogService.exportBacklogMd(project, { save: false });
    const content = exportRes.content;
    let backlogPath = null;
    let changesWritten = false;
    if (project.repoPath) {
      backlogPath = path5.join(project.repoPath, "BACKLOG.md");
      let existingContent = "";
      if (fs5.existsSync(backlogPath)) {
        try {
          existingContent = fs5.readFileSync(backlogPath, "utf8");
        } catch {
        }
      }
      const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
      const stripDate = (s) => s.replace(/^> Consolidado generado el \d{4}-\d{2}-\d{2} por gripm( ⚡)?\n?/m, "");
      const isDifferent = stripDate(normalize(existingContent)) !== stripDate(normalize(content));
      if (isDifferent || autoFix) {
        atomicWriteFileSync(backlogPath, content, "utf8");
        changesWritten = true;
      }
    }
    return {
      ok: errors.length === 0,
      autoFix,
      fixedCount,
      errorsFound: errors.length,
      errors,
      warnings,
      taskCount: exportRes.taskCount,
      backlogPath,
      changesWritten
    };
  }
  /**
   * Reads full project backlog (items, releases, sprints) with ZERO disk mutations (AC 5).
   * Does NOT auto-close sprints, does NOT auto-write releases.json or sprints.json.
   */
  static readProjectBacklog(project) {
    if (isBacklogMdProject(project)) {
      const tasksDir = getProjectTasksDir(project);
      try {
        if (!fs5.existsSync(tasksDir)) {
          return {
            project: { ...project, storageType: "markdown" },
            items: [],
            releases: [],
            sprints: [],
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
        const items = _BacklogService.listTasks(project, { includeDeleted: true });
        let releases = [];
        const releasesPath = getProjectReleasesPath(project);
        if (fs5.existsSync(releasesPath)) {
          try {
            releases = JSON.parse(fs5.readFileSync(releasesPath, "utf8"));
          } catch {
          }
        }
        if (releases.length === 0 && project.repoPath) {
          const parsed = parseReleaseNotesMd(project.repoPath, project.codePrefix, items);
          if (parsed.length > 0) {
            releases = parsed;
          }
        }
        if (releases.length > 0) {
          for (const rel of releases) {
            const vClean = (rel.version || "").replace(/^v/i, "");
            const existingCodes = new Set((rel.itemCodes || []).map((c2) => c2.toUpperCase()));
            for (const it of items) {
              const itRel = (it.release || it.targetRelease || "").replace(/^v/i, "");
              const inReleases = (it.releases || []).some((r) => r.replace(/^v/i, "") === vClean);
              if (itRel === vClean || inReleases) {
                const codeUpper = (it.code || it.id).toUpperCase();
                if (!existingCodes.has(codeUpper)) {
                  existingCodes.add(codeUpper);
                  if (!rel.itemCodes) rel.itemCodes = [];
                  rel.itemCodes.push(it.code || it.id);
                }
              }
            }
          }
          const releaseByCode = /* @__PURE__ */ new Map();
          for (const rel of releases) {
            const isReleased = rel.status === "released";
            for (const code of rel.itemCodes || []) {
              const key = code.toUpperCase();
              if (!releaseByCode.has(key) || !releaseByCode.get(key).isReleased && isReleased) {
                releaseByCode.set(key, { version: rel.version, date: rel.date, isReleased });
              }
            }
          }
          for (const it of items) {
            const key = (it.code || it.id).toUpperCase();
            if (releaseByCode.has(key)) {
              const rInfo = releaseByCode.get(key);
              it.targetRelease = it.targetRelease || rInfo.version;
              it.release = it.release || rInfo.version;
              if (rInfo.isReleased) {
                it.releasedAt = it.releasedAt || (rInfo.date ? new Date(rInfo.date).toISOString() : void 0);
              }
            }
          }
        }
        let sprints = [];
        const sprintsPath = getProjectSprintsPath(project);
        if (fs5.existsSync(sprintsPath)) {
          try {
            sprints = JSON.parse(fs5.readFileSync(sprintsPath, "utf8"));
          } catch {
          }
        }
        sprints = (sprints || []).map((s) => ({
          ...s,
          projectId: project.id
        }));
        if (project.repoPath) {
          const detectedSprintNames = /* @__PURE__ */ new Set();
          for (const it of items) {
            const sp = it.sprint || it.targetSprint;
            if (sp && typeof sp === "string" && sp.trim() && sp.toLowerCase() !== "backlog" && !sp.toLowerCase().includes("sin sprint") && sp !== "-") {
              detectedSprintNames.add(sp.trim());
            }
          }
          if (detectedSprintNames.size > 0) {
            const existingNames = new Set(sprints.map((s) => s.name?.toLowerCase().trim()));
            for (const name of detectedSprintNames) {
              if (!existingNames.has(name.toLowerCase())) {
                const sprintItems = items.filter((it) => (it.sprint || it.targetSprint || "").trim().toLowerCase() === name.toLowerCase());
                const allDone = sprintItems.length > 0 && sprintItems.every((it) => it.status === "done" || it.status === "ready" || it.status === "finish");
                const hasDoing = sprintItems.some((it) => it.status === "doing" || it.status === "review");
                sprints.push({
                  id: `sprint-${name.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`,
                  projectId: project.id,
                  name,
                  goal: "",
                  status: allDone ? "completed" : hasDoing ? "active" : "planned",
                  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                  completedAt: allDone ? (/* @__PURE__ */ new Date()).toISOString() : void 0
                });
              }
            }
          }
        }
        return {
          project: { ...project, storageType: "markdown" },
          items,
          releases,
          sprints,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      } catch (err) {
        console.warn(`[gripm BacklogService] Error reading Backlog.md tasks for ${project.id}:`, err.message);
        return {
          project: { ...project, storageType: "markdown", error: err.message },
          items: [],
          releases: [],
          sprints: [],
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
    const filePath = resolveJsonBacklogPath(project);
    try {
      if (!fs5.existsSync(filePath)) {
        const initial = {
          project: { ...project, storageType: "json" },
          items: [],
          releases: [],
          sprints: [],
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          atomicWriteFileSync(filePath, JSON.stringify(initial, null, 2), "utf8");
        } catch (writeErr) {
          console.error(`[gripm BacklogService] Cannot initialize backlog at ${filePath}:`, writeErr.message);
        }
        return initial;
      }
      const jsonStat = fs5.statSync(filePath);
      const jsonMtime = Math.round(jsonStat.mtimeMs);
      const raw = fs5.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      let items = Array.isArray(parsed.items) ? parsed.items : [];
      items = items.map((it) => ({
        ...it,
        code: it.code || it.id,
        projectId: it.projectId || project.id,
        status: normalizeStatus(it.status),
        acceptanceCriteriaList: it.acceptanceCriteriaList || it.acceptanceCriteria || [],
        acceptanceCriteria: it.acceptanceCriteria || it.acceptanceCriteriaList || [],
        mtime: it.mtime || jsonMtime
      }));
      return {
        project: { ...project, storageType: "json" },
        items,
        releases: Array.isArray(parsed.releases) ? parsed.releases : [],
        sprints: Array.isArray(parsed.sprints) ? parsed.sprints : [],
        lastUpdated: parsed.lastUpdated || (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (err) {
      console.error(`[gripm BacklogService] Error reading backlog for project ${project.id}:`, err.message);
      return {
        project: { ...project, storageType: "json", error: err.message },
        items: [],
        releases: [],
        sprints: [],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
  /**
   * Reads releases from disk guarded by atomic file lock.
   */
  static readReleases(project) {
    const filePath = getProjectReleasesPath(project);
    if (!filePath || !fs5.existsSync(filePath)) return [];
    return withFileLockSync(filePath, () => {
      try {
        if (!fs5.existsSync(filePath)) return [];
        const content = fs5.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });
  }
  /**
   * Mutates releases on disk guarded by atomic file lock.
   */
  static mutateReleases(project, mutator) {
    const filePath = getProjectReleasesPath(project);
    if (!filePath) return [];
    return withFileLockSync(filePath, () => {
      let current = [];
      if (fs5.existsSync(filePath)) {
        try {
          const content = fs5.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) current = parsed;
        } catch {
        }
      }
      const result = mutator(current);
      const toWrite = Array.isArray(result) ? result : current;
      atomicWriteFileSync(filePath, JSON.stringify(toWrite, null, 2), "utf8");
      return toWrite;
    });
  }
  /**
   * Reads retrospectives from disk guarded by atomic file lock.
   */
  static readRetrospectives(project) {
    const filePath = getProjectRetrospectivesPath(project);
    if (!filePath || !fs5.existsSync(filePath)) return [];
    return withFileLockSync(filePath, () => {
      try {
        if (!fs5.existsSync(filePath)) return [];
        const content = fs5.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });
  }
  /**
   * Mutates retrospectives on disk guarded by atomic file lock.
   */
  static mutateRetrospectives(project, mutator) {
    const filePath = getProjectRetrospectivesPath(project);
    if (!filePath) return [];
    return withFileLockSync(filePath, () => {
      let current = [];
      if (fs5.existsSync(filePath)) {
        try {
          const content = fs5.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) current = parsed;
        } catch {
        }
      }
      const result = mutator(current);
      const toWrite = Array.isArray(result) ? result : current;
      atomicWriteFileSync(filePath, JSON.stringify(toWrite, null, 2), "utf8");
      return toWrite;
    });
  }
  /**
   * Writes releases and sprints to disk atomically (markdown) or updates backlog.json (JSON).
   */
  static writeProjectBacklog(project, data) {
    if (isBacklogMdProject(project)) {
      if (project.repoPath) {
        try {
          const dir = path5.join(project.repoPath, project.backlogDir || "backlog");
          if (!fs5.existsSync(dir)) fs5.mkdirSync(dir, { recursive: true });
          const releasesPath = path5.join(dir, "releases.json");
          withFileLockSync(releasesPath, () => {
            let releasesToWrite = data.releases || [];
            if (fs5.existsSync(releasesPath)) {
              try {
                const diskReleases = JSON.parse(fs5.readFileSync(releasesPath, "utf8"));
                if (Array.isArray(diskReleases)) {
                  releasesToWrite = releasesToWrite.map((rel) => {
                    const diskMatch = diskReleases.find((dr) => dr.id === rel.id || dr.version === rel.version);
                    if (diskMatch && Array.isArray(diskMatch.itemCodes) && diskMatch.itemCodes.length > 0) {
                      if (!rel.itemCodes || rel.itemCodes.length === 0) {
                        return { ...rel, itemCodes: diskMatch.itemCodes };
                      }
                    }
                    return rel;
                  });
                }
              } catch {
              }
            }
            atomicWriteFileSync(releasesPath, JSON.stringify(releasesToWrite, null, 2), "utf8");
          });
          if (data.sprints !== void 0) {
            atomicWriteFileSync(path5.join(dir, "sprints.json"), JSON.stringify(data.sprints || [], null, 2), "utf8");
          }
        } catch (err) {
          console.warn(`[gripm BacklogService] Warning writing releases/sprints: ${err.message}`);
        }
      }
      return;
    }
    const filePath = resolveJsonBacklogPath(project);
    data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    try {
      atomicWriteFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error(`[gripm BacklogService] Error writing project backlog to ${filePath}:`, err.message);
    }
  }
  /**
   * Saves or creates a single task item (used by legacy and HTTP adapters).
   */
  static saveTask(project, item) {
    if (!project.repoPath && isBacklogMdProject(project)) return;
    if (isBacklogMdProject(project)) {
      const tasksDir = getProjectTasksDir(project);
      if (!fs5.existsSync(tasksDir)) fs5.mkdirSync(tasksDir, { recursive: true });
      const fileInfo = findTaskFile(project, item.code || item.id);
      let existingFile = fileInfo?.filename;
      let existingTask = fileInfo?.task || {};
      const taskData = {
        id: item.code || item.id,
        title: item.title || existingTask.title || "Sin t\xEDtulo",
        status: normalizeStatus(item.status),
        type: normalizeType(item.type || existingTask.type) || "feature",
        priority: item.priority || existingTask.priority || "p2",
        assignees: item.assignees !== void 0 ? item.assignees : existingTask.assignees || [],
        labels: item.labels !== void 0 ? item.labels : existingTask.labels || [],
        dependencies: item.dependencies || existingTask.dependencies || [],
        parentId: item.parentId !== void 0 ? item.parentId : existingTask.parentId,
        blocks: item.blocks !== void 0 ? item.blocks : existingTask.blocks,
        blockedBy: item.blockedBy !== void 0 ? item.blockedBy : existingTask.blockedBy,
        blockedReason: item.blockedReason !== void 0 ? item.blockedReason : existingTask.blockedReason,
        dismissedReason: item.dismissedReason !== void 0 ? item.dismissedReason : existingTask.dismissedReason,
        relatedTo: item.relatedTo !== void 0 ? item.relatedTo : existingTask.relatedTo,
        sprints: item.sprints !== void 0 ? item.sprints : existingTask.sprints,
        releases: item.release !== void 0 || item.targetRelease !== void 0 || item.milestone !== void 0 || item.releases !== void 0 ? (Array.isArray(item.releases) ? item.releases.filter(Boolean) : item.release ? [item.release] : []).filter((r) => !r.toLowerCase().includes("sprint")) : (existingTask.releases || []).filter((r) => !r.toLowerCase().includes("sprint")),
        milestone: item.release !== void 0 || item.targetRelease !== void 0 || item.milestone !== void 0 ? (item.release || item.targetRelease || item.milestone || "").toLowerCase().includes("sprint") ? void 0 : item.release || item.targetRelease || item.milestone || void 0 : existingTask.milestone && !existingTask.milestone.toLowerCase().includes("sprint") ? existingTask.milestone : void 0,
        createdDate: item.createdAt || existingTask.createdDate,
        updatedDate: item.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
        description: item.description !== void 0 ? item.description : existingTask.description || "",
        acceptanceCriteria: item.acceptanceCriteriaList || existingTask.acceptanceCriteria || [],
        implementationPlan: item.implementationPlan !== void 0 ? item.implementationPlan : existingTask.implementationPlan || "",
        implementationNotes: item.fix || item.implementationNotes || existingTask.implementationNotes,
        finalSummary: item.finalSummary || existingTask.finalSummary,
        estimate: item.estimate !== void 0 ? item.estimate === "" ? void 0 : item.estimate : existingTask.estimate,
        startDate: item.startDate !== void 0 ? item.startDate : existingTask.startDate,
        dueDate: item.dueDate !== void 0 ? item.dueDate : existingTask.dueDate,
        rawExtraFrontmatter: {
          ...existingTask.rawExtraFrontmatter || {}
        }
      };
      if (item.isDeleted) {
        taskData.isDeleted = true;
        taskData.deletedAt = item.deletedAt || (/* @__PURE__ */ new Date()).toISOString();
        taskData.previousStatus = item.previousStatus || existingTask.previousStatus || existingTask.status || "draft";
        if (taskData.rawExtraFrontmatter) {
          taskData.rawExtraFrontmatter.isDeleted = "true";
          if (taskData.deletedAt) taskData.rawExtraFrontmatter.deletedAt = taskData.deletedAt;
          if (taskData.previousStatus) taskData.rawExtraFrontmatter.previousStatus = taskData.previousStatus;
        }
      } else {
        taskData.isDeleted = void 0;
        taskData.deletedAt = void 0;
        taskData.previousStatus = void 0;
        if (taskData.rawExtraFrontmatter) {
          delete taskData.rawExtraFrontmatter.isdeleted;
          delete taskData.rawExtraFrontmatter.isDeleted;
          delete taskData.rawExtraFrontmatter.deletedat;
          delete taskData.rawExtraFrontmatter.deletedAt;
          delete taskData.rawExtraFrontmatter.previousstatus;
          delete taskData.rawExtraFrontmatter.previousStatus;
        }
      }
      if (item.estimate !== void 0) {
        if (item.estimate === "" || item.estimate === null) {
          taskData.estimate = void 0;
          if (taskData.rawExtraFrontmatter) delete taskData.rawExtraFrontmatter.estimate;
        } else {
          taskData.estimate = item.estimate;
          if (taskData.rawExtraFrontmatter) taskData.rawExtraFrontmatter.estimate = String(item.estimate);
        }
      }
      if (item.impactedFile !== void 0) taskData.rawExtraFrontmatter.impactedFile = item.impactedFile;
      if (item.risk !== void 0) taskData.rawExtraFrontmatter.risk = item.risk;
      if (item.fix !== void 0) taskData.rawExtraFrontmatter.fix = item.fix;
      if (item.module !== void 0) taskData.rawExtraFrontmatter.module = item.module;
      if (item.epic !== void 0) taskData.rawExtraFrontmatter.epic = item.epic;
      if (item.category !== void 0) taskData.rawExtraFrontmatter.category = item.category;
      const isSprintProvided = item.sprint !== void 0 || item.targetSprint !== void 0 || item.sprints !== void 0;
      const rawSVal = isSprintProvided ? item.sprint || item.targetSprint || (item.sprints && item.sprints.length > 0 ? item.sprints[item.sprints.length - 1] : "") || "" : existingTask.sprint || existingTask.targetSprint || (existingTask.sprints && existingTask.sprints.length > 0 ? existingTask.sprints[existingTask.sprints.length - 1] : "") || "";
      const resolvedSprint = resolveLegibleSprint(project, rawSVal);
      if (resolvedSprint) {
        taskData.sprint = resolvedSprint;
        taskData.targetSprint = resolvedSprint;
        taskData.sprints = [resolvedSprint];
        taskData.rawExtraFrontmatter.sprint = resolvedSprint;
        taskData.rawExtraFrontmatter.targetSprint = resolvedSprint;
      } else {
        taskData.sprint = void 0;
        taskData.targetSprint = void 0;
        taskData.sprints = [];
        delete taskData.rawExtraFrontmatter.sprint;
        delete taskData.rawExtraFrontmatter.targetSprint;
      }
      const isReleaseProvided = item.release !== void 0 || item.targetRelease !== void 0 || item.milestone !== void 0 || item.releases !== void 0;
      if (isReleaseProvided) {
        const rawRVal = (item.release || item.targetRelease || item.milestone || (item.releases && item.releases.length > 0 ? item.releases[0] : "") || "").trim();
        const rVal = rawRVal.toLowerCase().includes("sprint") ? "" : rawRVal;
        const relArray = (Array.isArray(item.releases) ? item.releases.filter(Boolean) : rVal ? [rVal] : []).filter((r) => !r.toLowerCase().includes("sprint"));
        if (rVal || relArray.length > 0) {
          taskData.rawExtraFrontmatter.release = rVal || relArray[0];
          taskData.rawExtraFrontmatter.targetRelease = rVal || relArray[0];
          taskData.milestone = rVal || relArray[0];
          taskData.releases = relArray;
        } else {
          delete taskData.rawExtraFrontmatter.release;
          delete taskData.rawExtraFrontmatter.targetRelease;
          delete taskData.rawExtraFrontmatter.releases;
          taskData.milestone = void 0;
          taskData.releases = [];
        }
        if (project.repoPath) {
          const releasesPath = getProjectReleasesPath(project);
          if (releasesPath) {
            withFileLockSync(releasesPath, () => {
              if (fs5.existsSync(releasesPath)) {
                try {
                  const relsData = JSON.parse(fs5.readFileSync(releasesPath, "utf8"));
                  const taskCode = (taskData.id || "").toUpperCase();
                  let changed = false;
                  const targetVersion = (rVal || (relArray[0] || "")).replace(/^v/i, "");
                  let versionFound = false;
                  for (const rel of relsData) {
                    const vClean = (rel.version || "").replace(/^v/i, "");
                    if (!rel.itemCodes) rel.itemCodes = [];
                    const idx2 = rel.itemCodes.findIndex((c2) => c2.toUpperCase() === taskCode);
                    if (targetVersion && vClean === targetVersion) {
                      versionFound = true;
                      if (idx2 < 0) {
                        rel.itemCodes.push(taskData.id);
                        changed = true;
                      }
                    } else if (idx2 >= 0 && !relArray.some((rv) => rv.replace(/^v/i, "") === vClean)) {
                      rel.itemCodes.splice(idx2, 1);
                      changed = true;
                    }
                  }
                  if (targetVersion && !versionFound) {
                    const now = /* @__PURE__ */ new Date();
                    const todayStr = now.toISOString().slice(0, 10);
                    const targetDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
                    relsData.unshift({
                      id: `rel-${targetVersion.replace(/\./g, "-")}`,
                      projectId: project.id,
                      version: targetVersion,
                      date: todayStr,
                      targetDate,
                      status: "unreleased",
                      title: `v${targetVersion}`,
                      summary: `Versi\xF3n ${targetVersion} creada para planificaci\xF3n.`,
                      itemCodes: [taskData.id],
                      markdownContent: `## [${targetVersion}] - Unreleased

### \u{1F3AF} Resumen
*Versi\xF3n ${targetVersion} en planificaci\xF3n.*`,
                      createdAt: now.toISOString()
                    });
                    changed = true;
                  }
                  if (changed) {
                    atomicWriteFileSync(releasesPath, JSON.stringify(relsData, null, 2), "utf8");
                  }
                } catch (syncErr) {
                  console.warn("[gripm BacklogService] Error syncing releases.json when saving task:", syncErr.message);
                }
              }
            });
          }
        }
      }
      if (item.order !== void 0) taskData.rawExtraFrontmatter.order = item.order;
      const content = serializeBacklogMd(taskData);
      const targetFilename = existingFile || generateTaskFilename(taskData.id, taskData.title);
      const targetFilePath = path5.join(tasksDir, targetFilename);
      atomicWriteFileSync(targetFilePath, content, "utf8");
      return;
    }
    const jsonPath = resolveJsonBacklogPath(project);
    let currentBacklog = { project, items: [] };
    if (fs5.existsSync(jsonPath)) {
      try {
        currentBacklog = JSON.parse(fs5.readFileSync(jsonPath, "utf8"));
      } catch {
      }
    }
    const cleanId = String(item.code || item.id).toLowerCase();
    const idx = (currentBacklog.items || []).findIndex(
      (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
    );
    if (idx >= 0) {
      currentBacklog.items[idx] = { ...currentBacklog.items[idx], ...item, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    } else {
      currentBacklog.items.push({ ...item, createdAt: (/* @__PURE__ */ new Date()).toISOString(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    }
    currentBacklog.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    atomicWriteFileSync(jsonPath, JSON.stringify(currentBacklog, null, 2), "utf8");
  }
};

// scripts/gripm-cli.ts
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path6.dirname(__filename3);
var ROOT_DIR = path6.resolve(__dirname3, "..");
function getRegistry() {
  const reg = loadRegistryFile(ROOT_DIR);
  if (!reg || !Array.isArray(reg.projects)) {
    return { activeProjectId: "", projects: [] };
  }
  return reg;
}
function getProject(projectId) {
  const registry = getRegistry();
  if (projectId) {
    const found = registry.projects.find((p) => p.id === projectId || p.codePrefix?.toLowerCase() === projectId.toLowerCase());
    if (found) return found;
  }
  const cwd = process.cwd();
  const matched = registry.projects.find((p) => p.repoPath && path6.normalize(p.repoPath) === path6.normalize(cwd));
  if (matched) {
    const identity = resolveProjectIdentity(matched.repoPath || cwd);
    return {
      ...matched,
      id: identity.id || matched.id,
      name: identity.name || matched.name,
      codePrefix: identity.codePrefix || matched.codePrefix
    };
  }
  const hasMdBacklog = fs6.existsSync(path6.join(cwd, "backlog/tasks"));
  const hasJsonBacklog = fs6.existsSync(path6.join(cwd, ".gripm/backlog.json"));
  if (hasMdBacklog || hasJsonBacklog) {
    const identity = resolveProjectIdentity(cwd);
    return {
      id: identity.id,
      name: identity.name,
      codePrefix: identity.codePrefix,
      repoPath: cwd,
      storageType: hasMdBacklog ? "markdown" : "json",
      backlogDir: "backlog",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (registry.activeProjectId) {
    const active = registry.projects.find((p) => p.id === registry.activeProjectId);
    if (active) return active;
  }
  return registry.projects[0];
}
function loadTasks(project, options = {}) {
  if (!project) return [];
  if (project.storageType === "markdown" && project.repoPath) {
    if (options.staged) {
      try {
        const out = execSync2("git ls-files -s -z backlog/tasks/", {
          cwd: project.repoPath,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"]
        });
        const entries = [];
        for (const chunk of out.split("\0")) {
          if (!chunk.endsWith(".md")) continue;
          const tabIdx = chunk.indexOf("	");
          if (tabIdx === -1) continue;
          const meta = chunk.slice(0, tabIdx).trim().split(/\s+/);
          const relPath = chunk.slice(tabIdx + 1);
          entries.push({ sha: meta[1], relPath, file: path6.basename(relPath) });
        }
        entries.sort((a, b) => a.file.localeCompare(b.file, void 0, { numeric: true }));
        const res = spawnSync("git", ["cat-file", "--batch"], {
          cwd: project.repoPath,
          input: entries.map((e) => e.sha).join("\n") + "\n",
          maxBuffer: 50 * 1024 * 1024
        });
        const buf = res.stdout;
        let offset = 0;
        const items = [];
        for (let i = 0; i < entries.length; i++) {
          const nlIdx = buf.indexOf(10, offset);
          if (nlIdx === -1) break;
          const header = buf.slice(offset, nlIdx).toString("utf8");
          const size = parseInt(header.split(" ")[2], 10);
          const contentStart = nlIdx + 1;
          const contentEnd = contentStart + size;
          const raw = buf.slice(contentStart, contentEnd).toString("utf8");
          offset = contentEnd + 1;
          const entry = entries[i];
          const fallbackId = entry.file.split(" - ")[0] || entry.file.replace(/\.md$/, "");
          const task = parseBacklogMd(raw, fallbackId);
          items.push({
            id: task.id || fallbackId,
            code: task.id || fallbackId,
            title: task.title,
            status: normalizeStatus(task.status),
            priority: normalizePriority(task.priority),
            type: task.type,
            milestone: task.milestone,
            sprint: task.sprint || task.targetSprint || task.rawExtraFrontmatter?.sprint,
            targetSprint: task.targetSprint || task.sprint || task.rawExtraFrontmatter?.sprint || task.milestone,
            acceptanceCriteria: task.acceptanceCriteria || [],
            labels: task.labels || [],
            _file: entry.file,
            _relPath: entry.relPath,
            _raw: task
          });
        }
        return items.filter((t) => !t._raw?.isDeleted && t._raw?.isDeleted !== "true");
      } catch {
      }
    }
  }
  return BacklogService.listTasks(project, { includeDeleted: false });
}
var isColorSupported = !("NO_COLOR" in process.env) && (process.env.FORCE_COLOR === "1" || process.stdout?.isTTY && process.env.TERM !== "dumb");
var c = {
  bold: (s) => isColorSupported ? `\x1B[1m${s}\x1B[22m` : s,
  dim: (s) => isColorSupported ? `\x1B[2m${s}\x1B[22m` : s,
  cyan: (s) => isColorSupported ? `\x1B[36m${s}\x1B[39m` : s,
  green: (s) => isColorSupported ? `\x1B[32m${s}\x1B[39m` : s,
  yellow: (s) => isColorSupported ? `\x1B[33m${s}\x1B[39m` : s,
  red: (s) => isColorSupported ? `\x1B[31m${s}\x1B[39m` : s
};
function printUsage() {
  console.log(`
  ${c.bold("gripm")} ${c.dim("\xB7")} Gesti\xF3n, Auditor\xEDa y Mutaciones de Backlog

${c.bold("Uso:")}
  gripm [comando] [opciones]
  npm run tasks -- [opciones]

${c.bold("Comandos / Modos:")}
  list                 (Por defecto) Lista las tareas con filtros aplicados
  --stats              Muestra un panel consolidado de m\xE9tricas y agrupaci\xF3n por prefijo
  --update-status <s>  Actualiza masivamente el estado de todas las tareas filtradas

${c.bold("Filtros:")}
  --open, -o           Muestra solo tareas abiertas (excluye done, dismissed, released)
  --prefix <prefijo>   Filtra por prefijo de c\xF3digo (ej: FEAT, BUG, DEV)
  --ids <id1,id2>      Filtra por lista expl\xEDcita de IDs separados por coma
  --status <estado>    Filtra por estado (draft, doing, review, ready, done)
  --priority <prio>    Filtra por prioridad (urgent, high, medium, low)
  --sprint <milestone> Filtra por sprint / milestone (ej: v1.1.0)
  --project <id>       ID del proyecto (por defecto el activo)
  --limit <n>          Cantidad m\xE1xima a mostrar (por defecto 30)
  --search <texto>     Filtra por texto en t\xEDtulo o etiquetas
  --json               Emite la salida en formato JSON
  --help, -h           Muestra esta ayuda
`);
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args[0] === "help") {
    printUsage();
    return;
  }
  const showStats = args.includes("--stats");
  const openOnly = args.includes("--open") || args.includes("-o") || args.includes("--active");
  const asJson = args.includes("--json");
  const getArgValue = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("-") ? args[idx + 1] : void 0;
  };
  const status = getArgValue("--status");
  const priority = getArgValue("--priority");
  const sprint = getArgValue("--sprint") || getArgValue("--milestone");
  const projectId = getArgValue("--project");
  const search = getArgValue("--search") || getArgValue("-s");
  const prefix = getArgValue("--prefix") || getArgValue("-p");
  const idsArg = getArgValue("--ids");
  const updateStatus = getArgValue("--update-status");
  const limitStr = getArgValue("--limit") || getArgValue("-n");
  const limit = limitStr ? parseInt(limitStr, 10) : showStats ? 999999 : 30;
  const project = getProject(projectId);
  if (!project) {
    console.error(`  ${c.red("\u2716")} No se encontr\xF3 ning\xFAn proyecto registrado en gripm.`);
    process.exit(1);
  }
  let tasks = loadTasks(project);
  if (args[0] === "export" || args.includes("--export")) {
    const isStaged = args.includes("--staged");
    const tasksToExport = isStaged ? loadTasks(project, { staged: true }) : tasks;
    const md = generateMonolithicBacklogMd(project.name, tasksToExport.map((t) => t._raw || {
      id: t.id || t.code,
      title: t.title,
      status: t.status,
      type: t.type,
      priority: t.priority,
      milestone: t.milestone,
      description: t.description || "",
      acceptanceCriteria: t.acceptanceCriteria || []
    }));
    const exportPath = path6.join(project.repoPath || process.cwd(), "BACKLOG.md");
    if (args.includes("--check")) {
      let existing = "";
      if (isStaged) {
        try {
          existing = execFileSync("git", ["show", ":BACKLOG.md"], {
            cwd: project.repoPath || process.cwd(),
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
          });
        } catch {
          console.error(`  ${c.red("\u2716")} BACKLOG.md no est\xE1 presente en el \xEDndice de Git (stage).`);
          process.exit(1);
        }
      } else {
        existing = fs6.existsSync(exportPath) ? fs6.readFileSync(exportPath, "utf8") : "";
      }
      const normalizeLf = (s) => s.replace(/\r\n/g, "\n").trim();
      const stripDateHeader = (s) => s.replace(/^> Consolidado generado el \d{4}-\d{2}-\d{2} por gripm( ⚡)?\n?/m, "");
      if (stripDateHeader(normalizeLf(existing)) !== stripDateHeader(normalizeLf(md))) {
        const differingFiles = [];
        for (const t of tasksToExport) {
          const taskId = String(t.id || t.code || "");
          const escapedId = taskId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`#### \\[${escapedId}\\][\\s\\S]*?\\n---`);
          const existingMatch = existing.match(regex);
          const genMatch = md.match(regex);
          if (!existingMatch || !genMatch || normalizeLf(existingMatch[0]) !== normalizeLf(genMatch[0])) {
            differingFiles.push(t._file ? `backlog/tasks/${t._file}` : taskId);
          }
        }
        if (differingFiles.length > 0) {
          console.error(`  ${c.red("\u2716")} BACKLOG.md ${isStaged ? "en el \xEDndice de Git " : ""}no coincide con el estado de las tareas:`);
          differingFiles.slice(0, 5).forEach((f) => console.error(`    ${c.dim("\u2022")} ${f}`));
          if (differingFiles.length > 5) {
            console.error(`    ${c.dim("...")} y ${differingFiles.length - 5} tarea(s) m\xE1s.`);
          }
          console.error(`    ${c.yellow("\u25B2")} Acci\xF3n requerida: Regenera BACKLOG.md ${isStaged ? "desde el \xEDndice y stagealo" : "con npm run backlog:sync"}.
`);
        } else {
          console.error(`  ${c.red("\u2716")} BACKLOG.md ${isStaged ? "en el \xEDndice de Git " : ""}est\xE1 desactualizado respecto a las tareas en backlog/tasks/. Ejecuta: npm run backlog:sync`);
        }
        process.exit(1);
      }
      console.log(`  ${c.green("\u2714")} BACKLOG.md ${isStaged ? "(\xEDndice Git) " : ""}100% sincronizado (modo solo lectura).`);
      return;
    }
    atomicWriteFileSync(exportPath, md, "utf8");
    console.log(`  ${c.green("\u2714")} Backlog consolidado exportado exitosamente a: ${exportPath}`);
    return;
  }
  if (showStats) {
    const total = tasks.length;
    const closedStatuses = ["done", "dismissed", "cancelled", "released"];
    let openCount = 0;
    let doneCount = 0;
    const byStatus = {};
    const byPriority = {};
    const byPrefix = {};
    for (const t of tasks) {
      const isClosed = closedStatuses.includes(t.status);
      if (isClosed) doneCount++;
      else openCount++;
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      const code = String(t.code || t.id || "");
      const parts = code.split("-");
      const pfx = parts.length > 2 ? `${parts[0]}-${parts[1]}` : parts[0] || "OTHER";
      if (!byPrefix[pfx]) {
        byPrefix[pfx] = { total: 0, open: 0, done: 0 };
      }
      byPrefix[pfx].total++;
      if (isClosed) byPrefix[pfx].done++;
      else byPrefix[pfx].open++;
    }
    const completionRate = total > 0 ? Math.round(doneCount / total * 100) : 0;
    if (asJson) {
      console.log(JSON.stringify({
        project: { id: project.id, name: project.name, storage: project.storageType },
        summary: { total, open: openCount, done: doneCount, completionRate: `${completionRate}%` },
        byStatus,
        byPriority,
        byPrefix
      }, null, 2));
      return;
    }
    console.log(`
  ${c.bold("gripm")} ${c.dim("\xB7")} M\xE9tricas de Backlog: ${c.bold(project.name)} ${c.dim(`[${project.storageType.toUpperCase()}]`)}
`);
    console.log(`  Total \xCDtems:       ${c.bold(String(total))}`);
    console.log(`  Abiertos:          ${openCount} ${c.dim(`(${total > 0 ? Math.round(openCount / total * 100) : 0}%)`)}`);
    console.log(`  Terminados:        ${doneCount} ${c.dim(`(${completionRate}%)`)}`);
    console.log(`  Tasa de Avance:    [${c.green("\u2588".repeat(Math.round(completionRate / 5)))}${c.dim("\u2591".repeat(20 - Math.round(completionRate / 5)))}] ${completionRate}%
`);
    console.log(`  ${c.bold("Por Estado:")}`);
    for (const [st, cnt] of Object.entries(byStatus)) {
      console.log(`    ${c.dim("\u2022")} ${st.padEnd(12, " ")} : ${cnt}`);
    }
    console.log(`
  ${c.bold("Agrupaci\xF3n por Prefijo de Tarea:")}`);
    console.log(`    Prefijo          Total      Abiertas   Terminadas`);
    console.log(`    ${c.dim("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")}`);
    for (const [pfx, data] of Object.entries(byPrefix)) {
      console.log(`    ${pfx.padEnd(15, " ")}  ${String(data.total).padEnd(9, " ")}  ${String(data.open).padEnd(9, " ")}  ${data.done}`);
    }
    console.log("");
    return;
  }
  if (openOnly) {
    const closed = ["done", "dismissed", "cancelled", "released"];
    tasks = tasks.filter((t) => !closed.includes(t.status));
  }
  if (prefix) {
    const pfxLower = prefix.toLowerCase();
    tasks = tasks.filter(
      (t) => t.code && t.code.toLowerCase().startsWith(pfxLower) || t.id && t.id.toLowerCase().startsWith(pfxLower)
    );
  }
  if (idsArg) {
    const setIds = new Set(idsArg.split(",").map((s) => s.trim().toLowerCase()));
    tasks = tasks.filter(
      (t) => t.code && setIds.has(t.code.toLowerCase()) || t.id && setIds.has(t.id.toLowerCase())
    );
  }
  if (status) {
    const sNorm = normalizeStatus(status);
    tasks = tasks.filter((t) => t.status === sNorm);
  }
  if (priority) {
    const pNorm = normalizePriority(priority);
    tasks = tasks.filter((t) => t.priority === pNorm);
  }
  if (sprint) {
    const spLower = sprint.toLowerCase();
    tasks = tasks.filter(
      (t) => t.sprint && String(t.sprint).toLowerCase() === spLower || t.targetSprint && String(t.targetSprint).toLowerCase() === spLower || t.milestone && String(t.milestone).toLowerCase() === spLower
    );
  }
  if (search) {
    const q = search.toLowerCase();
    tasks = tasks.filter(
      (t) => t.title && t.title.toLowerCase().includes(q) || t.code && t.code.toLowerCase().includes(q) || t.id && t.id.toLowerCase().includes(q) || t.labels && t.labels.some((l) => l.toLowerCase().includes(q))
    );
  }
  if (updateStatus) {
    const newStatus = normalizeStatus(updateStatus);
    if (tasks.length === 0) {
      console.log(`  ${c.yellow("\u25B2")} No hay tareas que coincidan con los filtros para actualizar.`);
      return;
    }
    const force = args.includes("--force") || args.includes("-f");
    const matchedIds = tasks.map((t) => t.code || t.id);
    try {
      const res = BacklogService.bulkUpdateTasks(
        project,
        { taskIds: matchedIds },
        { status: newStatus },
        { force }
      );
      if (res.warning) {
        console.warn(`
  ${c.yellow("\u25B2")} ${res.warning}`);
      }
      console.log(`
  ${c.green("\u2714")} Actualizaci\xF3n masiva completada: ${res.updatedCount} tareas pasadas a estado '${newStatus}'.
`);
    } catch (err) {
      console.error(`
  ${c.red("\u2716")} Error al actualizar tareas: ${err.message}
`);
      process.exit(1);
    }
    return;
  }
  const totalFiltered = tasks.length;
  const sliced = tasks.slice(0, limit);
  if (asJson) {
    console.log(JSON.stringify({
      project: { id: project.id, name: project.name, storage: project.storageType },
      total: totalFiltered,
      showing: sliced.length,
      items: sliced
    }, null, 2));
    return;
  }
  console.log(`
  ${c.bold("gripm")} ${c.dim("\xB7")} Backlog: ${project.name} ${c.dim(`(${project.storageType.toUpperCase()})`)}`);
  console.log(`  Mostrando ${sliced.length} de ${totalFiltered} tareas ${openOnly ? "abiertas" : ""}:
`);
  if (sliced.length === 0) {
    console.log("  (No hay tareas que coincidan con los filtros)\n");
    return;
  }
  sliced.forEach((t, i) => {
    const acList = t.acceptanceCriteria || t.acceptanceCriteriaList || [];
    const acProgress = acList.length > 0 ? ` [${acList.filter((ac) => ac.checked).length}/${acList.length} AC]` : "";
    const sprintTag = t.milestone || t.targetSprint ? ` <${t.milestone || t.targetSprint}>` : "";
    const statusMarker = t.status === "doing" ? c.cyan("\u25CF") : t.status === "review" ? c.yellow("\u25D0") : t.status === "ready" ? c.green("\u25CE") : t.status === "done" ? c.green("\u2714") : c.dim("\u25CB");
    console.log(`  ${String(i + 1).padStart(2, " ")}. ${statusMarker} [${t.code || t.id}] (${t.status.toUpperCase()} / ${t.priority})${sprintTag} - ${t.title}${acProgress}`);
  });
  if (totalFiltered > limit) {
    console.log(`
  ... y ${totalFiltered - limit} tareas m\xE1s (usa --limit ${totalFiltered} para ver todas)`);
  }
  console.log("");
}
main().catch((err) => {
  console.error(`  ${c.red("\u2716")} Error:`, err.message);
  process.exit(1);
});
