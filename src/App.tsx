import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Tuner from './pages/Tuner';
import Chords from './pages/Chords';
import ChordProgressionGenerator from './pages/ChordProgressionGenerator';
import './App.css';

function AppRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/tuner" element={<Tuner />} />
        <Route path="/chords" element={<Chords />} />
        <Route path="/chord-progression-generator" element={<ChordProgressionGenerator />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <div className="App">
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}

export default App;
