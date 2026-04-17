// Event bus simples para invalidação cruzada entre páginas.
// Emite eventos quando dados mudam para que outras páginas abertas recarreguem.
//
// Uso:
//   emit('animal:changed')                    // após criar/editar/deletar animal
//   const unsub = on('animal:changed', fn)    // para ouvir
//   unsub()                                   // para parar de ouvir

const EVENT_PREFIX = 'gestao-rural:';

export function emit(tipo, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_PREFIX + tipo, { detail }));
}

export function on(tipo, handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = (e) => handler(e.detail || {});
  window.addEventListener(EVENT_PREFIX + tipo, listener);
  return () => window.removeEventListener(EVENT_PREFIX + tipo, listener);
}

// Tipos de eventos usados no app (referência para manter consistência)
export const EVENTS = {
  ANIMAL_CHANGED: 'animal:changed',
  EVENTO_CHANGED: 'evento:changed',
  MOVIMENTACAO_CHANGED: 'movimentacao:changed',
  DESPESA_CHANGED: 'despesa:changed',
  CATEGORIA_CHANGED: 'categoria:changed',
  LEMBRETE_CHANGED: 'lembrete:changed',
};
