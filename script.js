/* ==========================================================================
   SM LIMOUSINE – Main Script (Precision Version 5.4 - Clean Restoration)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          base: 65,  perMile: 4.00, category: 'Premium sedan',    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    base: 85,  perMile: 5.00, category: 'Premium SUV',      passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2e57c8707998441ada71f30611004c25cdc32bf69297e9741f5ed6747ef63327.png' },
        denali:     { name: 'GMC Denali',            base: 95,  perMile: 5.50, category: 'Premium SUV',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/c535ec35e31ee0dbc9eebf7e8c4ab1f9fb24e6e9c301d8fe7f94f26854d7ec0f.png' },
        escalade:   { name: '2026 Cadillac Escalade',    base: 125, perMile: 6.50, category: 'First class',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        maybach:    { name: 'Mercedes-Maybach',      base: 150, perMile: 7.50, category: 'Ultra Luxury',     passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/df430f8d73d1aad459320327e99032c81b2244772710f1d44626a4985eca047d.png' },
        sprinter:   { name: 'Mercedes Sprinter',     base: 225, perMile: 10.00, category: 'Sprinter van',    passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           base: 500, perMile: 25.00, category: 'Motor coach',      passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    const MIN_HOURS = 3;

    /* --- STATE --- */
    let leg1Miles = 0, leg2Miles = 0, currentTotal = 0;
    let stripe = null, elements = null, cardNumber = null, cardExpiry = null, cardCvc = null;
    let passengerCount = 1, luggageCount = 1;
    let bookingData = {};

    /* --- MOBILE MENU CONTROL --- */
    const burgerBtn = document.getElementById('burgerBtn');
    const mainNav = document.getElementById('mainNav');
    if (burgerBtn) {
        burgerBtn.onclick = () => {
            mainNav.classList.toggle('open');
            burgerBtn.classList.toggle('open');
        };
    }

    /* --- TAB CONTROL --- */
    const tabs = document.querySelectorAll('.booking-widget__tab');
    tabs.forEach(t => t.onclick = () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.querySelectorAll('.booking-widget__form').forEach(f => f.classList.remove('active'));
        document.getElementById('form-' + t.dataset.tab).classList.add('active');
        initAutocomplete();
    });

    window.setBookingTab = (name) => {
        const tab = document.querySelector(`[data-tab="${name}"]`);
        if (tab) tab.click();
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    /* --- MODAL LOGIC --- */
    window.openAddonModal = () => document.getElementById('addon-Overlay').classList.add('active');
    window.closeAddonModal = () => document.getElementById('addon-Overlay').classList.remove('active');
    window.updateCounter = (type, change) => {
        if (type === 'passengers') { passengerCount = Math.max(1, passengerCount + change); document.getElementById('count-passengers').textContent = passengerCount; }
        else { luggageCount = Math.max(0, luggageCount + change); document.getElementById('count-luggage').textContent = luggageCount; }
        syncAddons();
    };
    window.syncAddons = () => {
        const summary = `${passengerCount} People, ${luggageCount} Luggage`;
        ['oneway', 'roundtrip', 'hourly'].forEach(m => {
            const el = document.getElementById(`people-summary-${m}`);
            if (el) el.textContent = summary;
        });
    };

    /* --- GOOGLE AUTOCOMPLETE --- */
    function initAutocomplete() {
        if (typeof google === 'undefined') return;
        const options = { types: ['geocode', 'establishment'], componentRestrictions: { country: "us" } };
        const ids = ['pickup-oneway', 'dropoff-oneway', 'pickup-roundtrip', 'dropoff-roundtrip', 'return-pickup-roundtrip', 'return-dropoff-roundtrip', 'pickup-hourly', 'dropoff-hourly'];
        ids.forEach(id => {
            const input = document.getElementById(id);
            if (input && !input.dataset.acBound) {
                const ac = new google.maps.places.Autocomplete(input, options);
                input.dataset.acBound = "true";
                ac.addListener('place_changed', () => {
                    const mode = id.includes('oneway') ? 'oneway' : (id.includes('roundtrip') ? 'roundtrip' : null);
                    if (mode) refreshDistances(mode);
                });
            }
        });
    }
    if (typeof google !== 'undefined') initAutocomplete();

    async function refreshDistances(mode) {
        const pInput = document.getElementById(`pickup-${mode}`);
        const dInput = document.getElementById(`dropoff-${mode}`);
        if (!pInput || !dInput) return;
        const origin1 = pInput.value;
        const dest1 = dInput.value;
        if (!origin1 || !dest1) return;
        const service = new google.maps.DistanceMatrixService();
        leg1Miles = await getLegMiles(service, origin1, dest1);
        if (mode === 'roundtrip') {
            const origin2 = document.getElementById('return-pickup-roundtrip').value;
            const dest2 = document.getElementById('return-dropoff-roundtrip').value;
            leg2Miles = (origin2 && dest2) ? await getLegMiles(service, origin2, dest2) : leg1Miles;
        }
        updateUI(mode);
    }

    function getLegMiles(service, origin, dest) {
        return new Promise((resolve) => {
            service.getDistanceMatrix({ origins: [origin], destinations: [dest], travelMode: 'DRIVING', unitSystem: google.maps.UnitSystem.IMPERIAL }, (response, status) => {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                    const m = response.rows[0].elements[0].distance.value;
                    resolve(Math.round((m / 1609.34) * 10) / 10);
                } else resolve(0);
            });
        });
    }

    function updateUI(mode) {
        const previewBox = document.getElementById(`preview-${mode}`);
        const distVal = document.getElementById(`dist-val-${mode}`);
        if (!previewBox) return;
        previewBox.style.display = 'block';
        if (mode === 'roundtrip') distVal.innerHTML = `<div style='font-size:0.8rem'>Outbound: ${leg1Miles} mi | Return: ${leg2Miles} mi</div><div>Total: ${(leg1Miles + leg2Miles).toFixed(1)} mi</div>`;
        else distVal.textContent = leg1Miles + ' mi';
    }

    /* --- FORM SUBMISSION --- */
    document.querySelectorAll('.booking-widget__form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.booking-widget__submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Calculating...';
            const type = form.id.replace('form-', '');
            
            bookingData = {
                type: type,
                pickup: document.getElementById(`pickup-${type}`)?.value || 'N/A',
                dropoff: document.getElementById(`dropoff-${type}`)?.value || 'N/A',
                date: form.querySelector('input[type="date"]')?.value || 'N/A',
                time: form.querySelector('input[type="time"]')?.value || 'N/A',
                passengers: passengerCount,
                luggage: luggageCount,
                hours: parseInt(form.querySelector('[data-field="hours"]')?.value || MIN_HOURS)
            };

            await refreshDistances(type);
            openVehicleSelector(type, bookingData.hours);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Get a Quote';
        });
    });

    const vsOverlay = document.getElementById('vsOverlay');
    const vsList = document.getElementById('vsList');
    const vsContinueBtn = document.getElementById('vsContinueBtn');

    function openVehicleSelector(type, hours) {
        vsList.innerHTML = ''; vsContinueBtn.disabled = true;
        const totalMiles = type === 'roundtrip' ? (leg1Miles + leg2Miles) : leg1Miles;
        const finalMiles = totalMiles || 20;
        document.getElementById('vs-distance-summary').textContent = (type !== 'hourly') ? `Total Journey: ${finalMiles.toFixed(1)} miles` : `Duration: ${hours} hours`;

        Object.keys(VEHICLE_RATES).forEach(key => {
            const v = VEHICLE_RATES[key];
            let total = type === 'hourly' ? v.base * hours : (type === 'roundtrip' ? (v.base * 2) + (v.perMile * totalMiles) : v.base + (v.perMile * totalMiles));
            const minBase = 90;
            if (v.name === "Motor Coach" && total < 1200) total = 1200;
            if (total < minBase) total = minBase;
            const card = document.createElement('div');
            card.className = 'vs-card';
            card.innerHTML = `<div class="vs-card__info"><div class="vs-card__category">${v.category}</div><div class="vs-card__name">${v.name}</div><div class="vs-card__price">$${total.toFixed(2)} USD</div><div class="vs-card__capacity">👤 ${passengerCount}  💼 ${luggageCount}</div></div><div class="vs-card__right"><img src="${v.image}"></div>`;
            card.onclick = () => {
                document.querySelectorAll('.vs-card').forEach(c => c.classList.remove('vs-card--selected'));
                card.classList.add('vs-card--selected');
                vsContinueBtn.disabled = false;
                vsContinueBtn.onclick = () => { 
                    vsOverlay.classList.remove('active'); 
                    bookingData.vehicle = v.name;
                    bookingData.total = total.toFixed(2);
                    openPayment(v.name, total);
                };
            };
            vsList.appendChild(card);
        });

        vsOverlay.classList.add('active');
        document.getElementById('vsBackBtn').onclick = () => vsOverlay.classList.remove('active');
    }

    /* --- PAYMENT --- */
    function openPayment(vehicleName, total) {
        currentTotal = total;
        document.getElementById('pay-vehicle').textContent = vehicleName;
        document.getElementById('pay-total').textContent = `$${total.toFixed(2)} USD`;

        const STRIPE_KEY = 'pk_live_51RBmFdAKEb3tUfD6AJYgxHYzuAinKIZ5NHsxS3LNQM7tZDLqkFAPf3fZiV5jjY5sUXE5KHrLLAqfRPxPm5uR3US00bU95Vl5M';
        if (!stripe) {
            stripe = Stripe(STRIPE_KEY);
            elements = stripe.elements();
            const style = { base: { color: '#fff', fontSize: '16px', '::placeholder': { color: '#888' } } };
            cardNumber = elements.create('cardNumber', { style });
            cardExpiry = elements.create('cardExpiry', { style });
            cardCvc    = elements.create('cardCvc',    { style });
            cardNumber.mount('#card-number-element');
            cardExpiry.mount('#card-expiry-element');
            cardCvc.mount('#card-cvc-element');
        } else {
            cardNumber.clear(); cardExpiry.clear(); cardCvc.clear();
        }

        document.getElementById('paymentOverlay').classList.add('active');
        document.getElementById('paymentClose').onclick = () => document.getElementById('paymentOverlay').classList.remove('active');

        document.getElementById('payBtn').onclick = async () => {
            const name  = document.getElementById('pay-name').value.trim();
            const email = document.getElementById('pay-email').value.trim();
            if (!name || !email) { alert('Please fill in your name and email.'); return; }

            const payBtn = document.getElementById('payBtn');
            payBtn.disabled = true; payBtn.textContent = 'Processing...';

            try {
                const res = await fetch('/.netlify/functions/dispatch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, vehicle: bookingData.vehicle, total: currentTotal, booking: bookingData })
                });
                const data = await res.json();

                if (data.clientSecret) {
                    const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
                        payment_method: { card: cardNumber, billing_details: { name, email } }
                    });
                    if (error) { alert('Payment failed: ' + error.message); }
                    else if (paymentIntent.status === 'succeeded') {
                        document.getElementById('paymentOverlay').classList.remove('active');
                        alert(`Booking confirmed! A receipt has been sent to ${email}.`);
                    }
                } else {
                    alert('Server error. Please try again.');
                }
            } catch (err) {
                alert('Network error: ' + err.message);
            } finally {
                payBtn.disabled = false; payBtn.textContent = 'Book Now';
            }
        };
    }
});
