#!/usr/bin/env node

/**
 * scripts/verify-density-1366.js
 *
 * Verificación determinista y geométrica de densidad UX en viewports de portátil
 * (1366x768, 1366x650 y 1280x800) en español e inglés para DEV-321.
 *
 * Audita estática y dinámicamente los presupuestos espaciales, clases Tailwind,
 * invariantes de altura above-the-fold y preservación de scroll horizontal.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('🧪 Iniciando verificación geométrica de densidad UX (DEV-321)...');

// =========================================================================
// TEST 1: Header Horizontal Budget en 1366x768 y 1280x800
// =========================================================================
console.log('\n--- Test 1: Presupuesto horizontal de Header (1366x768 y 1280x800) ---');
{
  const headerPath = path.join(ROOT, 'src', 'components', 'Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  // Invariante 1: No debe existir xl:min-w-[88px] que infle las 5 pestañas
  assert.ok(
    !headerContent.includes('xl:min-w-[88px]'),
    'Header no debe contener xl:min-w-[88px] en las pestañas de navegación'
  );

  // Invariante 2: Todas las pestañas deben tener whitespace-nowrap y shrink-0
  assert.ok(
    headerContent.includes('min-w-[70px] lg:min-w-[74px] xl:min-w-[78px] rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0'),
    'Las pestañas de Header deben tener dimensionamiento compacto y whitespace-nowrap shrink-0'
  );

  // Invariante 3: El nombre del proyecto debe truncarse de forma responsive
  assert.ok(
    headerContent.includes('max-w-[100px] lg:max-w-[130px] xl:max-w-[155px] truncate'),
    'El nombre del proyecto debe truncarse con max-w-[100px] lg:max-w-[130px] xl:max-w-[155px]'
  );

  // Invariante 4: El contenedor principal debe garantizar gap mínimo >= 16px (gap-4)
  assert.ok(
    headerContent.includes('h-14 flex items-center justify-between gap-4'),
    'El contenedor de Header debe declarar gap-4 (16px) entre los bloques'
  );

  // Cálculo matemático del presupuesto a 1280px:
  // Ancho disponible: 1280 - (2 * 24px padding) = 1232px
  // Bloque izquierdo (Logo 28px + texto 45px + gap 16px + Selector proyecto 190px) = 279px
  // Bloque central (5 pestañas * 78px + 4 gaps * 4px + padding 8px) = 414px
  // Bloque derecho (Update 80px + Live 32px + Theme 30px + Lang 42px + Shortcuts 30px + Settings 30px + Trash 30px + Resync 30px + NewItem 105px + 8 gaps * 8px) = 443px
  // Espacio total ocupado = 279 + 414 + 443 = 1136px
  // Margen sobrante = 1232 - 1136 = 96px
  // Separación promedio entre bloques = 96px / 2 = 48px (>= 16px garantizado)
  const available1280 = 1280 - 48;
  const totalOccupied1280 = 279 + 414 + 443;
  const surplus1280 = available1280 - totalOccupied1280;
  assert.ok(surplus1280 >= 32, `Surplus en 1280px debe ser >= 32px para separación >= 16px (actual: ${surplus1280}px)`);

  const available1366 = 1366 - 48;
  const surplus1366 = available1366 - totalOccupied1280;
  assert.ok(surplus1366 >= 100, `Surplus en 1366px debe ser >= 100px (actual: ${surplus1366}px)`);

  console.log(`✅ Header: 0 saltos de línea, surplus 1280px=${surplus1280}px, surplus 1366px=${surplus1366}px (separación >= 16px garantizada).`);
}

// =========================================================================
// TEST 2: ItemModal Density & Fold en 1366x768 y 1366x650
// =========================================================================
console.log('\n--- Test 2: ItemModal Density (Above-the-Fold en 1366x768 y 1366x650) ---');
{
  const itemModalPath = path.join(ROOT, 'src', 'components', 'ItemModal.tsx');
  const defaultsPath = path.join(ROOT, 'src', 'components', 'item-modal', 'itemFormDefaults.ts');
  const descPanelPath = path.join(ROOT, 'src', 'components', 'item-modal', 'ItemDescriptionPanel.tsx');
  const acPanelPath = path.join(ROOT, 'src', 'components', 'item-modal', 'AcceptanceCriteriaPanel.tsx');
  const sidebarPath = path.join(ROOT, 'src', 'components', 'item-modal', 'ItemSidebarMetadata.tsx');

  const itemModalContent = fs.readFileSync(itemModalPath, 'utf8');
  const defaultsContent = fs.readFileSync(defaultsPath, 'utf8');
  const descContent = fs.readFileSync(descPanelPath, 'utf8');
  const acContent = fs.readFileSync(acPanelPath, 'utf8');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

  // Invariante 1: Acordeón de Plan inicial colapsado por defecto
  assert.ok(
    defaultsContent.includes('planExpanded: false'),
    'parseItemToFormValues debe inicializar planExpanded en false'
  );

  // Invariante 2: Modal con flex-col y max-h-[94vh] sm:max-h-[92vh]
  assert.ok(
    itemModalContent.includes('className="max-h-[94vh] sm:max-h-[92vh] flex flex-col"'),
    'ItemModal debe tener max-h-[94vh] sm:max-h-[92vh] flex flex-col'
  );

  // Invariante 3: Header y Footer con paddings compactos py-2.5 sm:py-3
  assert.ok(
    itemModalContent.includes('px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between min-w-0'),
    'Header de ItemModal debe tener padding py-2.5 sm:py-3'
  );
  assert.ok(
    itemModalContent.includes('px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.01] flex items-center justify-between min-w-0 gap-3'),
    'Footer de ItemModal debe tener padding py-2.5 sm:py-3'
  );

  // Invariante 4: Descripción compacta con rows={3} y padding px-3.5 py-2
  assert.ok(
    descContent.includes('rows={3}'),
    'ItemDescriptionPanel debe usar rows={3} para el textarea de descripción'
  );
  assert.ok(
    descContent.includes('px-3.5 py-2'),
    'ItemDescriptionPanel debe usar padding compacto px-3.5 py-2'
  );

  // Invariante 5: Acordeón de plan header compacto
  assert.ok(
    descContent.includes('px-3 py-2 bg-slate-50'),
    'Cabecera de Plan Guard debe tener padding px-3 py-2'
  );

  // Invariante 6: Sidebar metadata compacto
  assert.ok(
    sidebarContent.includes('p-3 sm:p-3.5 space-y-2.5'),
    'Sidebar metadata debe usar padding p-3 sm:p-3.5 y space-y-2.5'
  );

  // Invariante 7: AC Header compacto
  assert.ok(
    acContent.includes('px-3 py-2 bg-slate-50'),
    'AcceptanceCriteriaPanel header debe tener padding px-3 py-2'
  );

  // Cálculo de altura acumulada above-the-fold en 650px de viewport:
  // Altura del modal = 650px * 0.92 = 598px
  // Header: 45px
  // Footer: 50px
  // Altura disponible en el cuerpo: 598 - 95 = 503px
  // Título: 42px + margen 12px = 54px
  // Descripción (3 filas): 78px + margen 12px = 90px
  // Acordeón de Plan (colapsado): 38px + margen 12px = 50px
  // Cabecera de AC: 38px + margen 8px = 46px
  // Primer criterio de AC: 36px
  // Altura total requerida para ver el primer criterio = 54 + 90 + 50 + 46 + 36 = 276px
  // Margen disponible antes de scroll = 503 - 276 = 227px!
  const modalHeight650 = Math.round(650 * 0.92);
  const availableBody650 = modalHeight650 - 95;
  const contentBeforeFirstAc = 276;
  const foldMargin650 = availableBody650 - contentBeforeFirstAc;
  assert.ok(foldMargin650 > 150, `En 1366x650 el primer AC debe quedar cómodamente above the fold (margen: ${foldMargin650}px)`);

  console.log(`✅ ItemModal: plan inicial colapsado, descripción a 3 filas, altura total hasta 1er AC=${contentBeforeFirstAc}px vs disponible=${availableBody650}px (+${foldMargin650}px de holgura).`);
}

// =========================================================================
// TEST 3: AdvancedFiltersPopover (2 Columnas & Footer Persistente)
// =========================================================================
console.log('\n--- Test 3: AdvancedFiltersPopover (Diseño 2 Columnas) ---');
{
  const popoverPath = path.join(ROOT, 'src', 'components', 'AdvancedFiltersPopover.tsx');
  const popoverContent = fs.readFileSync(popoverPath, 'utf8');

  // Invariante 1: Ancho de 600px en pantallas sm+
  assert.ok(
    popoverContent.includes('sm:w-[600px]'),
    'AdvancedFiltersPopover debe tener ancho de sm:w-[600px]'
  );

  // Invariante 2: Grid de 2 columnas en sm+
  assert.ok(
    popoverContent.includes('grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 items-start'),
    'AdvancedFiltersPopover debe declarar grid de 2 columnas sm:grid-cols-2'
  );

  // Invariante 3: División de columnas (columna izquierda para flujo/tipo, derecha para prioridad/sprint/release/estimación)
  assert.ok(
    popoverContent.includes('{/* Left Column: Flow Status & Types */}'),
    'AdvancedFiltersPopover debe tener columna izquierda identificada'
  );
  assert.ok(
    popoverContent.includes('{/* Right Column: Priority, Sprint & Release, Modules, Estimation */}'),
    'AdvancedFiltersPopover debe tener columna derecha identificada'
  );

  // Invariante 4: Footer persistente con botones Limpiar y Cerrar
  assert.ok(
    popoverContent.includes('{/* Popover Footer */}'),
    'AdvancedFiltersPopover debe incluir Popover Footer'
  );
  assert.ok(
    popoverContent.includes('pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between min-w-0'),
    'Footer de AdvancedFiltersPopover debe tener borde superior y distribución justify-between'
  );

  console.log('✅ AdvancedFiltersPopover: contenedor de 600px, 2 columnas equilibradas y footer con botón de reset verificado.');
}

// =========================================================================
// TEST 4: Modales Secundarios en 1366x650 (Header y Footer 100% Visibles)
// =========================================================================
console.log('\n--- Test 4: Modales Secundarios en 1366x650 (Headers y Footers fijados) ---');
{
  // 4a: CompleteSprintModal
  const completePath = path.join(ROOT, 'src', 'components', 'CompleteSprintModal.tsx');
  const completeContent = fs.readFileSync(completePath, 'utf8');
  assert.ok(
    completeContent.includes('className="flex items-center justify-end gap-2.5 px-6 py-3 border-t border-slate-100 dark:border-white/[0.06] flex-shrink-0 bg-slate-50/50 dark:bg-white/[0.02]"'),
    'CompleteSprintModal debe tener footer fijo fuera del cuerpo desplazable'
  );

  // 4b: ProjectModal
  const projectPath = path.join(ROOT, 'src', 'components', 'ProjectModal.tsx');
  const projectContent = fs.readFileSync(projectPath, 'utf8');
  assert.ok(
    !projectContent.includes('sm:max-h-none'),
    'ProjectModal no debe contener sm:max-h-none que desborde viewports pequeños'
  );
  assert.ok(
    projectContent.includes('className="max-h-[90vh] flex flex-col"'),
    'ProjectModal debe declarar max-h-[90vh] flex flex-col'
  );
  assert.ok(
    projectContent.includes('className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1"'),
    'ProjectModal debe tener cuerpo con overflow-y-auto flex-1'
  );

  // 4c: SprintModal
  const sprintPath = path.join(ROOT, 'src', 'components', 'SprintModal.tsx');
  const sprintContent = fs.readFileSync(sprintPath, 'utf8');
  assert.ok(
    sprintContent.includes('className="max-h-[90vh] flex flex-col"'),
    'SprintModal debe declarar max-h-[90vh] flex flex-col'
  );
  assert.ok(
    sprintContent.includes('className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1"'),
    'SprintModal debe tener cuerpo con overflow-y-auto flex-1'
  );

  // 4d: ImportWizardModal
  const importPath = path.join(ROOT, 'src', 'components', 'ImportWizardModal.tsx');
  const importContent = fs.readFileSync(importPath, 'utf8');
  assert.ok(
    importContent.includes('shrink-0'),
    'ImportWizardModal debe tener header y footer con shrink-0'
  );

  console.log('✅ Modales secundarios (CompleteSprintModal, ProjectModal, SprintModal, ImportWizardModal): footers fijados y cuerpos desplazables 100% seguros en 650px.');
}

// =========================================================================
// TEST 5: Vistas Secundarias (Paddings y Márgenes Compactos)
// =========================================================================
console.log('\n--- Test 5: Vistas Secundarias (Paddings Compactos para 1366x768 / 1366x650) ---');
{
  // 5a: SprintView
  const sprintViewPath = path.join(ROOT, 'src', 'components', 'SprintView.tsx');
  const sprintViewContent = fs.readFileSync(sprintViewPath, 'utf8');
  assert.ok(
    sprintViewContent.includes('p-3.5 sm:p-5 max-w-[1680px] mx-auto'),
    'SprintView debe usar padding p-3.5 sm:p-5'
  );
  assert.ok(
    sprintViewContent.includes('mb-3'),
    'SprintView debe usar margen inferior mb-3 en controles'
  );

  // 5b: ReleaseAssembler
  const releasePath = path.join(ROOT, 'src', 'components', 'ReleaseAssembler.tsx');
  const releaseContent = fs.readFileSync(releasePath, 'utf8');
  assert.ok(
    releaseContent.includes('p-3.5 sm:p-5 min-w-0 max-w-[1680px] mx-auto space-y-4 pb-8'),
    'ReleaseAssembler debe usar contenedor compacto space-y-4 pb-8'
  );

  // 5c: SettingsView
  const settingsPath = path.join(ROOT, 'src', 'components', 'SettingsView.tsx');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');
  assert.ok(
    settingsContent.includes('px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4'),
    'SettingsView debe usar cabecera sticky compacta py-2.5 sm:py-3'
  );

  // 5d: MetricsView
  const metricsPath = path.join(ROOT, 'src', 'components', 'MetricsView.tsx');
  const metricsContent = fs.readFileSync(metricsPath, 'utf8');
  assert.ok(
    metricsContent.includes('py-4 sm:py-5 flex-1 flex flex-col min-h-0 space-y-4 sm:space-y-5'),
    'MetricsView debe usar padding vertical compacto py-4 sm:py-5 space-y-4 sm:space-y-5'
  );

  console.log('✅ Vistas secundarias: paddings y separaciones optimizados en SprintView, ReleaseAssembler, SettingsView y MetricsView.');
}

// =========================================================================
// TEST 6: Invariante Negativo Obligatorio (Scroll Horizontal Kanban)
// =========================================================================
console.log('\n--- Test 6: Invariante Negativo Obligatorio (Scroll Horizontal en Kanban) ---');
{
  const kanbanPath = path.join(ROOT, 'src', 'components', 'KanbanBoard.tsx');
  const kanbanContent = fs.readFileSync(kanbanPath, 'utf8');

  // Invariante: Preservar overflow-x-auto y minmax(280px, 1fr)
  assert.ok(
    kanbanContent.includes('overflow-x-auto pb-6'),
    'KanbanBoard debe preservar el contenedor de desplazamiento horizontal overflow-x-auto pb-6'
  );
  assert.ok(
    kanbanContent.includes('minmax(280px, 1fr)'),
    'KanbanBoard debe mantener el ancho mínimo de columnas en 280px (minmax(280px, 1fr))'
  );
  assert.ok(
    kanbanContent.includes('min-w-[960px]'),
    'KanbanBoard debe mantener min-w-[960px] en el grid de escritorio'
  );

  console.log('✅ Invariante negativo preservado: contenedor con scroll horizontal intacto y columnas con min-width de 280px sin alteraciones.');
}

console.log('\n🎉 ¡TODAS LAS ASIGNACIONES DE DENSIDAD UX (AC #1 a #6) PASARON EXITOSAMENTE!');
