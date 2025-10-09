# Budget Highlights Update Script

Dit script berekent de budget highlights voor de longread pagina op basis van de projectdata en plaatst deze vooraf in de HTML.

## Gebruik

```bash
python3 update_budget_highlights.py
```

of

```bash
./update_budget_highlights.py
```

## Wat doet het script?

Het script:
1. Laadt de projectdata uit `dashboard/all_projects.json`
2. Berekent de volgende budget highlights:
   - **Asset Management**: Totaal budget en aantal projecten uit het programma "Asset Management"
   - **Oosterweelverbinding**: Budget van projecten met "oosterweel" in de naam
   - **Ring Brussel**: Budget van projecten met "ring", "r0" of "brussel" in naam/locatie
   - **Fietsinfrastructuur**: Budget van projecten met "fiets" in infrastructuur_type of naam
   - **Sigmaplan**: Budget van projecten met "sigma" in de naam
   - **Albertkanaal**: Budget van projecten met "albertkanaal" in de naam
3. Update de HTML in `longread/index.html` met de berekende bedragen

## Output formaat

Bedragen worden geformatteerd als:
- Miljoenen: `€2085M`
- Duizenden: `€465K`

Met aantal projecten: `€2085M • 311 projecten`

## Wanneer uitvoeren?

Voer dit script uit wanneer:
- De projectdata is gewijzigd (`dashboard/all_projects.json`)
- De HTML template is aangepast met nieuwe budget highlight ID's
- Je de longread wilt deployen met actuele cijfers

## Automatisering

Je kunt dit script toevoegen aan je deployment pipeline:

```bash
# Update highlights voor deployment
python3 update_budget_highlights.py

# Commit en push
git add longread/index.html
git commit -m "Update budget highlights"
git push
```
