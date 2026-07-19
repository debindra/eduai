import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import NepaliCalendar from './NepaliCalendar.svelte';

describe('NepaliCalendar', () => {
  it('shows 12-month overview by default and drills into a month', async () => {
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
});
