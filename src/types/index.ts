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
  joker?: boolean   // ×2 points — one per matchday
}

export interface UserDoc {
  uid: string
  displayName: string
  email: string
  photoURL?: string | null
  department?: string | null
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
  finalistCodes: string[]          // up to 2 teams predicted to reach the final
  surpriseTeamCode: string | null  // "dark horse" predicted to reach the quarter-finals
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
  finalist: number   // points per correctly predicted finalist
  surprise: number   // points if the "surprise" team reaches the quarter-finals
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

export interface ContentConfig {
  tournamentName: string   // header title
  tagline: string          // login subtitle
  rulesIntro: string       // free text shown at top of the Rules page
  rulesNotes: string       // free text shown at the bottom of the Rules page
  prize: string            // the prize, spotlighted on the home screen
}

export interface AnnouncementConfig {
  text: string
  active: boolean
}

export interface AppConfig {
  scoring: ScoringConfig
  bonus: BonusScoringConfig
  content: ContentConfig
  announcement: AnnouncementConfig
  theme: ThemeConfig
  navIcons: NavIconsConfig
  polls: Poll[]
  playerPhotos: Record<string, string>  // player name → photo URL (or data URL in demo)
  customPlayers: CustomPlayer[]         // additional players added by admin (besides TOP_SCORER_CANDIDATES)
  hiddenScorers: string[]               // names of top-scorer candidates removed from the list by admin
  departments: string[]                 // company departments users can belong to
  adminEmails: string[]
  allowedEmailDomains: string[]         // e.g. ["storenext.com"] — empty = no restriction
  updatedAt?: Timestamp
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  scoring: { exact: 5, winnerAndDiff: 3, winnerOnly: 1 },
  bonus:   { champion: 20, topScorer: 15, finalist: 10, surprise: 15 },
  content: {
    tournamentName: 'מונדיאל 2026',
    tagline: 'משחק ניחושים פנימי של StoreNext',
    rulesIntro: '',
    rulesNotes: '',
    prize: ''
  },
  announcement: { text: '', active: false },
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
  hiddenScorers: [],
  departments: ['דאטה ואנליזה', 'פיתוח', 'סיסטם', 'פרוייקטים', 'מטאור', 'המימד השביעי', 'משאבי אנוש', 'הנהלה', 'כספים', 'מוצר'],
  adminEmails: [],
  allowedEmailDomains: []
}
