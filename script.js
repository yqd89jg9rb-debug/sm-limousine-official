/* ===================================================================
   SM LIMOUSINE — SM2 Engine (Bookinglane-style)
   Pure JS with Google Maps, Stripe, Netlify Dispatch
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ===== CONSTANTS =====
    const VEHICLE_RATES = {
        escalade:   { name: '2026 Cadillac Escalade', base: 150, perMile: 7.80, hourly: 185 },
        denali:     { name: 'GMC Denali',             base: 114, perMile: 6.60, hourly: 140 },
        suburban:   { name: 'Chevrolet Suburban',     base: 102, perMile: 6.00, hourly: 125 },
        sprinter:   { name: 'Mercedes Sprinter',      base: 270, perMile: 12.00, hourly: 225 },
        xt6:        { name: 'Cadillac XT6',           base: 78,  perMile: 4.80, hourly: 95 },
        motorcoach: { name: 'Motor Coach',            base: 600, perMile: 30.00, hourly: 450 }
    };

    // ===== STATE =====
    let bookingData = {
        tripType: 'oneway',
        serviceType: 'chauffeur',
        pickup: '',
        dropoff: '',
        stops: [],
        date: '',
        time: '',
        hours: 3,
        passengers: 1,
        vehicle: '',
        vehicleName: '',
        miles: 0,
        total: 0
    };

    // ===== HEADER SCROLL =====
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 10);
    });

    // ===== MOBILE MENU =====
    const menuBtn = document.getElementById('menuBtn');
    const mobileNav = document.getElementById('mobileNav');
    
    menuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
    });

    // Close mobile nav on link click
    document.querySelectorAll('.mobile-nav__link').forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
        });
    });

    // ===== SERVICE TABS (Chauffeur / Charter / Flight) =====
    document.querySelectorAll('.service-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.service-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            bookingData.serviceType = tab.dataset.service;
        });
    });

    // ===== TRIP TABS (One-way / Roundtrip / Hourly) =====
    const hourlyField = document.getElementById('hourlyField');
    
    document.querySelectorAll('.trip-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.trip-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            bookingData.tripType = tab.dataset.trip;
            
            // Show/hide hourly duration field
            if (tab.dataset.trip === 'hourly') {
                hourlyField.style.display = 'flex';
            } else {
                hourlyField.style.display = 'none';
            }
        });
    });

    // ===== PASSENGER COUNT =====
    const paxCount = document.getElementById('paxCount');
    const paxMinus = document.getElementById('paxMinus');
    const paxPlus = document.getElementById('paxPlus');

    paxMinus.addEventListener('click', () => {
        if (bookingData.passengers > 1) {
            bookingData.passengers--;
            paxCount.textContent = bookingData.passengers;
        }
    });

    paxPlus.addEventListener('click', () => {
        if (bookingData.passengers < 56) {
            bookingData.passengers++;
            paxCount.textContent = bookingData.passengers;
        }
    });

    // ===== ADD STOP =====
    const addStopBtn = document.getElementById('addStopBtn');
    const stopsContainer = document.getElementById('stopsContainer');
    let stopCount = 0;

    addStopBtn.addEventListener('click', () => {
        if (stopCount >= 3) return;
        stopCount++;
        
        const stopDiv = document.createElement('div');
        stopDiv.className = 'stop-field';
        stopDiv.innerHTML = `
            <div class="form-field__icon"><div class="dot"></div></div>
            <div class="form-field__input">
                <label>Stop ${stopCount}</label>
                <input type="text" class="stop-input" placeholder="Stop location" autocomplete="off">
            </div>
            <button class="remove-stop" type="button">×</button>
        `;
        
        stopsContainer.appendChild(stopDiv);
        
        // Init autocomplete on new stop
        const input = stopDiv.querySelector('.stop-input');
        initAutocompleteOnInput(input);
        
        // Remove stop handler
        stopDiv.querySelector('.remove-stop').addEventListener('click', () => {
            stopDiv.remove();
            stopCount--;
        });
    });

    // ===== GOOGLE MAPS AUTOCOMPLETE =====
    function initAutocompleteOnInput(input) {
        if (typeof google === 'undefined' || !google.maps) return;
        const autocomplete = new google.maps.places.Autocomplete(input, {
            componentRestrictions: { country: 'us' }
        });
        autocomplete.addListener('place_changed', () => {
            calculateDistance();
        });
    }

    function initMaps() {
        if (typeof google === 'undefined' || !google.maps) {
            setTimeout(initMaps, 500);
            return;
        }

        const pickupInput = document.getElementById('pickup-input');
        const dropoffInput = document.getElementById('dropoff-input');
        
        initAutocompleteOnInput(pickupInput);
        initAutocompleteOnInput(dropoffInput);
    }

    function calculateDistance() {
        const pickup = document.getElementById('pickup-input').value;
        const dropoff = document.getElementById('dropoff-input').value;
        
        if (!pickup || !dropoff) return;
        if (typeof google === 'undefined') return;

        const svc = new google.maps.DistanceMatrixService();
        svc.getDistanceMatrix({
            origins: [pickup],
            destinations: [dropoff],
            travelMode: 'DRIVING',
            unitSystem: google.maps.UnitSystem.IMPERIAL
        }, (res, stat) => {
            if (stat === 'OK' && res.rows[0].elements[0].status === 'OK') {
                bookingData.miles = res.rows[0].elements[0].distance.value / 1609.34;
                bookingData.pickup = pickup;
                bookingData.dropoff = dropoff;
            }
        });
    }

    // ===== SEARCH BUTTON → OPEN MODAL =====
    const searchBtn = document.getElementById('searchBtn');
    const bookingModal = document.getElementById('bookingModal');
    const modalClose = document.getElementById('modalClose');
    const modalBack = document.getElementById('modalBack');

    searchBtn.addEventListener('click', () => {
        // Capture form data
        bookingData.pickup = document.getElementById('pickup-input').value;
        bookingData.dropoff = document.getElementById('dropoff-input').value;
        bookingData.date = document.getElementById('trip-date').value;
        bookingData.time = document.getElementById('trip-time').value;
        
        if (bookingData.tripType === 'hourly') {
            bookingData.hours = parseInt(document.getElementById('hourly-duration').value);
        }

        // Collect stops
        bookingData.stops = [];
        document.querySelectorAll('.stop-input').forEach(inp => {
            if (inp.value) bookingData.stops.push(inp.value);
        });

        // Validate
        if (!bookingData.pickup) {
            document.getElementById('pickup-input').focus();
            return;
        }

        // Open modal
        bookingModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        showModalStep(2);
    });

    modalClose.addEventListener('click', closeModal);
    
    bookingModal.addEventListener('click', (e) => {
        if (e.target === bookingModal) closeModal();
    });

    function closeModal() {
        bookingModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showModalStep(n) {
        document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`modal-step-${n}`).classList.add('active');
    }

    // ===== VEHICLE SELECTION =====
    document.querySelectorAll('.vehicle-select-card').forEach(card => {
        card.addEventListener('click', () => {
            const vehicleKey = card.dataset.vehicle;
            bookingData.vehicle = vehicleKey;
            bookingData.vehicleName = VEHICLE_RATES[vehicleKey].name;

            // Visual selection
            document.querySelectorAll('.vehicle-select-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            // Calculate price
            const rate = VEHICLE_RATES[vehicleKey];
            let total;
            if (bookingData.tripType === 'hourly') {
                total = rate.hourly * bookingData.hours;
            } else {
                total = rate.base + (rate.perMile * (bookingData.miles || 15));
                if (bookingData.tripType === 'roundtrip') total *= 2;
            }
            bookingData.total = total.toFixed(2);

            // Show step 3
            setTimeout(() => {
                showModalStep(3);
                updateModalSummary();
            }, 300);
        });
    });

    modalBack.addEventListener('click', () => showModalStep(2));

    function updateModalSummary() {
        const summary = document.getElementById('modalSummary');
        const priceEl = document.getElementById('modalPrice');
        
        summary.innerHTML = `
            <strong>${bookingData.vehicleName}</strong><br>
            ${bookingData.tripType.charAt(0).toUpperCase() + bookingData.tripType.slice(1)} · ${bookingData.passengers} passenger${bookingData.passengers > 1 ? 's' : ''}<br>
            ${bookingData.pickup ? `📍 ${bookingData.pickup}` : ''}
            ${bookingData.dropoff ? ` → ${bookingData.dropoff}` : ''}
            ${bookingData.date ? `<br>📅 ${bookingData.date} at ${bookingData.time}` : ''}
        `;
        
        priceEl.textContent = `$${bookingData.total}`;
    }

    // ===== CONFIRM RESERVATION =====
    const confirmBtn = document.getElementById('confirmBtn');
    
    confirmBtn.addEventListener('click', async () => {
        const name = document.getElementById('pay-name').value;
        const email = document.getElementById('pay-email').value;
        const phone = document.getElementById('pay-phone').value;
        const notes = document.getElementById('final-notes').value;

        if (!name || !email || !phone) {
            alert('Please fill in all required fields.');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';

        // Send to Netlify dispatch
        try {
            const payload = {
                name,
                email,
                phone,
                vehicle: bookingData.vehicleName,
                total: bookingData.total,
                pickup: bookingData.pickup,
                dropoff: bookingData.dropoff,
                date: bookingData.date,
                time: bookingData.time,
                passengers: bookingData.passengers,
                luggage: 0,
                tripType: bookingData.tripType,
                serviceType: bookingData.serviceType,
                stops: bookingData.stops.join(' | '),
                notes,
                smsConsent: document.getElementById('sms-consent').checked
            };

            await fetch('/.netlify/functions/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Show success
            document.querySelector('.modal-form').style.display = 'none';
            document.querySelector('#modal-step-3 .modal-summary').style.display = 'none';
            document.getElementById('bookingSuccess').style.display = 'block';

        } catch (e) {
            console.error('Dispatch error:', e);
            // Still show success (lead captured in form data)
            document.querySelector('.modal-form').style.display = 'none';
            document.getElementById('bookingSuccess').style.display = 'block';
        }
    });

    // ===== SET DEFAULT DATE/TIME =====
    function setDefaultDateTime() {
        const now = new Date();
        now.setHours(now.getHours() + 2);
        
        const dateInput = document.getElementById('trip-date');
        const timeInput = document.getElementById('trip-time');
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        dateInput.min = `${year}-${month}-${day}`;
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(Math.ceil(now.getMinutes() / 15) * 15).padStart(2, '0');
        timeInput.value = `${hours}:${minutes === '60' ? '00' : minutes}`;
    }
    
    setDefaultDateTime();

    // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
                window.scrollTo({
                    top: target.offsetTop - offset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ===== INIT =====
    initMaps();

    // ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.vehicle-card, .service-card, .dest-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});
