import type { MatchStage } from '../types'

const STAGE_NAMES: Record<MatchStage, string> = {
  GROUP: 'שלב הבתים',
  R32: 'סיבוב 32',
  R16: 'שמינית הגמר',
  QF: 'רבע הגמר',
  SF: 'חצי הגמר',
  TP: 'משחק על המקום השלישי',
  F: 'הגמר'
}

export function stageLabel(stage: MatchStage, group?: string | null): string {
  if (stage === 'GROUP' && group) return `בית ${group}`
  return STAGE_NAMES[stage] || stage
}

const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const HE_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

export function formatDateHe(d: Date): string {
  return `יום ${HE_DAYS[d.getDay()]}, ${d.getDate()} ב${HE_MONTHS[d.getMonth()]}`
}

export function formatTimeHe(d: Date): string {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
