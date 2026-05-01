import { API_BASE_URL } from '../config';

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = new Set(['processing', 'queued', 'running']);

export const pollVideoJob = (jobId, { intervalMs = POLL_INTERVAL_MS } = {}) => {
  if (!jobId) {
    return Promise.reject(new Error('job_id manquant'));
  }

  return new Promise((resolve, reject) => {
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/optavision/jobs/${jobId}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.detail || 'Erreur lors du polling du job video');
        }

        if (payload.status === 'completed') {
          stopped = true;
          if (!payload.video_url) {
            reject(new Error('Job termine sans URL video'));
            return;
          }
          resolve(payload.video_url);
          return;
        }

        if (payload.status === 'error' || payload.status === 'failed') {
          stopped = true;
          reject(new Error(payload.error || 'Erreur generation video'));
          return;
        }

        if (ACTIVE_STATUSES.has(payload.status)) {
          setTimeout(poll, intervalMs);
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (err) {
        stopped = true;
        reject(err);
      }
    };

    setTimeout(poll, intervalMs);
  });
};
