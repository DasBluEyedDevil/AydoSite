/**
 * Portal Functions for AydoCorp Employee Portal
 * Created as part of the Employee Portal revamp
 * Includes functions for carousel, navigation, and other interactive elements
 */

(function($) {
    // Initialize portal functionality when document is ready
    $(document).ready(function() {
        initPortalNavigation();
        initCarousel();
        initCalendar();
        initRankHover();
        setupPortalUsername();
    });

    /**
     * Initialize portal navigation
     * Handles tab switching and sub-navigation
     */
    function initPortalNavigation() {
        // Main navigation items
        $('.portal-nav-item').on('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            $('.portal-nav-item').removeClass('active');
            
            // Add active class to clicked item
            $(this).addClass('active');
            
            // Get the section to show
            const sectionId = $(this).data('section');
            
            // Hide all sections
            $('.portal-section').hide();
            
            // Show the selected section
            $(`#${sectionId}-section`).show();
            
            // If this is a section with subsections, show the first subsection
            if ($(`#${sectionId}-section .portal-subsection`).length > 0) {
                $(`#${sectionId}-section .portal-subsection`).hide();
                $(`#${sectionId}-section .portal-subsection:first`).show();
            }
        });
        
        // Sub-navigation items
        $('.portal-subnav-item').on('click', function(e) {
            e.preventDefault();
            
            // Get the parent section
            const parentSection = $(this).closest('li').parent().prev().data('section');
            
            // Remove active class from all subnav items in this section
            $(`.portal-subnav-item`).removeClass('active');
            
            // Add active class to clicked item
            $(this).addClass('active');
            
            // Get the subsection to show
            const subsectionId = $(this).data('subsection');
            
            // Hide all subsections in this section
            $(`#${parentSection}-section .portal-subsection`).hide();
            
            // Show the selected subsection
            $(`#${subsectionId}-subsection`).show();
        });
        
        // Toggle subnav visibility when clicking on nav items with children
        $('.portal-nav-item').each(function() {
            if ($(this).next('.portal-subnav').length > 0) {
                $(this).on('click', function() {
                    $(this).next('.portal-subnav').slideToggle(200);
                });
            }
        });
    }

    /**
     * Initialize image carousel
     * Handles automatic and manual slideshow
     */
    function initCarousel() {
        let currentSlide = 0;
        const slides = $('.carousel-slide');
        const totalSlides = slides.length;
        
        // Hide all slides except the first one
        slides.hide();
        slides.eq(0).show();
        
        // Function to show a specific slide
        function showSlide(index) {
            slides.hide();
            slides.eq(index).show();
            currentSlide = index;
        }
        
        // Next slide button
        $('.carousel-button.next').on('click', function() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        });
        
        // Previous slide button
        $('.carousel-button.prev').on('click', function() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            showSlide(currentSlide);
        });
        
        // Auto-advance slides every 5 seconds
        setInterval(function() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }, 5000);
    }

    /**
     * Initialize calendar functionality
     * Sets up a basic calendar with event highlighting
     */
    function initCalendar() {
        // Sample events data - in a real implementation, this would come from an API
        const events = [
            { date: '2023-06-10', title: 'Friday Night Ops', type: 'general' },
            { date: '2023-06-15', title: 'Mining Operation', type: 'empyrion' },
            { date: '2023-06-20', title: 'Cargo Run', type: 'aydoexpress' },
            { date: '2023-06-25', title: 'Training Session', type: 'general' }
        ];
        
        // Create a simple calendar display
        const calendarEl = $('#events-calendar');
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Create calendar header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const calendarHeader = $(`<div class="calendar-header"><h4>${monthNames[currentMonth]} ${currentYear}</h4></div>`);
        
        // Create calendar grid
        const calendarGrid = $('<div class="calendar-grid"></div>');
        
        // Add day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayHeader = $('<div class="calendar-days"></div>');
        
        dayNames.forEach(day => {
            dayHeader.append(`<div class="calendar-day-header">${day}</div>`);
        });
        
        calendarGrid.append(dayHeader);
        
        // Get the first day of the month
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        
        // Get the number of days in the month
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Create calendar cells
        const calendarCells = $('<div class="calendar-cells"></div>');
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            calendarCells.append('<div class="calendar-cell empty"></div>');
        }
        
        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayEvents = events.filter(event => event.date === dateStr);
            
            let cellClass = 'calendar-cell';
            let eventHtml = '';
            
            if (dayEvents.length > 0) {
                // Add event indicators
                dayEvents.forEach(event => {
                    let eventClass = 'event-indicator';
                    
                    if (event.type === 'general') {
                        eventClass += ' event-general';
                    } else if (event.type === 'aydoexpress') {
                        eventClass += ' event-aydoexpress';
                    } else if (event.type === 'empyrion') {
                        eventClass += ' event-empyrion';
                    }
                    
                    eventHtml += `<div class="${eventClass}" title="${event.title}"></div>`;
                });
                
                cellClass += ' has-events';
            }
            
            // Highlight current day
            if (day === currentDate.getDate() && currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear()) {
                cellClass += ' current-day';
            }
            
            calendarCells.append(`
                <div class="${cellClass}" data-date="${dateStr}">
                    <div class="calendar-day-number">${day}</div>
                    <div class="calendar-events">${eventHtml}</div>
                </div>
            `);
        }
        
        calendarGrid.append(calendarCells);
        
        // Add calendar to the container
        calendarEl.empty().append(calendarHeader).append(calendarGrid);
        
        // Expand calendar button
        $('.expand-calendar-button').on('click', function() {
            // Create a modal with a larger calendar
            const modal = $(`
                <div class="calendar-modal">
                    <div class="calendar-modal-content">
                        <span class="calendar-modal-close">&times;</span>
                        <h3>AydoCorp Events Calendar</h3>
                        <div class="calendar-modal-body">
                            <div class="calendar-legend">
                                <div class="legend-item"><span class="legend-color general"></span> General Events</div>
                                <div class="legend-item"><span class="legend-color aydoexpress"></span> AydoExpress Events</div>
                                <div class="legend-item"><span class="legend-color empyrion"></span> Empyrion Industries Events</div>
                            </div>
                            <div id="modal-calendar"></div>
                            <div class="calendar-events-list">
                                <h4>Upcoming Events</h4>
                                <ul>
                                    ${events.map(event => `
                                        <li class="event-item ${event.type}">
                                            <div class="event-date">${formatDate(event.date)}</div>
                                            <div class="event-title">${event.title}</div>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            // Add modal to body
            $('body').append(modal);
            
            // Clone the calendar to the modal
            $('#modal-calendar').append(calendarEl.clone());
            
            // Close modal when clicking the close button
            $('.calendar-modal-close').on('click', function() {
                modal.remove();
            });
            
            // Close modal when clicking outside the content
            modal.on('click', function(e) {
                if ($(e.target).hasClass('calendar-modal')) {
                    modal.remove();
                }
            });
        });
    }

    /**
     * Initialize rank hover functionality
     * Shows salary information when hovering over ranks
     */
    function initRankHover() {
        $('.rank-item').on('mouseenter', function() {
            const wage = $(this).data('wage');
            const formattedWage = new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'UEC',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(wage);
            
            $(this).attr('title', `Annual Salary: ${formattedWage}`);
        });
    }

    /**
     * Set up username display in the portal
     * Gets the username from session storage and displays it
     */
    function setupPortalUsername() {
        // Get user data from session storage
        const userJson = sessionStorage.getItem('aydocorpUser');
        
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                if (user && user.username) {
                    // Update the username display
                    $('.username-display').text(user.username);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }

    /**
     * Helper function to format dates
     */
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

})(jQuery);