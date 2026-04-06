const BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getPlants:          ()           => request('GET',    '/plants'),
  getPlant:           (id)         => request('GET',    `/plants/${id}`),
  createPlant:        (body)       => request('POST',   '/plants', body),
  updatePlant:        (id, body)   => request('PUT',    `/plants/${id}`, body),
  deletePlant:        (id)         => request('DELETE', `/plants/${id}`),
  waterPlant:         (id)         => request('POST',   `/plants/${id}/water`),
  fertilizePlant:     (id)         => request('POST',   `/plants/${id}/fertilize`),
  waterBatch:         (ids)        => request('POST',   '/plants/water-batch',       { plant_ids: ids }),
  fertilizeBatch:     (ids)        => request('POST',   '/plants/fertilize-batch',   { plant_ids: ids }),

  getPlantTypes:      ()           => request('GET',    '/plant-types'),
  createPlantType:    (body)       => request('POST',   '/plant-types', body),

  getSettings:        ()           => request('GET',    '/settings'),
  updateSetting:      (key, value) => request('PUT',    `/settings/${key}`, { value }),

  getVapidKey:        ()           => request('GET',    '/push/vapid-public-key'),
  subscribe:          (sub)        => request('POST',   '/push/subscribe',  sub),
  unsubscribe:        (endpoint)   => request('DELETE', '/push/subscribe',  { endpoint }),
  testPush:           ()           => request('POST',   '/push/test'),
};
