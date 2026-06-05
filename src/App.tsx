import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Matches from './pages/Matches'
import Lobby from './pages/Lobby'
import Teams from './pages/Teams'
import BracketPage from './pages/Bracket'
import MatchRoom from './pages/MatchRoom'
import Leaderboard from './pages/Leaderboard'
import MyPredictions from './pages/MyPredictions'
import Profile from './pages/Profile'
import Bonus from './pages/Bonus'
import Rules from './pages/Rules'
import Admin from './pages/Admin'
import { ToastProvider } from './components/Toast'
import { AppConfigProvider } from './hooks/useAppConfig'
import ThemeApplier from './components/ThemeApplier'
import { ThemeModeProvider } from './hooks/useThemeMode'
import AdminGate from './admin/AdminGate'

export default function App() {
  return (
    <ThemeModeProvider>
    <AuthProvider>
      <AppConfigProvider>
        <ThemeApplier />
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/tv" element={<Lobby />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Matches />} />
                <Route path="teams" element={<Teams />} />
                <Route path="bracket" element={<BracketPage />} />
                <Route path="match/:id" element={<MatchRoom />} />
                <Route path="bonus" element={<Bonus />} />
                <Route path="my" element={<MyPredictions />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="profile" element={<Profile />} />
                <Route
                  path="admin/*"
                  element={
                    <AdminGate>
                      <Admin />
                    </AdminGate>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AppConfigProvider>
    </AuthProvider>
    </ThemeModeProvider>
  )
}
