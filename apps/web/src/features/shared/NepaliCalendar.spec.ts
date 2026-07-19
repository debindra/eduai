import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import NepaliCalendar from './NepaliCalendar.svelte';
import { formatBsHeading, todayBsParts } from './nepali-calendar-logic';

describe('NepaliCalendar', () => {
  it('opens on the current BS month by default', () => {
    const today = todayBsParts();
    render(NepaliCalendar, { props: { bsYear: today.bsYear } });
    expect(
      screen.getByText(formatBsHeading(today.bsYear, today.bsMonth)),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous month/i })).toBeInTheDocument();
    expect(screen.queryByText(/12-month overview/i)).not.toBeInTheDocument();
  });

  it('shows 12-month overview when initialView is year and drills into a month', async () => {
    const user = userEvent.setup();
    render(NepaliCalendar, { props: { bsYear: 2082, initialView: 'year' } });
    expect(screen.getByRole('heading', { name: /BS 2082/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Open Baisakh 2082/i }));
    expect(screen.getByText(/^Baisakh 2082$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous month/i })).toBeDisabled();
  });

  it('blocks next month at Chaitra (end of BS year)', async () => {
    const user = userEvent.setup();
    render(NepaliCalendar, {
      props: { bsYear: 2082, bsMonth: 12, initialView: 'month' },
    });
    expect(screen.getByRole('button', { name: /Next month/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Year/i }));
    expect(screen.getByText(/12-month overview/i)).toBeInTheDocument();
  });

  it('applies tone class for marked dates in month view', () => {
    render(NepaliCalendar, {
      props: {
        bsYear: 2082,
        bsMonth: 1,
        initialView: 'month',
        markedDates: {
          '2025-04-14': { label: 'Holiday', tone: 'red' },
        },
      },
    });
    const marked = document.querySelector('[data-tone="red"]');
    expect(marked).not.toBeNull();
    expect(marked?.textContent).toContain('Holiday');
  });
});
