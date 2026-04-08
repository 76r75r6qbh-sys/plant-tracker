import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/home',       label: 'Today',    icon: '🏠' },
  { to: '/plants',     label: 'Plants',   icon: '🌿' },
  { to: '/plants/add', label: 'Add',      icon: '➕' },
  { to: '/settings',   label: 'Settings', icon: '⚙️' },
];

const navStyle = {
  position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: 480, background: 'white',
  borderTop: '1px solid #e0e0e0', display: 'flex',
  boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
};

const tabStyle = (isActive) => ({
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '10px 0 6px', textDecoration: 'none',
  color: isActive ? '#2e7d32' : '#888', fontSize: 11, fontWeight: isActive ? 600 : 400,
});

export default function BottomNav() {
  return (
    <nav style={navStyle}>
      {tabs.map(tab => (
        <NavLink key={tab.to} to={tab.to} style={({ isActive }) => tabStyle(isActive)}>
          <span style={{ fontSize: 22 }}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
