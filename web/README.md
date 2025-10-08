# GIP Infrastructure Projects Web Application

This directory contains the web application for visualizing GIP (Gewestelijk InvesteringsProgramma) infrastructure projects in Belgium.

## Files and Structure

### Main Application
- `index.html` - Main web application entry point
- `css/map.css` - Stylesheet for the map application
- `js/map.js` - Main JavaScript application with chunked data loading
- `js/backup/` - Backup of previous JavaScript versions

### Data Files
- `gip_projects.json` - Complete dataset with 570 geocoded projects (1.1MB)
- `projects_index.json` - Index file for chunked loading
- `projects_chunk_01.json` to `projects_chunk_06.json` - Data split into 6 chunks of ~100 projects each

### Utilities
- `split_json.py` - Script to split large JSON into smaller chunks for better browser compatibility

## Features

✅ **Interactive Map** with Leaflet and marker clustering  
✅ **570 Geocoded Projects** with precise road-level locations  
✅ **Color Coding** by investment start year:
   - Red (#FF6B6B): 2025
   - Turquoise (#4ECDC4): 2026  
   - Blue (#45B7D1): 2027
   - Gray (#95A5A6): No budget data

✅ **Filtering** by:
   - Investment start year
   - Responsible entity
   - Infrastructure type

✅ **Budget Information**:
   - Total project amounts
   - Yearly budget breakdown (2025/2026/2027)
   - Budget overview panel

✅ **Project Details** in popups:
   - Project name and description
   - Responsible entity
   - Municipalities involved
   - Budget amounts
   - Infrastructure type

## Technical Implementation

### Chunked Loading
The application uses chunked loading to avoid browser limitations with large JSON files. Instead of loading one 1.1MB file, it loads 6 smaller chunks progressively with a loading indicator.

### Data Quality Fixes
- **NaN Values**: Fixed invalid `NaN` values in JSON files by replacing them with `null` to ensure proper JSON parsing
- **JSON Validation**: All JSON files are validated for syntax correctness

### Geocoding
Projects were geocoded using Nominatim OpenStreetMap API to provide precise road-level coordinates instead of general municipality centers.

### Data Enhancement
The original GIP data was enhanced with:
- Precise coordinates for 570/778 projects (73% success rate)
- Budget breakdown by year
- Investment start year calculation
- Color coding for visualization

## Usage

1. Start a local HTTP server: `python3 -m http.server 8081`
2. Open `http://localhost:8081/` in a web browser
3. Use the filters and legend to explore the data
4. Click on markers to see detailed project information

## Browser Compatibility

The chunked loading approach ensures compatibility with VS Code's Simple Browser and other environments that may have limitations with large JSON files.