import { Injectable } from '@nestjs/common';

export interface CommunityMoment {
  id: string;
  title: string;
  method: string;
  body: string;
}

/**
 * Config-driven library of shareable teaching moments / method highlights.
 * Deliberately contains NO child records or child-identifiable data — the
 * community library is teacher-to-teacher practice sharing only.
 */
export const COMMUNITY_MOMENTS: CommunityMoment[] = [
  {
    id: 'moment-circle-time',
    title: 'Calm circle-time start',
    method: 'routine',
    body: 'Open the day with a two-minute breathing-and-greeting circle to settle the class before the first activity.',
  },
  {
    id: 'moment-peer-pairs',
    title: 'Peer-practice pairs',
    method: 'peer_practice',
    body: 'Pair a confident learner with one who needs support for a short, low-stakes practice task. Rotate weekly.',
  },
  {
    id: 'moment-concrete-first',
    title: 'Concrete before abstract',
    method: 'concrete_manipulatives',
    body: 'Introduce a new number concept with counters or bottle caps before moving to the written symbol.',
  },
  {
    id: 'moment-story-recall',
    title: 'Story-recall retell',
    method: 'oral_language',
    body: 'After a story, invite children to retell one part in their own words to build sequencing and confidence.',
  },
];

@Injectable()
export class CommunityService {
  getMoments(): { moments: CommunityMoment[] } {
    return { moments: COMMUNITY_MOMENTS };
  }
}
