export const formatTime = (dateString: string): string => {
  const d = new Date(dateString);
  const hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${mins.toString().padStart(2, '0')} ${ampm}`;
};

export const formatDateSeparator = (dateString: string): string => {
  const d = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - msgDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const getDateKey = (dateString: string): string => {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const getAvatarColor = (name?: string): string => {
  const colors = ['#C96A25', '#5F745F', '#4A6741', '#D97706', '#2563EB', '#7C3AED'];
  if (!name) return colors[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
};

export const QUICK_EMOJIS = ['❤️', '😭', '🔥', '😆', '💖'];

export const ALL_EMOJIS = [
  '❤️', '😭', '🔥', '😆', '💖', '👍', '🎉', '🏖️', '✈️', '🙌', '😍', '👀', '🌴', '✨', '🍻',
];
