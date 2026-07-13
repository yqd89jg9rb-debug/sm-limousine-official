/* ===================================================================
   SM LIMOUSINE — Master Elite Engine (v27.1 - RECOVERY FIX)
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    let map, directionsService, directionsRenderer;

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          base: 65,  perMile: 4.00, hourly: 72.68, category: 'Premium sedan',    passengers: '2-4',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    base: 85,  perMile: 5.00, hourly: 95.63, category: 'Premium SUV',      passengers: '4-6',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2e57c8707998441ada71f30611004c25cdc32bf69297e9741f5ed6747ef63327.png' },
        denali:     { name: 'GMC Denali',            base: 95,  perMile: 5.50, hourly: 107.10, category: 'Premium SUV',      passengers: '4-7',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/c535ec35e31ee0dbc9eebf7e8c4ab1f9fb24e6e9c301d8fe7f94f26854d7ec0f.png' },
        escalade:   { name: '2026 Cadillac Escalade',    base: 125, perMile: 6.50, hourly: 141.53, category: 'First class',      passengers: '4-7',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        maybach:    { name: 'Mercedes-Maybach',      base: 150, perMile: 7.50, hourly: 180.00, category: 'Ultra Luxury',     passengers: '2-4',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/df430f8d73d1aad459320327e99032c81b2244772710f1d44626a4985eca047d.png' },
        sprinter:   { name: 'Mercedes Sprinter',     base: 225, perMile: 10.00, hourly: 225.00, category: 'Sprinter van',    passengers: '6-14', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           base: 500, perMile: 25.00, hourly: 450.00, category: 'Motor coach',      passengers: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    let bookingData = { serviceType: 'oneway', pax: 1, luggage: 0, miles: 15, total: 0, addons: { 'meet-greet': false, 'child-seat': false } };

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

    window.updateStep = (type, val) => {
        if (type === 'pax') {
            bookingData.pax = Math.max(1, bookingData.pax + val);
            document.getElementById('pax-val').innerText = bookingData.pax;
        } else if (type === 'luggage') {
            bookingData.luggage = Math.max(0, bookingData.luggage + val);
            document.getElementById('luggage-val').innerText = bookingData.luggage;
        }
    };

    window.toggleAddon = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('active');
            bookingData.addons[id] = el.classList.contains('active');
        }
    };

    function calculatePrice(key) {
        const v = VEHICLE_RATES[key];
        let total = 0;
        if (bookingData.serviceType === 'hourly') {
            const hrSelect = document.getElementById('trip-hours');
            const hrs = hrSelect ? parseInt(hrSelect.value) : 3;
            total = v.hourly * hrs;
        } else {
            total = v.base + (v.perMile * (bookingData.miles || 15));
            if (bookingData.serviceType === 'roundtrip') total *= 2;
        }
        if (bookingData.addons['meet-greet']) total += 25;
        if (bookingData.addons['child-seat']) total += 15;
        return total.toFixed(2);
    }

    function renderFleet() {
        const list = document.getElementById('bl-fleet-list');
        if (!list) return;
        list.innerHTML = '';
        Object.keys(VEHICLE_RATES).forEach(key => {
            const v = VEHICLE_RATES[key];
            const price = calculatePrice(key);
            const card = document.createElement('div');
            card.className = 'bl-fleet-card';
            card.onclick = () => {
                document.querySelectorAll('.bl-fleet-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                bookingData.vehicleKey = key;
                bookingData.vehicleName = v.name;
                bookingData.total = price;
            };
            card.innerHTML = `
                <img src="${v.image}" class="bl-fleet-img">
                <div class="bl-fleet-info">
                    <div class="bl-v-header">
                        <div class="bl-v-name">${v.name}</div>
                        <div class="bl-v-price">$${price}</div>
                    </div>
                    <div class="bl-v-meta">${v.category} • UP TO ${v.passengers} PASSENGERS</div>
                    <div class="bl-v-select-btn">Select Vehicle</div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    async function updateDistance() {
        const p = document.getElementById('pickup-input').value;
        const d = document.getElementById('dropoff-input').value;
        if (!p || !d) return false;

        return new Promise((resolve) => {
            if (typeof google === 'undefined' || !google.maps || !directionsService) {
                console.warn('Google Maps unavailable. Falling back to default distance.');
                bookingData.miles = 15;
                return resolve(false);
            }
            directionsService.route({
                origin: p,
                destination: d,
                travelMode: 'DRIVING',
                unitSystem: google.maps.UnitSystem.IMPERIAL
            }, (res, stat) => {
                if (stat === 'OK') {
                    bookingData.miles = res.routes[0].legs[0].distance.value / 1609.34;
                    resolve(true);
                } else { 
                    console.warn('Routing failed:', stat);
                    bookingData.miles = 15;
                    resolve(false); 
                }
            });
        });
    }

    window.goToStep = async (n) => {
        try {
            if (n === 2) {
                const p = document.getElementById('pickup-input').value;
                const d = document.getElementById('dropoff-input').value;
                if (!p || !d) { alert("Please enter Pickup and Dropoff locations."); return; }
                
                const btn = document.querySelector('.bl-confirm-btn');
                const originalText = btn.innerText;
                btn.innerText = "Calculating...";
                btn.disabled = true;

                await updateDistance();
                renderFleet();
                
                btn.innerText = "Confirm Details";
                btn.disabled = false;
                if(document.getElementById('booking-intro')) document.getElementById('booking-intro').style.display = 'none';
            }
            
            document.querySelectorAll('.bl-step').forEach(s => s.style.display = 'none');
            const target = document.getElementById(`bl-step-${n}`);
            if (target) {
                target.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (n === 3) {
                document.getElementById('summary-v-name').innerText = bookingData.vehicleName || '---';
                document.getElementById('summary-total').innerText = '$' + (bookingData.total || '0.00');
            }
        } catch (err) {
            console.error('Booking Engine Error:', err);
            const btn = document.querySelector('.bl-confirm-btn');
            if (btn) {
                btn.innerText = "Confirm Details";
                btn.disabled = false;
            }
            // Fallback: Show fleet anyway
            if (n === 2) {
                renderFleet();
                document.querySelectorAll('.bl-step').forEach(s => s.style.display = 'none');
                document.getElementById('bl-step-2').style.display = 'block';
            }
        }
    };

    function initMaps() {
        if (typeof google === 'undefined' || !google.maps || !google.maps.places) { 
            setTimeout(initMaps, 500); 
            return; 
        }
        directionsService = new google.maps.DirectionsService();
        const inputs = [document.getElementById('pickup-input'), document.getElementById('dropoff-input')];
        inputs.forEach(input => {
            const autocomplete = new google.maps.places.Autocomplete(input, { componentRestrictions: { country: "us" } });
            autocomplete.addListener('place_changed', () => updateDistance());
        });
    }
    initMaps();
});
