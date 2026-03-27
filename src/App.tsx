/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/ui/Layout';
import MatchPage from './pages/MatchPage';
import StatsPage from './pages/StatsPage';
import PlayersPage from './pages/PlayersPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import LiveMatchPage from './pages/LiveMatchPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública — no requiere login */}
        <Route path="/match/:id" element={<LiveMatchPage />} />

        {/* Rutas privadas dentro del Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<MatchPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
