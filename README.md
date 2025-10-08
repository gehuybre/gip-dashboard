# GIP Dashboard 2025-2029

Interactieve visualisatie van het Geïntegreerd Investeringsplan (GIP) 2025-2029 van het beleidsdomein Mobiliteit en Openbare Werken van de Vlaamse overheid.

## 🌐 Live Demo

- **Dashboard**: [https://gehuybre.github.io/gip-dashboard/](https://gehuybre.github.io/gip-dashboard/)
- **Kaart**: [https://gehuybre.github.io/gip-dashboard/web/](https://gehuybre.github.io/gip-dashboard/web/)

## 📊 Features

- **Interactieve kaart** met 570 gelocaliseerde infrastructuurprojecten
- **Filterable dashboard** met alle 778 investeringsprojecten
- **Budget visualisatie** - marker grootte gebaseerd op projectbudget
- **Kleurcodering** per startjaar (2025/2026/2027)
- **CSV export** functionaliteit
- **Gedetailleerde statistieken** per programma, entiteit en infrastructuurtype

## 🎨 Kleurenschema

- 🟠 **Oranje (#ff4000)** - Projecten startend in 2025
- ⚫ **Donkergrijs (#3f334d)** - Projecten startend in 2026  
- 🟣 **Roze (#c1809d)** - Projecten startend in 2027
- ⚪ **Lichtgrijs (#bababa)** - Projecten zonder budget

## 📈 Data

- **Totaal investeringsbudget**: €15,02 miljard (2025-2027)
- **Aantal projecten**: 778
- **Gelocaliseerde projecten**: 570
- **Bron**: Vlaamse Regering, 14 juli 2025

## 🚀 Lokaal draaien

```bash
# Dashboard
cd dashboard
python3 -m http.server 8083

# Standalone kaart
cd web
python3 -m http.server 8082
```

## 📁 Structuur

```
gip-dashboard/
├── dashboard/          # Volledig dashboard (alle projecten)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── *.json         # Project data
└── web/               # Standalone kaart (geocoded projecten)
    ├── index.html
    ├── css/
    ├── js/
    └── *.json         # Geocoded project chunks
```

## 🛠️ Technologie

- **Leaflet 1.7.1** - Interactieve kaarten
- **CartoDB Positron** - Basemap
- **Vanilla JavaScript** - Geen frameworks
- **GitHub Pages** - Hosting

## 📝 Licentie

Data afkomstig van de Vlaamse Regering. Visualisatie door Gert Huybreghts.
