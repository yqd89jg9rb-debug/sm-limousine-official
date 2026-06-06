/* ===================================================================
   SM LIMOUSINE — Elite Booking Engine (v22.7 - FULL FLEET RESTORE)
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const FLEET = [
        { 
            key: 'sedan', 
            name: 'Premium sedan', 
            base: 78, 
            perMile: 4.80, 
            hourly: 95, 
            pax: 3, 
            bag: 2, 
            sub: 'Cadillac XT6 or similar.', 
            img: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' 
        },
        { 
            key: 'suburban', 
            name: 'Executive SUV',   
            base: 102, 
            perMile: 6.00, 
            hourly: 125, 
            pax: 6, 
            bag: 5, 
            sub: 'Chevrolet Suburban or similar.', 
            img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1000&q=80' 
        },
        { 
            key: 'denali',   
            name: 'Premium SUV',   
            base: 114, 
            perMile: 6.60, 
            hourly: 140, 
            pax: 6, 
            bag: 5, 
            sub: 'GMC Denali or similar.', 
            img: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2b8c60feeae7034daea35ae7343d608f10d8f13b1116025c20080796380d9ff7.jpeg' 
        },
        { 
            key: 'elite', 
            name: 'First class',   
            base: 150, 
            perMile: 7.80, 
            hourly: 185, 
            pax: 6, 
            bag: 6, 
            sub: '2026 Cadillac Escalade or similar.', 
            img: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' 
        },
        { 
            key: 'van',   
            name: 'Sprinter van',  
            base: 270, 
            perMile: 12.00, 
            hourly: 225, 
            pax: 14, 
            bag: 10, 
            sub: 'Mercedes Sprinter or similar.', 
            img: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' 
        },
        { 
            key: 'motorcoach', 
            name: 'Motor Coach', 
            base: 600, 
            perMile: 30.00, 
            hourly: 450, 
            pax: 56, 
            bag: 50, 
            sub: 'Premium Charter Bus for large groups.', 
            img: 'https://images.ctfassets.net/youh2ajahg7j/35mg10tqU3HdcQLjD2izW0/b4d2b3658d8ff3d97130177675574a76/buses.webp' 
        }
    ];

    let bookingData = {
        tripType: 'oneway',
        pax: 1,
        luggage: 0,
        addons: [],
        miles: 15,
        selectedVehicle: null,
        total: 0
    };

    // --- STRIPE ---
    let stripe, elements, cardNumber, cardExpiry, cardCvc;
    if (typeof Stripe !== 'undefined') {
        stripe = Stripe('pk_live_51TQZ7FGTeUSAGumaBySxRKK4Nq2LviyICLrkgY4aRJwR2ZEqJucrcftzDt0NP0gzYL4CrZVFulJlMe6q8qIyz7gp00Tg6GQXrd');
        elements = stripe.elements();
        const style = { base: { color: '#fff', fontSize: '16px', '::placeholder': { color: '#666' } } };
        cardNumber = elements.create('cardNumber', {style: style});
        cardExpiry = elements.create('cardExpiry', {style: style});
        cardCvc    = elements.create('cardCvc',    {style: style});
        cardNumber.mount('#card-number');
        cardExpiry.mount('#card-expiry');
        cardCvc.mount('#card-cvc');
    }

    // --- UI UPDATES ---
    window.updateStep = (key, val) => {
        bookingData[key] = Math.max(key === 'pax' ? 1 : 0, bookingData[key] + val);
        document.getElementById(`${key}-val`).innerText = bookingData[key];
    };

    window.toggleAddon = (id) => {
        const el = document.getElementById(id);
        el.classList.toggle('active');
        if (el.classList.contains('active')) {
            bookingData.addons.push(id);
        } else {
            bookingData.addons = bookingData.addons.filter(a => a !== id);
        }
    };

    window.goToStep = (n) => {
        if (n === 2) {
            const p = document.getElementById('pickup-input').value;
            const d = document.getElementById('dropoff-input').value;
            if (!p || !d) { alert("Please enter Pickup and Dropoff locations."); return; }
            renderFleet();
        }
        document.querySelectorAll('.bl-step').forEach(s => s.style.display = 'none');
        document.getElementById(`bl-step-${n}`).style.display = 'block';
        window.scrollTo(0,0);
    };

    function renderFleet() {
        const list = document.getElementById('bl-fleet-list');
        list.innerHTML = FLEET.map(v => {
            let price = v.base + (v.perMile * bookingData.miles);
            if (bookingData.tripType === 'roundtrip') price *= 2;
            if (bookingData.tripType === 'hourly') price = v.hourly * parseInt(document.getElementById('trip-hours').value || 3);
            return `
                <div class="bl-vehicle-card" id="v-${v.key}" onclick="selectVehicle('${v.key}', ${price.toFixed(2)})">
                    <div class="bl-v-content">
                        <div class="bl-v-title">${v.name}</div>
                        <div class="bl-v-sub">${v.sub}</div>
                        <div class="bl-v-price">$${price.toFixed(2)} <span style="font-size:0.8rem; color:#888;">USD</span></div>
                        <div class="bl-v-disclaimer">Price includes taxes & fees</div>
                    </div>
                    <img src="${v.img}" class="bl-v-img">
                    <div class="bl-v-icons">
                        <div class="bl-v-icon-item">👥 ${v.pax}</div>
                        <div class="bl-v-icon-item">💼 ${v.bag}</div>
                    </div>
                    <div class="bl-v-radio"></div>
                </div>`;
        }).join('');
    }

    window.selectVehicle = (key, price) => {
        const v = FLEET.find(x => x.key === key);
        bookingData.selectedVehicle = v;
        bookingData.total = price;
        document.querySelectorAll('.bl-vehicle-card').forEach(c => c.classList.remove('active'));
        const el = document.getElementById(`v-${key}`);
        if(el) el.classList.add('active');
        document.getElementById('bl-continue-btn').style.background = '#5d2b45';
        document.getElementById('summary-v-name').innerText = v.name;
        document.getElementById('summary-total').innerText = `$${price}`;
    };

    document.querySelectorAll('.bl-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.bl-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            bookingData.tripType = tab.dataset.trip;
            document.getElementById('hourly-field').style.display = (tab.dataset.trip === 'hourly') ? 'block' : 'none';
        });
    });

    const overlay = document.getElementById('paymentOverlay');
    const payModalBtn = document.getElementById('pay-modal-submit-btn');
    window.handleFinalReservation = () => {
        const name = document.getElementById('pay-name').value;
        const email = document.getElementById('pay-email').value;
        const phone = document.getElementById('pay-phone').value;
        if(!name || !email || !phone) { alert("Please fill in your contact details."); return; }
        document.getElementById('pay-summary-vehicle').textContent = bookingData.selectedVehicle.name;
        document.getElementById('pay-summary-total').textContent = `$${bookingData.total}`;
        document.getElementById('pay-card-email').value = email;
        document.getElementById('pay-card-name').value = name;
        overlay.style.display = 'flex';
    };

    if (payModalBtn) {
        payModalBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            payModalBtn.disabled = true; payModalBtn.innerText = "Processing...";
            try {
                const {token, error} = await stripe.createToken(cardNumber);
                if (error) throw new Error(error.message);
                const chargeRes = await fetch('/.netlify/functions/create-charge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token.id, amount: bookingData.total, email: document.getElementById('pay-email').value })
                });
                const chargeData = await chargeRes.json();
                if(!chargeData.success) throw new Error("Payment failed.");
                await fetch('/.netlify/functions/dispatch', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        name: document.getElementById('pay-name').value,
                        email: document.getElementById('pay-email').value,
                        clientPhone: document.getElementById('pay-phone').value,
                        vehicle: bookingData.selectedVehicle.name,
                        total: bookingData.total,
                        pickup: document.getElementById('pickup-input').value,
                        dropoff: document.getElementById('dropoff-input').value
                    })
                });
                document.querySelector('.payment-modal__form').style.display = 'none';
                document.getElementById('paymentSuccess').style.display = 'block';
                document.getElementById('confirmationId').innerText = 'STRIPE ID: ' + chargeData.chargeId;
            } catch (err) { alert(err.message); payModalBtn.disabled = false; payModalBtn.innerText = "Pay Now"; }
        });
    }

    function initMaps() {
        const pInput = document.getElementById('pickup-input');
        const dInput = document.getElementById('dropoff-input');
        if (!pInput || !dInput) return;
        const setupAutocomplete = (input) => {
            const autocomplete = new google.maps.places.Autocomplete(input, { componentRestrictions: { country: "us" } });
            autocomplete.addListener('place_changed', () => {
                const p = pInput.value;
                const d = dInput.value;
                if (p && d) {
                    const svc = new google.maps.DistanceMatrixService();
                    svc.getDistanceMatrix({ origins: [p], destinations: [d], travelMode: 'DRIVING', unitSystem: google.maps.UnitSystem.IMPERIAL }, (res, stat) => {
                        if (stat === 'OK' && res.rows[0].elements[0].status === 'OK') {
                            bookingData.miles = res.rows[0].elements[0].distance.value / 1609.34;
                        }
                    });
                }
            });
        };
        setupAutocomplete(pInput);
        setupAutocomplete(dInput);
    }

    if (typeof google !== 'undefined' && google.maps) {
        initMaps();
    } else {
        window.addEventListener('load', initMaps);
    }
});
