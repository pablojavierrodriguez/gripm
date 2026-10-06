import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Verifies the non-dragging reordering path (DEV-173, AC #3).
 *
 * `handleMoveWithinColumn` lives inside KanbanBoard, which imports icons and
 * renders JSX, so it cannot be imported from a plain node script. The order
 * arithmetic is therefore reproduced here and asserted against the shape the
 * component uses: a card must land strictly between the item it displaces and
 * the one beyond it, so a single update persists the move without rewriting
 * every other card in the column.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOARD = path.join(ROOT, 'src', 'components', 'KanbanBoard.tsx');
const CARD = path.join(ROOT, 'src', 'components', 'ItemCard.tsx');

/** Same scheme as handleMoveWithinColumn. */
function nextOrder(colItems, idx, direction) {
  const neighbourIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || neighbourIdx < 0 || neighbourIdx >= colItems.length) return null;

  const neighbour = colItems[neighbourIdx];
  const beyondIdx = direction === 'up' ? idx - 2 : idx + 2;
  const beyond = beyondIdx >= 0 && beyondIdx < colItems.length ? colItems[beyondIdx] : null;

  const neighbourOrder = neighbour.order ?? (neighbourIdx + 1) * 10;

  if (beyond) {
    const beyondOrder = beyond.order ?? (beyondIdx + 1) * 10;
    return direction === 'up'
      ? (beyondOrder < neighbourOrder
          ? beyondOrder + (neighbourOrder - beyondOrder) / 2
          : neighbourOrder + 5)
      : (beyondOrder > neighbourOrder
          ? neighbourOrder + (beyondOrder - neighbourOrder) / 2
          : neighbourOrder - 5);
  }
  return direction === 'up' ? neighbourOrder - 10 : neighbourOrder + 10;
}

const sortByOrder = (items) => [...items].sort((a, b) => a.order - b.order);

// --- 1. Moving up places the card before the one above it ------------------

{
  const items = [
    { id: 'a', order: 10 },
    { id: 'b', order: 20 },
    { id: 'c', order: 30 },
  ];
  const order = nextOrder(items, 2, 'up');
  assert.ok(order !== null, 'mover hacia arriba debe producir un order');
  assert.ok(
    order < items[1].order,
    `mover "c" hacia arriba debe caer por debajo de "b" (${order} vs ${items[1].order})`,
  );

  const moved = sortByOrder(items.map((i) => (i.id === 'c' ? { ...i, order } : i)));
  assert.deepEqual(moved.map((i) => i.id), ['a', 'c', 'b'], 'el orden final debe ser a, c, b');
}

// --- 2. Moving down places the card after the one below it ------------------

{
  const items = [
    { id: 'a', order: 10 },
    { id: 'b', order: 20 },
    { id: 'c', order: 30 },
  ];
  const order = nextOrder(items, 0, 'down');
  assert.ok(order > items[1].order, `mover "a" hacia abajo debe caer por encima de "b" (${order} vs ${items[1].order})`);

  const moved = sortByOrder(items.map((i) => (i.id === 'a' ? { ...i, order } : i)));
  assert.deepEqual(moved.map((i) => i.id), ['b', 'a', 'c'], 'el orden final debe ser b, a, c');
}

// --- 3. Edges are refused rather than silently corrupting order ------------

{
  const items = [
    { id: 'a', order: 10 },
    { id: 'b', order: 20 },
  ];
  assert.equal(nextOrder(items, 0, 'up'), null, 'la primera tarjeta no puede subir');
  assert.equal(nextOrder(items, 1, 'down'), null, 'la última tarjeta no puede bajar');
}

// --- 4. Items without an explicit order still resolve ----------------------

{
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const order = nextOrder(items, 2, 'up');
  assert.ok(order !== null && Number.isFinite(order), 'un order implícito debe resolverse');
  assert.ok(order < 20, `debe caer por debajo del vecino implícito (${order})`);
}

// --- 5. The component wires the actions and the guard ---------------------

{
  const board = fs.readFileSync(BOARD, 'utf8');
  const card = fs.readFileSync(CARD, 'utf8');

  assert.ok(
    board.includes('handleMoveWithinColumn'),
    'AC #3: KanbanBoard debe exponer el reordenamiento sin puntero',
  );
  assert.ok(
    board.includes('canMoveUp={idx > 0}'),
    'AC #3: el borde superior debe deshabilitar "Subir"',
  );
  assert.ok(
    board.includes('canMoveDown={idx < colItems.length - 1}'),
    'AC #3: el borde inferior debe deshabilitar "Bajar"',
  );
  assert.ok(card.includes("onMoveWithinColumn('up')"), 'AC #3: la tarjeta debe ofrecer Subir');
  assert.ok(card.includes("onMoveWithinColumn('down')"), 'AC #3: la tarjeta debe ofrecer Bajar');

  // Both locales must carry the labels, or the menu renders raw keys.
  for (const locale of ['es', 'en']) {
    const json = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'src', 'locales', `${locale}.json`), 'utf8'),
    );
    assert.ok(json['card.moveUp'], `falta card.moveUp en ${locale}.json`);
    assert.ok(json['card.moveDown'], `falta card.moveDown en ${locale}.json`);
  }

  console.log('✅ DEV-173 AC #3: reordenamiento sin puntero verificado (aritmética, bordes e integración)');
}

console.log('🎉 All reorder tests passed successfully!');