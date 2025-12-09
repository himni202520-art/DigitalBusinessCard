import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import MyCard from './pages/MyCard';
import PublicCard from './pages/PublicCard';
import CRM from './pages/CRM';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/my-card" element={<MyCard />} />
        <Route path="/card/:slug" element={<PublicCard />} />
        <Route path="/crm" element={<CRM />} />
      </Routes>
    </Router>
  );
}
