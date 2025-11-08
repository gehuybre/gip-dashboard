// Dashboard Integration for Longread
class ProjectDashboard {
    constructor() {
        this.allProjects = [];
        this.filteredProjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.sortColumn = 'id';
        this.sortDirection = 'asc';
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateFilters();
        this.calculateTopCategories();
        this.applyFilters();
    }
    
    async loadData() {
        try {
            // Determine path based on environment
            // For local: ../dashboard/
            // For GitHub Pages: /gip-dashboard/dashboard/
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '';
            const isGitHubPages = window.location.hostname.includes('github.io');
            
            let basePath;
            if (isLocalhost) {
                basePath = '../dashboard/';
            } else if (isGitHubPages) {
                basePath = '/gip-dashboard/dashboard/';
            } else {
                // Fallback: try relative path first
                basePath = '../dashboard/';
            }
            
            console.log('Loading data from:', basePath + 'all_projects.json');
            const response = await fetch(basePath + 'all_projects.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.allProjects = data.projects;
            this.filteredProjects = [...this.allProjects];
            console.log(`✅ Loaded ${this.allProjects.length} projects`);
        } catch (error) {
            console.error('Error loading project data:', error);
            // Show error message to user
            const container = document.querySelector('.dashboard-section .content-container');
            if (container) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.style.cssText = 'background: #fee; border-left: 4px solid #f00; padding: 1rem; margin: 1rem 0; border-radius: 4px;';
                errorMsg.innerHTML = `<strong>Fout bij laden van data:</strong> ${error.message}<br>Probeer de pagina te verversen.`;
                container.insertBefore(errorMsg, container.firstChild);
            }
        }
    }
    
    setupEventListeners() {
        // Search
        document.getElementById('search').addEventListener('input', () => this.applyFilters());
        
        // Filters
        document.getElementById('filter-programma').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-entiteit').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-startjaar').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-gemeente').addEventListener('input', () => this.applyFilters());
        
        // Reset filters
        document.getElementById('reset-filters').addEventListener('click', () => this.resetFilters());
        
        // Export CSV
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
        
        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => this.changePage(-1));
        document.getElementById('next-page').addEventListener('click', () => this.changePage(1));
        document.getElementById('items-per-page').addEventListener('change', (e) => {
            this.itemsPerPage = e.target.value === 'all' ? this.filteredProjects.length : parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable();
        });
        
        // Table sorting
        document.querySelectorAll('#projects-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                if (this.sortColumn === column) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                this.renderTable();
            });
        });
    }
    
    populateFilters() {
        const programmas = [...new Set(this.allProjects.map(p => p.programma))].filter(p => p).sort();
        const entiteiten = [...new Set(this.allProjects.map(p => p.entiteit))].filter(e => e).sort();
        // Filter out null/undefined/empty values and convert to numbers for proper sorting
        const startjaren = [...new Set(this.allProjects
            .map(p => p.start_jaar)
            .filter(j => j != null && j !== '' && !isNaN(j))
            .map(j => Number(j))
        )].sort((a, b) => a - b);
        
        const programmaSelect = document.getElementById('filter-programma');
        programmas.forEach(prog => {
            const option = document.createElement('option');
            option.value = prog;
            option.textContent = prog;
            programmaSelect.appendChild(option);
        });
        
        const entiteitSelect = document.getElementById('filter-entiteit');
        entiteiten.forEach(ent => {
            const option = document.createElement('option');
            option.value = ent;
            option.textContent = ent;
            entiteitSelect.appendChild(option);
        });
        
        const startjaarSelect = document.getElementById('filter-startjaar');
        startjaren.forEach(jaar => {
            const option = document.createElement('option');
            option.value = jaar;
            option.textContent = jaar;
            startjaarSelect.appendChild(option);
        });
    }
    
    applyFilters() {
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const programma = document.getElementById('filter-programma').value;
        const entiteit = document.getElementById('filter-entiteit').value;
        const startjaar = document.getElementById('filter-startjaar').value;
        const gemeente = document.getElementById('filter-gemeente').value.toLowerCase();
        
        this.filteredProjects = this.allProjects.filter(project => {
            const matchesSearch = !searchTerm || 
                (project.project_naam && project.project_naam.toLowerCase().includes(searchTerm)) ||
                (project.locatie && project.locatie.toLowerCase().includes(searchTerm)) ||
                (project.gemeenten && project.gemeenten.toLowerCase().includes(searchTerm));
            
            const matchesProgramma = !programma || project.programma === programma;
            const matchesEntiteit = !entiteit || project.entiteit === entiteit;
            
            const matchesStartjaar = !startjaar || project.start_jaar == startjaar;
            const matchesGemeente = !gemeente || 
                (project.gemeenten && project.gemeenten.toLowerCase().includes(gemeente));
            
            return matchesSearch && matchesProgramma && matchesEntiteit && 
                   matchesStartjaar && matchesGemeente;
        });
        
        this.currentPage = 1;
        this.renderTable();
        this.updateResultsInfo();
    }
    
    resetFilters() {
        document.getElementById('search').value = '';
        document.getElementById('filter-programma').value = '';
        document.getElementById('filter-entiteit').value = '';
        document.getElementById('filter-startjaar').value = '';
        document.getElementById('filter-gemeente').value = '';
        this.applyFilters();
    }
    
    renderTable() {
        // Sort
        const sorted = [...this.filteredProjects].sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            aVal = String(aVal || '').toLowerCase();
            bVal = String(bVal || '').toLowerCase();
            
            if (this.sortDirection === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return bVal < aVal ? -1 : bVal > aVal ? 1 : 0;
            }
        });
        
        // Paginate
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageProjects = sorted.slice(start, end);
        
        // Render
        const tbody = document.getElementById('table-body');
        tbody.innerHTML = pageProjects.map(project => `
            <tr>
                <td class="col-project">${project.project_naam}</td>
                <td class="col-entiteit">${project.entiteit}</td>
                <td class="col-gemeenten">${project.gemeenten || '-'}</td>
                <td class="col-budget numeric">${this.formatCurrencyShort(project.budget_2025)}</td>
                <td class="col-budget numeric">${this.formatCurrencyShort(project.budget_2026)}</td>
                <td class="col-budget numeric">${this.formatCurrencyShort(project.budget_2027)}</td>
                <td class="col-budget numeric"><strong>${this.formatCurrencyShort(project.totaal_budget)}</strong></td>
                <td class="col-jaar">${project.start_jaar || '-'}</td>
            </tr>
        `).join('');
        
        this.updatePagination();
    }
    
    updateResultsInfo() {
        const totalBudget = this.filteredProjects.reduce((sum, p) => sum + p.totaal_budget, 0);
        document.getElementById('results-count').textContent = this.filteredProjects.length;
        document.getElementById('filtered-budget').textContent = this.formatCurrency(totalBudget);
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredProjects.length / this.itemsPerPage);
        document.getElementById('page-info').textContent = `Pagina ${this.currentPage} van ${totalPages}`;
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === totalPages;
    }
    
    changePage(delta) {
        const totalPages = Math.ceil(this.filteredProjects.length / this.itemsPerPage);
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderTable();
        }
    }
    
    formatCurrency(amount) {
        if (!amount || amount === 0) return '-';
        return '€ ' + amount.toLocaleString('nl-BE', { maximumFractionDigits: 0 });
    }
    
    formatCurrencyShort(amount) {
        if (!amount || amount === 0) return '€0';
        if (amount >= 1000000) {
            return '€' + (amount / 1000000).toFixed(0) + 'M';
        } else if (amount >= 1000) {
            return '€' + (amount / 1000).toFixed(0) + 'K';
        }
        return '€' + amount.toFixed(0);
    }
    
    calculateTopCategories() {
        // Group projects by programma and calculate total budgets
        const programmaStats = {};
        
        this.allProjects.forEach(project => {
            const programma = project.programma || 'Onbekend';
            if (!programmaStats[programma]) {
                programmaStats[programma] = {
                    name: programma,
                    budget_2025: 0,
                    budget_2026: 0,
                    budget_2027: 0,
                    total: 0,
                    count: 0
                };
            }
            
            programmaStats[programma].budget_2025 += project.budget_2025 || 0;
            programmaStats[programma].budget_2026 += project.budget_2026 || 0;
            programmaStats[programma].budget_2027 += project.budget_2027 || 0;
            programmaStats[programma].total += project.totaal_budget || 0;
            programmaStats[programma].count++;
        });
        
        // Convert to array and sort by total budget
        const sortedProgrammas = Object.values(programmaStats)
            .sort((a, b) => b.total - a.total)
            .slice(0, 6); // Get top 6
        
        // Render the top categories
        this.renderTopCategories(sortedProgrammas);
    }
    
    renderTopCategories(categories) {
        const container = document.getElementById('top-categories-grid');
        if (!container) return;
        
        container.innerHTML = categories.map(cat => `
            <div class="category-card">
                <div class="category-header">
                    <h5>${cat.name}</h5>
                    <div class="category-total">${this.formatCurrencyShort(cat.total)}</div>
                </div>
                <div class="category-breakdown">
                    <span class="year-budget">2025: ${this.formatCurrencyShort(cat.budget_2025)}</span>
                    <span class="year-budget">2026: ${this.formatCurrencyShort(cat.budget_2026)}</span>
                    <span class="year-budget">2027: ${this.formatCurrencyShort(cat.budget_2027)}</span>
                </div>
                <div class="category-count">${cat.count} projecten</div>
            </div>
        `).join('');
    }
    
    exportToCSV() {
        const headers = ['ID', 'Project', 'Entiteit', 'Gemeenten', 'Infrastructuur', 
                        'Budget 2025', 'Budget 2026', 'Budget 2027', 'Totaal Budget', 'Startjaar'];
        
        const rows = this.filteredProjects.map(p => [
            p.id,
            `"${p.project_naam}"`,
            `"${p.entiteit}"`,
            `"${p.gemeenten || ''}"`,
            `"${p.infrastructuur_type}"`,
            p.budget_2025,
            p.budget_2026,
            p.budget_2027,
            p.totaal_budget,
            p.start_jaar || ''
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `gip_projecten_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProjectDashboard();
});
