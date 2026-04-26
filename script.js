/* ===================================================================
   SM LIMOUSINE — Main Script (Production Mode)
   Pricing, Vehicle Selection, Live Estimates & Square Payment Integration
   Google Maps Places Autocomplete & Distance Matrix Integration
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          hourly: 95,  perMile: 4.50, category: 'Premium sedan',    subtitle: 'Cadillac XT6 or similar',                    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    hourly: 100, perMile: 4.50, category: 'Premium SUV',      subtitle: 'Chevrolet Suburban, GMC Denali, or similar',  passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/fd71bfa5f116a37ac3411b7203dbd0100bb61a10183601a25a88b96482ff917f.jpeg' },
        escalade:   { name: 'Cadillac Escalade',    hourly: 125, perMile: 4.50, category: 'First class',      subtitle: 'Cadillac Escalade or similar',                passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        sprinter:   { name: 'Mercedes Sprinter',     hourly: 160, perMile: 4.50, category: 'Sprinter van',     subtitle: 'Mercedes Sprinter or similar',                passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           hourly: 290, perMile: 4.50, category: 'Motor coach',      subtitle: 'Motor Coach',                                passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    const DISTANCE_RATE = 4.50;
    const FIXED_MILES = 20;
    const MIN_HOURS = 3;

    /* --- SQUARE PRODUCTION CONFIG --- */
    const SQUARE_APP_ID = 'sq0idp-cecvvfhW0-GvaKyq34xIfw';
    const SQUARE_LOCATION_ID = 'A71H8PW';

    let squarePayments = null;
    let squareCard = null;
    let squareCardReady = false;

    /* --- TRIP STATE --- */
    let currentTripDetails = null;
    let selectedVehicleKey = null;

    /* --- GOOGLE MAPS — Autocomplete & Distance Matrix --- */
    let distanceMatrixService = null;
    let mapsInitialized = false;

    function initGoogleMaps() {
        if (mapsInitialized || typeof google === 'undefined' || !google.maps || !google.maps.places) return;

        distanceMatrixService = new google.maps.DistanceMatrixService();
        const addressInputs = document.querySelectorAll('input[data-field="pickup"], input[data-field="dropoff"]');

        addressInputs.forEach(input => {
            const autocomplete = new google.maps.places.Autocomplete(input, {
                types: ['geocode', 'establishment'],
                componentRestrictions: { country: 'us' },
                fields: ['formatted_address', 'name']
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') e.preventDefault();
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place && place.formatted_address) {
                    input.value = place.formatted_address;
                }
            });
        });
        mapsInitialized = true;
    }

    function waitForGoogleMaps() {
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            initGoogleMaps();
        } else {
            setTimeout(waitForGoogleMaps, 500);
        }
    }
    waitForGoogleMaps();

    function calculateDistanceWithGoogle(origin, destination) {
        return new Promise((resolve) => {
            if (!distanceMatrixService) return resolve({ miles: FIXED_MILES });

            distanceMatrixService.getDistanceMatrix(
                {
                    origins: [origin],
                    destinations: [destination],
                    travelMode: google.maps.TravelMode.DRIVING,
                    unitSystem: google.maps.UnitSystem.IMPERIAL
                },
                (response, status) => {
                    if (status !== 'OK' || !response.rows[0].elements[0].distance) {
                        return resolve({ miles: FIXED_MILES });
                    }
                    const element = response.rows[0].elements[0];
                    const miles = element.distance.value * 0.000621371;
                    resolve({
                        miles: Math.round(miles * 10) / 10,
                        distanceText: element.distance.text,
                        durationText: element.duration.text
                    });
                }
            );
        });
    }

    /* ---------------------------------------------------------------
       PRICING CALCULATOR
       --------------------------------------------------------------- */
    function calculatePrice(serviceType, vehicleKey, options) {
        if (!vehicleKey || !VEHICLE_RATES[vehicleKey]) return null;
        const vehicle = VEHICLE_RATES[vehicleKey];

        if (serviceType === 'hourly') {
            const hours = Math.max(options.hours || MIN_HOURS, MIN_HOURS);
            return { total: vehicle.hourly * hours, breakdown: `${hours} hrs × $${vehicle.hourly}/hr`, vehicle: vehicle.name };
        }

        const miles = options.miles || FIXED_MILES;
        const multiplier = serviceType === 'roundtrip' ? 2 : 1;
        const total = DISTANCE_RATE * miles * multiplier;
        const label = serviceType === 'roundtrip' ? ' (round trip)' : '';
        
        return {
            total,
            breakdown: `${miles} mi × $${DISTANCE_RATE.toFixed(2)}/mi${label}`,
            vehicle: vehicle.name
        };
    }

    /* --- UI — Tabs & Sticky Header --- */
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => header.classList.toggle('header--scrolled', window.scrollY > 40), { passive: true });

    const burgerBtn = document.getElementById('burgerBtn');
    const mainNav = document.getElementById('mainNav');
    if (burgerBtn && mainNav) {
        burgerBtn.addEventListener('click', () => { burgerBtn.classList.toggle('open'); mainNav.classList.toggle('open'); });
        mainNav.querySelectorAll('.header__link').forEach(link => link.addEventListener('click', () => { burgerBtn.classList.remove('open'); mainNav.classList.remove('open'); }));
    }

    const tabs = document.querySelectorAll('.booking-widget__tab');
    const forms = document.querySelectorAll('.booking-widget__form');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`form-${tab.dataset.tab}`).classList.add('active');
        });
    });

    /* --- SUBMISSION — Step 1 → Step 2 --- */
    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.booking-widget__submit');
            const originalText = submitBtn.textContent;
            
            const serviceType = form.id.replace('form-', '');
            const pickup = form.querySelector('[data-field="pickup"]')?.value;
            const dropoff = form.querySelector('[data-field="dropoff"]')?.value;
            
            const tripDetails = {
                serviceType,
                pickup,
                dropoff,
                date: form.querySelector('[data-field="date"]')?.value,
                time: form.querySelector('[data-field="time"]')?.value,
                hours: parseInt(form.querySelector('[data-field="hours"]')?.value || MIN_HOURS),
                passengers: form.querySelector('[data-field="passengers"]')?.value || '1',
                miles: FIXED_MILES
            };

            if (pickup && dropoff && serviceType !== 'hourly') {
                submitBtn.textContent = 'Calculating...';
                submitBtn.disabled = true;
                const geo = await calculateDistanceWithGoogle(pickup, dropoff);
                tripDetails.miles = geo.miles;
                tripDetails.distanceText = geo.distanceText;
                tripDetails.durationText = geo.durationText;
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }

            currentTripDetails = tripDetails;
            openVehicleSelection(tripDetails);
        });
    });

    /* --- VEHICLE SELECTION — Step 2 --- */
    const vsOverlay = document.getElementById('vsOverlay');
    const vsList = document.getElementById('vsList');
    const vsContinueBtn = document.getElementById('vsContinueBtn');

    function openVehicleSelection(trip) {
        selectedVehicleKey = null;
        vsContinueBtn.disabled = true;
        vsList.innerHTML = '';
        
        ['xt6', 'suburban', 'escalade', 'sprinter', 'motorcoach'].forEach((key, i) => {
            const v = VEHICLE_RATES[key];
            const pricing = calculatePrice(trip.serviceType, key, { miles: trip.miles, hours: trip.hours });
            const card = document.createElement('div');
            card.className = 'vs-card';
            card.innerHTML = `
                <div class="vs-card__info">
                    <div class="vs-card__category">${v.category}</div>
                    <div class="vs-card__subtitle">${v.subtitle}</div>
                    <div class="vs-card__price">$${pricing.total.toLocaleString(undefined, {minimumFractionDigits:2})} <span class="vs-card__price-currency">USD</span></div>
                    <div class="vs-card__price-note">Price includes taxes, tolls & tips</div>
                </div>
                <div class="vs-card__right">
                    <div class="vs-card__right-top">
                        <div class="vs-card__capacity">
                            <div class="vs-card__capacity-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <span>${v.passengers}</span>
                            </div>
                            <div class="vs-card__capacity-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/></svg>
                                <span>${v.suitcases}</span>
                            </div>
                        </div>
                        <div class="vs-card__radio"><div class="vs-card__radio-circle"></div></div>
                    </div>
                    <div class="vs-card__image"><img src="${v.image}" alt="${v.name}"></div>
                </div>`;
            card.addEventListener('click', () => {
                vsList.querySelectorAll('.vs-card').forEach(c => c.classList.remove('vs-card--selected'));
                card.classList.add('vs-card--selected');
                selectedVehicleKey = key;
                vsContinueBtn.disabled = false;
            });
            vsList.appendChild(card);
        });
        vsOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    document.getElementById('vsBackBtn').addEventListener('click', () => { vsOverlay.classList.remove('active'); document.body.style.overflow = ''; });
    vsContinueBtn.addEventListener('click', () => {
        const pricing = calculatePrice(currentTripDetails.serviceType, selectedVehicleKey, { miles: currentTripDetails.miles, hours: currentTripDetails.hours });
        vsOverlay.classList.remove('active');
        openPaymentModal({ service: currentTripDetails.serviceType, vehicle: pricing.vehicle, breakdown: pricing.breakdown, total: pricing.total });
    });

    /* --- SQUARE PAYMENTS --- */
    const overlay = document.getElementById('paymentOverlay');
    const payBtn = document.getElementById('payBtn');
    
    async function initializeSquare() {
        if (squarePayments || typeof Square === 'undefined') return !!squarePayments;
        squarePayments = Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        return true;
    }

    async function attachSquareCard() {
        if (squareCardReady) return;
        await initializeSquare();
        if (!squarePayments) return;
        try {
            squareCard = await squarePayments.card({ style: SQ_ELEMENT_STYLE });
            await squareCard.attach('#sq-card-container');
            squareCardReady = true;
        } catch (e) { 
            console.error('Square error', e);
            const errEl = document.getElementById('sq-card-errors');
            if (errEl) {
                errEl.textContent = 'Payment fields failed to load. Please refresh and ensure your domain is authorized in Square dashboard.';
                errEl.style.display = 'block';
            }
        }
    }

    function openPaymentModal(booking) {
        document.getElementById('pay-service').textContent = booking.service;
        document.getElementById('pay-vehicle').textContent = booking.vehicle;
        document.getElementById('pay-breakdown').textContent = booking.breakdown;
        document.getElementById('pay-total').textContent = `$${booking.total.toFixed(2)}`;
        overlay.classList.add('active');
        setTimeout(attachSquareCard, 300);
    }

    document.getElementById('paymentClose').addEventListener('click', () => overlay.classList.remove('active'));
    document.getElementById('pmBackBtn').addEventListener('click', () => { overlay.classList.remove('active'); vsOverlay.classList.add('active'); });

    payBtn.addEventListener('click', async () => {
        payBtn.textContent = 'Processing...';
        payBtn.disabled = true;
        const result = await squareCard.tokenize();
        if (result.status === 'OK') {
            document.getElementById('confirmationId').textContent = 'SM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            document.getElementById('squareFormContainer').style.display = 'none';
            document.querySelector('.payment-modal__summary').style.display = 'none';
            document.getElementById('paymentSuccess').style.display = 'flex';
        } else {
            payBtn.textContent = 'Book';
            payBtn.disabled = false;
            alert('Payment failed. Please check card details.');
        }
    });

    const SQ_ELEMENT_STYLE = { input: { color: '#ffffff', fontSize: '16px' }, 'input::placeholder': { color: '#888888' } };

    /* --- MIN DATE & REVEAL --- */
    document.querySelectorAll('input[type="date"]').forEach(i => i.setAttribute('min', new Date().toISOString().split('T')[0]));
    const revealElements = document.querySelectorAll('.fleet-card, .service-card, .testimonial-card');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }});
    });
    revealElements.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; el.style.transition = '0.6s ease-out'; observer.observe(el); });
});
