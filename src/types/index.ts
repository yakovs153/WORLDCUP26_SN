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
  minute?: number | null            // live clock (minutes), when in play
  scorers?: MatchScorer[]            // goalscorers, when available
  venue?: string | null              // stadium (already localized to Hebrew)
  lastUpdated?: Timestamp
  manualOverride?: boolean           // admin pinned score/status (liveSync won't clobber)
}

export interface MatchScorer {
  name: string
  team: string   // team code (home/away)
  minute: number | null
}

export interface Prediction {
  id: string
  uid: string
  matchId: string
  homeScore: number
  awayScore: number
  submittedAt: Timestamp
  points: number | null
  auto?: boolean    // filled automatically by the Octopus when the user forgot to predict
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
  coach?: { text: string }   // Tom's daily personalized AI coaching line
}

export interface LeaderboardEntry extends UserDoc {
  rank: number
}

export interface BonusPrediction {
  uid: string
  championTeamCode: string | null
  topScorer: string | null
  runnerUpCode: string | null      // the team predicted to LOSE the final (runner-up)
  surpriseTeamCode: string | null  // "dark horse" (non-favourite) predicted to reach the quarter-finals
  flopTeamCode: string | null      // the favourite predicted to crash out earliest
  championPoints: number | null   // computed after tournament ends
  topScorerPoints: number | null  // computed after tournament ends
  updatedAt: Timestamp
}

// ===== App Config (managed by admin) =====
export interface StageScoring {
  exact: number       // exact score match (e.g. predicted 2-1, actual 2-1)
  direction: number   // correct outcome only (winner OR draw) — was "winnerOnly"; the old
                      // "winnerAndDiff" middle bucket has been retired.
}
// Scoring is now per-stage: each round has its own (exact, direction) values.
// Replaces the old "base values × stageMultipliers" model.
export type ScoringConfig = Record<MatchStage, StageScoring>

export interface BonusScoringConfig {
  champion: number
  topScorer: number
  runnerUp: number   // points if the predicted runner-up indeed loses the final
  surprise: number   // points if the "surprise" (non-favourite) team reaches the quarter-finals
  flop: number       // points if the predicted favourite indeed crashes out earliest
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

export interface SurveyQuestion {
  id: string
  text: string
  options: string[]   // single-choice options
}

export interface Survey {
  id: string
  title: string
  active: boolean
  questions: SurveyQuestion[]
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

// StageMultipliers retired — scoring is now per-stage in ScoringConfig.
// (Type kept as a no-op alias so deprecated imports don't break the build;
// remove it when nothing references it anymore.)
export type StageMultipliers = never

export type HofMetric = 'prophet' | 'optimist' | 'draw' | 'disaster'

export interface FeatureFlags {
  pundit: boolean                 // רובי's daily AI recap card
  leaderPerk: boolean             // king banner + megaphone
  analystAutofill: boolean        // Tom auto-fills forgotten predictions (admin override)
  requireEmailVerification: boolean // block app access until the user clicks the email-verify link
}

export interface HofCategory {
  key: HofMetric       // which computed metric drives this award
  title: string        // admin-editable label
  emoji: string        // admin-editable icon
  active: boolean       // show/hide
}

export interface AppConfig {
  scoring: ScoringConfig
  bonus: BonusScoringConfig
  content: ContentConfig
  hallOfFame: HofCategory[]            // admin-managed Hall of Fame & Shame categories
  features: FeatureFlags               // admin on/off switches for automatic features
  analystOverrides: Record<string, [number, number]> // admin overrides for Tom's pick, by matchId
  tips: string[]                       // admin-managed "tip of the day" rotation
  tipsEnabled: boolean
  announcement: AnnouncementConfig
  theme: ThemeConfig
  navIcons: NavIconsConfig
  polls: Poll[]
  surveys: Survey[]                     // multi-question surveys (single-choice, public results)
  playerPhotos: Record<string, string>  // player name → photo URL (or data URL in demo)
  customPlayers: CustomPlayer[]         // additional players added by admin (besides TOP_SCORER_CANDIDATES)
  hiddenScorers: string[]               // names of top-scorer candidates removed from the list by admin
  departments: string[]                 // company departments users can belong to
  adminEmails: string[]
  allowedEmailDomains: string[]         // e.g. ["storenext.com"] — empty = no restriction
  blockedEmails: string[]               // emails rejected from login/register (admin-managed)
  updatedAt?: Timestamp
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  // Per-stage scoring: direction = correct outcome only; exact = exact score.
  scoring: {
    GROUP: { direction: 1, exact: 3 },
    R32:   { direction: 2, exact: 4 },
    R16:   { direction: 2, exact: 4 },
    QF:    { direction: 3, exact: 6 },
    SF:    { direction: 3, exact: 6 },
    TP:    { direction: 1, exact: 3 },   // third-place game: same as group (low stakes)
    F:     { direction: 5, exact: 10 }
  },
  bonus:   { champion: 20, topScorer: 15, runnerUp: 8, surprise: 8, flop: 8 },
  hallOfFame: [
    { key: 'prophet',  emoji: '🔮', title: 'הנביא',       active: true },
    { key: 'optimist', emoji: '🤡', title: 'האופטימי',    active: true },
    { key: 'draw',     emoji: '🤝', title: 'מלך התיקו',   active: true },
    { key: 'disaster', emoji: '💔', title: 'אסון השבוע',  active: true }
  ],
  features: { pundit: true, leaderPerk: true, analystAutofill: true, requireEmailVerification: true },
  analystOverrides: {},
  tips: [],
  tipsEnabled: true,
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
  surveys: [],
  playerPhotos: {},
  customPlayers: [],
  hiddenScorers: [],
  departments: ['דאטה ואנליזה', 'פיתוח', 'סיסטם', 'פרוייקטים', 'מטאור', 'המימד השביעי', 'משאבי אנוש', 'הנהלה', 'כספים', 'מוצר'],
  adminEmails: [],
  allowedEmailDomains: [],
  blockedEmails: []
}
