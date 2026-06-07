import { doc, setDoc } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { DEFAULT_APP_CONFIG, type AppConfig } from '../types'
import { mergeScoring } from './scoring'

const STORAGE_KEY = 'demo-app-config-v1'

export function getDemoConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_APP_CONFIG
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return {
      ...DEFAULT_APP_CONFIG,
      ...parsed,
      scoring: mergeScoring(parsed.scoring),
      bonus: { ...DEFAULT_APP_CONFIG.bonus, ...(parsed.bonus || {}) },
      content: { ...DEFAULT_APP_CONFIG.content, ...(parsed.content || {}) },
      hallOfFame: Array.isArray(parsed.hallOfFame) ? parsed.hallOfFame : DEFAULT_APP_CONFIG.hallOfFame,
      features: { ...DEFAULT_APP_CONFIG.features, ...(parsed.features || {}) },
      analystOverrides: parsed.analystOverrides || {},
      tips: parsed.tips || [],
      tipsEnabled: parsed.tipsEnabled !== false,
      announcement: { ...DEFAULT_APP_CONFIG.announcement, ...(parsed.announcement || {}) },
      theme: { ...DEFAULT_APP_CONFIG.theme, ...(parsed.theme || {}) },
      navIcons: { ...DEFAULT_APP_CONFIG.navIcons, ...(parsed.navIcons || {}) },
      polls: parsed.polls || [],
      surveys: parsed.surveys || [],
      playerPhotos: parsed.playerPhotos || {},
      customPlayers: parsed.customPlayers || [],
      hiddenScorers: parsed.hiddenScorers || [],
      departments: parsed.departments || DEFAULT_APP_CONFIG.departments,
      adminEmails: parsed.adminEmails || [],
      allowedEmailDomains: parsed.allowedEmailDomains || [],
      blockedEmails: parsed.blockedEmails || []
    }
  } catch {
    return DEFAULT_APP_CONFIG
  }
}

export function setDemoConfig(cfg: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  window.dispatchEvent(new Event('demo-app-config-changed'))
}

export async function saveAppConfig(cfg: AppConfig): Promise<void> {
  if (DEMO_MODE) {
    setDemoConfig(cfg)
    return
  }
  await setDoc(doc(db, 'appConfig', 'main'), cfg)
}

// Update a single section (deep-merged with current).
export async function patchAppConfig(patch: Partial<AppConfig>): Promise<void> {
  if (DEMO_MODE) {
    const current = getDemoConfig()
    setDemoConfig({ ...current, ...patch })
    return
  }
  await setDoc(doc(db, 'appConfig', 'main'), patch, { merge: true })
}
