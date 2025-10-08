// GIP Longread JavaScript - Interactive Maps with Scroll Triggers

class LongreadMaps {
    constructor() {
        this.geocodedProjects = [];
        this.maps = {};
        this.init();
    }
    
    async init() {
        await this.loadGecodedData();
        this.initializeMaps();
        this.setupScrollObserver();
    }
    
    async loadGecodedData() {
        try {
            const chunks = [];
            // Support both local dev and GitHub Pages paths
            const basePath = window.location.hostname === 'localhost' 
                ? '../dashboard/' 
                : '/gip-dashboard/dashboard/';
            
            for (let i = 1; i <= 6; i++) {
                const response = await fetch(`${basePath}projects_chunk_0${i}.json`);
                if (!response.ok) {
                    console.warn(`Failed to load chunk ${i}`);
                    continue;
                }
                const data = await response.json();
                chunks.push(...data.projects);
            }
            this.geocodedProjects = chunks;
            console.log(`✅ Loaded ${this.geocodedProjects.length} geocoded projects`);
        } catch (error) {
            console.error('Error loading geocoded data:', error);
        }
    }
    
    initializeMaps() {
        const mapSections = document.querySelectorAll('.map-section');
        
        mapSections.forEach((section, index) => {
            const mapId = section.querySelector('.map-container').id;
            const filter = section.dataset.filter;
            const filterValue = section.dataset.filterValue;
            
            if (!mapId) return;
            
            // Create map
            const map = L.map(mapId, {
                center: [51.15, 4.4],
                zoom: 9,
                maxBounds: [[49.5, 2.5], [51.6, 6.4]],
                maxBoundsViscosity: 1.0,
                minZoom: 7,
                maxZoom: 18,
                zoomControl: true,
                scrollWheelZoom: false
            });
            
            // Add tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 18
            }).addTo(map);
            
            // Store map instance
            this.maps[mapId] = {
                map: map,
                filter: filter,
                filterValue: filterValue,
                markers: null,
                loaded: false
            };
        });
        
        console.log(`✅ Initialized ${Object.keys(this.maps).length} maps`);
    }
    
    setupScrollObserver() {
        const options = {
            threshold: 0.3,
            rootMargin: '-100px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const mapContainer = entry.target.querySelector('.map-container');
                    if (mapContainer && mapContainer.id) {
                        this.loadMapData(mapContainer.id);
                    }
                }
            });
        }, options);
        
        document.querySelectorAll('.map-section').forEach(section => {
            observer.observe(section);
        });
    }
    
    loadMapData(mapId) {
        const mapData = this.maps[mapId];
        if (!mapData || mapData.loaded) return;
        
        console.log(`Loading data for map: ${mapId}`);
        
        // Filter projects based on map settings
        let filteredProjects = this.geocodedProjects;
        
        if (mapData.filter && mapData.filter !== 'all') {
            if (mapData.filter === 'programma') {
                filteredProjects = this.geocodedProjects.filter(p => {
                    const programmaMatch = p.programma && p.programma.toLowerCase().includes(mapData.filterValue.toLowerCase());
                    const subprogrammaMatch = p.subprogramma && p.subprogramma.toLowerCase().includes(mapData.filterValue.toLowerCase());
                    return programmaMatch || subprogrammaMatch;
                });
            }
        }
        
        console.log(`Filtered to ${filteredProjects.length} projects for ${mapId}`);
        
        // Add markers
        this.addMarkers(mapId, filteredProjects);
        mapData.loaded = true;
        
        // Invalidate size to fix rendering issues
        setTimeout(() => {
            mapData.map.invalidateSize();
        }, 100);
    }
    
    addMarkers(mapId, projects) {
        const mapData = this.maps[mapId];
        if (!mapData) return;
        
        // Clear existing markers
        if (mapData.markers) {
            mapData.map.removeLayer(mapData.markers);
        }
        
        // Create marker layer
        mapData.markers = L.featureGroup();
        
        // Calculate budget range for sizing
        const budgets = projects.map(p => 
            (p.budgets?.budget_2025 || 0) + (p.budgets?.budget_2026 || 0) + (p.budgets?.budget_2027 || 0)
        ).filter(b => b > 0);
        
        const maxBudget = Math.max(...budgets);
        const minBudget = Math.min(...budgets);
        
        let markersAdded = 0;
        
        projects.forEach(project => {
            if (project.coordinates && project.coordinates.length === 2) {
                const [lat, lon] = project.coordinates;
                
                // Determine color based on start year
                let color = '#bababa';
                if (project.investment_start_year === 2025) color = '#ff4000';
                else if (project.investment_start_year === 2026) color = '#3f334d';
                else if (project.investment_start_year === 2027) color = '#c1809d';
                
                // Calculate marker size
                const totalBudget = (project.budgets?.budget_2025 || 0) + 
                                   (project.budgets?.budget_2026 || 0) + 
                                   (project.budgets?.budget_2027 || 0);
                
                let radius = 6;
                if (totalBudget > 0 && maxBudget > minBudget) {
                    const normalized = (totalBudget - minBudget) / (maxBudget - minBudget);
                    const sqrtScale = Math.sqrt(normalized);
                    radius = 6 + (sqrtScale * 19);
                }
                
                const marker = L.circleMarker([lat, lon], {
                    radius: radius,
                    fillColor: color,
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                });
                
                // Create popup
                const popupContent = `
                    <div style="min-width: 200px;">
                        <strong>${this.escapeHtml(project.naam)}</strong><br>
                        <small>${this.escapeHtml(project.verantwoordelijke)}</small><br>
                        <hr style="margin: 5px 0;">
                        <strong>Budget:</strong><br>
                        2025: ${this.formatCurrency(project.budgets?.budget_2025 || 0)}<br>
                        2026: ${this.formatCurrency(project.budgets?.budget_2026 || 0)}<br>
                        2027: ${this.formatCurrency(project.budgets?.budget_2027 || 0)}<br>
                        <strong>Totaal: ${this.formatCurrency(totalBudget)}</strong>
                    </div>
                `;
                
                marker.bindPopup(popupContent);
                mapData.markers.addLayer(marker);
                markersAdded++;
            }
        });
        
        mapData.markers.addTo(mapData.map);
        
        // Fit bounds if markers exist
        if (markersAdded > 0 && mapData.markers.getBounds().isValid()) {
            mapData.map.fitBounds(mapData.markers.getBounds(), {
                padding: [50, 50],
                maxZoom: 11
            });
        }
        
        console.log(`✅ Added ${markersAdded} markers to ${mapId}`);
    }
    
    formatCurrency(amount) {
        if (amount === 0) return '-';
        return '€ ' + amount.toLocaleString('nl-BE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Smooth scroll for navigation
document.addEventListener('DOMContentLoaded', () => {
    // Initialize maps
    new LongreadMaps();
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Fade-in on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.content-section, .video-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        fadeObserver.observe(section);
    });
});

// Store instance globally for debugging
window.longreadMaps = null;
document.addEventListener('DOMContentLoaded', () => {
    window.longreadMaps = new LongreadMaps();
});
