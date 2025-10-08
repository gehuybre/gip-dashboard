// GIP Dashboard JavaScript

// Check if we should hide the map (for embedding)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('embed') === 'true' || urlParams.get('hideMap') === 'true') {
    document.body.classList.add('hide-map');
}

class GIPDashboard {
    constructor() {
        this.allProjects = [];
        this.filteredProjects = [];
        this.geocodedProjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.sortColumn = 'id';
        this.sortDirection = 'asc';
        this.map = null;
        this.markers = null;
        this.showFilteredOnMap = false;
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        await this.loadGecodedData();
        this.setupEventListeners();
        this.populateFilters();
        this.applyFilters();
        this.initMap(); // Initialize map AFTER data is loaded
    }
    
    async loadData() {
        try {
            const response = await fetch('all_projects.json');
            const data = await response.json();
            this.allProjects = data.projects;
            this.updateGlobalStats(data.stats);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Fout bij het laden van de data');
        }
    }
    
    async loadGecodedData() {
        try {
            // Load all project chunks
            const chunks = [];
            for (let i = 1; i <= 6; i++) {
                const response = await fetch(`projects_chunk_0${i}.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load chunk ${i}: ${response.status}`);
                }
                const data = await response.json();
                chunks.push(...data.projects);
                console.log(`Loaded chunk ${i}: ${data.projects.length} projects`);
            }
            this.geocodedProjects = chunks;
            console.log(`✅ Loaded ${this.geocodedProjects.length} total geocoded projects for map`);
        } catch (error) {
            console.error('Error loading geocoded data:', error);
            alert('Fout bij het laden van kaartdata. Controleer de browser console voor details.');
        }
    }
    
    initMap() {
        // Check if map element exists
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }
        
        console.log('Initializing map with', this.geocodedProjects?.length || 0, 'geocoded projects');
        
        // Initialize Leaflet map with restricted bounds for Flanders/Belgium
        const belgiumBounds = [
            [49.5, 2.5],  // Southwest coordinates
            [51.6, 6.4]   // Northeast coordinates
        ];
        
        this.map = L.map('map', {
            center: [51.15, 4.4],  // Meer noordelijk (richting Antwerpen)
            zoom: 9,  // Meer ingezoomd
            maxBounds: belgiumBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 7,
            maxZoom: 18
        });
        
        // Add CartoDB Positron tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 18
        }).addTo(this.map);
        
        // Update markers if we have geocoded projects
        if (this.geocodedProjects && this.geocodedProjects.length > 0) {
            this.updateMapMarkers();
        } else {
            console.warn('No geocoded projects available to display on map');
        }
    }
    
    updateGlobalStats(stats) {
        document.getElementById('total-projects').textContent = stats.total_projects.toLocaleString('nl-BE');
        document.getElementById('budget-2025').textContent = this.formatCurrency(stats.total_budget_2025);
        document.getElementById('budget-2026').textContent = this.formatCurrency(stats.total_budget_2026);
        document.getElementById('budget-2027').textContent = this.formatCurrency(stats.total_budget_2027);
        document.getElementById('total-budget').textContent = this.formatCurrency(stats.total_budget_all);
    }
    
    setupEventListeners() {
        // Search
        document.getElementById('search').addEventListener('input', () => this.applyFilters());
        
        // Filter selects
        document.getElementById('filter-programma').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-entiteit').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-infrastructuur').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-startjaar').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-gemeente').addEventListener('input', () => this.applyFilters());
        
        // Reset filters
        document.getElementById('reset-filters').addEventListener('click', () => this.resetFilters());
        
        // Export CSV
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
        
        // Map controls
        document.getElementById('show-all-map').addEventListener('click', () => {
            this.showFilteredOnMap = false;
            document.getElementById('show-all-map').classList.add('active');
            document.getElementById('show-filtered-map').classList.remove('active');
            if (this.map) {
                this.updateMapMarkers();
            }
        });
        
        document.getElementById('show-filtered-map').addEventListener('click', () => {
            this.showFilteredOnMap = true;
            document.getElementById('show-all-map').classList.remove('active');
            document.getElementById('show-filtered-map').classList.add('active');
            if (this.map) {
                this.updateMapMarkers();
            }
        });
        
        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => this.previousPage());
        document.getElementById('next-page').addEventListener('click', () => this.nextPage());
        document.getElementById('items-per-page').addEventListener('change', (e) => {
            this.itemsPerPage = e.target.value === 'all' ? this.filteredProjects.length : parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable();
        });
        
        // Table sorting
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                if (this.sortColumn === column) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                this.sortData();
                this.renderTable();
                this.updateSortIndicators();
            });
        });
    }
    
    updateMapMarkers() {
        // Check if map is initialized
        if (!this.map) {
            console.warn('Map not initialized yet');
            return;
        }
        
        // Clear existing markers
        if (this.markers) {
            this.map.removeLayer(this.markers);
        }
        
        // Get projects to show
        const projectsToShow = this.showFilteredOnMap 
            ? this.geocodedProjects.filter(p => this.filteredProjects.some(fp => fp.id === p.id))
            : this.geocodedProjects;
        
        console.log(`Updating map with ${projectsToShow.length} projects (filtered: ${this.showFilteredOnMap})`);
        
        // Create marker layer
        this.markers = L.featureGroup();
        
        let markersAdded = 0;
        projectsToShow.forEach(project => {
            if (project.coordinates && project.coordinates.length === 2) {
                const [lat, lon] = project.coordinates;
                
                // Determine color based on start year (volgens Vlaamse overheid kleurenschema)
                let color = '#bababa'; // lichtgrijs for no budget
                if (project.investment_start_year === 2025) color = '#ff4000'; // oranje
                else if (project.investment_start_year === 2026) color = '#3f334d'; // donkergrijs
                else if (project.investment_start_year === 2027) color = '#c1809d'; // roze
                
                // Calculate marker size based on budget
                const totalBudget = (project.budgets?.budget_2025 || 0) + 
                                   (project.budgets?.budget_2026 || 0) + 
                                   (project.budgets?.budget_2027 || 0);
                
                const maxBudget = Math.max(...this.geocodedProjects.map(p => 
                    (p.budgets?.budget_2025 || 0) + (p.budgets?.budget_2026 || 0) + (p.budgets?.budget_2027 || 0)
                ));
                
                const minBudget = Math.min(...this.geocodedProjects
                    .filter(p => ((p.budgets?.budget_2025 || 0) + (p.budgets?.budget_2026 || 0) + (p.budgets?.budget_2027 || 0)) > 0)
                    .map(p => (p.budgets?.budget_2025 || 0) + (p.budgets?.budget_2026 || 0) + (p.budgets?.budget_2027 || 0))
                );
                
                let radius = 6;
                if (totalBudget > 0) {
                    const normalized = (totalBudget - minBudget) / (maxBudget - minBudget);
                    const sqrtScale = Math.sqrt(normalized);
                    radius = 6 + (sqrtScale * 19);  // Min 6px, max 25px
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
                this.markers.addLayer(marker);
                markersAdded++;
            }
        });
        
        console.log(`Added ${markersAdded} markers to map`);
        
        this.markers.addTo(this.map);
        
        // Fit bounds if showing filtered
        if (this.showFilteredOnMap && projectsToShow.length > 0) {
            this.map.fitBounds(this.markers.getBounds(), { padding: [50, 50] });
        }
    }
    
    populateFilters() {
        // Programma's
        const programmas = [...new Set(this.allProjects.map(p => p.programma))].filter(p => p).sort();
        this.populateSelect('filter-programma', programmas);
        
        // Entiteiten
        const entiteiten = [...new Set(this.allProjects.map(p => p.entiteit))].filter(e => e).sort();
        this.populateSelect('filter-entiteit', entiteiten);
        
        // Infrastructuur types
        const infrastructuur = [...new Set(this.allProjects.map(p => p.infrastructuur_type))].filter(i => i).sort();
        this.populateSelect('filter-infrastructuur', infrastructuur);
    }
    
    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }
    
    applyFilters() {
        const search = document.getElementById('search').value.toLowerCase();
        const programma = document.getElementById('filter-programma').value;
        const entiteit = document.getElementById('filter-entiteit').value;
        const infrastructuur = document.getElementById('filter-infrastructuur').value;
        const startjaar = document.getElementById('filter-startjaar').value;
        const gemeente = document.getElementById('filter-gemeente').value.toLowerCase();
        
        this.filteredProjects = this.allProjects.filter(project => {
            // Search filter
            if (search) {
                const searchFields = [
                    project.project_naam,
                    project.deelproject_naam,
                    project.locatie,
                    project.gemeenten,
                    project.entiteit,
                    project.infrastructuur_naam
                ].join(' ').toLowerCase();
                
                if (!searchFields.includes(search)) return false;
            }
            
            // Programma filter
            if (programma && project.programma !== programma) return false;
            
            // Entiteit filter
            if (entiteit && project.entiteit !== entiteit) return false;
            
            // Infrastructuur filter
            if (infrastructuur && project.infrastructuur_type !== infrastructuur) return false;
            
            // Startjaar filter
            if (startjaar) {
                if (startjaar === 'null' && project.start_jaar !== null) return false;
                if (startjaar !== 'null' && project.start_jaar !== parseInt(startjaar)) return false;
            }
            
            // Gemeente filter
            if (gemeente && !project.gemeenten.toLowerCase().includes(gemeente)) return false;
            
            return true;
        });
        
        this.sortData();
        this.currentPage = 1;
        this.updateFilteredStats();
        this.renderTable();
        
        // Update map if showing filtered
        if (this.showFilteredOnMap) {
            this.updateMapMarkers();
        }
    }
    
    sortData() {
        this.filteredProjects.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            // Handle null values
            if (aVal === null) aVal = '';
            if (bVal === null) bVal = '';
            
            // Numeric comparison
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // String comparison
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            
            if (this.sortDirection === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    }
    
    updateSortIndicators() {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
            if (th.dataset.column === this.sortColumn) {
                th.classList.add(this.sortDirection);
            }
        });
    }
    
    updateFilteredStats() {
        const totalBudget = this.filteredProjects.reduce((sum, p) => sum + p.totaal_budget, 0);
        document.getElementById('results-count').textContent = this.filteredProjects.length.toLocaleString('nl-BE');
        document.getElementById('filtered-budget').textContent = this.formatCurrency(totalBudget);
    }
    
    renderTable() {
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = '';
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredProjects.length);
        const pageProjects = this.filteredProjects.slice(start, end);
        
        if (pageProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: #64748b;">Geen projecten gevonden</td></tr>';
            return;
        }
        
        pageProjects.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${project.id}</td>
                <td>
                    <strong>${this.escapeHtml(project.project_naam)}</strong>
                    ${project.deelproject_naam ? '<br><small style="color: #64748b;">' + this.escapeHtml(project.deelproject_naam) + '</small>' : ''}
                </td>
                <td>${this.escapeHtml(project.entiteit)}</td>
                <td>${this.escapeHtml(project.gemeenten) || '<span style="color: #94a3b8;">-</span>'}</td>
                <td>${this.escapeHtml(project.infrastructuur_type)}</td>
                <td class="numeric budget-cell ${project.budget_2025 > 0 ? 'budget-positive' : ''}">${this.formatCurrency(project.budget_2025)}</td>
                <td class="numeric budget-cell ${project.budget_2026 > 0 ? 'budget-positive' : ''}">${this.formatCurrency(project.budget_2026)}</td>
                <td class="numeric budget-cell ${project.budget_2027 > 0 ? 'budget-positive' : ''}">${this.formatCurrency(project.budget_2027)}</td>
                <td class="numeric budget-cell budget-positive"><strong>${this.formatCurrency(project.totaal_budget)}</strong></td>
                <td>${this.getStartYearBadge(project.start_jaar)}</td>
            `;
            tbody.appendChild(row);
        });
        
        this.updatePagination();
    }
    
    getStartYearBadge(year) {
        if (!year) return '<span class="start-year-badge year-null">Geen</span>';
        return `<span class="start-year-badge year-${year}">${year}</span>`;
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredProjects.length / this.itemsPerPage);
        document.getElementById('page-info').textContent = `Pagina ${this.currentPage} van ${totalPages}`;
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === totalPages || totalPages === 0;
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredProjects.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    resetFilters() {
        document.getElementById('search').value = '';
        document.getElementById('filter-programma').value = '';
        document.getElementById('filter-entiteit').value = '';
        document.getElementById('filter-infrastructuur').value = '';
        document.getElementById('filter-startjaar').value = '';
        document.getElementById('filter-gemeente').value = '';
        this.applyFilters();
    }
    
    exportToCSV() {
        const headers = [
            'ID', 'Programma', 'Subprogramma', 'Entiteit', 'Project', 'Deelproject',
            'Locatie', 'Gemeenten', 'Infrastructuur Type', 'Infrastructuur Naam',
            'Werk Type', 'Is Traject', 'Scope', 'Budget 2025', 'Budget 2026',
            'Budget 2027', 'Totaal Budget', 'Startjaar'
        ];
        
        let csv = headers.join(',') + '\n';
        
        this.filteredProjects.forEach(project => {
            const row = [
                project.id,
                this.csvEscape(project.programma),
                this.csvEscape(project.subprogramma),
                this.csvEscape(project.entiteit),
                this.csvEscape(project.project_naam),
                this.csvEscape(project.deelproject_naam),
                this.csvEscape(project.locatie),
                this.csvEscape(project.gemeenten),
                this.csvEscape(project.infrastructuur_type),
                this.csvEscape(project.infrastructuur_naam),
                this.csvEscape(project.werk_type),
                project.is_traject,
                this.csvEscape(project.project_scope),
                project.budget_2025,
                project.budget_2026,
                project.budget_2027,
                project.totaal_budget,
                project.start_jaar || ''
            ];
            csv += row.join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `gip_investeringen_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    csvEscape(value) {
        if (value === null || value === undefined) return '';
        value = String(value);
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
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

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GIPDashboard();
});
