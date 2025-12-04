import Avatar from 'boring-avatars';

interface UserAvatarProps {
  did: string;
  avatarUrl?: string;
  size: number;
  className?: string;
}

// Simple hash function to create consistent avatar seeds
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * UserAvatar component that shows either custom avatar or boring-avatars fallback
 */
export function UserAvatar({ did, avatarUrl, size, className = '' }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Avatar"
        style={{ width: size, height: size }}
        className={`object-cover rounded-full flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
      <Avatar
        size={size}
        name={hashString(did)}
        variant="marble"
        colors={["#fdbf5c", "#f69a0b", "#d43a00", "#9b0800", "#1d2440"]}
      />
    </div>
  );
}
