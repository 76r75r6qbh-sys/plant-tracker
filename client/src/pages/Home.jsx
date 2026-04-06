import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import TaskCard from '../components/TaskCard';

const headerStyle = { fontSize: 22, fontWeight: 700, color: '#2e7d32', marginBottom: 4 };
const subtitleStyle = { fontSize: 13, color: '#888', marginBottom: 16 };
const batchBtnStyle = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 8,
  padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  marginBottom: 8, width: '100%',
});
const emptyStyle = { textAlign: 'center', color: '#aaa', marginTop: 48, fontSize: 15 };

export default function Home() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlants(await api.getPlants()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dueWater     = plants.filter(p => p.overdue_water);
  const dueFertilize = plants.filter(p => p.overdue_fertilize);
  const allDue       = plants.filter(p => p.overdue_water || p.overdue_fertilize);

  const handleWater     = async (id) => { await api.waterPlant(id);     load(); };
  const handleFertilize = async (id) => { await api.fertilizePlant(id); load(); };
  const handleWaterAll  = async ()   => { await api.waterBatch(dueWater.map(p => p.id));         load(); };
  const handleFeedAll   = async ()   => { await api.fertilizeBatch(dueFertilize.map(p => p.id)); load(); };

  if (loading) return <p style={{ color: '#aaa', marginTop: 32 }}>Loading...</p>;

  return (
    <div>
      <h1 style={headerStyle}>🌿 Today</h1>
      <p style={subtitleStyle}>{new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {dueWater.length >= 2 && (
        <button style={batchBtnStyle('#2e7d32')} onClick={handleWaterAll}>
          💧 Water all ({dueWater.length})
        </button>
      )}
      {dueFertilize.length >= 2 && (
        <button style={batchBtnStyle('#e65100')} onClick={handleFeedAll}>
          🌿 Feed all ({dueFertilize.length})
        </button>
      )}

      {allDue.length === 0 ? (
        <p style={emptyStyle}>✅ Nothing due today</p>
      ) : (
        allDue.map(plant => (
          <TaskCard key={plant.id} plant={plant} onWater={handleWater} onFertilize={handleFertilize} />
        ))
      )}

      {plants.filter(p => !p.overdue_water && !p.overdue_fertilize).length > 0 && (
        <>
          <h2 style={{ fontSize: 13, color: '#aaa', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Upcoming</h2>
          {plants.filter(p => !p.overdue_water && !p.overdue_fertilize).map(plant => (
            <TaskCard key={plant.id} plant={plant} onWater={handleWater} onFertilize={handleFertilize} />
          ))}
        </>
      )}
    </div>
  );
}
