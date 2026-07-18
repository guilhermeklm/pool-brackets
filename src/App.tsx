import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { NewChampionship } from './screens/NewChampionship'
import { TeamRegistration } from './screens/TeamRegistration'
import { BracketScreen } from './screens/BracketScreen'
import { PoolPanel } from './screens/PoolPanel'

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto min-h-svh w-full max-w-md bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/new" element={<NewChampionship />} />
          <Route path="/championship/:id/teams" element={<TeamRegistration />} />
          <Route path="/championship/:id/bracket" element={<BracketScreen />} />
          <Route path="/championship/:id/pool" element={<PoolPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
