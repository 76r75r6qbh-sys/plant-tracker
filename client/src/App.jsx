import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Plants from './pages/Plants';
import AddPlant from './pages/AddPlant';
import PlantDetail from './pages/PlantDetail';
import Settings from './pages/Settings';

const pageStyle = {
  padding: '16px 16px 80px',
  minHeight: '100vh',
};

export default function App() {
  return (
    <BrowserRouter>
      <div style={pageStyle}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/plants/add" element={<AddPlant />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  );
}
