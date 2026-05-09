const BASE = 'https://qiwiosity-production.up.railway.app';

export async function deepDive({ name, region, category, existing, tags }) {
  const res = await fetch(`${BASE}/api/deepdive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, region, category, existing, tags }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Deep dive failed');
  return data; // { text }
}

export async function snapIdentify({ imageDataUrl, hint, candidates }) {
  const res = await fetch(`${BASE}/api/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, hint, candidates }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Identification failed');
  return data;
}
