import { apiFetch } from '../../lib/shared/api/client';
import type { CommunityFeed } from './community-logic';

export async function getMoments() {
  return apiFetch<CommunityFeed>('/community/moments');
}
