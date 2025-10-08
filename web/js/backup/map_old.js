// GIP Projects Interactive Map
class GIPMap {
    constructor() {
        this.map = null;
        this.markersGroup = null;
        this.data = null;
        this.filteredProjects = [];
        
        this.init();
    }
    
    async init() {
        await this.loadData();
    }
    
    async loadData() {
        try {
            console.log('Starting to load data...');
            
            // Multiple cache busting strategies
            const timestamp = Date.now();
            const random = Math.random();
            const url = `./gip_projects.json?v=${timestamp}&r=${random}`;
            
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store', // Stronger cache busting
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}: ${response.statusText}`);
            }
            
            // Direct JSON parsing
            this.data = await response.json();
            
            console.log('✅ Data loaded successfully:', {
                type: typeof this.data,
                hasProjects: !!this.data.projects,
                projectCount: this.data.projects ? this.data.projects.length : 0
            });
            
            if (!this.data.projects || !Array.isArray(this.data.projects)) {
                throw new Error('Invalid data structure: projects array not found');
            }
            
            console.log('Projects array length:', this.data.projects.length);
            
            // Hide loading and show app
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').classList.remove('app-hidden');
            
            this.initMap();
            this.createMarkers();
            this.populateFilters();
            this.populateBudgetInfo();
            
        } catch (error) {
            console.error('Error loading data:', error);
            const loadingEl = document.getElementById('loading');
            loadingEl.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2>Error Loading Data</h2>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    initMap() {
        this.map = L.map('map').setView([50.8503, 4.3517], 8);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        this.markersGroup = L.markerClusterGroup();
        this.map.addLayer(this.markersGroup);
    }
    
    createMarkers() {
        this.markersGroup.clearLayers();
        
        const projects = this.data.projects.filter(p => 
            p.coordinates && 
            Array.isArray(p.coordinates) && 
            p.coordinates.length >= 2
        );
        
        console.log(`Creating markers for ${projects.length} projects`);
        
        projects.forEach(project => {
            const [lat, lng] = project.coordinates;
            
            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                const color = project.year_color || '#95A5A6';
                
                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                const popupContent = this.createPopupContent(project);
                marker.bindPopup(popupContent);
                
                this.markersGroup.addLayer(marker);
            }
        });
        
        this.filteredProjects = projects;
    }
    
    createPopupContent(project) {
        const budgets = project.budgets || {};
        const budgetInfo = Object.entries(budgets)
            .filter(([key, value]) => value > 0)
            .map(([key, value]) => `${key.replace('budget_', '')}: €${value.toLocaleString()}`)
            .join('<br>');
        
        return `
            <div class="popup-content">
                <h3>${project.naam}</h3>
                <p><strong>Entity:</strong> ${project.verantwoordelijke}</p>
                <p><strong>Municipalities:</strong> ${project.gemeenten}</p>
                <p><strong>Amount:</strong> €${project.bedrag.toLocaleString()}</p>
                <p><strong>Infrastructure:</strong> ${project.infrastructuur_type}</p>
                ${budgetInfo ? `<p><strong>Budget per year:</strong><br>${budgetInfo}</p>` : ''}
                ${project.investment_start_year ? `<p><strong>Start year:</strong> ${project.investment_start_year}</p>` : ''}
            </div>
        `;
    }
    
    populateFilters() {
        const yearFilter = document.getElementById('year-filter');
        const entityFilter = document.getElementById('entity-filter');
        const infraFilter = document.getElementById('infrastructure-filter');
        
        // Year filter
        const years = [...new Set(this.data.projects
            .map(p => p.investment_start_year)
            .filter(y => y)
        )].sort();
        
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });
        
        // Entity filter
        const entities = [...new Set(this.data.projects
            .map(p => p.verantwoordelijke)
            .filter(e => e)
        )].sort();
        
        entities.forEach(entity => {
            const option = document.createElement('option');
            option.value = entity;
            option.textContent = entity;
            entityFilter.appendChild(option);
        });
        
        // Infrastructure filter
        const infrastructures = [...new Set(this.data.projects
            .flatMap(p => p.infrastructuur_type ? p.infrastructuur_type.split(';').map(i => i.trim()) : [])
            .filter(i => i)
        )].sort();
        
        infrastructures.forEach(infra => {
            const option = document.createElement('option');
            option.value = infra;
            option.textContent = infra;
            infraFilter.appendChild(option);
        });
        
        // Add event listeners
        [yearFilter, entityFilter, infraFilter].forEach(filter => {
            filter.addEventListener('change', () => this.applyFilters());
        });
    }
    
    applyFilters() {
        const yearFilter = document.getElementById('year-filter').value;
        const entityFilter = document.getElementById('entity-filter').value;
        const infraFilter = document.getElementById('infrastructure-filter').value;
        
        let filtered = this.data.projects.filter(p => 
            p.coordinates && 
            Array.isArray(p.coordinates) && 
            p.coordinates.length >= 2
        );
        
        if (yearFilter) {
            filtered = filtered.filter(p => p.investment_start_year == yearFilter);
        }
        
        if (entityFilter) {
            filtered = filtered.filter(p => p.verantwoordelijke === entityFilter);
        }
        
        if (infraFilter) {
            filtered = filtered.filter(p => 
                p.infrastructuur_type && 
                p.infrastructuur_type.includes(infraFilter)
            );
        }
        
        this.filteredProjects = filtered;
        this.updateMarkers();
        this.populateBudgetInfo();
    }
    
    updateMarkers() {
        this.markersGroup.clearLayers();
        
        this.filteredProjects.forEach(project => {
            const [lat, lng] = project.coordinates;
            
            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                const color = project.year_color || '#95A5A6';
                
                const marker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                const popupContent = this.createPopupContent(project);
                marker.bindPopup(popupContent);
                
                this.markersGroup.addLayer(marker);
            }
        });
    }
    
    populateBudgetInfo() {
        const budgetDetails = document.getElementById('budget-details');
        
        const totalAmount = this.filteredProjects.reduce((sum, p) => sum + (p.bedrag || 0), 0);
        const totalBudget2025 = this.filteredProjects.reduce((sum, p) => sum + (p.budgets?.budget_2025 || 0), 0);
        const totalBudget2026 = this.filteredProjects.reduce((sum, p) => sum + (p.budgets?.budget_2026 || 0), 0);
        const totalBudget2027 = this.filteredProjects.reduce((sum, p) => sum + (p.budgets?.budget_2027 || 0), 0);
        
        budgetDetails.innerHTML = `
            <p><strong>Projects shown:</strong> ${this.filteredProjects.length}</p>
            <p><strong>Total amount:</strong> €${totalAmount.toLocaleString()}</p>
            <div class="budget-breakdown">
                <h4>Budget per year:</h4>
                <p>2025: €${totalBudget2025.toLocaleString()}</p>
                <p>2026: €${totalBudget2026.toLocaleString()}</p>
                <p>2027: €${totalBudget2027.toLocaleString()}</p>
            </div>
        `;
    }
}

// Initialize the map when page loads
document.addEventListener('DOMContentLoaded', () => {
    new GIPMap();
});