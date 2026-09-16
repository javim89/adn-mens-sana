'use client';

import { useCallback, useState } from 'react';

const MAX_STEPS = 50;

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Estado con pila de undo/redo.
 *
 * Las tres pilas viven en un único `useState` y no en refs: `canUndo`/`canRedo`
 * se derivan de ellas y se leen durante el render, así que tienen que ser
 * estado real — con refs, los botones no se re-habilitarían al cambiar la pila.
 *
 * Solo vive en memoria: al recargar se pierde, como en cualquier editor sin
 * borradores. La pila se topa en `MAX_STEPS` para que una sesión larga de
 * arrastres no crezca sin límite.
 */
export function useDraftHistory<T>(initial: T) {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const commit = useCallback((next: T) => {
    setHistory((h) => ({
      past: [...h.past, h.present].slice(-MAX_STEPS),
      present: next,
      // Cualquier cambio nuevo invalida el futuro: es la rama que se abandona.
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      return {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future].slice(0, MAX_STEPS),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      return {
        past: [...h.past, h.present].slice(-MAX_STEPS),
        present: h.future[0],
        future: h.future.slice(1),
      };
    });
  }, []);

  /** Descarta el historial y arranca de cero (después de guardar). */
  const reset = useCallback((next: T) => {
    setHistory({ past: [], present: next, future: [] });
  }, []);

  return {
    present: history.present,
    commit,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
