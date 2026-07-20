import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import NepaliDateRangePicker from './NepaliDateRangePicker.svelte';

describe('NepaliDateRangePicker', () => {
  it('selects a range with two day clicks and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(NepaliDateRangePicker, {
      props: {
        label: 'Session dates',
        startDate: '',
        endDate: '',
        startAriaLabel: 'Session start',
        endAriaLabel: 'Session end',
        onChange,
        // Open on Baisakh 2082 so day buttons are stable.
      },
    });

    await user.click(screen.getByRole('button', { name: /session start to session end/i }));
    expect(screen.getByTestId('range-picker-hint')).toHaveTextContent(/Select start date/i);

    // Force calendar onto known month via first available day in grid after open.
    // NepaliCalendar defaults to today — pick any two Select buttons.
    const days = screen.getAllByRole('button', { name: /Select \d{4}-\d{2}-\d{2}/i });
    expect(days.length).toBeGreaterThan(1);
    const firstIso = days[0]!.getAttribute('aria-label')!.replace('Select ', '');
    const secondIso = days[2]!.getAttribute('aria-label')!.replace('Select ', '');

    await user.click(days[0]!);
    expect(screen.getByTestId('range-picker-hint')).toHaveTextContent(/Select end date/i);
    await user.click(days[2]!);

    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0]![0] as { startDate: string; endDate: string };
    expect([range.startDate, range.endDate].sort()).toEqual([firstIso, secondIso].sort());
    expect(screen.queryByTestId('nepali-calendar')).not.toBeInTheDocument();
  });

  it('shows existing range on the summary button', () => {
    render(NepaliDateRangePicker, {
      props: {
        label: 'Session dates',
        startDate: '2025-04-14',
        endDate: '2026-04-13',
        onChange: vi.fn(),
      },
    });
    expect(screen.getByText(/Baisakh/i)).toBeInTheDocument();
    expect(screen.getByText(/AD /i)).toBeInTheDocument();
  });
});
