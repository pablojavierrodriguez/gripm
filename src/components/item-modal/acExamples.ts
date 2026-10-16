import type { ItemType } from '../../types';

/**
 * DEV-126: Ejemplos de Criterio de Aceptación según el Tipo del ítem.
 */
const AC_EXAMPLES_BY_TYPE: Record<string, (ref: string) => string> = {
  bug: (r) =>
    r
      ? `Dado que el usuario intenta «${r}», el sistema responde correctamente, sin errores ni saltos de contenido.`
      : 'Dado que el usuario ejecuta un flujo no previsto, el sistema responde correctamente, sin errores ni saltos de contenido.',
  feature: (r) =>
    r
      ? `«${r}» queda disponible para el usuario sin pasos manuales, y el resultado se persiste.`
      : 'La funcionalidad queda disponible para el usuario sin pasos manuales, y el resultado se persiste.',
  tech_debt: (r) =>
    r
      ? `El módulo «${r}» queda sin dependencias obsoletas y la suite de tests sigue pasando en verde.`
      : 'El módulo afectado queda sin dependencias obsoletas y la suite de tests sigue pasando en verde.',
  ux: (r) =>
    r
      ? `Al interactuar con «${r}», la interfaz se mantiene legible y sin saltos de layout, en móvil y escritorio.`
      : 'Al interactuar con el elemento, la interfaz se mantiene legible y sin saltos de layout, en móvil y escritorio.',
  epic: (r) =>
    r
      ? `«${r}» se resuelve de punta a punta, con estados y roles bien definidos.`
      : 'El flujo completo se resuelve de punta a punta, con estados y roles bien definidos.',
  initiative: (r) =>
    r
      ? `«${r}» se da por completado cuando existe un impacto medible en el equipo o el producto.`
      : 'El objetivo estratégico se da por completado cuando existe un impacto medible en el equipo o el producto.'
};

const AC_EXAMPLE_FALLBACK = (r: string): string =>
  r
    ? `Describe un resultado observable y verificable sobre «${r}», en una sola frase.`
    : 'Describe un resultado observable y verificable, en una sola frase.';

const acExampleForType = new Proxy(
  (() => AC_EXAMPLE_FALLBACK) as unknown as (type: string) => (ref: string) => string,
  {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && typeof AC_EXAMPLES_BY_TYPE[prop] === 'function') {
        return AC_EXAMPLES_BY_TYPE[prop];
      }
      return Reflect.get(target, prop);
    }
  }
);

/** Recorta el texto de referencia para que el placeholder nunca desborde el input. */
export const buildCriterionExample = (type: ItemType, title: string, module: string): string => {
  const raw = (title || module || '').trim().replace(/\s+/g, ' ');
  const ref = raw.length > 40 ? `${raw.slice(0, 40).trimEnd()}…` : raw;
  return acExampleForType(type)(ref);
};
