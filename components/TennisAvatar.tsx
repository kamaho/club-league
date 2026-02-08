import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';

export interface TennisAvatarProps {
  /** User with optional avatarUrl; id used as seed for generated avatar */
  user: { id: string; name: string; avatarUrl?: string | null };
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Avatar that shows user.avatarUrl if set, otherwise a DiceBear avatar from user.id (same user = same avatar).
 */
export const TennisAvatar: React.FC<TennisAvatarProps> = ({ user, size = 48, className = '', rounded = true }) => {
  const pixelSize = typeof size === 'number' ? size : 48;

  const generatedAvatar = useMemo(() => {
    return createAvatar(lorelei, {
      seed: user.id,
      size: pixelSize,
    }).toDataUri();
  }, [user.id, pixelSize]);

  const src = user.avatarUrl || generatedAvatar;

  return (
    <img
      src={src}
      alt=""
      className={`object-cover shrink-0 ${rounded ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      title={user.name}
    />
  );
};
