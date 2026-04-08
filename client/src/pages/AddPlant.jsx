import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const ORIENTATIONS = ['N','NE','E','SE','S','SW','W','NW'];
const DISTANCES = [
  { key: 'close',    label: '<50 cm' },
  { key: 'medium',   label: '50–150 cm' },
  { key: 'far',      label: '150–300 cm' },
  { key: 'very_far', label: '>300 cm' },
];

const BASE = { S:5, SE:6, SW:6, E:7, W:7, NE:9, NW:9, N:11 };
const SEASON = { 1:2.2,2:2.0,3:1.5,4:1.2,5:1.0,6:0.9,7:0.85,8:0.9,9:1.1,10:1.4,11:1.8,12:2.3 };
const DIST   = { close:1.0, medium:1.3, far:1.7, very_far:2.2 };

function previewInterval(orientation, distance, thirstFactor) {
  if (!orientation || !distance || !thirstFactor) return null;
  const month = new Date().getMonth() + 1;
  const raw = Math.round(BASE[orientation] * SEASON[month] * DIST[distance] * Number(thirstFactor));
  return Math.min(Math.max(raw, 2), 30);
}

export default function AddPlant() {
  const navigate = useNavigate();
  const [plantTypes, setPlantTypes] = useState([]);
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', height_cm: '', window_orientation: '', window_distance: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.getPlantTypes().then(setPlantTypes); }, []);

  const filtered = plantTypes.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const interval = previewInterval(form.window_orientation, form.window_distance, selectedType?.thirst_factor);
  const amount   = selectedType && form.height_cm ? Math.round(selectedType.water_amount_per_cm * Number(form.height_cm)) : null;

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.height_cm || !form.window_orientation || !form.window_distance) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      await api.createPlant({
        name: form.name,
        plant_type_id: selectedType.id,
        window_orientation: form.window_orientation,
        window_distance: form.window_distance,
        height_cm: Number(form.height_cm),
        notes: form.notes || null,
      });
      navigate('/plants');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, marginTop: 4 };
  const labelStyle = { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 };
  const chipStyle  = (active) => ({
    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
    background: active ? '#2e7d32' : '#f5f5f5', color: active ? 'white' : '#333',
  });

  if (step === 1) {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32', marginBottom: 12 }}>Choose Plant Type</h1>
        <input
          placeholder="🔍 Search plants..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        {filtered.map(type => (
          <div key={type.id} onClick={() => { setSelectedType(type); setStep(2); }}
            style={{ background: 'white', borderRadius: 8, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <span style={{ fontSize: 24 }}>{type.emoji}</span>
            <span style={{ fontWeight: 500 }}>{type.name}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', marginBottom: 12, fontSize: 14 }}>
        ← Back
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32', marginBottom: 4 }}>
        {selectedType.emoji} {selectedType.name}
      </h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Fill in your plant's details</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="nickname">Nickname *</label>
          <input id="nickname" aria-label="nickname" value={form.name} onChange={set('name')} style={inputStyle} placeholder="e.g. Living room Pothos" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="height">Height (cm) *</label>
          <input id="height" aria-label="height" type="number" min="1" value={form.height_cm} onChange={set('height_cm')} style={inputStyle} placeholder="e.g. 45" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={labelStyle}>Window orientation *</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {ORIENTATIONS.map(o => (
              <button type="button" key={o} onClick={() => setForm(f => ({ ...f, window_orientation: o }))} style={chipStyle(form.window_orientation === o)}>{o}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={labelStyle}>Distance to window *</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {DISTANCES.map(d => (
              <button type="button" key={d.key} onClick={() => setForm(f => ({ ...f, window_distance: d.key }))} style={chipStyle(form.window_distance === d.key)}>{d.label}</button>
            ))}
          </div>
        </div>
        {interval && amount && (
          <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#2e7d32' }}>
            💧 Water every <strong>{interval} days</strong> · <strong>{amount} ml</strong>
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle} htmlFor="notes">Notes (optional)</label>
          <input id="notes" value={form.notes} onChange={set('notes')} style={inputStyle} placeholder="Any special care notes" />
        </div>
        {error && <p style={{ color: '#c62828', marginBottom: 12 }}>{error}</p>}
        <button type="submit" disabled={saving} style={{ ...chipStyle(true), width: '100%', padding: '14px', fontSize: 16 }}>
          {saving ? 'Adding...' : 'Add Plant'}
        </button>
      </form>
    </div>
  );
}
