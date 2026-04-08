import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Plants() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlants().then(setPlants).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#aaa', marginTop: 32 }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2e7d32', marginBottom: 16 }}>🪴 My Plants</h1>
      {plants.length === 0 && (
        <p style={{ color: '#aaa', textAlign: 'center', marginTop: 32 }}>
          No plants yet. <Link to="/plants/add" style={{ color: '#2e7d32' }}>Add one!</Link>
        </p>
      )}
      {plants.map(plant => (
        <Link key={plant.id} to={`/plants/${plant.id}`} style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'white', borderRadius: 10, padding: '12px 14px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}>
            <span style={{ fontSize: 28 }}>{plant.type_emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#212121' }}>{plant.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                💧 Every {plant.water_interval_days}d · {plant.water_amount_ml}ml
              </div>
            </div>
            {(plant.overdue_water || plant.overdue_fertilize) && (
              <span style={{ background: '#e65100', color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 11 }}>Due</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
