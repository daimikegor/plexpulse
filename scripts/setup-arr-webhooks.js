// One-time setup script: registers PlexPulse's arr-import webhook against
// every configured Radarr/Sonarr instance via each Arr's notification API.
//
// Usage:
//   node --env-file=.env scripts/setup-arr-webhooks.js [--dry-run]
//
// Requires ARR_WEBHOOK_SECRET and PLEXPULSE_WEBHOOK_URL to be set (see .env.example).

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const webhookBase = process.env.PLEXPULSE_WEBHOOK_URL;
  const secret = process.env.ARR_WEBHOOK_SECRET;

  if (!webhookBase || !secret) {
    console.error('PLEXPULSE_WEBHOOK_URL and ARR_WEBHOOK_SECRET must both be set.');
    process.exit(1);
  }

  const webhookUrl = `${webhookBase.replace(/\/+$/, '')}/api/webhooks/arr-import?token=${secret}`;

  const instances = [
    ...[1, 2, 3].map((n) => ({
      kind: 'radarr',
      url: process.env[`RADARR_${n}_URL`],
      key: process.env[`RADARR_${n}_API_KEY`],
    })),
    ...[1, 2, 3].map((n) => ({
      kind: 'sonarr',
      url: process.env[`SONARR_${n}_URL`],
      key: process.env[`SONARR_${n}_API_KEY`],
    })),
  ].filter((i) => i.url && i.key);

  if (instances.length === 0) {
    console.error('No Radarr/Sonarr instances configured (check RADARR_*/SONARR_* env vars).');
    process.exit(1);
  }

  const results = [];

  for (const instance of instances) {
    try {
      const schemaRes = await fetch(`${instance.url}/api/v3/notification/schema`, {
        headers: { 'X-Api-Key': instance.key },
      });
      if (!schemaRes.ok) throw new Error(`schema fetch failed: ${schemaRes.status}`);
      const schemas = await schemaRes.json();
      const webhookSchema = schemas.find((s) => s.implementation === 'Webhook');
      if (!webhookSchema) throw new Error('no "Webhook" implementation found in notification schema');

      const fields = webhookSchema.fields.map((f) => {
        if (f.name === 'url') return { ...f, value: webhookUrl };
        if (f.name === 'method') {
          const postOption = f.selectOptions?.find((o) => /post/i.test(o.name));
          return postOption ? { ...f, value: postOption.value } : f;
        }
        return f;
      });

      const payload = {
        name: 'PlexPulse',
        implementation: webhookSchema.implementation,
        implementationName: webhookSchema.implementationName,
        configContract: webhookSchema.configContract,
        onGrab: false,
        onDownload: true,
        onUpgrade: true,
        fields,
      };

      if (dryRun) {
        console.log(`[${instance.kind}] ${instance.url}: (dry run) would POST:`);
        console.log(JSON.stringify(payload, null, 2));
        results.push({ instance, ok: true });
        continue;
      }

      const createRes = await fetch(`${instance.url}/api/v3/notification`, {
        method: 'POST',
        headers: { 'X-Api-Key': instance.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(`notification create failed: ${createRes.status} ${text}`);
      }
      console.log(`[${instance.kind}] ${instance.url}: webhook registered OK`);
      results.push({ instance, ok: true });
    } catch (err) {
      console.error(`[${instance.kind}] ${instance.url}: FAILED — ${err.message}`);
      results.push({ instance, ok: false, error: err.message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\nDone: ${okCount}/${results.length} instances configured.`);
  if (okCount < results.length) {
    console.log('See "Manual webhook setup" in SETUP.md for any instance that failed.');
  }
}

main();
