import { useAuth } from '../auth/AuthProvider'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import Bracket from '../components/Bracket'
import { MatchCardSkeleton } from '../components/Skeleton'

export default function BracketPage() {
  const { user } = useAuth()
  const { matches, loading } = useMatches()
  const { byMatchId } = usePredictions(user?.uid ?? null)

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: 1 }}>🏆 הדרך לגמר</h1>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          שלב הנוקאאוט — מתמלא והופך ירוק/אדום ככל שהמשחקים מסתיימים. גלול הצידה לראות עד הגמר.
        </p>
      </div>
      {loading ? <MatchCardSkeleton /> : <Bracket matches={matches} predictions={byMatchId} />}
    </div>
  )
}
