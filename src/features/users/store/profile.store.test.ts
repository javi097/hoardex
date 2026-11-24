import { beforeEach, describe, expect, it } from 'vitest';
import { useProfileStore } from './profile.store';
import type { Profile } from '@/interfaces/user.interface';

describe('profile.store', () => {
  const sampleProfile: Profile = {
    id: 'user-1',
    username: 'javi',
    displayName: 'Javi Gómez',
    avatarUrl: 'https://example.com/javi.jpg',
    bio: 'Coleccionista de videojuegos y cómics',
    isPublic: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    useProfileStore.getState().clearProfile();
  });

  it('starts with null profile and false isLoading', () => {
    const state = useProfileStore.getState();
    expect(state.profile).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('sets profile and resets isLoading to false', () => {
    useProfileStore.getState().setIsLoading(true);
    expect(useProfileStore.getState().isLoading).toBe(true);

    useProfileStore.getState().setProfile(sampleProfile);
    const state = useProfileStore.getState();
    expect(state.profile).toEqual(sampleProfile);
    expect(state.isLoading).toBe(false);
  });

  it('updates profile partially without mutating other fields', () => {
    useProfileStore.getState().setProfile(sampleProfile);

    useProfileStore.getState().updateProfile({
      displayName: 'Javier Gómez',
      bio: 'Nueva bio',
      isPublic: false,
    });

    const state = useProfileStore.getState();
    expect(state.profile?.displayName).toBe('Javier Gómez');
    expect(state.profile?.bio).toBe('Nueva bio');
    expect(state.profile?.isPublic).toBe(false);
    expect(state.profile?.username).toBe('javi');
    expect(state.profile?.id).toBe('user-1');
  });

  it('ignores updateProfile when profile is null', () => {
    useProfileStore.getState().updateProfile({ displayName: 'Nobody' });
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it('clears profile and resets isLoading', () => {
    useProfileStore.getState().setProfile(sampleProfile);
    useProfileStore.getState().setIsLoading(true);

    useProfileStore.getState().clearProfile();
    const state = useProfileStore.getState();
    expect(state.profile).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
