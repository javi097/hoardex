import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar component', () => {
  it('renders initials on gradient when no avatarUrl is provided', () => {
    render(<UserAvatar displayName="Javier Gómez" username="javig" />);

    const avatar = screen.getByRole('img', {
      name: /avatar de javier gómez \(@javig\)/i,
    });
    expect(avatar).toBeDefined();
    expect(avatar.textContent).toBe('JG');
  });

  it('renders an image when avatarUrl is provided', () => {
    render(
      <UserAvatar
        displayName="Ada Lovelace"
        username="ada"
        avatarUrl="https://example.com/ada.jpg"
      />
    );

    const img = screen.getByRole('img', {
      name: /avatar de ada lovelace \(@ada\)/i,
    });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/ada.jpg');
  });

  it('falls back to initials when image fails to load', () => {
    render(
      <UserAvatar
        displayName="Alan Turing"
        username="alan"
        avatarUrl="https://broken-image.com/alan.png"
      />
    );

    const imgElement = screen.getByAltText(/avatar de alan turing \(@alan\)/i);
    expect(imgElement).toBeDefined();

    // Fire error event
    fireEvent.error(imgElement);

    // Image is gone and initials fallback is displayed
    expect(
      screen.queryByAltText(/avatar de alan turing \(@alan\)/i)
    ).toBeNull();
    const fallback = screen.getByRole('img', {
      name: /avatar de alan turing \(@alan\)/i,
    });
    expect(fallback).toBeDefined();
    expect(fallback.textContent).toBe('AT');
  });

  it('applies the appropriate size classes', () => {
    const { rerender } = render(
      <UserAvatar displayName="Javi" size="sm" />
    );
    const container = screen.getByTestId('user-avatar');
    expect(container.className).toContain('h-8');
    expect(container.className).toContain('w-8');

    rerender(<UserAvatar displayName="Javi" size="lg" />);
    expect(container.className).toContain('h-16');
    expect(container.className).toContain('w-16');

    rerender(<UserAvatar displayName="Javi" size="xl" />);
    expect(container.className).toContain('h-24');
    expect(container.className).toContain('w-24');
  });
});
