import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import VerifyEmail from './pages/VerifyEmail'
import Matches from './pages/Matches'
import { ToastProvider } from './components/Toast'
import { AppConfigProvider } from './hooks/useAppConfig'
import ThemeApplier from './components/ThemeApplier'
import { ThemeModeProvider } from './hooks/useThemeMode'
import AdminGate from './admin/AdminGate'

// Lazy-loaded routes → smaller initial bundle, faster first paint.
const Register = lazy(() => import('./pages/Register'))
const OctopusPreview = lazy(() => import('./pages/OctopusPreview'))
const Playground = lazy(() => import('./pages/Playground'))
const Teams = lazy(() => import('./pages/Teams'))
const BracketPage = lazy(() => import('./pages/Bracket'))
const MatchRoom = lazy(() => import('./pages/MatchRoom'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const MyPredictions = lazy(() => import('./pages/MyPredictions'))
const Profile = lazy(() => import('./pages/Profile'))
const Bonus = lazy(() => import('./pages/Bonus'))
const Wrap = lazy(() => import('./pages/Wrap'))
const Surveys = lazy(() => import('./pages/Surveys'))
const Survey = lazy(() => import('./pages/Survey'))
const Rules = lazy(() => import('./pages/Rules'))
const Compare = lazy(() => import('./pages/Compare'))
const Admin = lazy(() => import('./pages/Admin'))

const Fallback = () => <div className="page-fade" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>טוען…</div>

export default function App() {
  return (
    <ThemeModeProvider>
    <AuthProvider>
      <AppConfigProvider>
        <ThemeApplier />
        <ToastProvider>
          <HashRouter>
            <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify" element={<VerifyEmail />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/octopus" element={<OctopusPreview />} />
              <Route path="/playground" element={<Playground />} />
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
                <Route path="wrap" element={<Wrap />} />
                <Route path="surveys" element={<Surveys />} />
                <Route path="survey/:id" element={<Survey />} />
                <Route path="my" element={<MyPredictions />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="compare/:otherUid" element={<Compare />} />
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
            </Suspense>
          </HashRouter>
        </ToastProvider>
      </AppConfigProvider>
    </AuthProvider>
    </ThemeModeProvider>
  )
}
