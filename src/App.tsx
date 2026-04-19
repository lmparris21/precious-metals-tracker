import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/dashboard/Dashboard'
import Collection from './components/collection/Collection'
import PieceForm from './components/pieces/PieceForm'
import Settings from './components/settings/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/pieces/new" element={<PieceForm />} />
          <Route path="/pieces/:id/edit" element={<PieceForm />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
