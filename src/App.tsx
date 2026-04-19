import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/dashboard/Dashboard'
import Collection from './components/collection/Collection'
import PieceForm from './components/pieces/PieceForm'
import Settings from './components/settings/Settings'

function PieceFormRoute() {
  const { id } = useParams()
  return <PieceForm key={id ?? 'new'} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/pieces/new" element={<PieceFormRoute />} />
          <Route path="/pieces/:id/edit" element={<PieceFormRoute />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
