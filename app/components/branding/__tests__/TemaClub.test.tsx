import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import TemaClub from '../TemaClub';
import { TEMA_BIOTEAM, TEMA_NEUTRO, type Tema } from '@/lib/branding/tokens';
import { temaDelClub } from '@/lib/branding/tema';

describe('TemaClub', () => {
  it('renderiza un <style data-tema-club> con las --club-* en :root', () => {
    const { container } = render(<TemaClub tema={temaDelClub({ colorPrimario: '#8b0000' })} />);
    const style = container.querySelector('style[data-tema-club]');
    expect(style).not.toBeNull();
    expect(style!.textContent).toMatch(/^:root\{/);
    expect(style!.textContent).toContain('--club-primario:#8b0000;');
  });

  it('se renderiza en el lugar (sin precedence/href, que lo hoistearían al <head>)', () => {
    const html = renderToStaticMarkup(
      <div id="raiz">
        <TemaClub tema={TEMA_NEUTRO} />
      </div>,
    );
    expect(html).toMatch(/^<div id="raiz"><style data-tema-club="">:root\{/);
    expect(html).not.toContain('data-precedence');
  });

  it('un valor que no es hex cae al default de BioTeam', () => {
    const malo = { ...TEMA_BIOTEAM, primario: 'red;}body{display:none' } as Tema;
    const { container } = render(<TemaClub tema={malo} />);
    const css = container.querySelector('style')!.textContent!;
    expect(css).not.toContain('body');
    expect(css).toContain(`--club-primario:${TEMA_BIOTEAM.primario};`);
  });
});
