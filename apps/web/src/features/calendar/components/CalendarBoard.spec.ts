import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  formatAdDateRangeSecondary,
  formatBsDateRangePrimary,
} from '../../shared/nepali-calendar-logic';
import CalendarBoard from './CalendarBoard.svelte';

describe('CalendarBoard', () => {
  it('renders Nepali calendar and closure legend with category tones', () => {
    render(CalendarBoard, {
      props: {
        bsYear: 2082,
        title: 'School calendar',
        readOnly: true,
        nationalClosures: [
          {
            name: 'Republic Day',
            startDate: '2025-05-29',
            endDate: '2025-05-29',
            category: 'govt_holiday',
          },
        ],
        localClosures: [
          {
            name: 'Sports',
            startDate: '2025-06-01',
            endDate: '2025-06-01',
            category: 'eca',
          },
        ],
      },
    });
    expect(screen.getByTestId('calendar-board')).toBeInTheDocument();
    expect(screen.getByTestId('nepali-calendar')).toBeInTheDocument();
    expect(screen.getByText('School calendar')).toBeInTheDocument();
    expect(screen.getByText('Republic Day')).toBeInTheDocument();
    expect(screen.getByText('Sports')).toBeInTheDocument();
    expect(screen.getByText('Government holiday')).toBeInTheDocument();
    expect(screen.getByText('ECA (Extra Curricular)/CCA (Co-Curricular)')).toBeInTheDocument();
    expect(
      screen.getByText(formatBsDateRangePrimary('2025-05-29', '2025-05-29')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatAdDateRangeSecondary('2025-05-29', '2025-05-29')),
    ).toBeInTheDocument();
    expect(screen.queryByText('2025-05-29 → 2025-05-29')).not.toBeInTheDocument();
    expect(screen.queryByText(/View only/i)).not.toBeInTheDocument();
  });

  it('opens closure dialog when editable and a day is clicked', async () => {
    const user = userEvent.setup();
    render(CalendarBoard, {
      props: {
        bsYear: 2082,
        title: 'Editable',
        editable: true,
        editKind: 'school',
        initialView: 'month',
        nationalClosures: [],
        closures: [],
      },
    });
    const dayButtons = screen.getAllByRole('button', { name: /Select \d{4}-\d{2}-\d{2}/i });
    expect(dayButtons.length).toBeGreaterThan(0);
    await user.click(dayButtons[0]!);
    expect(screen.getByTestId('closure-form-dialog')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Add school date/i)).toBeInTheDocument();
  });

  it('opens national closure dialog when editKind is national', async () => {
    const user = userEvent.setup();
    render(CalendarBoard, {
      props: {
        bsYear: 2082,
        title: 'National',
        editable: true,
        editKind: 'national',
        initialView: 'month',
        editableNationalClosures: [],
      },
    });
    const dayButtons = screen.getAllByRole('button', { name: /Select \d{4}-\d{2}-\d{2}/i });
    await user.click(dayButtons[0]!);
    expect(screen.getByTestId('closure-form-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Add national closure/i)).toBeInTheDocument();
  });

  it('shows weekly offs in the legend as day_off / red', () => {
    render(CalendarBoard, {
      props: {
        bsYear: 2082,
        title: 'School calendar',
        readOnly: true,
        nationalClosures: [],
        localClosures: [],
        sessionStart: '2025-10-01',
        sessionEnd: '2025-10-07',
        weeklyOffs: [6, 7],
      },
    });
    expect(screen.getByText(/Weekly offs \(Sat, Sun\)/i)).toBeInTheDocument();
    expect(screen.getByText('Day off')).toBeInTheDocument();
  });
});
