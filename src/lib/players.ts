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
  URY: { bg: '#0038a8', fg: '#fcd116' }
}

export const TOP_SCORER_CANDIDATES: PlayerOption[] = [
  { name: 'קיליאן מבאפה',       countryCode: 'FRA', display: 'קיליאן מבאפה · צרפת' },
  { name: 'הארי קיין',           countryCode: 'ENG', display: 'הארי קיין · אנגליה' },
  { name: 'ליונל מסי',           countryCode: 'ARG', display: 'ליונל מסי · ארגנטינה' },
  { name: 'לאוטרו מרטינס',       countryCode: 'ARG', display: 'לאוטרו מרטינס · ארגנטינה' },
  { name: 'כריסטיאנו רונאלדו',   countryCode: 'POR', display: 'כריסטיאנו רונאלדו · פורטוגל' },
  { name: 'ויניסיוס ג׳וניור',    countryCode: 'BRA', display: 'ויניסיוס ג׳וניור · ברזיל' },
  { name: 'רודריגו',             countryCode: 'BRA', display: 'רודריגו · ברזיל' },
  { name: 'ראפיניה',             countryCode: 'BRA', display: 'ראפיניה · ברזיל' },
  { name: 'ג׳וד בלינגהאם',       countryCode: 'ENG', display: 'ג׳וד בלינגהאם · אנגליה' },
  { name: 'בוקאיו סאקה',         countryCode: 'ENG', display: 'בוקאיו סאקה · אנגליה' },
  { name: 'לאמין יאמאל',         countryCode: 'ESP', display: 'לאמין יאמאל · ספרד' },
  { name: 'אלברו מוראטה',        countryCode: 'ESP', display: 'אלברו מוראטה · ספרד' },
  { name: 'קודי חאקפו',          countryCode: 'NED', display: 'קודי חאקפו · הולנד' },
  { name: 'ממפיס דפאי',          countryCode: 'NED', display: 'ממפיס דפאי · הולנד' },
  { name: 'רומלו לוקאקו',        countryCode: 'BEL', display: 'רומלו לוקאקו · בלגיה' },
  { name: 'קווין דה ברוינה',     countryCode: 'BEL', display: 'קווין דה ברוינה · בלגיה' },
  { name: 'פלוריאן וירץ',         countryCode: 'GER', display: 'פלוריאן וירץ · גרמניה' },
  { name: 'קאי האברץ',           countryCode: 'GER', display: 'קאי האברץ · גרמניה' },
  { name: 'כריסטיאן פוליסיץ׳',   countryCode: 'USA', display: 'כריסטיאן פוליסיץ׳ · ארה"ב' },
  { name: 'חיריבינג לוזאנו',     countryCode: 'MEX', display: 'חיריבינג לוזאנו · מקסיקו' },
  { name: 'חאקים זייאש',         countryCode: 'MAR', display: 'חאקים זייאש · מרוקו' },
  { name: 'יוסופה אן־דיאיה',     countryCode: 'SEN', display: 'יוסופה אן־דיאיה · סנגל' },
  { name: 'דארווין נונייס',      countryCode: 'URY', display: 'דארווין נונייס · אורוגוואי' }
]
