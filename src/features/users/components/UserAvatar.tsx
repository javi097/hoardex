import { useState } from 'react';
import { generateInitials } from '../core/profiles';
import { cn } from '@/lib/utils';

export type UserAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface Props {
  avatarUrl?: string | null;
  displayName: string;
  username?: string;
  size?: UserAvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<UserAvatarSize, { container: string; text: string }> = {
  sm: {
    container: 'h-8 w-8',
    text: 'text-xs',
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-sm',
  },
  lg: {
    container: 'h-16 w-16',
    text: 'text-xl',
  },
  xl: {
    container: 'h-24 w-24',
    text: 'text-3xl',
  },
};

/**
 * Avatar de usuario accesible con carga de imagen externa o iniciales sobre gradiente temático de Hoardex.
 */
export function UserAvatar({
  avatarUrl,
  displayName,
  username,
  size = 'md',
  className,
}: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const cleanUrl = avatarUrl?.trim();
  const showImage = Boolean(cleanUrl && failedUrl !== cleanUrl);
  const initials = generateInitials(displayName, username);
  const sizeConfig = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  const accessibleLabel = displayName
    ? `Avatar de ${displayName}${username ? ` (@${username})` : ''}`
    : 'Avatar de usuario';

  return (
    <div
      data-testid="user-avatar"
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-heading font-bold shadow-xs select-none',
        sizeConfig.container,
        className
      )}
    >
      {showImage ? (
        <img
          key={cleanUrl}
          src={cleanUrl}
          alt={accessibleLabel}
          onError={() => setFailedUrl(cleanUrl ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          role="img"
          aria-label={accessibleLabel}
          className={cn(
            'flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white tracking-wider',
            sizeConfig.text
          )}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
