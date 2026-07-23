export type RoundRobinSelection<T> = {
  selected: Array<{ bucketIndex: number; item: T }>;
  deferred: T[][];
};

/** Select at most limit items while giving every non-empty bucket one turn per round. */
export function selectRoundRobin<T>(
  buckets: ReadonlyArray<ReadonlyArray<T>>,
  limit: number,
): RoundRobinSelection<T> {
  const selected: Array<{ bucketIndex: number; item: T }> = [];
  const offsets = buckets.map(() => 0);
  const safeLimit = Math.max(0, Math.floor(limit));

  while (selected.length < safeLimit) {
    let selectedInRound = false;
    for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex++) {
      if (selected.length >= safeLimit) break;
      const item = buckets[bucketIndex][offsets[bucketIndex]];
      if (item === undefined) continue;
      selected.push({ bucketIndex, item });
      offsets[bucketIndex]++;
      selectedInRound = true;
    }
    if (!selectedInRound) break;
  }

  return {
    selected,
    deferred: buckets.map((bucket, index) => bucket.slice(offsets[index])),
  };
}
