import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';

/** Bakgrunnsfarger for avatar (ingen svart/hvit). Stabil per user.id. */
const AVATAR_BG_COLORS = [
  '#e0f2fe', '#dbeafe', '#e0e7ff', '#ede9fe', '#fce7f3',
  '#fef3c7', '#d1fae5', '#ccfbf1', '#e2e8f0', '#fecdd3',
  '#bfdbfe', '#c4b5fd', '#fbcfe8', '#fde68a', '#a7f3d0',
];

function getAvatarBgColor(userId: string): string {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n = (n * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_BG_COLORS[n % AVATAR_BG_COLORS.length];
}

export interface TennisAvatarProps {
  /** User with optional avatarUrl; id used as seed for generated avatar */
  user: { id: string; name: string; avatarUrl?: string | null };
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Avatar that shows user.avatarUrl if set, otherwise a DiceBear avatar from user.id (same user = same avatar).
 * Background color is randomized per user (no black/white).
 */
export const TennisAvatar: React.FC<TennisAvatarProps> = ({ user, size = 48, className = '', rounded = true }) => {
  const pixelSize = typeof size === 'number' ? size : 48;

  const generatedAvatar = useMemo(() => {
    return createAvatar(lorelei, {
      seed: user.id,
      size: pixelSize,
    }).toDataUri();
  }, [user.id, pixelSize]);

  const bgColor = useMemo(() => getAvatarBgColor(user.id), [user.id]);
  const src = user.avatarUrl || generatedAvatar;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${rounded ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={{ width: pixelSize, height: pixelSize, backgroundColor: bgColor }}
      title={user.name}
    >
      <img
        src={src}
        alt=""
        className="object-cover w-full h-full"
        style={{ width: pixelSize, height: pixelSize }}
      />
    </span>
  );
};
