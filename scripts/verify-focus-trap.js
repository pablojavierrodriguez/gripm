import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Verifies the focus trap contract across every dialog component (DEV-173, AC #2).
 *
 * The hook cannot be exercised without a DOM (the project is zero-deps, so there
 * is no jsdom), so this checks the two things that actually regress silently:
 * that each dialog opts into the shared hook, and that the hook implements the
 * four behaviours the AC requires.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = path.join(ROOT, 'src', 'hooks', 'useFocusTrap.ts');
const COMPONENTS_DIR = path.join(ROOT, 'src', 'components');

/** Every overlay in the app. The AC named five; there are eight, and leaving three
 *  behind would mean a modal that traps focus next to ones that do not. */
const DIALOGS = [
  'ConfirmModal',
  'CompleteSprintModal',
  'FolderPickerModal',
  'ImportWizardModal',
  'ItemModal',
  'PlanGuardModal',
  'ProjectModal',
  'SprintModal',
];

// --- 1. The hook implements the four required behaviours --------------------

{
  const hook = fs.readFileSync(HOOK, 'utf8');

  assert.ok(
    hook.includes("event.key !== 'Tab'"),
    'AC #2: el hook debe ciclar Tab y Shift+Tab',
  );
  assert.ok(
    hook.includes("event.key === 'Escape'"),
    'AC #2: el hook debe cerrar con Escape',
  );
  assert.ok(
    hook.includes('restoreFocusRef'),
    'AC #2: el hook debe devolver el foco al elemento disparador',
  );
  assert.ok(
    /restoreTo\.isConnected/.test(hook),
    'AC #2: la restauración del foco debe tolerar un disparador desmontado',
  );
  assert.ok(
    hook.includes('removeEventListener'),
    'AC #2: el listener debe liberarse al cerrar, si no se acumulan',
  );

  console.log('✅ DEV-173 AC #2: useFocusTrap implementa Tab, Shift+Tab, Escape y retorno de foco');
}

// --- 2. Every dialog opts into the shared hook ------------------------------

{
  const missing = [];

  for (const name of DIALOGS) {
    const src = fs.readFileSync(path.join(COMPONENTS_DIR, `${name}.tsx`), 'utf8');

    if (!src.includes("from '../hooks/useFocusTrap'")) missing.push(`${name}: sin import`);
    if (!/useFocusTrap<HTMLDivElement>\(isOpen, onClose\)/.test(src)) {
      missing.push(`${name}: no invoca el hook con (isOpen, onClose)`);
    }
    if (!/ref=\{panelRef\}/.test(src)) missing.push(`${name}: el panel no recibe el ref`);
    if (!/role="dialog"/.test(src)) missing.push(`${name}: falta role="dialog"`);
    if (!/aria-modal="true"/.test(src)) missing.push(`${name}: falta aria-modal`);
    if (!/tabIndex=\{-1\}/.test(src)) {
      missing.push(`${name}: el panel no es enfocable como último recurso`);
    }
  }

  assert.deepEqual(missing, [], `Diálogos incompletos:\n  ${missing.join('\n  ')}`);
  console.log(`✅ DEV-173 AC #2: ${DIALOGS.length} diálogos con trampa de foco y contrato ARIA`);
}

// --- 3. No duplicate Escape handlers that would close two dialogs at once ---

{
  const offenders = [];

  for (const name of DIALOGS) {
    const src = fs.readFileSync(path.join(COMPONENTS_DIR, `${name}.tsx`), 'utf8');
    // An Escape branch outside the hook means two handlers on the same keypress.
    if (/e\.key === ['"]Escape['"]/.test(src)) offenders.push(name);
  }

  assert.deepEqual(
    offenders,
    [],
    `Escape duplicado en: ${offenders.join(', ')}. El hook ya lo maneja.`,
  );
  console.log('✅ DEV-173 AC #2: ningún diálogo duplica el cierre con Escape');
}

console.log('🎉 All focus trap tests passed successfully!');