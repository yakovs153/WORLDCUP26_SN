/**
 * רשימת מועמדים אפשריים למלך השערים — שחקני התקפה בולטים מהנבחרות
 * שעשויות להתמודד במונדיאל 2026.
 *
 * `photoUrl` אופציונלי — כשמוגדר, יוצג במקום האווטר עם הראשי תיבות.
 * (אדמין יכול בעתיד להעלות תמונות אמיתיות לכל שחקן.)
 */
export interface PlayerOption {
  name: string
  countryCode: string
  display: string      // "שם · נבחרת"
  photoUrl?: string    // אופציונלי — תמונה מותאמת
}

/**
 * צבע ראשי של נבחרת לאווטר. מבוסס על הצבע הדומיננטי בדגל.
 */
export const COUNTRY_COLORS: Record<string, { bg: string; fg: string }> = {
  BRA: { bg: '#009c3b', fg: '#ffdf00' },
  ARG: { bg: '#74acdf', fg: '#ffffff' },
  FRA: { bg: '#0055a4', fg: '#ffffff' },
  ENG: { bg: '#cf142b', fg: '#ffffff' },
  ESP: { bg: '#aa151b', fg: '#f1bf00' },
  POR: { bg: '#046a38', fg: '#ffd100' },
  GER: { bg: '#1a1a1a', fg: '#ffce00' },
  NED: { bg: '#ff7900', fg: '#ffffff' },
  BEL: { bg: '#ed2939', fg: '#fdda24' },
  CRO: { bg: '#171796', fg: '#ffffff' },
  ITA: { bg: '#009246', fg: '#ffffff' },
  USA: { bg: '#3c3b6e', fg: '#ffffff' },
  MEX: { bg: '#006341', fg: '#ffffff' },
  MAR: { bg: '#c1272d', fg: '#006233' },
  JPN: { bg: '#ffffff', fg: '#bc002d' },
  SEN: { bg: '#00853f', fg: '#fdef42' },
  URY: { bg: '#0038a8', fg: '#fcd116' },
  NOR: { bg: '#ba0c2f', fg: '#ffffff' }
}

/**
 * Two-stop gradient for a team's "backed-to-win" ring.
 * Falls back to the brand red→amber when a team isn't in the colour map.
 */
export function ringColors(code: string): { a: string; b: string } {
  const c = COUNTRY_COLORS[code?.toUpperCase()]
  if (c) return { a: c.bg, b: c.fg }
  return { a: 'var(--color-primary)', b: 'var(--color-accent)' }
}

// Golden Boot favourites for WC 2026 (by pre-tournament betting odds) + "אחר" (Other).
// Photos: Wikimedia Commons thumbnails (CC-licensed, 500px) via Wikipedia's pageimages API.
export const TOP_SCORER_CANDIDATES: PlayerOption[] = [
  { name: 'קיליאן מבאפה',       countryCode: 'FRA', display: 'קיליאן מבאפה · צרפת', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Picture_with_Mbapp%C3%A9_%28cropped_and_rotated%29.jpg/500px-Picture_with_Mbapp%C3%A9_%28cropped_and_rotated%29.jpg' },
  { name: 'הארי קיין',           countryCode: 'ENG', display: 'הארי קיין · אנגליה', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Harry_Kane_on_October_10%2C_2023.jpg/500px-Harry_Kane_on_October_10%2C_2023.jpg' },
  { name: 'ארלינג הולאנד',       countryCode: 'NOR', display: 'ארלינג הולאנד · נורבגיה', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Erling_Haaland_June_2025.jpg/500px-Erling_Haaland_June_2025.jpg' },
  { name: 'ליאו מסי',            countryCode: 'ARG', display: 'ליאו מסי · ארגנטינה', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg/500px-Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg' },
  { name: 'לאמין יאמאל',         countryCode: 'ESP', display: 'לאמין יאמאל · ספרד', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Lamine_Yamal_in_2025.jpg/500px-Lamine_Yamal_in_2025.jpg' },
  { name: 'מיקל אויארסבאל',      countryCode: 'ESP', display: 'מיקל אויארסבאל · ספרד', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/UEFA_EURO_qualifiers_Sweden_vs_Spain_20191015_108_%28cropped%29.jpg/500px-UEFA_EURO_qualifiers_Sweden_vs_Spain_20191015_108_%28cropped%29.jpg' },
  { name: 'כריסטיאנו רונאלדו',   countryCode: 'POR', display: 'כריסטיאנו רונאלדו · פורטוגל', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/President_Donald_Trump_meets_with_Cristiano_Ronaldo_in_the_Oval_Office_%2854933344262%29_%28cropped_and_rotated%29.jpg/500px-President_Donald_Trump_meets_with_Cristiano_Ronaldo_in_the_Oval_Office_%2854933344262%29_%28cropped_and_rotated%29.jpg' },
  { name: 'חוליאן אלברס',        countryCode: 'ARG', display: 'חוליאן אלברס · ארגנטינה', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Argentina_national_football_team_-_2_-_2022_%28Juli%C3%A1n_%C3%81lvarez%29.jpg' },
  { name: 'לאוטרו מרטינס',       countryCode: 'ARG', display: 'לאוטרו מרטינס · ארגנטינה', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lautaro_Martinez_ARGENTINA_VS_VENEZUELA_2017.jpg/500px-Lautaro_Martinez_ARGENTINA_VS_VENEZUELA_2017.jpg' },
  { name: 'ויניסיוס ג׳וניור',    countryCode: 'BRA', display: 'ויניסיוס ג׳וניור · ברזיל', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/2023_05_06_Final_de_la_Copa_del_Rey_-_52879242230_%28cropped%29.jpg/500px-2023_05_06_Final_de_la_Copa_del_Rey_-_52879242230_%28cropped%29.jpg' },
  { name: 'עוסמאן דמבלה',        countryCode: 'FRA', display: 'עוסמאן דמבלה · צרפת', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Ousmane_Demb%C3%A9l%C3%A9_2018_%28cropped%29.jpg' },
  { name: 'ראפיניה',             countryCode: 'BRA', display: 'ראפיניה · ברזיל', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Raphael_Dias_Belloli_2023.jpg/500px-Raphael_Dias_Belloli_2023.jpg' },
  { name: 'קודי חאקפו',          countryCode: 'NED', display: 'קודי חאקפו · הולנד', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Cody_Gakpo_06042025_%282%29_%28cropped%29.jpg/500px-Cody_Gakpo_06042025_%282%29_%28cropped%29.jpg' },
  { name: 'בוקאיו סאקה',         countryCode: 'ENG', display: 'בוקאיו סאקה · אנגליה', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/1_bukayo_saka_arsenal_2025_%28cropped%29.jpg/500px-1_bukayo_saka_arsenal_2025_%28cropped%29.jpg' },
  { name: 'קאי הוורץ',           countryCode: 'GER', display: 'קאי הוורץ · גרמניה', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/1_kai_havertz_2026_%28cropped%29.jpg/500px-1_kai_havertz_2026_%28cropped%29.jpg' },
  { name: 'אחר',                 countryCode: '',    display: 'אחר · שחקן אחר' }
]
