import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import MyCard from './pages/MyCard';
import PublicCard from './pages/PublicCard';
import CRM from './pages/CRM';

// New pages you added
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Landing is the main home page now. Keeping Index available at /index so nothing breaks */}
        <Route path="/" element={<Landing />} />
        <Route path="/index" element={<Index />} />

        {/* Existing routes */}
        <Route path="/my-card" element={<MyCard />} />
        <Route path="/card/:slug" element={<PublicCard />} />
        <Route path="/crm" element={<CRM />} />

        {/* New app routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Fallback: redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}