'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Se reinicia el boundary cuando cambia (ej. al reconfigurar el widget). */
  resetKey?: string;
}

interface State {
  error: Error | null;
  resetKey?: string;
}

/**
 * Aísla el fallo de un widget para que no tumbe el dashboard entero.
 *
 * Tiene que ser una clase: React no expone `componentDidCatch` en componentes
 * de función y no hay hook equivalente.
 */
export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Al cambiar la config del widget se limpia el error y se reintenta pintar.
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error) {
    console.error('Insights · fallo al renderizar un widget:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-1.5 px-4 text-center">
          <AlertTriangle size={18} className="text-amber-500" />
          <p className="text-sm text-[#1C1C1C]">No se pudo dibujar este gráfico</p>
          <p className="text-xs text-[#6B7280]">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
