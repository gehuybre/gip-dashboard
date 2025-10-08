// Dashboard Integration for Longread
class ProjectDashboard {
    constructor() {
        this.allProjects = [];
        this.filteredProjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.sortColumn = 'id';
        this.sortDirection = 'asc';
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateFilters();
        this.applyFilters();
    }
    
    async loadData() {
        try {
            // Determine path based on environment
            const basePath = window.location.hostname === 'localhost' 
                ? '../dashboard/' 
                : '/gip-dashboard/dashboard/';
            
            const response = await fetch(basePath + 'all_projects.json');
            const data = await response.json();
            this.allProjects = data.projects;
            this.filteredProjects = [...this.allProjects];
        } catch (error) {
            console.error('Error loading project data:', error);
        }
    }
    
    setupEventListeners() {
        // Search
        document.getElementById('search').addEventListener('input', () => this.applyFilters());
        
        // Filters
        document.getElementById('filter-programma').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-entiteit').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-infrastructuur').addEventListener('change', () => this.applyFilters());
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
        // Programma's
        const programmas = [...new Set(this.allProjects.map(p => p.programma).filter(p => p))].sort();
        const programmaSelect = document.getElementById('filter-programma');
        programmas.forEach(prog => {
            const option = document.createElement('option');
            option.value = prog;
            option.textContent = prog;
            programmaSelect.appendChild(option);
        });
        
        // Entiteiten
        const entiteiten = [...new Set(this.allProjects.map(p => p.entiteit).filter(e => e))].sort();
        const entiteitSelect = document.getElementById('filter-entiteit');
        entiteiten.forEach(ent => {
            const option = document.createElement('option');
            option.value = ent;
            option.textContent = ent;
            entiteitSelect.appendChild(option);
        });
        
        // Infrastructuur types
        const infra = [...new Set(this.allProjects.map(p => p.infrastructuur_type).filter(i => i))].sort();
        const infraSelect = document.getElementById('filter-infrastructuur');
        infra.forEach(inf => {
            const option = document.createElement('option');
            option.value = inf;
            option.textContent = inf;
            infraSelect.appendChild(option);
        });
    }
    
    applyFilters() {
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const programma = document.getElementById('filter-programma').value;
        const entiteit = document.getElementById('filter-entiteit').value;
        const infrastructuur = document.getElementById('filter-infrastructuur').value;
        const startjaar = document.getElementById('filter-startjaar').value;
        const gemeente = document.getElementById('filter-gemeente').value.toLowerCase();
        
        this.filteredProjects = this.allProjects.filter(project => {
            const matchesSearch = !searchTerm || 
                project.project_naam.toLowerCase().includes(searchTerm) ||
                project.locatie.toLowerCase().includes(searchTerm) ||
                project.gemeenten.toLowerCase().includes(searchTerm);
            
            const matchesProgramma = !programma || project.programma === programma;
            const matchesEntiteit = !entiteit || project.entiteit === entiteit;
            const matchesInfra = !infrastructuur || project.infrastructuur_type === infrastructuur;
            const matchesStartjaar = !startjaar || 
                (startjaar === 'null' ? !project.start_jaar : project.start_jaar == startjaar);
            const matchesGemeente = !gemeente || project.gemeenten.toLowerCase().includes(gemeente);
            
            return matchesSearch && matchesProgramma && matchesEntiteit && 
                   matchesInfra && matchesStartjaar && matchesGemeente;
        });
        
        this.currentPage = 1;
        this.renderTable();
        this.updateResultsInfo();
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
                <td>${project.id}</td>
                <td>${project.project_naam}</td>
                <td>${project.entiteit}</td>
                <td>${project.gemeenten || '-'}</td>
                <td>${project.infrastructuur_type}</td>
                <td class="numeric">${this.formatCurrency(project.budget_2025)}</td>
                <td class="numeric">${this.formatCurrency(project.budget_2026)}</td>
                <td class="numeric">${this.formatCurrency(project.budget_2027)}</td>
                <td class="numeric"><strong>${this.formatCurrency(project.totaal_budget)}</strong></td>
                <td>${project.start_jaar || '-'}</td>
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
