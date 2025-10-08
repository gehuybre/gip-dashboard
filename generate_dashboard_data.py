"""
Generate dashboard data from GIP CSV
Filters out the 'Eindtotaal' summary row to avoid double counting
"""
import pandas as pd
import json

# Lees de volledige CSV
df = pd.read_csv('data/VR_2025_GIP_Gestructureerd.csv')

print(f"Totaal rijen in CSV (inclusief eindtotaal): {len(df)}")

# Filter de "Eindtotaal" rij eruit - deze bevat de som van alle projecten
# en moet niet opnieuw meegeteld worden
df = df[df['ProgrammaOverkoepelend'] != 'Eindtotaal']

print(f"Totaal projecten (exclusief eindtotaal): {len(df)}")

# Parse budget functie
def parse_budget(budget_str):
    if pd.isna(budget_str) or str(budget_str).strip() == '':
        return 0.0
    budget_clean = str(budget_str).replace('€ ', '').replace('.', '').replace(',', '.')
    try:
        return float(budget_clean)
    except:
        return 0.0

# Maak complete dataset
all_projects = []
for idx, row in df.iterrows():
    # Naam: gebruik DeelprojectNaam als ProjectNaam leeg is
    project_naam = row['ProjectNaam']
    if pd.isna(project_naam) or str(project_naam).strip() == '':
        project_naam = row.get('DeelprojectNaam', '')
    
    budget_2025 = parse_budget(row['Budget2025'])
    budget_2026 = parse_budget(row['Budget2026'])
    budget_2027 = parse_budget(row['Budget2027'])
    total_budget = budget_2025 + budget_2026 + budget_2027
    
    # Bepaal startjaar
    if budget_2025 > 0:
        start_year = 2025
    elif budget_2026 > 0:
        start_year = 2026
    elif budget_2027 > 0:
        start_year = 2027
    else:
        start_year = None
    
    project = {
        'id': idx + 1,
        'programma': str(row['ProgrammaOverkoepelend']) if pd.notna(row['ProgrammaOverkoepelend']) else '',
        'subprogramma': str(row['SubprogrammaOverkoepelend']) if pd.notna(row['SubprogrammaOverkoepelend']) else '',
        'entiteit': str(row['Entiteit']) if pd.notna(row['Entiteit']) else '',
        'project_naam': str(project_naam) if pd.notna(project_naam) and str(project_naam).strip() else 'Onbekend',
        'deelproject_naam': str(row['DeelprojectNaam']) if pd.notna(row['DeelprojectNaam']) else '',
        'locatie': str(row['Locatie']) if pd.notna(row['Locatie']) else '',
        'gemeenten': str(row['GedetecteerdeGemeenten']) if pd.notna(row['GedetecteerdeGemeenten']) else '',
        'aantal_gemeenten': int(row['AantalGemeenten']) if pd.notna(row['AantalGemeenten']) else 0,
        'infrastructuur_type': str(row['InfrastructuurType']) if pd.notna(row['InfrastructuurType']) else 'Onbekend',
        'infrastructuur_naam': str(row['InfrastructuurNaam']) if pd.notna(row['InfrastructuurNaam']) else '',
        'werk_type': str(row['WerkType']) if pd.notna(row['WerkType']) else 'Onbekend',
        'is_traject': str(row['IsTraject']) if pd.notna(row['IsTraject']) else 'False',
        'project_scope': str(row['ProjectScope']) if pd.notna(row['ProjectScope']) else 'onbekend',
        'budget_2025': budget_2025,
        'budget_2026': budget_2026,
        'budget_2027': budget_2027,
        'totaal_budget': total_budget,
        'start_jaar': start_year
    }
    
    all_projects.append(project)

# Bereken statistieken
stats = {
    'total_projects': len(all_projects),
    'total_budget_2025': sum(p['budget_2025'] for p in all_projects),
    'total_budget_2026': sum(p['budget_2026'] for p in all_projects),
    'total_budget_2027': sum(p['budget_2027'] for p in all_projects),
    'total_budget_all': sum(p['totaal_budget'] for p in all_projects)
}

# Sla op als JSON
output = {
    'projects': all_projects,
    'stats': stats
}

with open('dashboard/all_projects.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✅ {len(all_projects)} projecten opgeslagen naar dashboard/all_projects.json")
print(f"\nBudget overzicht:")
print(f"  2025: €{stats['total_budget_2025']:,.2f}")
print(f"  2026: €{stats['total_budget_2026']:,.2f}")
print(f"  2027: €{stats['total_budget_2027']:,.2f}")
print(f"  Totaal 2025-2027: €{stats['total_budget_all']:,.2f}")
