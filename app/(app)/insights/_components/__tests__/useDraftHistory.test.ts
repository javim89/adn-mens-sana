import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDraftHistory } from '../useDraftHistory';

describe('useDraftHistory', () => {
  it('arranca sin nada que deshacer ni rehacer', () => {
    const { result } = renderHook(() => useDraftHistory('a'));
    expect(result.current.present).toBe('a');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('commit avanza y habilita deshacer', () => {
    const { result } = renderHook(() => useDraftHistory('a'));

    act(() => result.current.commit('b'));

    expect(result.current.present).toBe('b');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo vuelve al estado anterior y habilita rehacer', () => {
    const { result } = renderHook(() => useDraftHistory('a'));

    act(() => result.current.commit('b'));
    act(() => result.current.undo());

    expect(result.current.present).toBe('a');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo vuelve a avanzar', () => {
    const { result } = renderHook(() => useDraftHistory('a'));

    act(() => result.current.commit('b'));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.present).toBe('b');
    expect(result.current.canRedo).toBe(false);
  });

  it('recorre varios pasos en orden', () => {
    const { result } = renderHook(() => useDraftHistory('a'));

    act(() => result.current.commit('b'));
    act(() => result.current.commit('c'));
    act(() => result.current.undo());
    expect(result.current.present).toBe('b');

    act(() => result.current.undo());
    expect(result.current.present).toBe('a');
    expect(result.current.canUndo).toBe(false);
  });

  // Rama abandonada: tras deshacer, un cambio nuevo descarta el futuro.
  it('un commit después de un undo borra lo que había para rehacer', () => {
    const { result } = renderHook(() => useDraftHistory('a'));

    act(() => result.current.commit('b'));
    act(() => result.current.undo());
    act(() => result.current.commit('c'));

    expect(result.current.present).toBe('c');
    expect(result.current.canRedo).toBe(false);
  });

  it('undo en el estado inicial no rompe ni cambia nada', () => {
    const { result } = renderHook(() => useDraftHistory('a'));

    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.present).toBe('a');
  });

  it('reset descarta el historial', () => {
    const { result } = renderHook(() => useDraftHistory('a'));

    act(() => result.current.commit('b'));
    act(() => result.current.reset('guardado'));

    expect(result.current.present).toBe('guardado');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('la pila se topa y no crece sin límite', () => {
    const { result } = renderHook(() => useDraftHistory(0));

    for (let i = 1; i <= 60; i++) {
      act(() => result.current.commit(i));
    }

    // Con el tope en 50, deshacer 50 veces llega al paso más viejo retenido,
    // no al estado inicial.
    for (let i = 0; i < 60; i++) {
      act(() => result.current.undo());
    }

    expect(result.current.canUndo).toBe(false);
    expect(result.current.present).toBe(10);
  });
});
