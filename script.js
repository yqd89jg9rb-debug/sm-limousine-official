/* ===================================================================
   SM LIMOUSINE — Main Script (v5.0 — Bulletproof Booking Architecture)
   Critical Fix: Form submission resilience, Google Maps failure handling,
   mobile compatibility, +20% rate markup applied.
   =================================================================== */

(function() {
    'use strict';

    /* --- VEHICLE RATES (Base rates + 20% markup applied at calculation) --- */
    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          base: 78,  perMile: 4.80, category: 'Premium sedan',    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    base: 102,  perMile: 6.00, category: 'Premium SUV',      passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/f271bfa5f116a37ac3411b7203dbd0100bb61a10183601a25a88b96482ff917f.jpeg' },
        denali:     { name: 'GMC Denali',            base: 114,  perMile: 6.60, category: 'Premium SUV',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2b8c60feeae7034daea35ae7343d608f10d8f13b1116025c20080796380d9ff7.jpeg' },
        escalade:   { name: '2026 Cadillac Escalade',    base: 150, perMile: 7.80, category: 'First class',      passengers: '4-7',  suitcases: '3-5',  image: 'hq_fleet.jpeg' },
        maybach:    { name: 'Mercedes-Maybach',     base: 180, perMile: 9.00, category: 'Ultra Luxury',     passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/df430f8d73d1aad459320327e99032c81b2244772710f1d44626a4985eca047d.png' },
        sprinter:   { name: 'Mercedes Sprinter',     base: 270, perMile: 12.00, category: 'Sprinter van',     passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           base: 600, perMile: 30.00, category: 'Motor coach',      passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    const RATE_MARKUP = 1.20; // +20% markup on all calculated rates
    const MIN_HOURS = 3;
    const DISTANCE_TIMEOUT_MS = 5000;
    const DEFAULT_MILES = 20;

    let leg1Miles = 0, leg2Miles = 0;
    let stripe = null, elements = null, cardNumber = null, cardExpiry = null, cardCvc = null;
    let passengerCount = 1, luggageCount = 1;
    let bookingData = {};

    /* --- SAFE DOM REFERENCES --- */
    const vsOverlay = document.getElementById('vsOverlay');
    const vsList = document.getElementById('vsList');
    const vsContinueBtn = document.getElementById('vsContinueBtn');
    const paymentOverlay = document.getElementById('paymentOverlay');

    /* --- TAB SWITCHER (Global) --- */
    window.switchForm = function(mode, btn) {
        document.querySelectorAll('.booking-widget__form').forEach(f => f.classList.remove('active'));
        document.querySelectorAll('.booking-widget__tab').forEach(t => t.classList.remove('active'));
        const targetForm = document.getElementById('form-' + mode);
        if (targetForm) targetForm.classList.add('active');
        if (btn) btn.classList.add('active');
    };

    /* --- GOOGLE MAPS AVAILABILITY CHECK --- */
    function isGoogleMapsReady() {
        return (typeof google !== 'undefined' && 
                typeof google.maps !== 'undefined' && 
                typeof google.maps.places !== 'undefined' &&
                typeof google.maps.DistanceMatrixService !== 'undefined');
    }

    /* --- AUTOCOMPLETE INITIALIZATION --- */
    function initAutocomplete() {
        if (!isGoogleMapsReady()) {
            console.warn('[SM LIMO] Google Maps not ready, retrying in 1s...');
            setTimeout(initAutocomplete, 1000);
            return;
        }
        const options = { types: ['geocode', 'establishment'], componentRestrictions: { country: 'us' } };
        const ids = [
            'pickup-oneway', 'dropoff-oneway', 
            'pickup-roundtrip', 'dropoff-roundtrip', 
            'return-pickup-roundtrip', 'return-dropoff-roundtrip', 
            'pickup-hourly', 'dropoff-hourly'
        ];
        ids.forEach(id => {
            const input = document.getElementById(id);
            if (input && !input.dataset.acBound) {
                try {
                    const ac = new google.maps.places.Autocomplete(input, options);
                    input.dataset.acBound = 'true';
                    // Prevent form submission on Enter when autocomplete dropdown is open
                    input.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            const pacContainer = document.querySelector('.pac-container');
                            if (pacContainer && pacContainer.style.display !== 'none') {
                                e.preventDefault();
                            }
                        }
                    });
                    ac.addListener('place_changed', () => {
                        const mode = id.includes('oneway') ? 'oneway' : (id.includes('roundtrip') ? 'roundtrip' : null);
                        if (mode) refreshDistances(mode).catch(() => {});
                    });
                } catch (err) {
                    console.error('[SM LIMO] Autocomplete init error for', id, err);
                }
            }
        });
        console.log('[SM LIMO] Autocomplete initialized successfully');
    }

    /* --- DISTANCE CALCULATION (with timeout + fallback) --- */
    async function refreshDistances(mode) {
        if (!isGoogleMapsReady()) {
            console.warn('[SM LIMO] Google Maps unavailable — using default distance');
            leg1Miles = DEFAULT_MILES;
            leg2Miles = DEFAULT_MILES;
            return;
        }

        const pInput = document.getElementById('pickup-' + mode);
        const dInput = document.getElementById('dropoff-' + mode);
        if (!pInput || !dInput) return;
        
        const origin1 = pInput.value.trim();
        const dest1 = dInput.value.trim();
        if (!origin1 || !dest1) {
            leg1Miles = DEFAULT_MILES;
            return;
        }

        try {
            const service = new google.maps.DistanceMatrixService();
            leg1Miles = await getLegMiles(service, origin1, dest1);

            if (mode === 'roundtrip') {
                const rPickup = document.getElementById('return-pickup-roundtrip');
                const rDropoff = document.getElementById('return-dropoff-roundtrip');
                const origin2 = rPickup ? rPickup.value.trim() : '';
                const dest2 = rDropoff ? rDropoff.value.trim() : '';
                if (origin2 && dest2) {
                    leg2Miles = await getLegMiles(service, origin2, dest2);
                } else {
                    leg2Miles = leg1Miles; // Mirror the first leg
                }
            }
        } catch (err) {
            console.error('[SM LIMO] Distance calculation failed:', err);
            leg1Miles = leg1Miles || DEFAULT_MILES;
            leg2Miles = leg2Miles || DEFAULT_MILES;
        }
    }

    function getLegMiles(service, origin, dest) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('[SM LIMO] Distance Matrix timeout — using default');
                resolve(DEFAULT_MILES);
            }, DISTANCE_TIMEOUT_MS);

            try {
                service.getDistanceMatrix({
                    origins: [origin],
                    destinations: [dest],
                    travelMode: 'DRIVING',
                    unitSystem: google.maps.UnitSystem.IMPERIAL
                }, (response, status) => {
                    clearTimeout(timeout);
                    if (status === 'OK' && 
                        response && 
                        response.rows && 
                        response.rows[0] && 
                        response.rows[0].elements && 
                        response.rows[0].elements[0] && 
                        response.rows[0].elements[0].status === 'OK') {
                        const meters = response.rows[0].elements[0].distance.value;
                        resolve(Math.round((meters / 1609.34) * 10) / 10);
                    } else {
                        console.warn('[SM LIMO] Distance Matrix status:', status);
                        resolve(DEFAULT_MILES);
                    }
                });
            } catch (e) {
                clearTimeout(timeout);
                console.error('[SM LIMO] Distance Service Error:', e);
                resolve(DEFAULT_MILES);
            }
        });
    }

    /* --- FORM SUBMISSION HANDLER (Bulletproof) --- */
    function attachFormHandlers() {
        const forms = document.querySelectorAll('.booking-widget__form');
        forms.forEach(form => {
            // Remove any previously attached listeners by cloning
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
        });

        // Re-attach to fresh form elements
        document.querySelectorAll('.booking-widget__form').forEach(form => {
            form.addEventListener('submit', handleFormSubmit, { passive: false });
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const form = e.currentTarget;
        const submitBtn = form.querySelector('.booking-widget__submit');
        if (!submitBtn) return;
        
        // Prevent double-submission
        if (submitBtn.dataset.submitting === 'true') return;
        submitBtn.dataset.submitting = 'true';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Calculating...';

        try {
            const type = form.id.replace('form-', '');
            
            bookingData = {
                type: type,
                pickup: (document.getElementById('pickup-' + type) || {}).value || 'N/A',
                dropoff: (document.getElementById('dropoff-' + type) || {}).value || 'N/A',
                date: (form.querySelector('input[type="date"]') || {}).value || 'N/A',
                time: (form.querySelector('input[type="time"]') || {}).value || 'N/A',
                passengers: passengerCount,
                luggage: luggageCount,
                hours: parseInt((form.querySelector('[data-field="hours"]') || {}).value || MIN_HOURS)
            };

            // Distance calculation with absolute timeout safety net
            if (type !== 'hourly') {
                await Promise.race([
                    refreshDistances(type),
                    new Promise(resolve => setTimeout(resolve, DISTANCE_TIMEOUT_MS + 1000))
                ]);
            }

            openVehicleSelector(type, bookingData.hours);
        } catch (err) {
            console.error('[SM LIMO] Form submission error:', err);
            // Still open vehicle selector with defaults on error
            openVehicleSelector(form.id.replace('form-', ''), bookingData.hours || MIN_HOURS);
        } finally {
            // ALWAYS reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = 'Get a Quote';
            submitBtn.dataset.submitting = 'false';
        }
    }

    /* --- VEHICLE SELECTOR --- */
    function openVehicleSelector(type, hours) {
        if (!vsList || !vsOverlay) return;
        
        vsList.innerHTML = '';
        if (vsContinueBtn) vsContinueBtn.disabled = true;

        const totalMiles = type === 'roundtrip' ? (leg1Miles + leg2Miles) : leg1Miles;
        const finalMiles = totalMiles || DEFAULT_MILES;
        
        const summaryEl = document.getElementById('vs-distance-summary');
        if (summaryEl) {
            summaryEl.textContent = (type !== 'hourly') 
                ? 'Total Journey: ' + finalMiles.toFixed(1) + ' miles' 
                : 'Duration: ' + hours + ' hours';
        }

        Object.keys(VEHICLE_RATES).forEach(key => {
            const v = VEHICLE_RATES[key];
            let rawTotal;
            
            if (type === 'hourly') {
                rawTotal = v.base * hours;
            } else if (type === 'roundtrip') {
                rawTotal = (v.base * 2) + (v.perMile * totalMiles);
            } else {
                rawTotal = v.base + (v.perMile * totalMiles);
            }
            
            // Apply +20% rate markup
            let total = rawTotal * RATE_MARKUP;
            
            // Minimums
            const minBase = 108;
            if (v.name === 'Motor Coach' && total < 1440) total = 1440;
            if (total < minBase) total = minBase;

            const card = document.createElement('div');
            card.className = 'vs-card';
            card.setAttribute('data-vehicle', key);
            card.innerHTML = '<div class="vs-card__info">' +
                '<div class="vs-card__category">' + v.category + '</div>' +
                '<div class="vs-card__name">' + v.name + '</div>' +
                '<div class="vs-card__price">$' + total.toFixed(2) + ' USD</div>' +
                '</div>' +
                '<div class="vs-card__right"><img src="' + v.image + '" alt="' + v.name + '"></div>';
            
            card.addEventListener('click', function() {
                document.querySelectorAll('.vs-card').forEach(c => c.classList.remove('vs-card--selected'));
                card.classList.add('vs-card--selected');
                if (vsContinueBtn) {
                    vsContinueBtn.disabled = false;
                    vsContinueBtn.onclick = function() {
                        vsOverlay.classList.remove('active'); document.body.classList.remove('overlay-active');
                        bookingData.vehicle = v.name;
                        bookingData.total = total.toFixed(2);
                        openPayment(v.name, total);
                    };
                }
            });
            
            vsList.appendChild(card);
        });
        
        vsOverlay.classList.add('active');
        document.body.classList.add('overlay-active');
        // Scroll to top of vehicle list
        vsList.scrollTop = 0;
    }

    /* --- PAYMENT OVERLAY --- */
    async function openPayment(vehicle, total) {
        const payVehicleEl = document.getElementById('pay-vehicle');
        const payTotalEl = document.getElementById('pay-total');
        
        if (payVehicleEl) payVehicleEl.textContent = vehicle;
        if (payTotalEl) payTotalEl.textContent = '$' + total.toFixed(2);
        if (paymentOverlay) { paymentOverlay.classList.add('active'); document.body.classList.add('overlay-active'); }

        // Initialize Stripe only once
        if (!stripe) {
            try {
                stripe = Stripe('pk_live_51TQZ7FGTeUSAGumaBySxRKK4Nq2LviyICLrkgY4aRJwR2ZEqJucrcftzDt0NP0gzYL4CrZVFulJlMe6q8qIyz7gp00Tg6GQXrd');
                elements = stripe.elements();
                const style = { base: { color: '#ffffff', fontSize: '16px', '::placeholder': { color: '#888888' } } };
                cardNumber = elements.create('cardNumber', { style });
                cardNumber.mount('#card-number-element');
                cardExpiry = elements.create('cardExpiry', { style });
                cardExpiry.mount('#card-expiry-element');
                cardCvc = elements.create('cardCvc', { style });
                cardCvc.mount('#card-cvc-element');
            } catch (err) {
                console.error('[SM LIMO] Stripe initialization failed:', err);
            }
        }
    }

    /* --- PAYMENT BUTTON HANDLER --- */
    function attachPaymentHandler() {
        const payBtn = document.getElementById('payBtn');
        if (!payBtn) return;
        
        payBtn.addEventListener('click', async function() {
            const name = (document.getElementById('pay-name') || {}).value;
            const email = (document.getElementById('pay-email') || {}).value;
            
            if (!name || !email) {
                alert('Please fill in your name and email.');
                return;
            }
            if (!stripe || !cardNumber) {
                alert('Payment system is loading. Please wait a moment and try again.');
                return;
            }

            payBtn.disabled = true;
            payBtn.textContent = 'Processing...';

            try {
                const {token, error} = await stripe.createToken(cardNumber);
                if (error) {
                    alert('Card Error: ' + error.message);
                    return;
                }
                if (token) {
                    const res = await fetch('/.netlify/functions/create-charge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.id,
                            amount: bookingData.total,
                            email: email,
                            description: 'SM LIMOUSINE Booking: ' + bookingData.vehicle
                        })
                    });
                    const result = await res.json();
                    if (result.success) {
                        bookingData.name = name;
                        bookingData.email = email;
                        // Fire dispatch (non-blocking)
                        fetch('/.netlify/functions/dispatch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(bookingData)
                        }).catch(err => console.error('[SM LIMO] Dispatch error:', err));
                        
                        alert('Booking Successful! A confirmation will be sent to ' + email);
                        if (paymentOverlay) { paymentOverlay.classList.remove('active'); document.body.classList.remove('overlay-active'); }
                    } else {
                        alert('Payment Error: ' + (result.error || 'Unknown error. Please try again.'));
                    }
                }
            } catch (err) {
                console.error('[SM LIMO] Payment processing error:', err);
                alert('An error occurred processing your payment. Please try again.');
            } finally {
                payBtn.disabled = false;
                payBtn.textContent = 'Book Now';
            }
        });
    }

    /* --- CLOSE BUTTONS --- */
    function attachCloseHandlers() {
        const paymentClose = document.getElementById('paymentClose');
        const vsBackBtn = document.getElementById('vsBackBtn');
        
        if (paymentClose) {
            paymentClose.addEventListener('click', function() {
                if (paymentOverlay) { paymentOverlay.classList.remove('active'); document.body.classList.remove('overlay-active'); }
            });
        }
        if (vsBackBtn) {
            vsBackBtn.addEventListener('click', function() {
                if (vsOverlay) { vsOverlay.classList.remove('active'); document.body.classList.remove('overlay-active'); }
            });
        }
        
        // Close overlays on backdrop click (mobile UX improvement)
        if (vsOverlay) {
            vsOverlay.addEventListener('click', function(e) {
                if (e.target === vsOverlay) { vsOverlay.classList.remove('active'); document.body.classList.remove('overlay-active'); }
            });
        }
        if (paymentOverlay) {
            paymentOverlay.addEventListener('click', function(e) {
                if (e.target === paymentOverlay) { paymentOverlay.classList.remove('active'); document.body.classList.remove('overlay-active'); }
            });
        }
    }

    /* --- ADDON MODAL (Global Close) --- */
    window.closeAddonModal = function() {
        const addonOverlay = document.getElementById('addonOverlay');
        if (addonOverlay) addonOverlay.classList.remove('active');
    };

    /* --- INITIALIZATION --- */
    function init() {
        console.log('[SM LIMO] Initializing v5.0 — Bulletproof Booking Architecture');
        initAutocomplete();
        attachFormHandlers();
        attachPaymentHandler();
        attachCloseHandlers();
        console.log('[SM LIMO] All handlers attached successfully');
    }

    // Ensure initialization regardless of document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
