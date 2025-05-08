/**
 * AydoCorp Employee Portal Functions
 * Includes carousel, navigation, calendar, and interactive elements
 */

(function($) {
    // Initialize portal functionality
    $(document).ready(function() {
        initPortalNavigation();
        initCarousel();
        initCalendar();
        initRankHover();
        setupPortalUsername();
    });

    /**
     * Portal navigation: tab switching and sub-navigation
     */
    function initPortalNavigation() {
        $('.portal-nav-item').on('click', function(e) {
            e.preventDefault();
            $('.portal-nav-item').removeClass('active');
            $(this).addClass('active');
            const sectionId = $(this).data('section');
            $('.portal-section').hide();
            $(`#${sectionId}-section`).show();
            if ($(`#${sectionId}-section .portal-subsection`).length > 0) {
                $(`#${sectionId}-section .portal-subsection`).hide();
                $(`#${sectionId}-section .portal-subsection:first`).show();
            }
        });

        $('.portal-subnav-item').on('click', function(e) {
            e.preventDefault();
            const parentSection = $(this).closest('li').parent().prev().data('section');
            $(`.portal-subnav-item`).removeClass('active');
            $(this).addClass('active');
            const subsectionId = $(this).data('subsection');
            $(`#${parentSection}-section .portal-subsection`).hide();
            $(`#${subsectionId}-subsection`).show();
        });

        $('.portal-nav-item').each(function() {
            if ($(this).next('.portal-subnav').length > 0) {
                $(this).on('click', function() {
                    $(this).next('.portal-subnav').slideToggle(200);
                });
            }
        });
    }

    /**
     * Image carousel: automatic and manual slideshow
     */
    function initCarousel() {
        let currentSlide = 0;
        const slides = $('.carousel-slide');
        const totalSlides = slides.length;

        slides.hide();
        slides.eq(0).show();

        function showSlide(index) {
            slides.hide();
            slides.eq(index).show();
            currentSlide = index;
        }

        $('.carousel-button.next').on('click', function() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        });

        $('.carousel-button.prev').on('click', function() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            showSlide(currentSlide);
        });

        setInterval(function() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }, 5000);
    }

    /**
     * Calendar: basic display with event highlighting
     */
    function initCalendar() {
        const events = [
            { date: '2023-06-10', title: 'Friday Night Ops', type: 'general' },
            { date: '2023-06-15', title: 'Mining Operation', type: 'empyrion' },
            { date: '2023-06-20', title: 'Cargo Run', type: 'aydoexpress' },
            { date: '2023-06-25', title: 'Training Session', type: 'general' }
        ];

        const calendarEl = $('#events-calendar');
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const calendarHeader = $(`<div class="calendar-header"><h4>${monthNames[currentMonth]} ${currentYear}</h4></div>`);

        const calendarGrid = $('<div class="calendar-grid"></div>');
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayHeader = $('<div class="calendar-days"></div>');

        dayNames.forEach(day => {
            dayHeader.append(`<div class="calendar-day-header">${day}</div>`);
        });

        calendarGrid.append(dayHeader);

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const calendarCells = $('<div class="calendar-cells"></div>');

        for (let i = 0; i < firstDay; i++) {
            calendarCells.append('<div class="calendar-cell empty"></div>');
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayEvents = events.filter(event => event.date === dateStr);

            let cellClass = 'calendar-cell';
            let eventHtml = '';

            if (dayEvents.length > 0) {
                dayEvents.forEach(event => {
                    let eventClass = 'event-indicator';
                    if (event.type === 'general') eventClass += ' event-general';
                    else if (event.type === 'aydoexpress') eventClass += ' event-aydoexpress';
                    else if (event.type === 'empyrion') eventClass += ' event-empyrion';
                    eventHtml += `<div class="${eventClass}" title="${event.title}"></div>`;
                });
                cellClass += ' has-events';
            }

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
        calendarEl.empty().append(calendarHeader).append(calendarGrid);

        $('.expand-calendar-button').on('click', function() {
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

            $('body').append(modal);
            $('#modal-calendar').append(calendarEl.clone());

            $('.calendar-modal-close').on('click', function() {
                modal.remove();
            });

            modal.on('click', function(e) {
                if ($(e.target).hasClass('calendar-modal')) {
                    modal.remove();
                }
            });
        });
    }

    /**
     * Rank hover: display salary information
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
     * Username display: fetch and show username
     */
    function setupPortalUsername() {
        const userJson = sessionStorage.getItem('aydocorpUser');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                if (user && user.username) {
                    $('.username-display').text(user.username);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }

    /**
     * Format dates for display
     */
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

})(jQuery);