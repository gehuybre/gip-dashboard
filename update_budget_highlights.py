#!/usr/bin/env python3
"""
Update budget highlights in longread HTML based on project data
"""

import json
import re
from pathlib import Path

def format_million(amount):
    """Format amount as millions or thousands"""
    millions = amount / 1_000_000
    if millions >= 1:
        return f"€{int(millions)}M"
    else:
        return f"€{int(amount / 1000)}K"

def calculate_budget_highlights(projects):
    """Calculate all budget highlights from project data"""
    highlights = {}
    
    # 1. Asset Management totaal
    asset_management = [p for p in projects if p.get('programma') == 'Asset Management']
    asset_total = sum(p.get('totaal_budget', 0) for p in asset_management)
    asset_count = len(asset_management)
    highlights['budget-asset-management'] = f"{format_million(asset_total)} • {asset_count} projecten"
    
    # 2. Oosterweelverbinding - zoek op projectnaam
    oosterweel = [p for p in projects if p.get('project_naam') and 'oosterweel' in p['project_naam'].lower()]
    oosterweel_total = sum(p.get('totaal_budget', 0) for p in oosterweel)
    oosterweel_count = len(oosterweel)
    if oosterweel_count > 0:
        highlights['budget-oosterweelverbinding'] = f"{format_million(oosterweel_total)} investering • {oosterweel_count} project{'en' if oosterweel_count > 1 else ''}"
    else:
        highlights['budget-oosterweelverbinding'] = "Geen data beschikbaar"
    
    # 3. Ring Brussel - zoek op projectnaam met "ring" of "brussel" en "r0"
    ring_brussel = [
        p for p in projects
        if (p.get('project_naam') and 
            ('ring' in p['project_naam'].lower() or 'r0' in p['project_naam'].lower() or 'brussel' in p['project_naam'].lower()) and
            (p.get('gemeenten') and 'brussel' in p['gemeenten'].lower() or 'ring' in p.get('project_naam', '').lower()))
    ]
    ring_total = sum(p.get('totaal_budget', 0) for p in ring_brussel)
    ring_count = len(ring_brussel)
    if ring_count > 0:
        highlights['budget-ring-brussel'] = f"{format_million(ring_total)} • {ring_count} projecten"
    else:
        highlights['budget-ring-brussel'] = "Geen data beschikbaar"
    
    # 4. Fietsinfrastructuur - zoek op infrastructuur_type
    fiets = [
        p for p in projects
        if (p.get('infrastructuur_type') and 'fiets' in p['infrastructuur_type'].lower()) or
           (p.get('project_naam') and 'fiets' in p['project_naam'].lower())
    ]
    fiets_total = sum(p.get('totaal_budget', 0) for p in fiets)
    fiets_count = len(fiets)
    if fiets_count > 0:
        highlights['budget-fietsinfrastructuur'] = f"{format_million(fiets_total)} fietsinfrastructuur • {fiets_count} projecten"
    else:
        highlights['budget-fietsinfrastructuur'] = "Geen data beschikbaar"
    
    # 5. Sigmaplan - zoek op projectnaam
    sigmaplan = [p for p in projects if p.get('project_naam') and 'sigma' in p['project_naam'].lower()]
    sigma_total = sum(p.get('totaal_budget', 0) for p in sigmaplan)
    sigma_count = len(sigmaplan)
    if sigma_count > 0:
        highlights['budget-sigmaplan'] = f"{format_million(sigma_total)} dijken en waterbeheer • {sigma_count} project{'en' if sigma_count > 1 else ''}"
    else:
        highlights['budget-sigmaplan'] = "Geen data beschikbaar"
    
    # 6. Albertkanaal - zoek op projectnaam
    albertkanaal = [
        p for p in projects
        if p.get('project_naam') and (
            'albertkanaal' in p['project_naam'].lower() or
            ('albert' in p['project_naam'].lower() and 'kanaal' in p['project_naam'].lower())
        )
    ]
    albert_total = sum(p.get('totaal_budget', 0) for p in albertkanaal)
    albert_count = len(albertkanaal)
    if albert_count > 0:
        highlights['budget-albertkanaal'] = f"{format_million(albert_total)} investering • {albert_count} project{'en' if albert_count > 1 else ''}"
    else:
        highlights['budget-albertkanaal'] = "Geen data beschikbaar"
    
    return highlights

def update_html_highlights(html_path, highlights):
    """Update the HTML file with calculated highlights"""
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Update each budget highlight by ID
    for highlight_id, text in highlights.items():
        # Pattern to match: <p class="budget-highlight" id="highlight_id">...</p>
        pattern = f'(<p class="budget-highlight" id="{highlight_id}">)[^<]+(</p>)'
        replacement = f'\\g<1>{text}\\g<2>'
        html_content = re.sub(pattern, replacement, html_content)
    
    # Write back
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Updated {len(highlights)} budget highlights in {html_path}")
    for highlight_id, text in highlights.items():
        print(f"   • {highlight_id}: {text}")

def main():
    # Paths
    project_root = Path(__file__).parent
    data_path = project_root / 'dashboard' / 'all_projects.json'
    html_path = project_root / 'longread' / 'index.html'
    
    # Load project data
    print(f"📊 Loading project data from {data_path}...")
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get projects (handle both direct array and nested object)
    projects = data.get('projects', data) if isinstance(data, dict) else data
    print(f"   Found {len(projects)} projects")
    
    # Calculate highlights
    print("\n🔢 Calculating budget highlights...")
    highlights = calculate_budget_highlights(projects)
    
    # Update HTML
    print(f"\n📝 Updating HTML file {html_path}...")
    update_html_highlights(html_path, highlights)
    
    print("\n✨ Done!")

if __name__ == '__main__':
    main()
