const urgencyColor = (plant) => {
  if (plant.overdue_water || plant.overdue_fertilize) return '#fff3e0';
  return '#f5f5f5';
};

export default function TaskCard({ plant, onWater, onFertilize }) {
  const needsWater = plant.overdue_water;
  const needsFertilize = plant.overdue_fertilize;

  return (
    <div style={{
      background: urgencyColor(plant), borderRadius: 10, padding: '12px 14px',
      marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 28 }}>{plant.type_emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{plant.name}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
          {needsWater && <span>💧 Water now · {plant.water_amount_ml}ml</span>}
          {needsWater && needsFertilize && <span> · </span>}
          {needsFertilize && <span>🌿 Fertilize now</span>}
          {!needsWater && !needsFertilize && (
            <span style={{ color: '#aaa' }}>
              💧 Next in {daysUntil(plant.next_water_date)}d
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {needsWater && (
          <button onClick={() => onWater(plant.id)} style={btnStyle('#2e7d32')}>Water</button>
        )}
        {needsFertilize && (
          <button onClick={() => onFertilize(plant.id)} style={btnStyle('#e65100')}>Feed</button>
        )}
      </div>
    </div>
  );
}

function daysUntil(isoDate) {
  const diff = new Date(isoDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function btnStyle(bg) {
  return {
    background: bg, color: 'white', border: 'none', borderRadius: 6,
    padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };
}
