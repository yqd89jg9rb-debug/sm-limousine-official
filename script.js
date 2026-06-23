/* ===================================================================
   SM LIMOUSINE — Master Elite Engine (v22.6 - GLOBAL REPAIR)
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          base: 65,  perMile: 4.00, hourly: 72.68, category: 'Premium sedan',    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    base: 85,  perMile: 5.00, hourly: 95.63, category: 'Premium SUV',      passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2e57c8707998441ada71f30611004c25cdc32bf69297e9741f5ed6747ef63327.png' },
        denali:     { name: 'GMC Denali',            base: 95,  perMile: 5.50, hourly: 107.10, category: 'Premium SUV',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/c535ec35e31ee0dbc9eebf7e8c4ab1f9fb24e6e9c301d8fe7f94f26854d7ec0f.png' },
        escalade:   { name: '2026 Cadillac Escalade',    base: 125, perMile: 6.50, hourly: 141.53, category: 'First class',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        maybach:    { name: 'Mercedes-Maybach',      base: 150, perMile: 7.50, hourly: 180.00, category: 'Ultra Luxury',     passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/df430f8d73d1aad459320327e99032c81b2244772710f1d44626a4985eca047d.png' },
        sprinter:   { name: 'Mercedes Sprinter',     base: 225, perMile: 10.00, hourly: 225.00, category: 'Sprinter van',    passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           base: 500, perMile: 25.00, hourly: 450.00, category: 'Motor coach',      passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    let bookingData = {
        serviceType: 'oneway',
        pax: 1,
        luggage: 0,
        miles: 15,
        total: 0
    };

    // --- STRIPE INITIALIZATION ---
    let stripe, elements, cardNumber, cardExpiry, cardCvc;
    if (typeof Stripe !== 'undefined') {
        stripe = Stripe('pk_live_51TQZ7FGTeUSAGumaBySxRKK4Nq2LviyICLrkgY4aRJwR2ZEqJucrcftzDt0NP0gzYL4CrZVFulJlMe6q8qIyz7gp00Tg6GQXrd');
        elements = stripe.elements();
        const style = {
            base: { color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '16px', '::placeholder': { color: '#666' } },
            invalid: { color: '#fa755a', iconColor: '#fa755a' }
        };
        if(document.getElementById('card-number')) {
            cardNumber = elements.create('cardNumber', {style: style});
            cardExpiry = elements.create('cardExpiry', {style: style});
            cardCvc    = elements.create('cardCvc',    {style: style});
            cardNumber.mount('#card-number');
            cardExpiry.mount('#card-expiry');
            cardCvc.mount('#card-cvc');
        }
    }

    // --- PRICING ENGINE ---
    function updateFinalPrice() {
        const vehicleSelect = document.getElementById('final-vehicle-select');
        const amountEl = document.getElementById('final-price-amount');
        if (!vehicleSelect || !amountEl) return;

        const vehicleKey = vehicleSelect.value;
        if (!vehicleKey) {
            amountEl.textContent = '—';
            return;
        }
        
        const v = VEHICLE_RATES[vehicleKey];
        let total = 0;
        if (bookingData.serviceType === 'hourly') {
            const hrSelect = document.getElementById('trip-hours');
            const hrs = hrSelect ? parseInt(hrSelect.value) : 3;
            total = v.hourly * hrs;
        } else {
            total = v.base + (v.perMile * bookingData.miles);
            if (bookingData.serviceType === 'roundtrip') total *= 2;
        }
        
        bookingData.total = total.toFixed(2);
        bookingData.vehicleName = v.name;
        amountEl.textContent = '$' + bookingData.total;
    }

    // --- NAVIGATION ---
    window.goToStep = (n) => {
        if (n === 2) {
            const p = document.getElementById('pickup-input')?.value;
            const d = document.getElementById('dropoff-input')?.value;
            if (!p || !d) { alert("Please enter Pickup and Dropoff locations."); return; }
        }
        document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`step-${n}`);
        if (target) {
            target.classList.add('active');
            if (n === 3) updateFinalPrice();
        }
    };

    // --- PICKERS ---
    function setupPicker(id, key) {
        const picker = document.getElementById(id);
        if (!picker) return;
        picker.querySelectorAll('.picker-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                picker.querySelectorAll('.picker-opt').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                bookingData[key] = parseInt(opt.dataset.val || opt.innerText);
            });
        });
    }
    setupPicker('pax-picker', 'pax');
    setupPicker('luggage-picker', 'luggage');

    // --- EXTERNAL ACTIONS ---
    window.selectVehicle = (key) => {
        const select = document.getElementById('final-vehicle-select');
        if (select) {
            select.value = key;
            bookingData.vehicleKey = key;
            bookingData.vehicleName = VEHICLE_RATES[key]?.name || '';
            window.goToStep(3);
        }
    };

    window.updateFinalPrice = updateFinalPrice;

    // --- PAYMENT MODAL LOGIC ---
    const overlay = document.getElementById('paymentOverlay');
    const closeBtn = document.getElementById('paymentClose');
    const payModalBtn = document.getElementById('pay-modal-submit-btn');

    window.handleFinalReservation = () => {
        const nameEl = document.getElementById('pay-name');
        const emailEl = document.getElementById('pay-email');
        const phoneEl = document.getElementById('pay-phone');
        const consentEl = document.getElementById('sms-consent');

        const name = nameEl ? nameEl.value.trim() : '';
        const email = emailEl ? emailEl.value.trim() : '';
        const phone = phoneEl ? phoneEl.value.trim() : '';
        const consent = consentEl ? consentEl.checked : false;

        if (!name || !email || !phone) { alert("Please fill all contact fields."); return; }
        if (!consent) { alert("Please agree to receive SMS updates."); return; }

        document.getElementById('pay-summary-vehicle').textContent = bookingData.vehicleName;
        document.getElementById('pay-summary-total').textContent = '$' + bookingData.total;
        
        const modalEmail = document.getElementById('pay-card-email');
        const modalName = document.getElementById('pay-card-name');
        if(modalEmail) modalEmail.value = email;
        if(modalName) modalName.value = name;

        overlay.classList.add('active');
        overlay.style.display = 'flex';
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        });
    }

    if (payModalBtn) {
        payModalBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            payModalBtn.disabled = true;
            payModalBtn.innerText = "Processing...";

            try {
                const {token, error} = await stripe.createToken(cardNumber);
                if (error) throw new Error(error.message);

                const chargeRes = await fetch('/.netlify/functions/create-charge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id,
                        amount: bookingData.total,
                        email: document.getElementById('pay-email').value,
                        description: 'Online Booking: ' + bookingData.vehicleName
                    })
                });
                const chargeData = await chargeRes.json();
                if(!chargeData.success) throw new Error(chargeData.error || "Charge failed");

                const payload = {
                    name: document.getElementById('pay-name').value.trim(),
                    email: document.getElementById('pay-email').value.trim(),
                    clientPhone: document.getElementById('pay-phone').value.trim(),
                    vehicle: bookingData.vehicleName,
                    total: bookingData.total,
                    pickup: document.getElementById('pickup-input')?.value || '',
                    dropoff: document.getElementById('dropoff-input')?.value || '',
                    date: document.getElementById('trip-date')?.value || '',
                    time: document.getElementById('trip-time')?.value || '',
                    passengers: bookingData.pax,
                    luggage: bookingData.luggage,
                    notes: document.getElementById('final-notes')?.value || ''
                };

                await fetch('/.netlify/functions/dispatch', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                const confirmId = 'SM-' + Date.now().toString(36).toUpperCase();
                document.getElementById('confirmationId').textContent = 'Confirmation: ' + confirmId;

                document.querySelector('.payment-modal__form').style.display = 'none';
                document.querySelector('.payment-modal__summary').style.display = 'none';
                document.getElementById('paymentSuccess').style.display = 'flex';
                
            } catch (err) {
                alert("Payment Error: " + err.message);
                payModalBtn.disabled = false;
                payModalBtn.innerText = "Pay Now";
            }
        });
    }

    // --- TABS LOGIC ---
    document.querySelectorAll('.trip-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.trip-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            bookingData.serviceType = tab.dataset.trip;
            const hField = document.getElementById('hourly-field');
            if (hField) hField.style.display = (tab.dataset.trip === 'hourly') ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.service-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.service-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.innerText.includes('Charter')) {
                const charter = document.getElementById('charter-section');
                if (charter) charter.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- VIEW / SCROLL ---
    window.viewAction = (tab) => {
        if (tab === 'Charter bus') {
            const charter = document.getElementById('charter-section');
            if (charter) charter.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (tab) {
            const tabBtn = document.querySelector(`.trip-tab[data-trip="${tab}"]`);
            if (tabBtn) tabBtn.click();
        }
        const booking = document.getElementById('booking');
        if (booking) booking.scrollIntoView({ behavior: 'smooth' });
    };

    // --- GOOGLE MAPS ---
    function initMaps() {
        if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
            setTimeout(initMaps, 500); return;
        }
        const inputs = document.querySelectorAll('input[data-field="pickup"], input[data-field="dropoff"]');
        inputs.forEach(input => {
            const autocomplete = new google.maps.places.Autocomplete(input, { componentRestrictions: { country: "us" } });
            autocomplete.addListener('place_changed', () => {
                const p = document.getElementById('pickup-input')?.value;
                const d = document.getElementById('dropoff-input')?.value;
                if (p && d) {
                    const svc = new google.maps.DistanceMatrixService();
                    svc.getDistanceMatrix({ origins: [p], destinations: [d], travelMode: 'DRIVING', unitSystem: google.maps.UnitSystem.IMPERIAL }, (res, stat) => {
                        if (stat === 'OK' && res.rows[0].elements[0].status === 'OK') {
                            bookingData.miles = res.rows[0].elements[0].distance.value / 1609.34;
                            updateFinalPrice();
                        }
                    });
                }
            });
        });
    }

    initMaps();
});
