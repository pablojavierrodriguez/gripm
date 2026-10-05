#!/usr/bin/env node

// scripts/mcp-server.ts
import fs3 from "node:fs";
import path3 from "node:path";
import readline from "node:readline";
import { fileURLToPath as fileURLToPath2 } from "node:url";

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
function extractSectionBlock(body, headerName) {
  const headerRegex = new RegExp(`^##\\s+${headerName}\\b[^\r
]*`, "im");
  const match = body.match(headerRegex);
  if (!match || match.index === void 0) return "";
  const startIndex = match.index + match[0].length;
  const rest = body.slice(startIndex);
  const nextHeaderMatch = rest.match(/\r?\n##\s+[^\r\n]+/);
  const endIndex = nextHeaderMatch && nextHeaderMatch.index !== void 0 ? startIndex + nextHeaderMatch.index : body.length;
  return body.slice(startIndex, endIndex);
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
  let bodyContent = content;
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const rawFm = frontmatterMatch[1];
    bodyContent = frontmatterMatch[2];
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
        } else if (currentKey === "releases") result.releases = currentList;
      }
      inList = false;
      currentList = [];
    };
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("- ")) {
        const itemVal = trimmed.replace(/^- /, "").trim().replace(/^['"]|['"]$/g, "");
        currentList.push(itemVal);
        continue;
      }
      if (inList && !line.startsWith(" ") && !line.startsWith("	")) {
        finalizeList();
      }
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const rawVal = line.slice(colonIdx + 1).trim();
        const cleanVal = rawVal.replace(/^['"]|['"]$/g, "");
        currentKey = key;
        if (!rawVal) {
          inList = true;
          currentList = [];
          continue;
        }
        if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
          const items = rawVal.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
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
          } else if (key === "releases") result.releases = items;
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
          default:
            if (result.rawExtraFrontmatter) {
              result.rawExtraFrontmatter[key] = cleanVal;
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
  const descTarget = descBlock || bodyContent;
  const descMatch = descTarget.match(/<!--\s*SECTION:DESCRIPTION:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:DESCRIPTION:END\s*-->/i);
  if (descMatch) {
    result.description = unescapeSectionMarkers(descMatch[1].trim());
  } else {
    const descHeaderMatch = descTarget.match(/## Description\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (descHeaderMatch) {
      result.description = unescapeSectionMarkers(descHeaderMatch[1].trim());
    } else if (descBlock) {
      result.description = unescapeSectionMarkers(descBlock.trim());
    }
  }
  const acBlock = extractSectionBlock(bodyContent, "Acceptance Criteria");
  const acTarget = acBlock || bodyContent;
  const acMatch = acTarget.match(/<!--\s*AC:BEGIN\s*-->([\s\S]*?)<!--\s*AC:END\s*-->/i);
  const acText = acMatch ? acMatch[1] : acTarget.match(/## Acceptance Criteria\r?\n([\s\S]*?)(?=\r?\n## |$)/i)?.[1] || "";
  if (acText) {
    const acLines = acText.split(/\r?\n/);
    const parsedAC = [];
    let autoIndex = 1;
    for (const line of acLines) {
      const match = line.match(/^-\s*\[([ xX])\]\s*(?:#(\d+)\s+)?(.*)$/);
      if (match) {
        const checked = match[1].toLowerCase() === "x";
        const num = match[2] ? parseInt(match[2], 10) : autoIndex++;
        const text = unescapeSectionMarkers(match[3].trim());
        parsedAC.push({ index: num, text, checked });
      }
    }
    result.acceptanceCriteria = parsedAC;
  }
  const planBlock = extractSectionBlock(bodyContent, "Implementation Plan");
  const planTarget = planBlock || bodyContent;
  const planMatch = planTarget.match(/<!--\s*SECTION:PLAN:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:PLAN:END\s*-->/i);
  if (planMatch) {
    result.implementationPlan = unescapeSectionMarkers(planMatch[1].trim());
  } else {
    const planHeaderMatch = planTarget.match(/## Implementation Plan\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (planHeaderMatch) {
      result.implementationPlan = unescapeSectionMarkers(planHeaderMatch[1].trim());
    }
  }
  const notesBlock = extractSectionBlock(bodyContent, "Implementation Notes");
  const notesTarget = notesBlock || bodyContent;
  const notesMatch = notesTarget.match(/<!--\s*SECTION:NOTES:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:NOTES:END\s*-->/i);
  if (notesMatch) {
    result.implementationNotes = unescapeSectionMarkers(notesMatch[1].trim());
  } else {
    const notesHeaderMatch = notesTarget.match(/## Implementation Notes\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (notesHeaderMatch) {
      result.implementationNotes = unescapeSectionMarkers(notesHeaderMatch[1].trim());
    }
  }
  const summaryBlock = extractSectionBlock(bodyContent, "Final Summary");
  const summaryTarget = summaryBlock || bodyContent;
  const summaryMatch = summaryTarget.match(/<!--\s*SECTION:FINAL_SUMMARY:BEGIN\s*-->([\s\S]*?)<!--\s*SECTION:FINAL_SUMMARY:END\s*-->/i);
  if (summaryMatch) {
    result.finalSummary = unescapeSectionMarkers(summaryMatch[1].trim());
  } else {
    const summaryHeaderMatch = summaryTarget.match(/## Final Summary\r?\n([\s\S]*?)(?=\r?\n## |$)/i);
    if (summaryHeaderMatch) {
      result.finalSummary = unescapeSectionMarkers(summaryHeaderMatch[1].trim());
    }
  }
  return result;
}
function serializeBacklogMd(task) {
  const frontmatterLines = ["---"];
  frontmatterLines.push(`id: ${task.id}`);
  frontmatterLines.push(`title: ${JSON.stringify(task.title || "Sin t\xEDtulo")}`);
  frontmatterLines.push(`status: ${formatStatusForMd(task.status)}`);
  if (task.assignees && task.assignees.length > 0) {
    frontmatterLines.push("assignee:");
    task.assignees.forEach((a) => frontmatterLines.push(`  - ${JSON.stringify(a)}`));
  }
  const nowStr = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 16);
  frontmatterLines.push(`created_date: '${task.createdDate || nowStr}'`);
  frontmatterLines.push(`updated_date: '${nowStr}'`);
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
    frontmatterLines.push(`type: ${task.type}`);
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
  if (task.rawExtraFrontmatter) {
    for (const [k, v] of Object.entries(task.rawExtraFrontmatter)) {
      if (!["id", "title", "status", "assignee", "created_date", "updated_date", "labels", "dependencies", "priority", "type", "milestone", "parent", "parentid", "blocks", "blocked_by", "blockedby", "related_to", "relatedto", "sprints", "releases", "sprint", "targetsprint", "isdeleted", "deletedat", "previousstatus"].includes(k.toLowerCase())) {
        frontmatterLines.push(`${k}: ${JSON.stringify(v)}`);
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
  const cleanId = (id || "TASK").trim().toUpperCase().replace(/--+/g, "-");
  let cleanTitle = (title || "task").replace(/[/\\:*?"<>|]/g, "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleanTitle.length > 200) {
    cleanTitle = cleanTitle.slice(0, 200).trim();
  }
  return `${cleanId} - ${cleanTitle || "Task"}.md`;
}
function generateMonolithicBacklogMd(projectName, items) {
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const lines = [
    `# Backlog: ${projectName}`,
    `> Consolidado generado el ${now} por DevBoard \u26A1`,
    "",
    "## Resumen de Estados",
    ""
  ];
  const statuses = ["ideas", "doing", "review", "ready", "draft", "done", "dismissed"];
  const grouped = {
    ideas: [],
    doing: [],
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
      dismissed: "\u{1F4E6} Archivadas / Descartadas"
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
function getDevBoardHomeDir() {
  if (process.env.GRIPM_HOME) {
    return path.resolve(process.env.GRIPM_HOME);
  }
  if (process.env.DEVBOARD_HOME) {
    return path.resolve(process.env.DEVBOARD_HOME);
  }
  if (process.env.XDG_CONFIG_HOME) {
    const gripmDir = path.join(process.env.XDG_CONFIG_HOME, "gripm");
    if (fs.existsSync(gripmDir)) return gripmDir;
    const devboardDir = path.join(process.env.XDG_CONFIG_HOME, "devboard");
    if (fs.existsSync(devboardDir)) return devboardDir;
    return gripmDir;
  }
  const primaryDir = path.join(os.homedir(), ".gripm");
  const legacyDir = path.join(os.homedir(), ".devboard");
  if (fs.existsSync(legacyDir) && !fs.existsSync(primaryDir)) {
    return legacyDir;
  }
  return primaryDir;
}
function getRegistryPath(pkgRoot = DEFAULT_PKG_ROOT) {
  if (process.env.GRIPM_REGISTRY_PATH) {
    return path.resolve(process.env.GRIPM_REGISTRY_PATH);
  }
  if (process.env.DEVBOARD_REGISTRY_PATH) {
    return path.resolve(process.env.DEVBOARD_REGISTRY_PATH);
  }
  return path.join(getDevBoardHomeDir(), "registry.json");
}
function getLegacyRegistryPath(pkgRoot = DEFAULT_PKG_ROOT) {
  if (!pkgRoot) return null;
  return path.join(pkgRoot, "data/projects-registry.json");
}
function loadRegistryFile(pkgRoot = DEFAULT_PKG_ROOT) {
  const primaryPath = getRegistryPath(pkgRoot);
  const legacyPath = getLegacyRegistryPath(pkgRoot);
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
  if (legacyPath) {
    try {
      if (fs.existsSync(legacyPath)) {
        const data = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
        if (data && Array.isArray(data.projects)) {
          try {
            saveRegistryFile(data, pkgRoot);
          } catch {
          }
          return data;
        }
      }
    } catch {
    }
  }
  return { activeProjectId: "", projects: [] };
}
function saveRegistryFile(registry, pkgRoot = DEFAULT_PKG_ROOT) {
  const targetPath = getRegistryPath(pkgRoot);
  const legacyPath = getLegacyRegistryPath(pkgRoot);
  let saved = false;
  try {
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, JSON.stringify(registry, null, 2), "utf8");
    saved = true;
  } catch {
  }
  if (!saved && legacyPath) {
    try {
      const legacyDir = path.dirname(legacyPath);
      if (!fs.existsSync(legacyDir)) {
        fs.mkdirSync(legacyDir, { recursive: true });
      }
      fs.writeFileSync(legacyPath, JSON.stringify(registry, null, 2), "utf8");
    } catch {
    }
  }
}
function resolveProjectIdentity(repoPath) {
  const normalized = path.resolve(repoPath);
  let name = "";
  let explicitId = null;
  let codePrefix = "";
  const gripmCfgPath = path.join(normalized, ".gripm", "config.json");
  const devboardCfgPath = path.join(normalized, ".devboard", "config.json");
  const targetCfgPath = fs.existsSync(gripmCfgPath) ? gripmCfgPath : devboardCfgPath;
  if (fs.existsSync(targetCfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(targetCfgPath, "utf8"));
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

// scripts/updateChecker.js
import fs2 from "node:fs";
import path2 from "node:path";
var CACHE_FILE_NAME = "update-cache.json";
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var GITHUB_REPO = "pablojavierrodriguez/gripm";
function semverGreaterThan(target, current) {
  if (!target || !current) return false;
  const cleanT = target.replace(/^v/, "").trim().split(".").map((n) => parseInt(n, 10) || 0);
  const cleanC = current.replace(/^v/, "").trim().split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const partT = cleanT[i] || 0;
    const partC = cleanC[i] || 0;
    if (partT > partC) return true;
    if (partT < partC) return false;
  }
  return false;
}
function getUpdateCachePath() {
  if (process.env.GRIPM_UPDATE_CACHE_PATH) {
    return path2.resolve(process.env.GRIPM_UPDATE_CACHE_PATH);
  }
  if (process.env.DEVBOARD_UPDATE_CACHE_PATH) {
    return path2.resolve(process.env.DEVBOARD_UPDATE_CACHE_PATH);
  }
  return path2.join(getDevBoardHomeDir(), CACHE_FILE_NAME);
}
function readUpdateCache() {
  try {
    const cachePath = getUpdateCachePath();
    if (!fs2.existsSync(cachePath)) return null;
    const content = fs2.readFileSync(cachePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function writeUpdateCache(data) {
  const cachePath = getUpdateCachePath();
  try {
    const dir = path2.dirname(cachePath);
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
    fs2.writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
  }
}
function isUpdateCheckDisabled() {
  const env = process.env.GRIPM_NO_UPDATE_CHECK || process.env.DEVBOARD_NO_UPDATE_CHECK;
  return env === "1" || env === "true";
}
function formatUpdateBanner(currentVersion2, latestVersion) {
  const cleanCurrent = currentVersion2.replace(/^v/, "");
  const cleanLatest = latestVersion.replace(/^v/, "");
  const versionLine = `  \u2728 \xA1Nueva versi\xF3n disponible!  v${cleanCurrent} \u2192 v${cleanLatest}`;
  return [
    "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
    `\u2502${versionLine.padEnd(60)}\u2502`,
    "\u2502                                                            \u2502",
    "\u2502  Instrucciones para actualizar:                            \u2502",
    "\u2502  \u2022 Con git: cd <repo> && git pull && npm run build         \u2502",
    "\u2502  \u2022 Con npm: npm i -g @gripm/board@latest (o gripm@latest)  \u2502",
    "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"
  ].join("\n");
}
function getCachedUpdateInfo(currentVersion2) {
  if (isUpdateCheckDisabled()) return null;
  const cached = readUpdateCache();
  if (cached && cached.hasUpdate && cached.latestVersion) {
    if (semverGreaterThan(cached.latestVersion, currentVersion2)) {
      return {
        hasUpdate: true,
        currentVersion: currentVersion2,
        latestVersion: cached.latestVersion,
        url: cached.url || `https://github.com/${GITHUB_REPO}/releases/latest`
      };
    }
  }
  return null;
}
async function checkForUpdates(currentVersion2, { force = false, timeoutMs = 2e3 } = {}) {
  if (isUpdateCheckDisabled()) {
    return { hasUpdate: false, currentVersion: currentVersion2, latestVersion: currentVersion2, disabled: true };
  }
  const cached = readUpdateCache();
  const now = Date.now();
  if (!force && cached && cached.lastCheck && now - cached.lastCheck < CACHE_TTL_MS) {
    const hasUpdate = semverGreaterThan(cached.latestVersion, currentVersion2);
    return {
      hasUpdate,
      currentVersion: currentVersion2,
      latestVersion: cached.latestVersion || currentVersion2,
      url: cached.url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      fromCache: true
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "gripm-cli",
        "Accept": "application/vnd.github.v3+json"
      }
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const rawTag = data.tag_name || data.name || "";
      const latestVersion = rawTag.replace(/^v/, "").trim();
      const hasUpdate = semverGreaterThan(latestVersion, currentVersion2);
      const url = data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
      const cacheData = {
        lastCheck: now,
        currentVersion: currentVersion2,
        latestVersion,
        hasUpdate,
        url
      };
      writeUpdateCache(cacheData);
      return {
        hasUpdate,
        currentVersion: currentVersion2,
        latestVersion,
        url,
        fromCache: false
      };
    } else {
      if (cached) {
        writeUpdateCache({ ...cached, lastCheck: now });
      } else {
        writeUpdateCache({ lastCheck: now, currentVersion: currentVersion2, latestVersion: currentVersion2, hasUpdate: false });
      }
    }
  } catch {
    if (cached) {
      writeUpdateCache({ ...cached, lastCheck: now });
    } else {
      writeUpdateCache({ lastCheck: now, currentVersion: currentVersion2, latestVersion: currentVersion2, hasUpdate: false });
    }
  }
  return {
    hasUpdate: cached ? semverGreaterThan(cached.latestVersion, currentVersion2) : false,
    currentVersion: currentVersion2,
    latestVersion: cached?.latestVersion || currentVersion2,
    fromCache: true
  };
}

// scripts/mcp-server.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
var ROOT_DIR = path3.resolve(__dirname2, "..");
var DEMO_FILE = path3.join(ROOT_DIR, "data/demo-backlog.json");
var currentVersion = "0.5.0";
try {
  const pkg = JSON.parse(fs3.readFileSync(path3.join(ROOT_DIR, "package.json"), "utf8"));
  if (pkg.version) currentVersion = pkg.version;
} catch {
}
try {
  const cached = getCachedUpdateInfo(currentVersion);
  if (cached && cached.hasUpdate) {
    process.stderr.write("\n" + formatUpdateBanner(currentVersion, cached.latestVersion) + "\n\n");
  }
  checkForUpdates(currentVersion).then((res) => {
    if (res.hasUpdate && !cached?.hasUpdate) {
      process.stderr.write("\n" + formatUpdateBanner(currentVersion, res.latestVersion) + "\n\n");
    }
  }).catch(() => {
  });
} catch {
}
function getRegistry() {
  let reg = loadRegistryFile(ROOT_DIR);
  if (!reg || !Array.isArray(reg.projects)) {
    reg = { activeProjectId: "", projects: [] };
  }
  const args = process.argv.slice(2);
  let cliRepo = null;
  const repoIdx = args.findIndex((a) => a === "--repo" || a === "-p");
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    cliRepo = path3.resolve(args[repoIdx + 1]);
  }
  const targetRepo = cliRepo || process.cwd();
  const hasMdBacklog = fs3.existsSync(path3.join(targetRepo, "backlog/tasks"));
  const hasJsonBacklog = fs3.existsSync(path3.join(targetRepo, ".gripm/backlog.json")) || fs3.existsSync(path3.join(targetRepo, ".devboard/backlog.json"));
  if (hasMdBacklog || hasJsonBacklog || cliRepo) {
    const existing = reg.projects.find((p) => p.repoPath && path3.resolve(p.repoPath) === targetRepo);
    const identity = resolveProjectIdentity(targetRepo);
    if (existing) {
      if (identity.id && identity.id !== existing.id) {
        existing.id = identity.id;
      }
      existing.name = identity.name || existing.name;
      existing.codePrefix = identity.codePrefix || existing.codePrefix;
      reg.activeProjectId = existing.id;
    } else {
      const synthProject = {
        id: identity.id,
        name: identity.name,
        codePrefix: identity.codePrefix,
        repoPath: targetRepo,
        storageType: hasMdBacklog ? "markdown" : "json",
        backlogDir: "backlog",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      reg.projects.unshift(synthProject);
      reg.activeProjectId = identity.id;
    }
  }
  return reg;
}
function getTasksDir(project) {
  const dir = project.backlogDir || "backlog";
  return path3.join(project.repoPath || ROOT_DIR, dir, "tasks");
}
function resolveLegibleSprint(project, val) {
  if (!val) return void 0;
  const clean = String(val).trim();
  if (!clean) return void 0;
  const lower = clean.toLowerCase();
  if (["backlog-futuro", "sin-sprint", "sin sprint", "backlog", "none", "null"].includes(lower)) {
    return void 0;
  }
  if (!project.repoPath) return clean;
  const sprintsPath = path3.join(project.repoPath, project.backlogDir || "backlog", "sprints.json");
  if (fs3.existsSync(sprintsPath)) {
    try {
      const registeredSprints = JSON.parse(fs3.readFileSync(sprintsPath, "utf8"));
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
function getProjectJsonBacklogPath(project) {
  if (project.isDemo) return DEMO_FILE;
  if (project.repoPath) {
    const gripmPath = path3.join(project.repoPath, ".gripm/backlog.json");
    if (fs3.existsSync(gripmPath)) return gripmPath;
    const devboardPath = path3.join(project.repoPath, ".devboard/backlog.json");
    if (fs3.existsSync(devboardPath)) return devboardPath;
    return gripmPath;
  }
  return path3.join(ROOT_DIR, `data/${project.id}-backlog.json`);
}
function readTasksForProject(project) {
  if (project.storageType === "markdown" && project.repoPath) {
    const tasksDir = getTasksDir(project);
    if (!fs3.existsSync(tasksDir)) return [];
    const files = fs3.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
    files.sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
    const items = [];
    for (const file of files) {
      try {
        const raw = fs3.readFileSync(path3.join(tasksDir, file), "utf8");
        const fallbackId = file.split(" - ")[0] || file.replace(/\.md$/, "");
        const task = parseBacklogMd(raw, fallbackId);
        items.push({
          id: task.id,
          code: task.id,
          projectId: project.id,
          title: task.title,
          status: task.status,
          type: task.type || "feature",
          priority: task.priority,
          assignees: task.assignees || [],
          labels: task.labels || [],
          description: task.description,
          implementationPlan: task.implementationPlan,
          notes: task.implementationNotes,
          acceptanceCriteriaList: task.acceptanceCriteria,
          sprint: task.sprint || task.targetSprint || task.rawExtraFrontmatter?.sprint,
          targetSprint: task.targetSprint || task.sprint || task.rawExtraFrontmatter?.sprint,
          milestone: task.milestone,
          createdAt: task.createdDate ? `${task.createdDate}T00:00:00.000Z` : void 0,
          updatedAt: task.updatedDate ? `${task.updatedDate}T00:00:00.000Z` : void 0
        });
      } catch (err) {
      }
    }
    return items;
  }
  const filePath = getProjectJsonBacklogPath(project);
  if (fs3.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs3.readFileSync(filePath, "utf8"));
      return data.items || [];
    } catch {
    }
  }
  return [];
}
var CANONICAL_TOOLS = [
  {
    name: "gripm_list_projects",
    description: "Lists registered projects in the gripm cockpit, their repository paths and storage engine (Markdown vs JSON).",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "gripm_list_tasks",
    description: "Lists backlog tasks with optional filters (openOnly, search, limit, compact format for minimal token usage).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID. If omitted, uses active project." },
        status: {
          type: "string",
          description: 'Filter by status: "draft", "doing", "review", "ready", "done", "dismissed", "cancelled".'
        },
        openOnly: {
          type: "boolean",
          description: "If true, excludes closed/done/dismissed tasks, returning only active or backlog tasks."
        },
        priority: { type: "string", description: 'Filter by priority: "urgent", "high", "medium", "low".' },
        sprint: { type: "string", description: 'Filter by assigned sprint (e.g. "Sprint 8").' },
        milestone: { type: "string", description: "Filter by milestone or release version." },
        search: { type: "string", description: "Search term to match against task title, code, or labels." },
        prefix: { type: "string", description: 'Filter by task code prefix (e.g. "DEV-", "FEAT-").' },
        taskIds: {
          type: "array",
          items: { type: "string" },
          description: 'Explicit list of task IDs to query (e.g. ["DEV-001", "DEV-002"]).'
        },
        limit: { type: "number", description: "Maximum number of tasks to return (recommended to prevent token saturation)." },
        offset: { type: "number", description: "Pagination offset (defaults to 0)." },
        format: {
          type: "string",
          enum: ["detailed", "compact"],
          description: 'Output format. "compact" returns a 1-line summary per task (saves ~90% tokens).'
        }
      }
    }
  },
  {
    name: "gripm_get_stats",
    description: "Calculates aggregate backlog metrics: total tasks, open, closed, completion percentage, status/priority breakdown, and code prefix breakdown.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID. If omitted, analyzes active project." }
      }
    }
  },
  {
    name: "gripm_bulk_update_tasks",
    description: "Performs atomic batch updates across multiple tasks simultaneously (by taskIds list or prefix/status filter).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID." },
        taskIds: {
          type: "array",
          items: { type: "string" },
          description: 'Explicit list of task IDs to update (e.g. ["DEV-001", "DEV-002"]).'
        },
        filterPrefix: {
          type: "string",
          description: 'Code prefix to match for bulk update (e.g. "FEAT-", "BUG-").'
        },
        filterStatus: {
          type: "string",
          description: 'Filter by current status before applying update (e.g. "draft").'
        },
        updates: {
          type: "object",
          description: "Fields to update across all matching tasks.",
          properties: {
            status: { type: "string", enum: ["draft", "doing", "review", "ready", "done", "dismissed", "cancelled", "ideas"] },
            priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
            milestone: { type: "string" },
            sprint: { type: "string", description: "Sprint to assign to matching tasks." },
            implementationNotes: { type: "string" },
            labels: { type: "array", items: { type: "string" } }
          }
        }
      },
      required: ["updates"]
    }
  },
  {
    name: "gripm_get_task",
    description: "Retrieves complete details of a task including Acceptance Criteria (AC), Implementation Plan, and Notes.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: 'Task ID or code (e.g. "DEV-001").' },
        projectId: { type: "string", description: "Project ID (optional if task code is unique)." }
      },
      required: ["taskId"]
    }
  },
  {
    name: "gripm_create_task",
    description: "Creates a new task in the backlog, generating an individual Markdown file in backlog/tasks/.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID." },
        title: { type: "string", description: "Descriptive title for the task." },
        description: { type: "string", description: "Technical description or detailed requirements." },
        type: { type: "string", enum: ["feature", "bug", "tech_debt", "ux"], description: "Item type." },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"], description: "Priority level." },
        status: { type: "string", enum: ["draft", "doing", "review", "ready", "done", "dismissed", "cancelled", "ideas"], description: "Initial status." },
        acceptanceCriteria: {
          type: "array",
          items: { type: "string" },
          description: "Plain-text list of acceptance criteria."
        },
        implementationPlan: { type: "string", description: "Step-by-step technical implementation plan." },
        milestone: { type: "string", description: "Assigned sprint or milestone." }
      },
      required: ["title"]
    }
  },
  {
    name: "gripm_update_task",
    description: "Updates task status (draft, doing, review, ready, done), acceptance criteria checkboxes, priority, or implementation plan.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID or code to update." },
        projectId: { type: "string", description: "Project ID." },
        status: {
          type: "string",
          enum: ["draft", "doing", "review", "ready", "done", "dismissed", "cancelled", "ideas"],
          description: "Task status (canonical top-level field)."
        },
        updates: {
          type: "object",
          description: "Optional update object (supports status, title, description, priority, etc.).",
          properties: {
            status: { type: "string", enum: ["draft", "doing", "review", "ready", "done", "dismissed", "cancelled", "ideas"] },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
            implementationPlan: { type: "string" },
            milestone: { type: "string" },
            sprint: { type: "string" },
            checkAllAcs: { type: "boolean" }
          }
        },
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
        implementationPlan: { type: "string", description: "Technical plan update." },
        sprint: { type: "string", description: 'Sprint name to assign (e.g. "Sprint 8").' },
        toggleAcIndex: { type: "number", description: "AC index (1-indexed) to toggle checked/unchecked." },
        checkAllAcs: { type: "boolean", description: "If true, checks all ACs. If false, unchecks all ACs." },
        milestone: { type: "string" }
      },
      required: ["taskId"]
    }
  },
  {
    name: "gripm_export_backlog",
    description: "Generates or updates the consolidated BACKLOG.md document at the repository root.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID to consolidate." }
      }
    }
  },
  {
    name: "gripm_list_releases",
    description: "Lists all project releases, versions, changelog notes, and linked tasks (both released and in preparation).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID. If omitted, uses active project." },
        version: { type: "string", description: 'Specific version to query (e.g. "v1.0.0"). If omitted, returns all.' }
      }
    }
  },
  {
    name: "gripm_sync_backlog",
    description: "Audits and automatically reconciles tasks with acceptance criteria and regenerates BACKLOG.md without shell commands.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID. If omitted, uses active project." },
        autoFix: { type: "boolean", description: "If true, auto-promotes completed tasks to Done and reconciles ACs." }
      }
    }
  },
  {
    name: "gripm_create_retro",
    description: "Records and persists a structured sprint retrospective in Markdown inside backlog/retros/sprint-N-retro.md.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID. If omitted, uses active project." },
        sprintId: { type: "string", description: 'Sprint ID or number (e.g. "sprint-8").' },
        sprintName: { type: "string", description: 'Human-readable sprint name (e.g. "Sprint 8").' },
        whatWentWell: { type: "string", description: "Strengths: What worked well and should be repeated?" },
        whatWentWrong: { type: "string", description: "Issues: What failed or took longer than expected?" },
        whatToImprove: { type: "string", description: "Efficiency: What could be improved for next iterations?" },
        actions: {
          type: "array",
          items: { type: "string" },
          description: "Concrete action items for subsequent sprints."
        }
      },
      required: ["sprintId"]
    }
  },
  {
    name: "gripm_list_retros",
    description: "Lists saved sprint retrospectives in backlog/retros/ with summaries and timestamps.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID." }
      }
    }
  }
];
var TOOLS = CANONICAL_TOOLS;
async function handleToolCall(rawName, args) {
  const registry = getRegistry();
  const name = rawName;
  if (name === "gripm_list_projects") {
    return {
      activeProjectId: registry.activeProjectId,
      projects: registry.projects.map((p) => ({
        id: p.id,
        name: p.name,
        codePrefix: p.codePrefix,
        repoPath: p.repoPath,
        storageType: p.storageType || "json"
      }))
    };
  }
  if (name === "gripm_list_tasks") {
    const targetProject = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!targetProject) throw new Error("No hay proyectos registrados en DevBoard.");
    let tasks = readTasksForProject(targetProject);
    if (args.openOnly) {
      const closedStatuses = ["done", "dismissed", "cancelled", "released"];
      tasks = tasks.filter((t) => !closedStatuses.includes(normalizeStatus(t.status)));
    }
    if (args.status) {
      const norm = normalizeStatus(args.status);
      tasks = tasks.filter((t) => normalizeStatus(t.status) === norm);
    }
    if (args.priority) {
      const normP = normalizePriority(args.priority);
      tasks = tasks.filter((t) => normalizePriority(t.priority) === normP);
    }
    if (args.sprint) {
      const sp = String(args.sprint).toLowerCase();
      tasks = tasks.filter(
        (t) => t.sprint && String(t.sprint).toLowerCase() === sp || t.targetSprint && String(t.targetSprint).toLowerCase() === sp || Array.isArray(t.sprints) && t.sprints.some((s) => String(s).toLowerCase() === sp)
      );
    }
    if (args.milestone) {
      tasks = tasks.filter((t) => t.milestone === args.milestone || t.targetSprint === args.milestone);
    }
    if (args.prefix) {
      const pfx = String(args.prefix).toLowerCase();
      tasks = tasks.filter(
        (t) => t.id && t.id.toLowerCase().startsWith(pfx) || t.code && t.code.toLowerCase().startsWith(pfx)
      );
    }
    if (Array.isArray(args.taskIds) && args.taskIds.length > 0) {
      const idsLower = new Set(args.taskIds.map((id) => String(id).toLowerCase()));
      tasks = tasks.filter(
        (t) => t.id && idsLower.has(t.id.toLowerCase()) || t.code && idsLower.has(t.code.toLowerCase())
      );
    }
    if (args.search) {
      const q = String(args.search).toLowerCase();
      tasks = tasks.filter(
        (t) => t.title && t.title.toLowerCase().includes(q) || t.id && t.id.toLowerCase().includes(q) || t.labels && Array.isArray(t.labels) && t.labels.some((l) => l.toLowerCase().includes(q))
      );
    }
    const totalFiltered = tasks.length;
    const offset = typeof args.offset === "number" ? Math.max(0, args.offset) : 0;
    if (args.limit && typeof args.limit === "number" && args.limit > 0) {
      tasks = tasks.slice(offset, offset + args.limit);
    } else if (offset > 0) {
      tasks = tasks.slice(offset);
    }
    if (args.format === "compact") {
      return {
        projectId: targetProject.id,
        projectName: targetProject.name,
        storageType: targetProject.storageType,
        total: totalFiltered,
        showing: tasks.length,
        offset,
        items: tasks.map((t) => {
          const acInfo = t.acceptanceCriteriaList ? `${t.acceptanceCriteriaList.filter((ac) => ac.checked).length}/${t.acceptanceCriteriaList.length} AC` : "0/0 AC";
          const m = t.milestone || t.targetSprint ? ` [${t.milestone || t.targetSprint}]` : "";
          return `[${t.code || t.id}] (${t.status}/${t.priority}) ${t.title}${m} (${acInfo})`;
        })
      };
    }
    return {
      projectId: targetProject.id,
      projectName: targetProject.name,
      storageType: targetProject.storageType,
      total: totalFiltered,
      showing: tasks.length,
      offset,
      tasks: tasks.map((t) => ({
        id: t.code || t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        milestone: t.milestone || t.targetSprint,
        acProgress: t.acceptanceCriteriaList ? `${t.acceptanceCriteriaList.filter((ac) => ac.checked).length}/${t.acceptanceCriteriaList.length} AC` : "0/0 AC"
      }))
    };
  }
  if (name === "gripm_get_stats") {
    const targetProject = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!targetProject) throw new Error("No hay proyectos registrados en DevBoard.");
    const tasks = readTasksForProject(targetProject);
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
    const completionRate = total > 0 ? Math.round(doneCount / total * 100) : 0;
    return {
      projectId: targetProject.id,
      projectName: targetProject.name,
      storageType: targetProject.storageType,
      summary: {
        total,
        open: openCount,
        done: doneCount,
        completionRate: `${completionRate}%`
      },
      byStatus,
      byPriority,
      byPrefix
    };
  }
  if (name === "gripm_bulk_update_tasks") {
    const targetProject = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!targetProject) throw new Error("No hay proyectos registrados en DevBoard.");
    const updates = args.updates || {};
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const cleanIds = Array.isArray(args.taskIds) ? new Set(args.taskIds.map((id) => String(id).toLowerCase())) : null;
    const pfxFilter = args.filterPrefix ? String(args.filterPrefix).toLowerCase() : null;
    const statusFilter = args.filterStatus ? normalizeStatus(args.filterStatus) : null;
    let updatedCount = 0;
    const updatedIds = [];
    if (targetProject.storageType === "markdown" && targetProject.repoPath) {
      const tasksDir = getTasksDir(targetProject);
      if (!fs3.existsSync(tasksDir)) throw new Error("Carpeta de tareas no encontrada.");
      const files = fs3.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        try {
          const fullPath = path3.join(tasksDir, file);
          const raw = fs3.readFileSync(fullPath, "utf8");
          const fallbackId = file.split(" - ")[0] || file.replace(/\.md$/, "");
          const current = parseBacklogMd(raw, fallbackId);
          const taskId = String(current.id || fallbackId).toLowerCase();
          let match = false;
          if (cleanIds) {
            match = cleanIds.has(taskId);
          } else if (pfxFilter) {
            match = taskId.startsWith(pfxFilter);
          } else {
            match = true;
          }
          if (statusFilter && normalizeStatus(current.status) !== statusFilter) {
            match = false;
          }
          if (match) {
            if (updates.status) current.status = normalizeStatus(updates.status);
            if (updates.priority) current.priority = normalizePriority(updates.priority);
            if (updates.milestone !== void 0) current.milestone = updates.milestone;
            if (updates.sprint !== void 0) {
              const legSprint = resolveLegibleSprint(targetProject, updates.sprint);
              if (legSprint) {
                current.sprint = legSprint;
                current.targetSprint = legSprint;
                if (!current.rawExtraFrontmatter) current.rawExtraFrontmatter = {};
                current.rawExtraFrontmatter.sprint = legSprint;
                current.rawExtraFrontmatter.targetSprint = legSprint;
                current.sprints = [legSprint];
              } else {
                current.sprint = void 0;
                current.targetSprint = void 0;
                current.sprints = [];
                if (current.rawExtraFrontmatter) {
                  delete current.rawExtraFrontmatter.sprint;
                  delete current.rawExtraFrontmatter.targetSprint;
                }
              }
            }
            if (updates.implementationNotes !== void 0) current.implementationNotes = updates.implementationNotes;
            if (Array.isArray(updates.labels)) current.labels = updates.labels;
            current.updatedDate = today;
            const serialized = serializeBacklogMd(current);
            fs3.writeFileSync(fullPath, serialized, "utf8");
            updatedCount++;
            updatedIds.push(current.id);
          }
        } catch {
        }
      }
      return {
        ok: true,
        projectId: targetProject.id,
        storageType: "markdown",
        updatedCount,
        updatedIds
      };
    }
    const filePath = getProjectJsonBacklogPath(targetProject);
    if (fs3.existsSync(filePath)) {
      const data = JSON.parse(fs3.readFileSync(filePath, "utf8"));
      const items = data.items || [];
      for (let i = 0; i < items.length; i++) {
        const current = items[i];
        const taskId = String(current.id || current.code || "").toLowerCase();
        let match = false;
        if (cleanIds) {
          match = cleanIds.has(taskId);
        } else if (pfxFilter) {
          match = taskId.startsWith(pfxFilter);
        } else {
          match = true;
        }
        if (statusFilter && normalizeStatus(current.status) !== statusFilter) {
          match = false;
        }
        if (match) {
          if (updates.status) current.status = normalizeStatus(updates.status);
          if (updates.priority) current.priority = normalizePriority(updates.priority);
          if (updates.milestone !== void 0) {
            current.milestone = updates.milestone;
            current.targetSprint = updates.milestone;
          }
          if (updates.sprint !== void 0) {
            const legSprint = resolveLegibleSprint(targetProject, updates.sprint);
            current.sprint = legSprint;
            current.targetSprint = legSprint;
            current.sprints = legSprint ? [legSprint] : [];
          }
          if (updates.implementationNotes !== void 0) {
            current.implementationNotes = updates.implementationNotes;
            current.fix = updates.implementationNotes;
          }
          if (Array.isArray(updates.labels)) current.labels = updates.labels;
          current.updatedAt = now;
          items[i] = current;
          updatedCount++;
          updatedIds.push(current.code || current.id);
        }
      }
      data.items = items;
      data.lastUpdated = now;
      fs3.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      return {
        ok: true,
        projectId: targetProject.id,
        storageType: "json",
        updatedCount,
        updatedIds
      };
    }
    throw new Error("No se pudo encontrar el archivo de almacenamiento del proyecto.");
  }
  if (name === "gripm_get_task") {
    const cleanId = String(args.taskId).toLowerCase();
    for (const p of registry.projects) {
      if (args.projectId && p.id !== args.projectId) continue;
      const tasks = readTasksForProject(p);
      const match = tasks.find(
        (t) => t.id && t.id.toLowerCase() === cleanId || t.code && t.code.toLowerCase() === cleanId
      );
      if (match) {
        return {
          found: true,
          project: { id: p.id, name: p.name, storageType: p.storageType },
          task: match
        };
      }
    }
    throw new Error(`Tarea ${args.taskId} no encontrada.`);
  }
  if (name === "gripm_create_task") {
    const project = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) throw new Error("Proyecto no encontrado.");
    const cleanPrefix = (project.codePrefix || "DEV").replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "DEV";
    const tasks = readTasksForProject(project);
    let maxNum = 0;
    const regex = new RegExp(`^${cleanPrefix}-(\\d+)`, "i");
    for (const t of tasks) {
      const m = (t.code || t.id || "").match(regex);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : tasks.length + 1;
    const code = `${cleanPrefix}-${String(nextNum).padStart(3, "0")}`;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const acList = (args.acceptanceCriteria || []).map((text, i) => ({
      index: i + 1,
      text,
      checked: false
    }));
    const taskData = {
      id: code,
      title: args.title,
      status: normalizeStatus(args.status || "draft"),
      priority: normalizePriority(args.priority || "medium"),
      type: args.type || "feature",
      createdDate: today,
      updatedDate: today,
      milestone: args.milestone,
      description: args.description || "",
      acceptanceCriteria: acList,
      implementationPlan: args.implementationPlan || ""
    };
    if (project.storageType === "markdown" && project.repoPath) {
      const tasksDir = getTasksDir(project);
      if (!fs3.existsSync(tasksDir)) fs3.mkdirSync(tasksDir, { recursive: true });
      const filename = generateTaskFilename(code, args.title);
      const filepath = path3.join(tasksDir, filename);
      fs3.writeFileSync(filepath, serializeBacklogMd(taskData), "utf8");
      return { ok: true, task: taskData, savedFile: filepath };
    }
    const filePath = getProjectJsonBacklogPath(project);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newItem = {
      ...taskData,
      code,
      projectId: project.id,
      acceptanceCriteriaList: acList,
      createdAt: now,
      updatedAt: now
    };
    let existingData = { project, items: [], releases: [] };
    if (fs3.existsSync(filePath)) {
      existingData = JSON.parse(fs3.readFileSync(filePath, "utf8"));
    }
    existingData.items.push(newItem);
    fs3.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf8");
    return { ok: true, task: newItem, savedFile: filePath };
  }
  if (name === "gripm_update_task") {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const project of registry.projects) {
      if (args.projectId && project.id !== args.projectId) continue;
      if (project.storageType === "markdown" && project.repoPath) {
        const tasksDir = getTasksDir(project);
        if (!fs3.existsSync(tasksDir)) continue;
        const files = fs3.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
        const cleanId = String(args.taskId).toLowerCase();
        let resolvedFile = files.find((f) => {
          const fLower = f.toLowerCase();
          return fLower.startsWith(`${cleanId} `) || fLower === `${cleanId}.md` || fLower.startsWith(`${cleanId}-`);
        });
        if (!resolvedFile) {
          for (const f of files) {
            try {
              const raw = fs3.readFileSync(path3.join(tasksDir, f), "utf8");
              const fallbackId = f.split(" - ")[0] || f.replace(/\.md$/, "");
              const task = parseBacklogMd(raw, fallbackId);
              if (task.id && task.id.toLowerCase() === cleanId) {
                resolvedFile = f;
                break;
              }
            } catch {
            }
          }
        }
        if (resolvedFile) {
          const fullPath = path3.join(tasksDir, resolvedFile);
          const raw = fs3.readFileSync(fullPath, "utf8");
          const current = parseBacklogMd(raw, args.taskId);
          const effectiveStatus = args.status || args.updates?.status;
          const effectiveTitle = args.title || args.updates?.title;
          const effectiveDesc = args.description !== void 0 ? args.description : args.updates?.description;
          const effectivePriority = args.priority || args.updates?.priority;
          const effectivePlan = args.implementationPlan !== void 0 ? args.implementationPlan : args.updates?.implementationPlan;
          const effectiveMilestone = args.milestone !== void 0 ? args.milestone : args.updates?.milestone;
          const effectiveSprint = args.sprint !== void 0 ? args.sprint : args.updates?.sprint;
          const effectiveCheckAllAcs = args.checkAllAcs !== void 0 ? args.checkAllAcs : args.updates?.checkAllAcs;
          const usedUpdatesObject = Boolean(args.updates && !args.status && args.updates.status);
          if (effectiveStatus) current.status = normalizeStatus(effectiveStatus);
          if (effectiveTitle) current.title = effectiveTitle;
          if (effectiveDesc !== void 0) current.description = effectiveDesc;
          if (effectivePriority) current.priority = normalizePriority(effectivePriority);
          if (effectivePlan !== void 0) current.implementationPlan = effectivePlan;
          if (effectiveMilestone !== void 0) current.milestone = effectiveMilestone;
          if (effectiveSprint !== void 0) {
            const legSprint = resolveLegibleSprint(project, effectiveSprint);
            if (legSprint) {
              current.sprint = legSprint;
              current.targetSprint = legSprint;
              if (!current.rawExtraFrontmatter) current.rawExtraFrontmatter = {};
              current.rawExtraFrontmatter.sprint = legSprint;
              current.rawExtraFrontmatter.targetSprint = legSprint;
              current.sprints = [legSprint];
            } else {
              current.sprint = void 0;
              current.targetSprint = void 0;
              current.sprints = [];
              if (current.rawExtraFrontmatter) {
                delete current.rawExtraFrontmatter.sprint;
                delete current.rawExtraFrontmatter.targetSprint;
              }
            }
          }
          current.updatedDate = today;
          if (effectiveCheckAllAcs !== void 0 && current.acceptanceCriteria) {
            current.acceptanceCriteria = current.acceptanceCriteria.map((ac) => ({
              ...ac,
              checked: Boolean(effectiveCheckAllAcs)
            }));
          } else if (args.toggleAcIndex !== void 0 && current.acceptanceCriteria) {
            current.acceptanceCriteria = current.acceptanceCriteria.map(
              (ac) => ac.index === args.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
            );
          }
          const serialized = serializeBacklogMd(current);
          fs3.writeFileSync(fullPath, serialized, "utf8");
          const resp = { ok: true, updatedTask: current, filePath: fullPath };
          if (usedUpdatesObject) {
            resp.warning = "Aviso: Se aplic\xF3 'status' recibido dentro del objeto 'updates'. Para m\xE1xima compatibilidad con AGENTS.md se recomienda pasar 'status' como campo top-level.";
          }
          return resp;
        }
      } else {
        const filePath = getProjectJsonBacklogPath(project);
        if (fs3.existsSync(filePath)) {
          const data = JSON.parse(fs3.readFileSync(filePath, "utf8"));
          const cleanId = String(args.taskId).toLowerCase();
          const idx = data.items.findIndex(
            (i) => i.id && String(i.id).toLowerCase() === cleanId || i.code && String(i.code).toLowerCase() === cleanId
          );
          if (idx >= 0) {
            const current = data.items[idx];
            const effectiveStatus = args.status || args.updates?.status;
            const effectiveTitle = args.title || args.updates?.title;
            const effectiveDesc = args.description !== void 0 ? args.description : args.updates?.description;
            const effectivePriority = args.priority || args.updates?.priority;
            const effectivePlan = args.implementationPlan !== void 0 ? args.implementationPlan : args.updates?.implementationPlan;
            const effectiveMilestone = args.milestone !== void 0 ? args.milestone : args.updates?.milestone;
            const effectiveSprint = args.sprint !== void 0 ? args.sprint : args.updates?.sprint;
            const effectiveCheckAllAcs = args.checkAllAcs !== void 0 ? args.checkAllAcs : args.updates?.checkAllAcs;
            const usedUpdatesObject = Boolean(args.updates && !args.status && args.updates.status);
            if (effectiveStatus) current.status = normalizeStatus(effectiveStatus);
            if (effectiveTitle) current.title = effectiveTitle;
            if (effectiveDesc !== void 0) current.description = effectiveDesc;
            if (effectivePriority) current.priority = normalizePriority(effectivePriority);
            if (effectivePlan !== void 0) current.implementationPlan = effectivePlan;
            if (effectiveMilestone !== void 0) current.milestone = effectiveMilestone;
            if (effectiveSprint !== void 0) {
              const legSprint = resolveLegibleSprint(project, effectiveSprint);
              current.sprint = legSprint;
              current.targetSprint = legSprint;
              current.sprints = legSprint ? [legSprint] : [];
            }
            current.updatedAt = now;
            if (effectiveCheckAllAcs !== void 0 && current.acceptanceCriteriaList) {
              current.acceptanceCriteriaList = current.acceptanceCriteriaList.map((ac) => ({
                ...ac,
                checked: Boolean(effectiveCheckAllAcs)
              }));
            } else if (args.toggleAcIndex !== void 0 && current.acceptanceCriteriaList) {
              current.acceptanceCriteriaList = current.acceptanceCriteriaList.map(
                (ac) => ac.index === args.toggleAcIndex ? { ...ac, checked: !ac.checked } : ac
              );
            }
            data.items[idx] = current;
            fs3.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
            const resp = { ok: true, updatedTask: current, filePath };
            if (usedUpdatesObject) {
              resp.warning = "Aviso: Se aplic\xF3 'status' recibido dentro del objeto 'updates'. Para m\xE1xima compatibilidad con AGENTS.md se recomienda pasar 'status' como campo top-level.";
            }
            return resp;
          }
        }
      }
    }
    throw new Error(`Tarea ${args.taskId} no encontrada para actualizar.`);
  }
  if (name === "gripm_export_backlog") {
    const project = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!project) throw new Error("Proyecto no encontrado.");
    const tasks = readTasksForProject(project);
    const mdTasks = tasks.map((t) => ({
      id: t.code || t.id,
      title: t.title,
      status: normalizeStatus(t.status),
      type: t.type,
      priority: t.priority,
      milestone: t.milestone,
      description: t.description,
      acceptanceCriteria: t.acceptanceCriteriaList || []
    }));
    const content = generateMonolithicBacklogMd(project.name, mdTasks);
    let savedPath = null;
    if (project.repoPath) {
      savedPath = path3.join(project.repoPath, "BACKLOG.md");
      fs3.writeFileSync(savedPath, content, "utf8");
    }
    return {
      ok: true,
      savedPath,
      taskCount: tasks.length
    };
  }
  if (name === "gripm_sync_backlog") {
    const targetProject = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!targetProject) throw new Error("Proyecto no encontrado.");
    let fixedCount = 0;
    const errors = [];
    const autoFix = args.autoFix !== false;
    if (targetProject.storageType === "markdown" && targetProject.repoPath) {
      const tasksDir = getTasksDir(targetProject);
      if (fs3.existsSync(tasksDir)) {
        const files = fs3.readdirSync(tasksDir).filter((f) => f.endsWith(".md"));
        for (const file of files) {
          const filePath = path3.join(tasksDir, file);
          const content2 = fs3.readFileSync(filePath, "utf8");
          const fmMatch = content2.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (!fmMatch) continue;
          const fm = fmMatch[1];
          const statusMatch = fm.match(/^status:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
          const idMatch = fm.match(/^id:\s*['"]?([A-Za-z0-9_-]+)['"]?/m);
          const rawStatus = (statusMatch ? statusMatch[1] : "").toLowerCase();
          const taskId = idMatch ? idMatch[1] : file.split(" - ")[0];
          const acBlockMatch = content2.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
          if (!acBlockMatch) continue;
          const acBlock = acBlockMatch[1];
          const allAcs = acBlock.match(/^-\s*\[([ xX])\]/gm) || [];
          const checkedAcs = acBlock.match(/^-\s*\[[xX]\]/gm) || [];
          const totalAcs = allAcs.length;
          const totalChecked = checkedAcs.length;
          if (totalAcs > 0 && totalChecked === totalAcs && (rawStatus === "draft" || rawStatus === "doing")) {
            if (autoFix) {
              const updatedFm = fm.replace(/^status:\s*.*$/m, "status: Done");
              const updatedContent = content2.replace(fmMatch[0], `---
${updatedFm}
---`);
              fs3.writeFileSync(filePath, updatedContent, "utf8");
              fixedCount++;
            } else {
              errors.push(`${taskId}: Todos los AC completados (${totalChecked}/${totalAcs}) pero status es '${rawStatus}'`);
            }
          }
          if (rawStatus === "done" && totalAcs > 0 && totalChecked < totalAcs) {
            if (autoFix) {
              const fixedAcBlock = acBlock.replace(/-\s*\[ \]/g, "- [x]");
              const updatedContent = content2.replace(acBlock, fixedAcBlock);
              fs3.writeFileSync(filePath, updatedContent, "utf8");
              fixedCount++;
            } else {
              errors.push(`${taskId}: Status es 'done' pero solo tiene ${totalChecked}/${totalAcs} ACs marcados`);
            }
          }
        }
      }
    }
    const allTasks = readTasksForProject(targetProject);
    const mdTasks = allTasks.map((t) => ({
      id: t.code || t.id,
      title: t.title,
      status: normalizeStatus(t.status),
      type: t.type,
      priority: t.priority,
      milestone: t.milestone,
      description: t.description,
      acceptanceCriteria: t.acceptanceCriteriaList || []
    }));
    const content = generateMonolithicBacklogMd(targetProject.name, mdTasks);
    let backlogPath = null;
    if (targetProject.repoPath) {
      backlogPath = path3.join(targetProject.repoPath, "BACKLOG.md");
      fs3.writeFileSync(backlogPath, content, "utf8");
    }
    return {
      ok: true,
      fixedCount,
      errorsFound: errors.length,
      errors,
      taskCount: allTasks.length,
      backlogPath
    };
  }
  if (name === "gripm_list_releases") {
    const targetProject = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!targetProject) throw new Error("No hay proyectos registrados en DevBoard.");
    let releases = [];
    const repoPath = targetProject.repoPath || ROOT_DIR;
    const releasesJsonPath = path3.join(repoPath, targetProject.backlogDir || "backlog", "releases.json");
    const gripmReleasesPath = path3.join(repoPath, ".gripm/releases.json");
    const legacyReleasesPath = path3.join(repoPath, ".devboard/releases.json");
    const dataReleasesPath = path3.join(ROOT_DIR, "data/releases.json");
    if (fs3.existsSync(releasesJsonPath)) {
      try {
        releases = JSON.parse(fs3.readFileSync(releasesJsonPath, "utf8"));
      } catch {
      }
    } else if (fs3.existsSync(gripmReleasesPath)) {
      try {
        releases = JSON.parse(fs3.readFileSync(gripmReleasesPath, "utf8"));
      } catch {
      }
    } else if (fs3.existsSync(legacyReleasesPath)) {
      try {
        releases = JSON.parse(fs3.readFileSync(legacyReleasesPath, "utf8"));
      } catch {
      }
    } else if (fs3.existsSync(dataReleasesPath)) {
      try {
        releases = JSON.parse(fs3.readFileSync(dataReleasesPath, "utf8"));
      } catch {
      }
    }
    const allTasks = readTasksForProject(targetProject);
    const knownCodes = new Set(allTasks.map((t) => (t.code || t.id || "").toUpperCase()).filter(Boolean));
    const codePrefix = (targetProject.codePrefix || "").toUpperCase().trim();
    if (releases.length === 0) {
      const notesPaths = [
        path3.join(repoPath, "docs/RELEASE_NOTES.md"),
        path3.join(repoPath, "docs/releasenotes.md"),
        path3.join(repoPath, "RELEASE_NOTES.md"),
        path3.join(repoPath, "releasenotes.md"),
        path3.join(repoPath, "CHANGELOG.md")
      ];
      for (const np of notesPaths) {
        if (fs3.existsSync(np)) {
          try {
            const content = fs3.readFileSync(np, "utf8");
            const sections = content.split(/(?=^##\s+)/m);
            for (const section of sections) {
              const trimmed = section.trim();
              if (!trimmed.startsWith("##")) continue;
              const firstLineEnd = trimmed.indexOf("\n");
              const headerLine = firstLineEnd > 0 ? trimmed.substring(0, firstLineEnd) : trimmed;
              const vMatch = headerLine.match(/^##\s*\[?([vV]?\d+(?:\.\d+)*(?:-[a-zA-Z0-9.]+)?(?:[^\s\]—–-]+)?)\]?/);
              if (!vMatch) continue;
              const rawVersion = vMatch[1].trim();
              const version = rawVersion.replace(/^v(?=\d)/i, "");
              const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
              const date = dateMatch ? dateMatch[1] : "";
              let title = headerLine.replace(/^##\s*\[?[^\]]+\]?/, "").trim();
              if (date) title = title.replace(date, "").trim();
              title = title.replace(/^[-—–:🚀 ]+/, "").trim();
              const itemCodesSet = /* @__PURE__ */ new Set();
              const candidates = trimmed.match(/\b([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)\b/g) || [];
              for (const c of candidates) {
                const upper = c.toUpperCase();
                if (knownCodes.has(upper) || codePrefix && upper.startsWith(`${codePrefix}-`)) {
                  itemCodesSet.add(upper);
                }
              }
              for (const t of allTasks) {
                const m = (t.milestone || t.targetSprint || "").replace(/^v/i, "");
                if (m && m === version) itemCodesSet.add(t.code || t.id);
              }
              releases.push({
                version,
                date: date || "",
                title: title || `Release ${version}`,
                itemCodes: Array.from(itemCodesSet),
                itemCount: itemCodesSet.size
              });
            }
          } catch {
          }
          if (releases.length > 0) break;
        }
      }
    }
    if (args.version) {
      const vClean = String(args.version).trim().toLowerCase().replace(/^v/, "");
      const foundRelease = releases.find((r) => String(r.version).toLowerCase().replace(/^v/, "") === vClean);
      if (!foundRelease) {
        return {
          project: targetProject.id,
          version: args.version,
          found: false,
          message: `No se encontr\xF3 el release para la versi\xF3n "${args.version}".`,
          availableVersions: releases.map((r) => r.version)
        };
      }
      const relatedCodes = new Set((foundRelease.itemCodes || []).map((c) => c.toLowerCase()));
      const relatedTasks = allTasks.filter((t) => {
        const idLower = String(t.id || t.code || "").toLowerCase();
        if (relatedCodes.has(idLower)) return true;
        const mLower = String(t.milestone || t.targetSprint || "").toLowerCase().replace(/^v/, "");
        return mLower === vClean;
      });
      return {
        project: targetProject.id,
        release: foundRelease,
        taskCount: relatedTasks.length,
        tasks: relatedTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          type: t.type
        }))
      };
    }
    return {
      project: targetProject.id,
      totalReleases: releases.length,
      releases: releases.map((r) => ({
        version: r.version,
        status: r.status || (r.version === "0.2.0" ? "released" : "unreleased"),
        date: r.date,
        title: r.title,
        itemCount: Array.isArray(r.itemCodes) ? r.itemCodes.length : 0,
        itemCodes: r.itemCodes || []
      }))
    };
  }
  if (name === "gripm_create_retro") {
    const targetProject = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!targetProject) throw new Error("Proyecto no encontrado.");
    const sprintKey = String(args.sprintId || args.sprintName || "sprint").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const retrosDir = path3.join(targetProject.repoPath || ROOT_DIR, targetProject.backlogDir || "backlog", "retros");
    if (!fs3.existsSync(retrosDir)) {
      fs3.mkdirSync(retrosDir, { recursive: true });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const sprintTitle = args.sprintName || args.sprintId;
    const filePath = path3.join(retrosDir, `${sprintKey}-retro.md`);
    const mdContent = `# Retrospectiva \u2014 ${sprintTitle}

**Fecha:** ${today}  
**Sprint:** ${sprintTitle}  
**Proyecto:** ${targetProject.name}

---

## \u{1F7E2} Fortalezas (\xBFQu\xE9 funcion\xF3 bien y debe repetirse?)
${args.whatWentWell ? args.whatWentWell.trim() : "No se registraron comentarios espec\xEDficos."}

## \u{1F534} Problemas (\xBFQu\xE9 fall\xF3, se rompi\xF3 o tom\xF3 m\xE1s tiempo del esperado?)
${args.whatWentWrong ? args.whatWentWrong.trim() : "No se registraron incidentes cr\xEDticos."}

## \u{1F7E1} Eficiencia (\xBFQu\xE9 podr\xEDa haberse hecho en menos pasos o con menos tokens?)
${args.whatToImprove ? args.whatToImprove.trim() : "Flujo eficiente y directo."}

## \u{1F4CC} Acciones Concretas (Compromisos y Mejoras)
${Array.isArray(args.actions) && args.actions.length > 0 ? args.actions.map((act) => `- [ ] ${act}`).join("\n") : "- [ ] Continuar aplicando las buenas pr\xE1cticas establecidas."}
`;
    fs3.writeFileSync(filePath, mdContent, "utf8");
    return {
      ok: true,
      sprint: sprintTitle,
      savedFile: filePath,
      actionsCount: Array.isArray(args.actions) ? args.actions.length : 0
    };
  }
  if (name === "gripm_list_retros") {
    const targetProject = registry.projects.find((p) => p.id === args.projectId) || registry.projects.find((p) => p.id === registry.activeProjectId) || registry.projects[0];
    if (!targetProject) throw new Error("Proyecto no encontrado.");
    const retrosDir = path3.join(targetProject.repoPath || ROOT_DIR, targetProject.backlogDir || "backlog", "retros");
    if (!fs3.existsSync(retrosDir)) {
      return { ok: true, retros: [] };
    }
    const files = fs3.readdirSync(retrosDir).filter((f) => f.endsWith(".md"));
    const retros = [];
    for (const f of files) {
      try {
        const full = path3.join(retrosDir, f);
        const raw = fs3.readFileSync(full, "utf8");
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        const dateMatch = raw.match(/\*\*Fecha:\*\*\s*([^\n]+)/);
        retros.push({
          file: f,
          path: full,
          title: titleMatch ? titleMatch[1].trim() : f.replace(/\.md$/, ""),
          date: dateMatch ? dateMatch[1].trim() : ""
        });
      } catch {
      }
    }
    return {
      ok: true,
      total: retros.length,
      retros
    };
  }
  throw new Error(`Herramienta desconocida: ${name}`);
}
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});
function sendJsonRpc(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}
rl.on("line", async (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    const { id, method, params } = request;
    if (method === "initialize") {
      sendJsonRpc({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "gripm-mcp",
            version: "1.0.0"
          }
        }
      });
      return;
    }
    if (method === "notifications/initialized") {
      return;
    }
    if (method === "tools/list") {
      sendJsonRpc({
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS
        }
      });
      return;
    }
    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const result = await handleToolCall(toolName, toolArgs);
        sendJsonRpc({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      } catch (toolErr) {
        sendJsonRpc({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error ejecutando ${toolName}: ${toolErr.message}`
              }
            ]
          }
        });
      }
      return;
    }
    if (id !== void 0) {
      sendJsonRpc({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `M\xE9todo desconocido: ${method}`
        }
      });
    }
  } catch (parseErr) {
    sendJsonRpc({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error: invalid JSON"
      }
    });
  }
});
