export async function checkRadarrForMovie(tmdbId: string): Promise<boolean> {
  const instances = [
    { url: process.env.RADARR_1_URL, key: process.env.RADARR_1_API_KEY },
    { url: process.env.RADARR_2_URL, key: process.env.RADARR_2_API_KEY },
    { url: process.env.RADARR_3_URL, key: process.env.RADARR_3_API_KEY },
  ].filter(i => i.url && i.key);

  for (const instance of instances) {
    try {
      const response = await fetch(`${instance.url}/api/v3/movie`, {
        headers: { 'X-Api-Key': instance.key as string }
      });
      if (!response.ok) continue;
      const movies = await response.json();
      const found = movies.find((m: any) => String(m.tmdbId) === String(tmdbId));
      if (found) return true;
    } catch (error) {
      console.error(`Error checking Radarr instance ${instance.url}:`, error);
      continue;
    }
  }
  return false;
}
