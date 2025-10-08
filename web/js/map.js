// GIP Projects Interactive Map with Chunked Loading
// Routing service for getting road trajectories
class RoutingService {
    constructor() {
        this.baseUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';
        this.apiKey = null; // Will use public endpoints or try alternative services
        this.cache = new Map();
        this.requestDelay = 1000; // 1 second delay between requests
        this.lastRequestTime = 0;
    }
    
    async getRoute(startCoords, endCoords, routeType = 'driving-car') {
        const cacheKey = `${startCoords[0]},${startCoords[1]}-${endCoords[0]},${endCoords[1]}-${routeType}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestDelay) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
        }
        
        try {
            // Try OpenRouteService first (may require API key for production)
            let route = await this.tryOpenRouteService(startCoords, endCoords, routeType);
            
            if (!route) {
                // Fallback to simple straight line
                route = this.createStraightLineRoute(startCoords, endCoords);
            }
            
            this.cache.set(cacheKey, route);
            this.lastRequestTime = Date.now();
            return route;
            
        } catch (error) {
            console.warn('Routing failed, using straight line:', error);
            const fallbackRoute = this.createStraightLineRoute(startCoords, endCoords);
            this.cache.set(cacheKey, fallbackRoute);
            return fallbackRoute;
        }
    }
    
    async tryOpenRouteService(startCoords, endCoords, routeType) {
        const url = `${this.baseUrl}?start=${startCoords[1]},${startCoords[0]}&end=${endCoords[1]},${endCoords[0]}`;
        
        const response = await fetch(url, {
            headers: this.apiKey ? { 'Authorization': this.apiKey } : {}
        });
        
        if (!response.ok) {
            throw new Error(`OpenRouteService failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.features && data.features[0] && data.features[0].geometry) {
            const coordinates = data.features[0].geometry.coordinates;
            // Convert from [lng, lat] to [lat, lng] for Leaflet
            return coordinates.map(coord => [coord[1], coord[0]]);
        }
        
        return null;
    }
    
    createStraightLineRoute(startCoords, endCoords) {
        // Create a simple straight line between points
        return [startCoords, endCoords];
    }
    
    // Estimate route points for highways based on known infrastructure
    estimateHighwayRoute(startCoords, endCoords, highwayName) {
        // For major highways, we can create more realistic routes
        // This is a simplified version - in production you'd use more sophisticated logic
        
        const points = [startCoords];
        
        // Add some intermediate points to make it look more like a real highway
        const latDiff = endCoords[0] - startCoords[0];
        const lngDiff = endCoords[1] - startCoords[1];
        
        // Add 2-3 intermediate points with slight curves
        for (let i = 1; i < 4; i++) {
            const progress = i / 4;
            const lat = startCoords[0] + (latDiff * progress);
            const lng = startCoords[1] + (lngDiff * progress);
            
            // Add slight randomness to make it look more natural
            const variation = 0.005; // Small variation
            const latVar = (Math.random() - 0.5) * variation;
            const lngVar = (Math.random() - 0.5) * variation;
            
            points.push([lat + latVar, lng + lngVar]);
        }
        
        points.push(endCoords);
        return points;
    }
}

class GIPMap {
    constructor() {
        this.map = null;
        this.markersGroup = null;
        this.polylinesGroup = null;
        this.data = { projects: [], stats: {} };
        this.filteredProjects = [];
        this.isLoading = false;
        this.routeCache = new Map(); // Cache for route requests
        this.routingService = new RoutingService();
        
        // Start loading data immediately
        this.init();
    }
    
    async init() {
        console.log('🚀 Starting GIPMap initialization...');
        await this.loadDataInChunks();
    }
    
    async loadDataInChunks() {
        try {
            console.log('🚀 Starting loadDataInChunks...');
            this.updateLoadingMessage('Loading project index...');
            
            // Initialize data structure
            this.data = { projects: [], stats: {} };
            
            // First, load the index to know how many chunks we have
            console.log('📋 Fetching index file...');
            const indexResponse = await fetch('./projects_index.json?' + Date.now());
            if (!indexResponse.ok) {
                throw new Error(`Failed to load index: ${indexResponse.status}`);
            }
            
            // Parse index as text first, then JSON
            const indexText = await indexResponse.text();
            console.log('📋 Index text length:', indexText.length);
            const index = JSON.parse(indexText);
            console.log('📋 Index loaded:', index);
            
            this.data.stats = index.stats;
            const totalChunks = index.total_chunks;
            console.log(`📦 Will load ${totalChunks} chunks`);
            
            // Load each chunk
            for (let i = 0; i < totalChunks; i++) {
                const chunkNumber = i + 1;
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                
                console.log(`📦 Loading chunk ${chunkNumber}/${totalChunks}...`);
                this.updateLoadingMessage(`Loading chunk ${chunkNumber}/${totalChunks} (${progress}%)...`);
                
                const chunkFilename = `projects_chunk_${chunkNumber.toString().padStart(2, '0')}.json`;
                const chunkResponse = await fetch(`./${chunkFilename}?` + Date.now());
                
                if (!chunkResponse.ok) {
                    console.warn(`❌ Failed to load chunk ${chunkNumber}: ${chunkResponse.status}`);
                    continue;
                }
                
                // Parse chunk as text first, then JSON
                const chunkText = await chunkResponse.text();
                console.log(`📦 Chunk ${chunkNumber} text length:`, chunkText.length);
                const chunkData = JSON.parse(chunkText);
                console.log(`✅ Loaded chunk ${chunkNumber}: ${chunkData.projects.length} projects`);
                
                // Add projects from this chunk
                this.data.projects.push(...chunkData.projects);
                console.log(`📊 Total projects so far: ${this.data.projects.length}`);
            }
            
            console.log(`🎉 All chunks loaded successfully! Total projects: ${this.data.projects.length}`);
            
            console.log('🗺️ Initializing map...');
            this.initMap();
            
            console.log('🔧 Populating filters...');
            this.populateFilters();
            
            console.log('📍 Creating markers...');
            this.updateLoadingMessage('Creating markers...');
            // Create markers with progress updates
            await this.createMarkers();
            
            console.log('✅ Hiding loading screen...');
            // Hide loading and show app
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').classList.remove('app-hidden');
            
            console.log('🎉 Application loaded successfully!');
            
        } catch (error) {
            console.error('💥 Error loading data:', error);
            console.error('💥 Error stack:', error.stack);
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
    
    updateLoadingMessage(message) {
        const loadingEl = document.querySelector('#loading p');
        if (loadingEl) {
            loadingEl.textContent = message;
        }
    }
    
    initMap() {
        console.log('🗺️ Initializing map...');
        
        // Define bounds for Belgium/Flanders
        const belgiumBounds = [
            [49.5, 2.5],  // Southwest
            [51.6, 6.4]   // Northeast
        ];
        
        // Create map centered on Flanders with restricted bounds
        this.map = L.map('map', {
            center: [51.15, 4.4],  // Meer noordelijk (richting Antwerpen)
            zoom: 9,  // Meer ingezoomd
            maxBounds: belgiumBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 7,
            maxZoom: 18
        });
        console.log('✅ Map object created with Belgium bounds restriction');
        
        // Use CartoDB Positron for a cleaner roads-only view
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 18
        });
        
        tileLayer.addTo(this.map);
        console.log('✅ Tile layer added');
        
        // Add event listener for tile loading
        tileLayer.on('load', () => {
            console.log('✅ Tiles loaded successfully');
        });
        
        tileLayer.on('tileerror', (error) => {
            console.error('❌ Tile loading error:', error);
        });
        
        // Use featureGroup instead of layerGroup to get getBounds() method
        this.markersGroup = L.featureGroup().addTo(this.map);
        this.polylinesGroup = L.featureGroup().addTo(this.map);
        console.log('✅ Marker groups created');
        
        // Force map to invalidate size (fixes display issues)
        setTimeout(() => {
            this.map.invalidateSize();
            console.log('🔄 Map size invalidated');
        }, 100);
    }
    
    async createMarkers() {
        this.markersGroup.clearLayers();
        this.polylinesGroup.clearLayers();
        
        const projects = this.data.projects.filter(p => 
            p.coordinates && 
            Array.isArray(p.coordinates) && 
            p.coordinates.length >= 2
        );
        
        console.log(`Creating markers for ${projects.length} projects`);
        
        // Find min and max budget for scaling
        const budgets = projects.map(p => {
            const total = (p.budgets?.budget_2025 || 0) + 
                         (p.budgets?.budget_2026 || 0) + 
                         (p.budgets?.budget_2027 || 0);
            return total > 0 ? total : p.bedrag || 0;
        });
        const maxBudget = Math.max(...budgets);
        const minBudget = Math.min(...budgets.filter(b => b > 0));
        
        console.log(`Budget range: €${minBudget.toLocaleString()} - €${maxBudget.toLocaleString()}`);
        
        // Since we're not using routing service, we can process all projects quickly
        projects.forEach((project, index) => {
            const [lat, lng] = project.coordinates;
            
            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                // Calculate total budget for this project
                const totalBudget = (project.budgets?.budget_2025 || 0) + 
                                   (project.budgets?.budget_2026 || 0) + 
                                   (project.budgets?.budget_2027 || 0);
                const projectBudget = totalBudget > 0 ? totalBudget : (project.bedrag || 0);
                
                // Scale radius based on budget (square root scale pushes more to smaller sizes)
                // Min radius: 7, Max radius: 25
                let radius = 7;
                if (projectBudget > 0 && maxBudget > minBudget) {
                    // Use square root to compress the scale (more dots stay small)
                    const normalized = (projectBudget - minBudget) / (maxBudget - minBudget);
                    const sqrtScale = Math.sqrt(normalized);
                    radius = 7 + (sqrtScale * 18); // Scale from 7 to 25
                }
                
                // Use color for better visibility
                let color = project.year_color || '#95A5A6';
                
                // Check if this is a line/road project and create appropriate visualization
                const isLineProject = this.isLineProject(project);
                
                if (isLineProject) {
                    // For line projects, use slightly larger marker
                    const marker = L.circleMarker([lat, lng], {
                        radius: radius * 1.3,
                        fillColor: color,
                        color: '#fff',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0.7
                    });
                    
                    const popupContent = this.createPopupContent(project);
                    marker.bindPopup(popupContent);
                    this.markersGroup.addLayer(marker);
                } else {
                    // Regular point projects with budget-based size
                    const marker = L.circleMarker([lat, lng], {
                        radius: radius,
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
            }
            
            // Update progress every 50 projects
            if (index % 50 === 0) {
                this.updateLoadingMessage(`Markers geladen: ${index + 1} van ${projects.length}...`);
            }
        });
        
        this.filteredProjects = projects;
        console.log(`✅ Created ${projects.length} markers successfully`);
        
        // Don't auto-zoom to markers, keep the Flanders overview
        console.log('📍 Markers displayed on map');
    }
    
    async createLineProject(project, color) {
        const [lat, lng] = project.coordinates;
        
        // For now, use simple markers for line projects to speed up loading
        // TODO: Re-enable routing service once performance is optimized
        const marker = L.circleMarker([lat, lng], {
            radius: 12,
            fillColor: color,
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.7
        });
        
        const popupContent = this.createPopupContent(project);
        marker.bindPopup(popupContent);
        this.markersGroup.addLayer(marker);
        
        /* 
        // DISABLED FOR NOW - Original routing code
        const routePoints = this.estimateRoutePoints(project);
        
        if (routePoints && routePoints.length > 1) {
            try {
                // Try to get actual route from routing service
                const route = await this.routingService.getRoute(routePoints[0], routePoints[1], 'driving-car');
                
                // Create polyline for the route
                const polyline = L.polyline(route, {
                    color: color,
                    weight: 6,
                    opacity: 0.8,
                    className: 'route-line'
                });
                
                const popupContent = this.createPopupContent(project);
                polyline.bindPopup(popupContent);
                this.polylinesGroup.addLayer(polyline);
                
                // Add small markers at start and end points
                const startMarker = L.circleMarker(routePoints[0], {
                    radius: 6,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1
                });
                
                const endMarker = L.circleMarker(routePoints[1], {
                    radius: 6,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1
                });
                
                startMarker.bindPopup(`${project.naam} - Start`);
                endMarker.bindPopup(`${project.naam} - Eind`);
                
                this.markersGroup.addLayer(startMarker);
                this.markersGroup.addLayer(endMarker);
                
            } catch (error) {
                console.warn('Failed to create route for project:', project.naam, error);
                // Fallback to regular marker
                const marker = L.circleMarker([lat, lng], {
                    radius: 12,
                    fillColor: color,
                    color: '#fff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.7
                });
                
                const popupContent = this.createPopupContent(project);
                marker.bindPopup(popupContent);
                this.markersGroup.addLayer(marker);
            }
        } else {
            // Fallback to larger marker for line projects without route data
            const marker = L.circleMarker([lat, lng], {
                radius: 12,
                fillColor: color,
                color: '#fff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.7
            });
            
            const popupContent = this.createPopupContent(project);
            marker.bindPopup(popupContent);
            this.markersGroup.addLayer(marker);
        }
        */
    }
    
    estimateRoutePoints(project) {
        const [centerLat, centerLng] = project.coordinates;
        const name = (project.naam || '').toLowerCase();
        
        // Try to estimate start and end points based on project name and known infrastructure
        if (name.includes('ring') || name.includes('r0')) {
            // Ring roads - create circular route
            const radius = 0.02; // About 2km radius
            const start = [centerLat + radius, centerLng];
            const end = [centerLat - radius, centerLng];
            return [start, end];
        }
        
        if (name.includes('a1') || name.includes('e19')) {
            // A1/E19 roughly north-south
            const distance = 0.05;
            const start = [centerLat + distance, centerLng];
            const end = [centerLat - distance, centerLng];
            return [start, end];
        }
        
        if (name.includes('a10') || name.includes('a4') || name.includes('e40')) {
            // A10/A4/E40 roughly east-west
            const distance = 0.05;
            const start = [centerLat, centerLng - distance];
            const end = [centerLat, centerLng + distance];
            return [start, end];
        }
        
        if (name.includes('tunnel') || name.includes('brug')) {
            // Tunnels and bridges are usually shorter
            const distance = 0.01;
            const start = [centerLat + distance, centerLng - distance];
            const end = [centerLat - distance, centerLng + distance];
            return [start, end];
        }
        
        // Default: create a line roughly east-west
        const distance = 0.03;
        const start = [centerLat, centerLng - distance];
        const end = [centerLat, centerLng + distance];
        return [start, end];
    }
    
    isLineProject(project) {
        // Check if project is likely a line/road project based on name and infrastructure type
        const name = (project.naam || '').toLowerCase();
        const infraType = (project.infrastructuur_type || '').toLowerCase();
        
        return (
            name.includes('a1') || name.includes('a2') || name.includes('a3') || 
            name.includes('a4') || name.includes('a5') || name.includes('a6') ||
            name.includes('a7') || name.includes('a8') || name.includes('a9') ||
            name.includes('a10') || name.includes('a11') || name.includes('a12') ||
            name.includes('a13') || name.includes('a14') || name.includes('a15') ||
            name.includes('a16') || name.includes('a17') || name.includes('a18') ||
            name.includes('e1') || name.includes('e2') || name.includes('e3') ||
            name.includes('e4') || name.includes('e40') || name.includes('e19') ||
            name.includes('n1') || name.includes('n2') || name.includes('n3') ||
            name.includes('ring') || name.includes('tunnel') || name.includes('brug') ||
            infraType.includes('wegen') || infraType.includes('spoor') ||
            infraType.includes('waterweg')
        );
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
    console.log('🚀 DOM Content Loaded - Starting GIPMap initialization...');
    try {
        const gipMap = new GIPMap();
        console.log('✅ GIPMap instance created successfully');
    } catch (error) {
        console.error('💥 Error creating GIPMap:', error);
        console.error('💥 Error stack:', error.stack);
        
        // Show error on screen
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2>JavaScript Error</h2>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
});

console.log('📄 map.js loaded successfully');