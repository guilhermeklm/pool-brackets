import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { NewChampionship } from './screens/NewChampionship'
import { TeamRegistration } from './screens/TeamRegistration'

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto min-h-svh w-full max-w-md bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/new" element={<NewChampionship />} />
          <Route path="/championship/:id/teams" element={<TeamRegistration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
