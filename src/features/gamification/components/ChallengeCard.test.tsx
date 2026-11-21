import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChallengeCard } from './ChallengeCard';
import type { ChallengeProgress } from '@/interfaces/gamification.interface';

describe('ChallengeCard', () => {
  const mockWeeklyIncomplete: ChallengeProgress = {
    challengeId: 'weekly_add_items',
    uniqueKey: 'weekly_add_items_2026-W47',
    title: 'Catalogador semanal',
    description: 'Añade al menos 2 ítems en la semana',
    category: 'weekly',
    icon: 'PackagePlus',
    current: 1,
    target: 2,
    percentage: 50,
    xpReward: 30,
    isCompleted: false,
    isClaimed: false,
  };

  const mockMilestoneCompleted: ChallengeProgress = {
    challengeId: 'milestone_collections',
    uniqueKey: 'milestone_collections',
    title: 'Cimientos firmes',
    description: 'Crea al menos 2 colecciones personalizadas',
    category: 'milestone',
    icon: 'Layers',
    current: 2,
    target: 2,
    percentage: 100,
    xpReward: 30,
    isCompleted: true,
    isClaimed: false,
  };

  const mockClaimed: ChallengeProgress = {
    ...mockWeeklyIncomplete,
    current: 2,
    percentage: 100,
    isCompleted: true,
    isClaimed: true,
  };

  it('renders weekly challenge with badge, progress bar and disabled progress button when incomplete', () => {
    render(<ChallengeCard progress={mockWeeklyIncomplete} />);

    expect(screen.getByRole('article')).toBeDefined();
    expect(screen.getByText(/^Semanal$/i)).toBeDefined();
    expect(screen.getByText('+30 XP')).toBeDefined();
    expect(screen.getByText('Catalogador semanal')).toBeDefined();
    expect(screen.getByText('Añade al menos 2 ítems en la semana')).toBeDefined();
    expect(screen.getByText('1 / 2 (50%)')).toBeDefined();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('50');

    const button = screen.getByRole('button', { name: '1 / 2' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('renders completed challenge with interactive claim button and invokes onClaim when clicked', () => {
    const onClaim = vi.fn();
    render(<ChallengeCard progress={mockMilestoneCompleted} onClaim={onClaim} />);

    expect(screen.getByText(/^Hito$/i)).toBeDefined();
    expect(screen.getByText('Cimientos firmes')).toBeDefined();
    expect(screen.getByText('2 / 2 (100%)')).toBeDefined();

    const claimButton = screen.getByRole('button', { name: /Reclamar \(\+30 XP\)/i });
    expect(claimButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(claimButton);
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(onClaim).toHaveBeenCalledWith(mockMilestoneCompleted);
  });

  it('renders claimed challenge with "Reclamado" label and disabled button', () => {
    render(<ChallengeCard progress={mockClaimed} />);

    const claimedButton = screen.getByRole('button', { name: /Reclamado/i });
    expect(claimedButton.hasAttribute('disabled')).toBe(true);
  });
});
