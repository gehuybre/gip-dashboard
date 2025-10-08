# GIP Vlaanderen Dashboard 2025-2029

🗺️ **Interactief dashboard voor het Geïntegreerd Investeringsprogramma van Vlaanderen**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://gehuybre.github.io/gip-vlaanderen-dashboard/)

## 📊 Over dit project

Dit dashboard visualiseert de 778 investeringsprojecten uit het Geïntegreerd Investeringsprogramma (GIP) 2025-2029 van het Vlaamse beleidsdomein Mobiliteit en Openbare Werken.

### Features

- 📍 **Interactieve kaart** met 570 geogecod localiseerde projecten
- 💰 **Budget tracking** van €15.02 miljard over 2025-2027
- 🔍 **Geavanceerde filters** op programma, entiteit, infrastructuur, jaar en gemeente
- 📈 **Overzichtstabel** met alle 778 projecten
- 📥 **CSV export** functionaliteit
- 🎨 **Officieel kleurenschema** volgens Vlaamse overheid richtlijnen

## 💻 Technologie

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Mapping**: Leaflet.js met CartoDB Positron basemap
- **Data**: GIP 2025-2029 Vlaamse Regering (14 juli 2025)

## 🚀 Live Demo

👉 [https://gehuybre.github.io/gip-vlaanderen-dashboard/](https://gehuybre.github.io/gip-vlaanderen-dashboard/)

## 📂 Project Structuur

```
├── index.html          # Dashboard HTML
├── css/
│   └── dashboard.css   # Styling
├── js/
│   └── dashboard.js    # Applicatie logica
└── *.json             # Project data chunks
```

## 🎯 Beleidsdoelstellingen GIP

1. Asset management voor performante infrastructuur
2. Grote infrastructuurprojecten voor verschillende modi
3. Investeringen in verkeersveiligheid
4. Duurzaam personenvervoer en modal shift
5. Duurzaam goederenvervoer
6. Waterbeheersing
7. Regionale luchthavens

## 📊 Dataset

- **778 investeringsprojecten** (570 met geografische locatie)
- **€5.17 miljard** budget 2025
- **€4.85 miljard** budget 2026
- **€5.00 miljard** budget 2027
- **€15.02 miljard** totaal 2025-2027

## 🗺️ Kaart Features

- Budget-proportionele marker groottes
- Kleurcodering per startjaar:
  - 🟠 Oranje: 2025 projecten
  - 🟣 Donkergrijs: 2026 projecten
  - 🌸 Roze: 2027 projecten
  - ⚪ Grijs: Projecten zonder budget
- Beperkte bounds tot België/Vlaanderen
- Gedetailleerde project popups

## 📝 Licentie

Data bron: Vlaamse Regering - Geïntegreerd Investeringsprogramma 2025-2029

## 🤝 Contributing

Bijdragen zijn welkom! Open een issue of pull request.

---

**Bron**: Vlaamse Regering, Geïntegreerd Investeringsprogramma (GIP) 2025-2027, goedgekeurd op 14 juli 2025

**Beleidsdomein**: Mobiliteit en Openbare Werken | Departement Mobiliteit en Openbare Werken