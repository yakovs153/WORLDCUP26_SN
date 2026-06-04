/**
 * FIFA 3-letter team code → ISO 3166 code used by flagcdn.com.
 * רשימה זו מכסה את ה-48 נבחרות הצפויות במונדיאל 2026 + נפוצות נוספות.
 */
const FIFA_TO_ISO: Record<string, string> = {
  // Americas
  USA: 'us', CAN: 'ca', MEX: 'mx',
  ARG: 'ar', BRA: 'br', URY: 'uy', URU: 'uy', CHI: 'cl', COL: 'co', ECU: 'ec', PAR: 'py', PER: 'pe', VEN: 've', BOL: 'bo',
  CRC: 'cr', HON: 'hn', JAM: 'jm', PAN: 'pa', SLV: 'sv',

  // Europe (UEFA)
  FRA: 'fr', ESP: 'es', POR: 'pt', GER: 'de', NED: 'nl', BEL: 'be', CRO: 'hr', ITA: 'it',
  ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls', NIR: 'gb-nir',
  POL: 'pl', SUI: 'ch', AUT: 'at', SRB: 'rs', DEN: 'dk', SWE: 'se', NOR: 'no', FIN: 'fi',
  CZE: 'cz', SVK: 'sk', HUN: 'hu', UKR: 'ua', ROU: 'ro', BUL: 'bg', GRE: 'gr',
  TUR: 'tr', ISR: 'il', ISL: 'is', IRL: 'ie', RUS: 'ru',

  // Africa (CAF)
  MAR: 'ma', SEN: 'sn', EGY: 'eg', ALG: 'dz', TUN: 'tn', NGA: 'ng', GHA: 'gh', CIV: 'ci', CMR: 'cm',
  RSA: 'za', MLI: 'ml', BFA: 'bf', GUI: 'gn', COD: 'cd', ANG: 'ao',

  // Asia (AFC)
  JPN: 'jp', KOR: 'kr', AUS: 'au', IRN: 'ir', KSA: 'sa', QAT: 'qa', UAE: 'ae', IRQ: 'iq', SYR: 'sy',
  UZB: 'uz', JOR: 'jo', LIB: 'lb', OMA: 'om', CHN: 'cn', PRK: 'kp', IND: 'in', THA: 'th',

  // Oceania
  NZL: 'nz', FIJ: 'fj'
}

/**
 * Returns a URL for the team's flag (SVG when possible).
 * Falls back to empty string — components should then use the emoji `flag` field.
 */
export function flagUrl(fifaCode: string, _size: 'sm' | 'md' | 'lg' = 'md'): string {
  if (!fifaCode) return ''
  const iso = FIFA_TO_ISO[fifaCode.toUpperCase()]
  if (!iso) return ''
  return `https://flagcdn.com/${iso}.svg`
}

export function hasFlag(fifaCode: string): boolean {
  return !!FIFA_TO_ISO[fifaCode.toUpperCase()]
}
