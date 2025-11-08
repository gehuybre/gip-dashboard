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
            
            console.log('Loading geocoded data from:', basePath);
            
            for (let i = 1; i <= 6; i++) {
                const chunkPath = `${basePath}projects_chunk_0${i}.json`;
                console.log(`Loading chunk ${i}:`, chunkPath);
                const response = await fetch(chunkPath);
                if (!response.ok) {
                    console.warn(`Failed to load chunk ${i}: HTTP ${response.status}`);
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
                let color = '#029453'; // Primary green as default instead of gray
                if (project.investment_start_year === 2025) color = '#029453'; // Primary green
                else if (project.investment_start_year === 2026) color = '#184382'; // Secondary blue
                else if (project.investment_start_year === 2027) color = '#10cfc9'; // Accent cyan
                
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
                    color: '#333', // Dark border for better visibility
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
                    block: 'nearest' // Changed from 'start' to 'nearest' to prevent jumping
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
    
    // Scroll-driven fade-out for complete overview overlay
    const completeOverviewSection = document.getElementById('complete-overview-section');
    const completeOverviewOverlay = document.getElementById('complete-overview-overlay');
    
    if (completeOverviewSection && completeOverviewOverlay) {
        window.addEventListener('scroll', () => {
            const sectionTop = completeOverviewSection.getBoundingClientRect().top;
            const sectionHeight = completeOverviewSection.offsetHeight;
            const windowHeight = window.innerHeight;
            
            // Start fading when section is in view, complete fade when scrolled halfway
            if (sectionTop < windowHeight && sectionTop > -sectionHeight) {
                const scrollProgress = 1 - ((sectionTop + sectionHeight * 0.5) / (windowHeight + sectionHeight * 0.5));
                const fadeProgress = Math.max(0, Math.min(1, scrollProgress * 2));
                
                if (fadeProgress > 0.3) {
                    completeOverviewOverlay.classList.add('fade-out');
                } else {
                    completeOverviewOverlay.classList.remove('fade-out');
                }
            }
        });
    }
});

// Video Autoplay Handler
class VideoAutoplay {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupVideoObserver());
        } else {
            this.setupVideoObserver();
        }
    }

    setupVideoObserver() {
        const videos = document.querySelectorAll('.video-section iframe');
        
        if (!videos.length) return;

        // Try to trigger autoplay with user interaction
        this.enableAutoplayWithInteraction();

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const iframe = entry.target;
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    this.playVideo(iframe);
                } else {
                    this.pauseVideo(iframe);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '0px 0px -100px 0px'
        });

        videos.forEach(video => {
            observer.observe(video);
        });
    }

    enableAutoplayWithInteraction() {
        // Add click/scroll handlers to enable autoplay
        const enableAutoplay = () => {
            const videos = document.querySelectorAll('.video-section iframe');
            videos.forEach(iframe => {
                // Re-set the src to trigger autoplay after user interaction
                const currentSrc = iframe.src;
                if (currentSrc && !currentSrc.includes('autoplay=1')) {
                    iframe.src = currentSrc.replace('autoplay=0', 'autoplay=1');
                }
            });
            
            // Remove listeners after first interaction
            document.removeEventListener('click', enableAutoplay);
            document.removeEventListener('scroll', enableAutoplay);
        };

        document.addEventListener('click', enableAutoplay, { once: true });
        document.addEventListener('scroll', enableAutoplay, { once: true });
    }

    playVideo(iframe) {
        try {
            // For YouTube embeds, we can try to use postMessage API
            iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        } catch (e) {
            console.log('Could not control video playback:', e.message);
        }
    }

    pauseVideo(iframe) {
        try {
            // For YouTube embeds, we can try to use postMessage API
            iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        } catch (e) {
            console.log('Could not control video playback:', e.message);
        }
    }
}

// Store instance globally for debugging
window.longreadMaps = null;
window.videoAutoplay = null;

document.addEventListener('DOMContentLoaded', () => {
    window.longreadMaps = new LongreadMaps();
    window.videoAutoplay = new VideoAutoplay();
});
