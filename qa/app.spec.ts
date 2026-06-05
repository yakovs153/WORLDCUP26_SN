import { test, expect, type Page } from '@playwright/test'

/**
 * End-to-end QA for Mundial 2026. Runs against the demo build (?demo=1 auto-logs
 * in, ?sim=1 seeds a live + finished game, Joker target, and goal tallies).
 * Every test fails on an uncaught exception or a console error.
 */

// Console noise that isn't an app bug.
const IGNORE = [/icon-192/i, /manifest/i, /react devtools/i, /favicon/i, /404 \(Not Found\)/i]

function watchErrors(page: Page): string[] {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.some((re) => re.test(m.text()))) errs.push(`console.error: ${m.text()}`)
  })
  return errs
}

const ROUTES: Record<string, string> = {
  Matches: '/?demo=1&sim=1#/',
  Teams: '/?demo=1&sim=1#/teams',
  Bracket: '/?demo=1&sim=1#/bracket',
  Bonus: '/?demo=1&sim=1#/bonus',
  Surveys: '/?demo=1&sim=1#/surveys',
  MyPredictions: '/?demo=1&sim=1#/my',
  Leaderboard: '/?demo=1&sim=1#/leaderboard',
  Profile: '/?demo=1&sim=1#/profile',
  Admin: '/?demo=1&sim=1#/admin',
  Rules: '/?demo=1&sim=1#/rules',
  Lobby: '/tv',
  LobbyLight: '/?theme=light#/tv', // hash route still resolves via HashRouter
  Octopus: '/?demo=1#/octopus',
  Playground: '/?demo=1#/playground'
}

test.describe('every screen renders without errors', () => {
  for (const [name, url] of Object.entries(ROUTES)) {
    test(`route: ${name}`, async ({ page }) => {
      const errs = watchErrors(page)
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)
      const bodyText = (await page.locator('#root').innerText().catch(() => '')) || (await page.locator('body').innerText())
      expect(bodyText.trim().length, `${name} rendered content`).toBeGreaterThan(20)
      expect(errs, `${name} console/page errors`).toEqual([])
    })
  }
})

test('theme toggle switches data-theme', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/?demo=1&theme=dark#/', { waitUntil: 'networkidle' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('.theme-toggle button', { hasText: '☀' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(errs).toEqual([])
})

test('save a prediction on a scheduled match', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/?demo=1&sim=1#/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  // first enabled save button on the page (scheduled matches)
  const inputs = page.locator('.match-card input[type="number"]:not([disabled])')
  await expect(inputs.first()).toBeVisible()
  await inputs.nth(0).fill('2')
  await inputs.nth(1).fill('1')
  const save = page.getByRole('button', { name: /שמירת ניחוש|עדכון ניחוש/ }).first()
  await save.click()
  await expect(page.getByText(/נשמר/).first()).toBeVisible({ timeout: 5000 })
  expect(errs).toEqual([])
})

test('leaderboard departments toggle works', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/?demo=1&sim=1#/leaderboard', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /מחלקות/ }).click()
  await page.waitForTimeout(600)
  expect(errs).toEqual([])
})

test('bonus: pick champion, runner-up, surprise and save', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/?demo=1&sim=1#/bonus', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  // champion: first team button under the champion section
  await page.locator('section', { hasText: 'הזוכה במונדיאל' }).locator('button').first().click()
  // runner-up: second team button (first may be the disabled champion)
  await page.locator('section', { hasText: 'הסגנית' }).locator('button:not([disabled])').first().click()
  // surprise: first team
  await page.locator('section', { hasText: 'הפתעת הטורניר' }).locator('button').first().click()
  await page.getByRole('button', { name: /שמירת ניחושי הבונוס/ }).click()
  await expect(page.getByText(/בונוס נשמר/).first()).toBeVisible({ timeout: 5000 })
  expect(errs).toEqual([])
})

test('match room: send a message', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/?demo=1&sim=1#/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('a[href*="/match/"]').first().click()
  await page.waitForTimeout(600)
  const box = page.getByPlaceholder('כתוב הודעה…')
  await box.fill('בדיקת QA ⚽')
  await page.getByRole('button', { name: 'שלח' }).click()
  await expect(page.getByText('בדיקת QA ⚽').first()).toBeVisible({ timeout: 5000 })
  expect(errs).toEqual([])
})

test('survey: admin creates a survey, user fills it and sees public results', async ({ page }) => {
  const errs = watchErrors(page)
  // Admin builds a survey in the סקרים tab
  await page.goto('/?demo=1&sim=1#/admin', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'סקרים', exact: false }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /סקר חדש/ }).click()
  await page.getByPlaceholder(/כותרת הסקר/).fill('סקר QA')
  await page.getByPlaceholder('שאלה 1').fill('מי תזכה?')
  await page.getByPlaceholder('אפשרות 1').fill('ברזיל')
  await page.getByPlaceholder('אפשרות 2').fill('צרפת')
  await page.getByRole('button', { name: 'פרסום' }).click()
  await page.waitForTimeout(500)

  // User opens the survey from the dedicated Surveys tab
  await page.goto('/?demo=1&sim=1#/surveys', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.locator('a[href*="/survey/"]').first().click()
  await page.waitForTimeout(500)
  // answer first option then submit
  await page.getByRole('button', { name: /ברזיל/ }).click()
  await page.getByRole('button', { name: 'שליחה' }).click()
  await expect(page.getByText(/תודה שהשתתפת/).first()).toBeVisible({ timeout: 5000 })
  expect(errs).toEqual([])
})

test('admin: open each tab without errors', async ({ page }) => {
  const errs = watchErrors(page)
  await page.goto('/?demo=1&sim=1#/admin', { waitUntil: 'networkidle' })
  for (const tab of ['תוכן', 'מחלקות', 'ניקוד', 'שחקנים', 'סקרים', 'ניחושים', 'גישה', 'משחקים']) {
    await page.getByRole('button', { name: tab, exact: false }).first().click().catch(() => {})
    await page.waitForTimeout(400)
  }
  expect(errs).toEqual([])
})
