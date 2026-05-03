/* ===================================================================
   SM LIMOUSINE — Main Script (Precision Version 4.8)
   Advanced Debug Reporting for Dispatch Engine
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          base: 65,  perMile: 4.00, category: 'Premium sedan',    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    base: 85,  perMile: 5.00, category: 'Premium SUV',      passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/f271bfa5f116a37ac3411b7203dbd0100bb61a10183601a25a88b96482ff917f.jpeg' },
        denali:     { name: 'GMC Denali',            base: 95,  perMile: 5.50, category: 'Premium SUV',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2b8c60feeae7034daea35ae7343d608f10d8f13b1116025c20080796380d9ff7.jpeg' },
        escalade:   { name: 'Cadillac Escalade',    base: 125, perMile: 6.50, category: 'First class',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        maybach:    { name: 'Mercedes-Maybach',     base: 150, perMile: 7.50, category: 'Ultra Luxury',     passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/df430f8d73d1aad459320327e99032c81b2244772710f1d44626a4985eca047d.png' },
        sprinter:   { name: 'Mercedes Sprinter',     base: 185, perMile: 9.00, category: 'Sprinter van',     passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           base: 250, perMile: 15.00, category: 'Motor coach',      passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
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

    document.querySelectorAll('.header__link').forEach(link => {
        link.onclick = () => {
            mainNav.classList.remove('open');
            burgerBtn.classList.remove('open');
        };
    });

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
        const tab = document.querySelector(`[data-tab=\"${name}\"]`);
        if (tab) tab.click();
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    /* --- MODAL LOGIC --- */
    window.openAddonModal = () => document.getElementById('addonOverlay').classList.add('active');
    window.closeAddonModal = () => document.getElementById('addonOverlay').classList.remove('active');
    window.updateCounter = (type, change) => {
        if (type === 'passengers') { passengerCount = Math.max(1, passengerCount + change); document.getElementById('count-passengers').textContent = passengerCount; }
        else { luggageCount = Math.max(0, luggageCount + change); document.getElementById('count-luggage').textContent = luggageCount; }
        syncAddons();
    };
    window.syncAddons = () => {
        const summary = `${passengerCount} People, ${luggageCount} Luggage`;
        ['oneway', 'roundtrip', 'hourly'].forEach(m => { const el = document.getElementById(`people-summary-${m}`); if (el) el.textContent = summary; });
    };

    /* --- GOOGLE AUTOCOMPLETE --- */
    function initAutocomplete() {
        if (typeof google === 'undefined') return;
        const options = { types: ['geocode', 'establishment'], componentRestrictions: { country: \"us\" } };
        const ids = ['pickup-oneway', 'dropoff-oneway', 'pickup-roundtrip', 'dropoff-roundtrip', 'return-pickup-roundtrip', 'return-dropoff-roundtrip', 'pickup-hourly'];
        ids.forEach(id => {
            const input = document.getElementById(id);
            if (input && !input.dataset.acBound) {
                const ac = new google.maps.places.Autocomplete(input, options);
                input.dataset.acBound = \"true\";
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
            submitBtn.disabled = true; submitBtn.textContent = 'Calculating...';
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
            submitBtn.disabled = false; submitBtn.textContent = 'Get a Quote';
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
            if (total < minBase) total = minBase;
            const card = document.createElement('div');
            card.className = 'vs-card';
            card.innerHTML = `<div class="vs-card__info"><div class="vs-card__category">${v.category}</div><div class="vs-card__name">${v.name}</div><div class="vs-card__price">$${total.toFixed(2)} USD</div><div class="vs-card__capacity">👥 ${passengerCount}  💼 ${luggageCount}</div></div><div class="vs-card__right"><img src="${v.image}"></div>`;
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
    }

    async function openPayment(vehicle, total) {
        document.getElementById('pay-vehicle').textContent = vehicle;
        document.getElementById('pay-total').textContent = `$${total.toFixed(2)}`;
        document.getElementById('paymentOverlay').classList.add('active');
        
        setTimeout(() => {
            if (!stripe) {
                stripe = Stripe('pk_live_51TQZ7FGTeUSAGumaBySxRKK4Nq2LviyICLrkgY4aRJwR2ZEqJucrcftzDt0NP0gzYL4CrZVFulJlOe6q8qIyz7gp00Tg6GQXrd');
                elements = stripe.elements();
                const style = { base: { color: '#ffffff', fontSize: '16px', '::placeholder': { color: '#888888' } } };
                cardNumber = elements.create('cardNumber', { style }); cardNumber.mount('#card-number-element');
                cardExpiry = elements.create('cardExpiry', { style }); cardExpiry.mount('#card-expiry-element');
                cardCvc = elements.create('cardCvc', { style }); cardCvc.mount('#card-cvc-element');
            }
        }, 500);
    }

    document.getElementById('payBtn').onclick = async () => {
        const btn = document.getElementById('payBtn');
        const name = document.getElementById('pay-name').value;
        const email = document.getElementById('pay-email').value;
        if (!name || !email) { alert('Please fill in your name and email.'); return; }
        
        btn.disabled = true; btn.textContent = 'Processing Payment...';
        
        const {token, error} = await stripe.createToken(cardNumber);
        if (token) { 
            try {
                const chargeResponse = await fetch('/.netlify/functions/create-charge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token.id,
                        amount: bookingData.total,
                        email: email,
                        description: `SM LIMOUSINE Booking: ${bookingData.vehicle} for ${name}`
                    })
                });
                
                const chargeResult = await chargeResponse.json();

                if (chargeResult.success) {
                    btn.textContent = 'Sending Notifications...';
                    
                    bookingData.name = name;
                    bookingData.email = email;
                    bookingData.chargeId = chargeResult.chargeId;

                    const dispatchRes = await fetch('/.netlify/functions/dispatch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bookingData)
                    });
                    const dispatchResult = await dispatchRes.json();

                    document.getElementById('paymentOverlay').classList.remove('active');
                    showBookingConfirmation(bookingData.vehicle, dispatchResult);
                } else {
                    alert('Payment Failed: ' + chargeResult.error);
                }
            } catch (e) {
                console.error('System error:', e);
                document.getElementById('paymentOverlay').classList.remove('active');
                showBookingConfirmation(bookingData.vehicle, { email_status: 'snag: Network error — 
' + e.message, sms_status: 'unknown', email_debug: { message: e.message } });
            }
        } else {
            alert('Card Error: ' + error.message);
        }
        btn.disabled = false; btn.textContent = 'Book Now';
    };

    function showBookingConfirmation(vehicle, dispatch) {
        const emailOk = dispatch.email_status === 'sent';
        const smsOk = dispatch.sms_status === 'sent';
        const dbg = dispatch.email_debug;

        let html = `
            <div id="confirmOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;">
              <div style="background:#111;border:1px solid #333;border-radius:12px;max-width:520px;width:100%;padding:28px 24px;font-family:Inter,sans-serif;color:#fff;max-height:90vh;overflow-y:auto;">
                <div style="font-size:2rem;text-align:center;margin-bottom:8px;"✅</div>
                <h2 style="text-align:center;font-size:1.2rem;margin:0 0 4px;">Payment Confirmed</h2>
                <p style="text-align:center;color:#aaa;font-size:0.85rem;margin:0 0 20px;">Your <strong style="color:#d4af37">${vehicle}</strong> reservation is confirmed.</p>

                <div style="display:grid;gap:8px;margin-bottom:20px;">
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;background:${emailOk ? '#0d2b0d' : '#2b0d0d'};border:1px solid ${emailOk ? '#1a5c1a' : '#5c1a1a'};">
                    <span style="font-size:1.2rem;">${emailOk ? '📧' : '⚠️'}</span>
                    <div>
                      <div style="font-size:0.8rem;font-weight:600;color:${emailOk ? '#4caf50' : '#f44336'};">Email Alert — ${emailOk ? 'Sent' : 'FAILED'}</div>
                      ${!emailOk && dbg ? `<div style="font-size:0.72rem;color:#e57373;margin-top:3px;word-break:break-all;">${dbg.message || ''}</div>` : ''}
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;background:${smsOk ? '#0d2b0d' : '#2b0d0d'};border:1px solid ${smsOk ? '#1a5c1a' : '#5c1a1a'};">
                    <span style="font-size:1.2rem;">${smsOk ? '📱' : '⚠️'}</span>
                    <div style="font-size:0.8rem;font-weight:600;color:${smsOk ? '#4caf50' : '#f44336'};">SMS Alert — ${smsOk ? 'Sent' : 'FAILED'}</div>
                  </div>
                </div>`;

        if (!emailOk && dbg) {
            const fields = [
                ['Error Code', dbg.code],
                ['SMTP Command', dbg.command],
                ['Response Code', dbg.responseCode],
                ['Server Response', dbg.response],
                ['Stack Trace', dbg.stack]
            ].filter(([, v]) => v);

            if (fields.length > 0) {
                html += `
                <details open style="margin-bottom:16px;">
                  <summary style="cursor:pointer;font-size:0.8rem;color:#f0c040;font-weight:600;margin-bottom:8px;outline:none;"🔍 Debug Details — Why mail.com blocked the connection</summary>
                  <div style="background:#0a0a0a;border:1px solid #333;border-radius:6px;padding:12px;font-size:0.72rem;">`;
                fields.forEach(([label, val]) => {
                    html += `<div style="margin-bottom:6px;"><span style="color:#888;text-transform:uppercase;font-size:0.65rem;letter-spacing:0.05em;">${label}</span><div style="color:#e0e0e0;word-break:break-all;margin-top:2px;">${val}</div></div>`;
                });
                html += `</div></details>`;
            }
        }

        html += `
                <button onclick="document.getElementById('confirmOverlay').remove()" style="width:100%;padding:12px;background:#d4af37;color:#000;border:none;border-radius:8px;font-weight:700;font-size:0.95rem;cursor:pointer;margin-top:4px;">Close</button>
              </div>
            </div>`;

        const el = document.createElement('div');
        el.innerHTML = html;
        document.body.appendChild(el.firstElementChild);
    }

    document.getElementById('paymentClose').onclick = () => document.getElementById('paymentOverlay').classList.remove('active');
    document.getElementById('vsBackBtn').onclick = () => vsOverlay.classList.remove('active');
});
