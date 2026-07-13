import { getTvdbIdFromTmdb } from '@/lib/tmdb';

export async function checkSonarrForShow(tmdbId: string): Promise<boolean> {
  const tvdbId = await getTvdbIdFromTmdb(tmdbId);
  if (!tvdbId) return false;

  const instances = [
    { url: process.env.SONARR_1_URL, key: process.env.SONARR_1_API_KEY },
    { url: process.env.SONARR_2_URL, key: process.env.SONARR_2_API_KEY },
    { url: process.env.SONARR_3_URL, key: process.env.SONARR_3_API_KEY },
  ].filter(i => i.url && i.key);

  for (const instance of instances) {
    try {
      const response = await fetch(`${instance.url}/api/v3/series`, {
        headers: { 'X-Api-Key': instance.key as string }
      });
      if (!response.ok) continue;
      const series = await response.json();
      const found = series.find((s: any) => String(s.tvdbId) === String(tvdbId));
      if (found) return true;
    } catch (error) {
      console.error(`Error checking Sonarr instance ${instance.url}:`, error);
      continue;
    }
  }
  return false;
}
