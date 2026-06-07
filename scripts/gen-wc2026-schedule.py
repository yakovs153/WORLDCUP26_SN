"""Generate wc2026Schedule.json + Hebrew stadium translations from the colleague's xlsx.
Run once, commits the JSON to the repo, then the app uses it as the venue source of truth.
"""
import pandas as pd
import json
from datetime import datetime

XLSX = r'C:\Users\yakovs\Downloads\wc2026.xlsx'
df = pd.read_excel(XLSX, sheet_name='Matches')

# English team name → FIFA TLA code (the codes football-data uses)
TLA = {
    'Algeria': 'ALG', 'Argentina': 'ARG', 'Australia': 'AUS', 'Austria': 'AUT',
    'Belgium': 'BEL', 'Bosnia & Herzegovina': 'BIH', 'Brazil': 'BRA', 'Canada': 'CAN',
    'Cape Verde': 'CPV', 'Colombia': 'COL', 'Croatia': 'CRO', 'Curaçao': 'CUW',
    'Czechia': 'CZE', 'DR Congo': 'COD', 'Ecuador': 'ECU', 'Egypt': 'EGY',
    'England': 'ENG', 'France': 'FRA', 'Germany': 'GER', 'Ghana': 'GHA',
    'Haiti': 'HAI', 'Iran': 'IRN', 'Iraq': 'IRQ', 'Ivory Coast': 'CIV',
    'Japan': 'JPN', 'Jordan': 'JOR', 'Mexico': 'MEX', 'Morocco': 'MAR',
    'Netherlands': 'NED', 'New Zealand': 'NZL', 'Norway': 'NOR', 'Panama': 'PAN',
    'Paraguay': 'PAR', 'Portugal': 'POR', 'Qatar': 'QAT', 'Saudi Arabia': 'KSA',
    'Scotland': 'SCO', 'Senegal': 'SEN', 'South Africa': 'RSA', 'South Korea': 'KOR',
    'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'SUI', 'Tunisia': 'TUN',
    'Türkiye': 'TUR', 'USA': 'USA', 'Uruguay': 'URU', 'Uzbekistan': 'UZB'
}

# English stadium → Hebrew name (with city for context)
HE_STADIUM = {
    'Estadio Azteca':          'אצטדיון אצטקה, מקסיקו סיטי',
    'Estadio Akron':           'אצטדיון אקרון, גוודלחרה',
    'BMO Field':               'BMO פילד, טורונטו',
    'SoFi Stadium':            "אצטדיון SoFi, לוס אנג'לס",
    "Levi's Stadium":          "אצטדיון Levi's, סן פרנסיסקו",
    'MetLife Stadium':         'אצטדיון מטלייף, ניו יורק',
    'Gillette Stadium':        "אצטדיון ג'ילט, בוסטון",
    'BC Place':                'BC פלייס, ונקובר',
    'NRG Stadium':             'אצטדיון NRG, יוסטון',
    'AT&T Stadium':            'אצטדיון AT&T, דאלאס',
    'Lincoln Financial Field': 'לינקולן פיננשל פילד, פילדלפיה',
    'Estadio BBVA':            'אצטדיון BBVA, מונטריי',
    'Mercedes-Benz Stadium':   'אצטדיון מרצדס-בנץ, אטלנטה',
    'Lumen Field':             'אצטדיון לומן, סיאטל',
    'Hard Rock Stadium':       'הארד רוק סטדיום, מיאמי',
    'Arrowhead Stadium':       'אצטדיון ארוהד, קנזס סיטי'
}

def parse_date(s):
    return datetime.strptime(f'{s} 2026', '%a, %b %d %Y').strftime('%Y-%m-%d')

schedule = []
for _, row in df.iterrows():
    t1, t2 = row['Team 1'], row['Team 2']
    schedule.append({
        'matchNum':  int(row['Match #']),
        'stage':     row['Stage'],
        'group':     None if pd.isna(row['Group']) else row['Group'],
        'date':      parse_date(row['Date (2026)']),
        'kickoffET': row['Kickoff (ET)'],
        'team1':     t1,
        'team2':     t2,
        'team1Code': TLA.get(t1),
        'team2Code': TLA.get(t2),
        'stadium':   row['Stadium'],
        'city':      row['City (Metro)'],
        'country':   row['Country'],
        'stadiumHe': HE_STADIUM.get(row['Stadium'], row['Stadium'])
    })

with open(r'C:\dev\storenext-mundial-2026\src\data\wc2026Schedule.json', 'w', encoding='utf-8') as f:
    json.dump(schedule, f, ensure_ascii=False, indent=2)

with open(r'C:\dev\storenext-mundial-2026\src\data\heVenues.json', 'w', encoding='utf-8') as f:
    json.dump(HE_STADIUM, f, ensure_ascii=False, indent=2)

with open(r'C:\dev\storenext-mundial-2026\functions\src\data\heVenues.json', 'w', encoding='utf-8') as f:
    json.dump(HE_STADIUM, f, ensure_ascii=False, indent=2)

group_with_codes = sum(1 for m in schedule if m['stage'] == 'Group' and m['team1Code'] and m['team2Code'])
ko_count = sum(1 for m in schedule if m['stage'] != 'Group')
print(f'Schedule: {len(schedule)} matches')
print(f'  Group with TLA codes: {group_with_codes}/72')
print(f'  KO bracket entries:   {ko_count}/32')
print(f'  Unique stadiums:      {len(set(m["stadium"] for m in schedule))}')
print('Group stage sample:')
for m in schedule[:5]:
    print(f'  {m["date"]} #{m["matchNum"]:3d}: {m["team1Code"]}-{m["team2Code"]:3} @ {m["stadiumHe"]}')
