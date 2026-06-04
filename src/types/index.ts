import type { Timestamp } from 'firebase/firestore'

export type MatchStage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'TP' | 'F'
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'

export interface TeamRef {
  name: string
  code: string
  flag: string
}

export interface Match {
  id: string
  homeTeam: TeamRef
  awayTeam: TeamRef
  kickoff: Timestamp
  stage: MatchStage
  group: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  lastUpdated?: Timestamp
}

export interface Prediction {
  id: string
  uid: string
  matchId: string
  homeScore: number
  awayScore: number
  submittedAt: Timestamp
  points: number | null
}

export interface UserDoc {
  uid: string
  displayName: string
  email: string
  photoURL?: string | null
  totalPoints: number
  predictionsCount: number
  joinedAt: Timestamp
}

export interface LeaderboardEntry extends UserDoc {
  rank: number
}

export interface BonusPrediction {
  uid: string
  championTeamCode: string | null
  topScorer: string | null
  championPoints: number | null   // computed after tournament ends
  topScorerPoints: number | null  // computed after tournament ends
  updatedAt: Timestamp
}

// ===== App Config (managed by admin) =====
export interface ScoringConfig {
  exact: number          // exact score match
  winnerAndDiff: number  // correct winner + correct goal diff
  winnerOnly: number     // correct winner only
}

export interface BonusScoringConfig {
  champion: number
  topScorer: number
}

export interface ThemeConfig {
  primary: string
  accent: string
  bg: string
  surface: string
  text: string
  danger: string
}

export interface NavIconsConfig {
  matches: string
  bonus: string
  my: string
  leaderboard: string
  profile: string
}

export interface PollOption {
  id: string
  label: string
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  active: boolean
  createdAt: number  // ms
}

export interface CustomPlayer {
  name: string
  countryCode: string
  // Photos for custom players are stored alongside hard-coded players in `playerPhotos`.
}

export interface AppConfig {
  scoring: ScoringConfig
  bonus: BonusScoringConfig
  theme: ThemeConfig
  navIcons: NavIconsConfig
  polls: Poll[]
  playerPhotos: Record<string, string>  // player name → photo URL (or data URL in demo)
  customPlayers: CustomPlayer[]         // additional players added by admin (besides TOP_SCORER_CANDIDATES)
  adminEmails: string[]
  allowedEmailDomains: string[]         // e.g. ["storenext.com"] — empty = no restriction
  updatedAt?: Timestamp
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  scoring: { exact: 5, winnerAndDiff: 3, winnerOnly: 1 },
  bonus:   { champion: 20, topScorer: 15 },
  theme: {
    primary: '#e11d48',
    accent:  '#f59e0b',
    bg:      '#1a1320',
    surface: '#322339',
    text:    '#f5f0f5',
    danger:  '#ef4444'
  },
  navIcons: {
    matches: '⚽',
    bonus: '🏆',
    my: '📋',
    leaderboard: '📊',
    profile: '👤'
  },
  polls: [],
  playerPhotos: {},
  customPlayers: [],
  adminEmails: [],
  allowedEmailDomains: []
}
