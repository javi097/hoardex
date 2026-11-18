import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App navigation & router', () => {
  it('renders HomePage on default route', () => {
    render(<App />);
    expect(screen.getByText('Mis Colecciones')).toBeDefined();
    expect(screen.getByRole('button', { name: /Nueva colección/i })).toBeDefined();
  });
});
