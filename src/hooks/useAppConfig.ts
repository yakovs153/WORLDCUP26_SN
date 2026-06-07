import { createContext, useContext, useEffect, useState, type ReactNode, createElement } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, DEMO_MODE } from '../firebase'
import { mergeScoring } from '../lib/scoring'
import { DEFAULT_APP_CONFIG, type AppConfig } from '../types'
import { getDemoConfig } from '../lib/appConfig'
import { cacheConfigForGate } from '../lib/emailGate'

const AppConfigContext = createContext<AppConfig>(DEFAULT_APP_CONFIG)

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<AppConfig>(DEFAULT_APP_CONFIG)

  useEffect(() => {
    if (DEMO_MODE) {
      const refresh = () => {
        const c = getDemoConfig()
        setCfg(c)
        cacheConfigForGate(c.allowedEmailDomains || [], c.blockedEmails || [])
      }
      refresh()
      window.addEventListener('demo-app-config-changed', refresh)
      window.addEventListener('storage', refresh)
      return () => {
        window.removeEventListener('demo-app-config-changed', refresh)
        window.removeEventListener('storage', refresh)
      }
    }
    const unsub = onSnapshot(doc(db, 'appConfig', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<AppConfig>
        const merged = {
          ...DEFAULT_APP_CONFIG,
          ...data,
          scoring: mergeScoring(data.scoring),
          bonus: { ...DEFAULT_APP_CONFIG.bonus, ...(data.bonus || {}) },
          content: { ...DEFAULT_APP_CONFIG.content, ...(data.content || {}) },
          hallOfFame: Array.isArray(data.hallOfFame) ? data.hallOfFame : DEFAULT_APP_CONFIG.hallOfFame,
          features: { ...DEFAULT_APP_CONFIG.features, ...(data.features || {}) },
          analystOverrides: data.analystOverrides || {},
          tips: data.tips || [],
          tipsEnabled: data.tipsEnabled !== false,
          announcement: { ...DEFAULT_APP_CONFIG.announcement, ...(data.announcement || {}) },
          theme: { ...DEFAULT_APP_CONFIG.theme, ...(data.theme || {}) },
          navIcons: { ...DEFAULT_APP_CONFIG.navIcons, ...(data.navIcons || {}) },
          polls: data.polls || [],
          surveys: data.surveys || [],
          playerPhotos: data.playerPhotos || {},
          customPlayers: data.customPlayers || [],
          hiddenScorers: data.hiddenScorers || [],
          departments: data.departments || DEFAULT_APP_CONFIG.departments,
          adminEmails: data.adminEmails || [],
          allowedEmailDomains: data.allowedEmailDomains || [],
          blockedEmails: data.blockedEmails || []
        }
        setCfg(merged)
        cacheConfigForGate(merged.allowedEmailDomains, merged.blockedEmails)
      }
    })
    return unsub
  }, [])

  return createElement(AppConfigContext.Provider, { value: cfg }, children)
}

export function useAppConfig() {
  return useContext(AppConfigContext)
}
