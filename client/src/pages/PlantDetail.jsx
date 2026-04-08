import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const labelStyle = { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 };
const valueStyle = { fontSize: 15, color: '#212121', marginTop: 2, marginBottom: 12 };
const btnStyle   = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 8,
});

export default function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.getPlant(id).then(setPlant).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const handleWater     = async () => { await api.waterPlant(id);     load(); };
  const handleFertilize = async () => { await api.fertilizePlant(id); load(); };
  const handleDelete    = async () => {
    if (!confirm(`Delete ${plant.name}?`)) return;
    await api.deletePlant(id);
    navigate('/plants');
  };

  if (loading) return <p style={{ color: '#aaa', marginTop: 32 }}>Loading...</p>;
  if (!plant)  return <p style={{ color: '#c62828', marginTop: 32 }}>Plant not found.</p>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', marginBottom: 12, fontSize: 14 }}>
        ← Back
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 40 }}>{plant.type_emoji}</span>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2e7d32' }}>{plant.name}</h1>
          <p style={{ fontSize: 13, color: '#888' }}>{plant.type_name}</p>
        </div>
      </div>
      {plant.overdue_water && <button style={btnStyle('#2e7d32')} onClick={handleWater}>💧 Water now ({plant.water_amount_ml} ml)</button>}
      {plant.overdue_fertilize && <button style={btnStyle('#e65100')} onClick={handleFertilize}>🌿 Fertilize now</button>}
      <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <p style={labelStyle}>Schedule</p>
        <p style={valueStyle}>💧 Every {plant.water_interval_days} days · {plant.water_amount_ml} ml</p>
        <p style={labelStyle}>Window</p>
        <p style={valueStyle}>{plant.window_orientation} · {plant.window_distance.replace('_', ' ')}</p>
        <p style={labelStyle}>Height</p>
        <p style={valueStyle}>{plant.height_cm} cm</p>
        {plant.notes && <><p style={labelStyle}>Notes</p><p style={valueStyle}>{plant.notes}</p></>}
      </div>
      <h2 style={{ fontSize: 14, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Care History</h2>
      {plant.care_logs.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 13 }}>No care logged yet.</p>
      ) : (
        plant.care_logs.map(log => (
          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
            <span>{log.type === 'water' ? '💧 Watered' : '🌿 Fertilized'}</span>
            <span style={{ color: '#aaa' }}>{new Date(log.logged_at).toLocaleDateString('nl-NL')}</span>
          </div>
        ))
      )}
      <button onClick={handleDelete} style={{ ...btnStyle('#c62828'), marginTop: 24 }}>Delete plant</button>
    </div>
  );
}
