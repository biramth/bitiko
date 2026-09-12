import { Routes, Route } from 'react-router-dom'
import { publicRoutes } from '@/routes/PublicRoutes'
import { adminRoutes } from '@/routes/AdminRoutes'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      {publicRoutes}
      {adminRoutes}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
