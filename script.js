/* ===================================================================
   SM LIMOUSINE — Master Elite Engine (v20.2 - PAYMENT FLOW FIX)
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        escalade:   { name: '2026 Cadillac Escalade', base: 150, perMile: 7.80, hourly: 185 },
        denali:     { name: 'GMC Denali',             base: 114, perMile: 6.60, hourly: 140 },
        suburban:   { name: 'Chevrolet Suburban',     base: 102, perMile: 6.00, hourly: 125 },
        sprinter:   { name: 'Mercedes Sprinter',      base: 270, perMile: 12.00, hourly: 225 },
        xt6:        { name: 'Cadillac XT6',           base: 78,  perMile: 4.80, hourly: 95 },
        motorcoach: { name: 'Motor Coach',            base: 600, perMile: 30.00, hourly: 450 }
    };

    let bookingData = {
        serviceType: 'oneway',
        pax: 1,
        luggage: 0,
        miles: 15,
        total: 0
    };

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
        amountEl.textContent = `$${bookingData.total}`;
    }

    // --- NAVIGATION ---
    window.goToStep = (n) => {
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

        // Populate Payment Modal Summary
        document.getElementById('pay-summary-vehicle').textContent = bookingData.vehicleName;
        document.getElementById('pay-summary-total').textContent = `$${bookingData.total}`;
        
        // Pre-fill Payment Modal Fields
        document.getElementById('pay-card-email').value = email;
        document.getElementById('pay-card-name').value = name;

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
        payModalBtn.addEventListener('click', async () => {
            const cardNum = document.getElementById('pay-card-number').value.trim();
            const cardExpiry = document.getElementById('pay-card-expiry').value.trim();
            const cardCvc = document.getElementById('pay-card-cvc').value.trim();

            if (!cardNum || !cardExpiry || !cardCvc) {
                alert("Please fill all card details.");
                return;
            }

            payModalBtn.disabled = true;
            payModalBtn.innerText = "Processing...";

            try {
                // FIXED DATA MAPPING FOR DISPATCH.JS
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

                // Generate confirmation ID
                const confirmId = 'SM-' + Date.now().toString(36).toUpperCase();
                document.getElementById('confirmationId').textContent = `Confirmation: ${confirmId}`;

                document.querySelector('.payment-modal__form').style.display = 'none';
                document.querySelector('.payment-modal__summary').style.display = 'none';
                document.getElementById('paymentSuccess').style.display = 'flex';
                
            } catch (e) {
                alert("Connection error. Please try again.");
                payModalBtn.disabled = false;
                payModalBtn.innerText = "Pay Now";
            }
        });
    }

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
                        }
                    });
                }
            });
        });
    }

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

    initMaps();
});
