import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Alert from './Alert.svelte';

describe('Alert', () => {
  it('renders an error message with the alert role', () => {
    render(Alert, { props: { message: 'Something failed' } });
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('Something failed');
  });

  it('renders a success message with the status role', () => {
    render(Alert, { props: { variant: 'success', message: 'Saved' } });
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Saved');
  });

  it('renders nothing when the message is empty', () => {
    render(Alert, { props: { message: null } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
