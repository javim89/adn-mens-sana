import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import React from 'react';
import DeportistaFormTabs, {
  type TabId,
} from '../app/(app)/deportistas/_components/DeportistaFormTabs';

function renderTabs(
  overrides: Partial<React.ComponentProps<typeof DeportistaFormTabs>> = {},
) {
  const onTabChange = vi.fn();
  const props: React.ComponentProps<typeof DeportistaFormTabs> = {
    activeTab: 'personal' as TabId,
    onTabChange,
    tabsWithErrors: {},
    ...overrides,
  };
  const utils = render(<DeportistaFormTabs {...props} />);
  return { ...utils, onTabChange };
}

test('the tab bar fixes the phantom vertical scroll (overflow-x-auto + overflow-y-hidden)', () => {
  renderTabs();
  const tablist = screen.getByRole('tablist');
  expect(tablist.className).toContain('overflow-x-auto');
  expect(tablist.className).toContain('overflow-y-hidden');
});

test('the tab bar hides its scrollbar and enables horizontal scroll-snap', () => {
  renderTabs();
  const tablist = screen.getByRole('tablist');
  expect(tablist.className).toContain('scrollbar-hide');
  expect(tablist.className).toContain('snap-x');
});

test('every tab button carries the snap-start class for horizontal scroll-snap', () => {
  renderTabs();
  const tabs = screen.getAllByRole('tab');
  expect(tabs).toHaveLength(5);
  tabs.forEach((tab) => {
    expect(tab.className).toContain('snap-start');
  });
});

test('the right-side fade exists and is hidden on md+ where all tabs fit', () => {
  renderTabs();
  const fade = screen.getByTestId('tabs-fade');
  expect(fade).toBeInTheDocument();
  expect(fade.className).toContain('md:hidden');
  expect(fade.className).toContain('pointer-events-none');
  expect(fade.className).toContain('from-white');
});

test('the error badge "!" renders only for tabs flagged in tabsWithErrors', () => {
  renderTabs({ tabsWithErrors: { personal: true } });
  // Exactly one badge for the flagged tab
  expect(screen.getAllByText('!')).toHaveLength(1);
});

test('no error badge renders when no tab has errors', () => {
  renderTabs();
  expect(screen.queryByText('!')).not.toBeInTheDocument();
});

test('the active tab keeps its navy active border/text classes', () => {
  renderTabs({ activeTab: 'deportivo' });
  const activeTab = screen.getByRole('tab', { name: 'Datos Deportivos' });
  expect(activeTab.className).toContain('border-[#121A61]');
  expect(activeTab.className).toContain('text-[#121A61]');
  expect(activeTab.getAttribute('aria-selected')).toBe('true');
});

test('clicking a tab calls onTabChange with the correct TabId (interaction regression)', async () => {
  const user = userEvent.setup();
  const { onTabChange } = renderTabs();
  await user.click(screen.getByRole('tab', { name: 'Salud' }));
  expect(onTabChange).toHaveBeenCalledWith('salud');
});
