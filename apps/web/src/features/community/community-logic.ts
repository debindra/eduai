export interface CommunityMoment {
  id: string;
  title: string;
  method: string;
  body: string;
}

export interface CommunityFeed {
  moments: CommunityMoment[];
}

/** Human-friendly label for the method tag on a moment. */
export function methodLabel(method: string): string {
  return method
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
