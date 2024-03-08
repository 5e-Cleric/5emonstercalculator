import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Suggestor from './Suggestor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Suggestor />} />
        {/* Define more routes here if needed */}
      </Routes>
    </Router>
  );
}

export default App;