import { Injectable } from '@nestjs/common';
import { REMEDIAL_ACTIVITY_FEATURE } from './cache-key';

interface Counter {
  hits: number;
  misses: number;
}

export interface FeatureMetric {
  featureId: string;
  hits: number;
  misses: number;
  total: number;
  hitRate: number | null;
}

export interface CacheMetricsSnapshot {
  overall: FeatureMetric;
  remedialActivity: FeatureMetric;
  byFeature: FeatureMetric[];
}

/**
 * In-process cache hit/miss counters (P5-API-01). The remedial-activity cache
 * (methods_toolkit) is reported as its own line — it is expected to have the
 * highest hit rate in the system. Swap for an Axiom/Sentry sink without
 * changing callers.
 */
@Injectable()
export class CacheMetricsService {
  private readonly counters = new Map<string, Counter>();

  record(featureId: string, hit: boolean): void {
    const counter = this.counters.get(featureId) ?? { hits: 0, misses: 0 };
    if (hit) counter.hits += 1;
    else counter.misses += 1;
    this.counters.set(featureId, counter);
  }

  snapshot(): CacheMetricsSnapshot {
    const byFeature: FeatureMetric[] = [];
    let overallHits = 0;
    let overallMisses = 0;
    for (const [featureId, counter] of this.counters) {
      byFeature.push(toMetric(featureId, counter));
      overallHits += counter.hits;
      overallMisses += counter.misses;
    }
    byFeature.sort((a, b) => a.featureId.localeCompare(b.featureId));
    const remedialCounter =
      this.counters.get(REMEDIAL_ACTIVITY_FEATURE) ?? { hits: 0, misses: 0 };
    return {
      overall: toMetric('overall', { hits: overallHits, misses: overallMisses }),
      remedialActivity: toMetric(REMEDIAL_ACTIVITY_FEATURE, remedialCounter),
      byFeature,
    };
  }

  reset(): void {
    this.counters.clear();
  }
}

function toMetric(featureId: string, counter: Counter): FeatureMetric {
  const total = counter.hits + counter.misses;
  return {
    featureId,
    hits: counter.hits,
    misses: counter.misses,
    total,
    hitRate: total === 0 ? null : counter.hits / total,
  };
}
