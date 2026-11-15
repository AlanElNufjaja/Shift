import { useEffect, useState } from 'react';
import { normalizeTeamPayload } from '../lib/teamPilotAdapter.js';

let cachedArchive = null;
let pendingArchive = null;

/** Fetches once per page session. A static California archive, never a global API. */
export function loadTeamPilotArchive() {
  if (cachedArchive) return Promise.resolve(cachedArchive);
  if (!pendingArchive) {
    pendingArchive = fetch('/data/team-pilot-2015-2024.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(normalizeTeamPayload)
      .then(byId => { cachedArchive = byId; return byId; })
      .catch(error => { pendingArchive = null; throw error; });
  }
  return pendingArchive;
}

/** `enabled` avoids fetching the historical archive before a user needs it. */
export function useTeamPilotArchive(enabled = true) {
  const [dataset, setDataset] = useState(() => cachedArchive
    ? { status: 'ready', byId: cachedArchive, error: '' }
    : { status: 'idle', byId: {}, error: '' });

  useEffect(() => {
    if (!enabled) return undefined;
    let mounted = true;
    if (!cachedArchive) setDataset({status: 'loading', byId: {}, error: ''});
    loadTeamPilotArchive()
      .then(byId => { if (mounted) setDataset({status: 'ready', byId, error: ''}); })
      .catch(error => { if (mounted) setDataset({status: 'error', byId: {}, error: error.message}); });
    return () => { mounted = false; };
  }, [enabled]);
  return dataset;
}
