/* ===================================================================
   SM LIMOUSINE — Main Script (Absolute Stability Version)
   Genuinely Google-Free | Active Stripe Fields | Instant Booking Flow
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

    /* --- STRIPE LIVE CONFIG --- */
    const STRIPE_PUBLISHABLE_KEY = 'pk_live_51IbYKJDTuAQjzxkZ1N0ux67FkazoNNnIBETCNDKY4ZGNPgvvhLQ6uUjllR00Hx6974pr4g0x7PJH0UCMJo5UFiQW008pn1ZBYX';
    let stripe = null;
    let elements = null;
    let cardNumberElement = null;
    let cardExpiryElement = null;
    let cardCvcElement = null;

    /* --- TRIP STATE --- */
    let currentTripDetails = null;
    let selectedVehicleKey = null;

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

        const miles = FIXED_MILES;
        const multiplier = serviceType === 'roundtrip' ? 2 : 1;
        const total = DISTANCE_RATE * miles * multiplier;
        const label = serviceType === 'roundtrip' ? ' (round trip)' : '';
        
        return {
            total,
            breakdown: `${miles} mi × $${DISTANCE_RATE.toFixed(2)}/mi${label}`,
            vehicle: vehicle.name
        };
    }

    /* --- UI — Tabs & Header --- */
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => header.classList.toggle('header--scrolled', window.scrollY > 40), { passive: true });

    const burgerBtn = document.getElementById('burgerBtn');
    const mainNav = document.getElementById('mainNav');
    if (burgerBtn && mainNav) {
        burgerBtn.addEventListener('click', () => { burgerBtn.classList.toggle('open'); mainNav.classList.toggle('open'); });
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

    /* --- SUBMISSION — Step 1 → Step 2 (NO GOOGLE CALLS) --- */
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const serviceType = form.id.replace('form-', '');
            
            currentTripDetails = {
                serviceType,
                pickup: form.querySelector('[data-field="pickup"]')?.value,
                dropoff: form.querySelector('[data-field="dropoff"]')?.value,
                date: form.querySelector('[data-field="date"]')?.value,
                time: form.querySelector('[data-field="time"]')?.value,
                hours: parseInt(form.querySelector('[data-field="hours"]')?.value || MIN_HOURS),
                passengers: form.querySelector('[data-field="passengers"]')?.value || '1',
                miles: FIXED_MILES
            };

            openVehicleSelection(currentTripDetails);
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
        
        Object.keys(VEHICLE_RATES).forEach((key) => {
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
                            <div class="vs-card__capacity-item">👥 ${v.passengers}</div>
                            <div class="vs-card__capacity-item">💼 ${v.suitcases}</div>
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

    /* --- STRIPE PAYMENTS --- */
    const overlay = document.getElementById('paymentOverlay');
    const payBtn = document.getElementById('payBtn');
    
    async function initStripe() {
        if (typeof Stripe === 'undefined') return;
        if (!stripe) {
            stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
            elements = stripe.elements();
            
            const elementStyle = {
                base: {
                    color: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    '::placeholder': { color: '#888888' }
                }
            };

            cardNumberElement = elements.create('cardNumber', { style: elementStyle });
            cardNumberElement.mount('#sq-card-number');

            cardExpiryElement = elements.create('cardExpiry', { style: elementStyle });
            cardExpiryElement.mount('#sq-expiration-date');

            cardCvcElement = elements.create('cardCvc', { style: elementStyle });
            cardCvcElement.mount('#sq-cvv');
        }
    }

    function openPaymentModal(booking) {
        document.getElementById('pay-service').textContent = booking.service;
        document.getElementById('pay-vehicle').textContent = booking.vehicle;
        document.getElementById('pay-breakdown').textContent = booking.breakdown;
        document.getElementById('pay-total').textContent = `$${booking.total.toFixed(2)}`;
        overlay.classList.add('active');
        setTimeout(initStripe, 300);
    }

    document.getElementById('paymentClose').addEventListener('click', () => overlay.classList.remove('active'));
    document.getElementById('pmBackBtn').addEventListener('click', () => { overlay.classList.remove('active'); vsOverlay.classList.add('active'); });

    payBtn.addEventListener('click', async () => {
        const btnText = document.getElementById('payBtnText');
        btnText.textContent = 'Processing...';
        payBtn.disabled = true;
        
        const {token, error} = await stripe.createToken(cardNumberElement);
        
        if (token) {
            document.getElementById('confirmationId').textContent = 'SM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            document.getElementById('squareFormContainer').style.display = 'none';
            document.querySelector('.payment-modal__summary').style.display = 'none';
            document.getElementById('paymentSuccess').style.display = 'flex';
        } else {
            btnText.textContent = 'Book';
            payBtn.disabled = false;
            alert('Payment error: ' + error.message);
        }
    });
});
