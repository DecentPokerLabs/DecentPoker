import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Table from './components/Table';
import './App.css';

function App() {
  return (
    <HashRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/table" element={<Table />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
