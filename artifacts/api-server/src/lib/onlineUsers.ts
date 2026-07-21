/**
 * In-memory online user tracking.
 * A user is considered "online" if they pinged within the last 5 minutes.
 */

const ONLINE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const onlineMap = new Map<string, number>(); // sessionId -> lastSeen (ms)

export function updateOnline(sessionId: string): void {
  onlineMap.set(sessionId, Date.now());
  // Prune stale entries to keep memory bounded
  const cutoff = Date.now() - ONLINE_TTL_MS;
  for (const [k, v] of onlineMap) {
    if (v < cutoff) onlineMap.delete(k);
  }
}

export function getOnlineCount(): number {
  const cutoff = Date.now() - ONLINE_TTL_MS;
  let n = 0;
  for (const v of onlineMap.values()) {
    if (v >= cutoff) n++;
  }
  return n;
}
