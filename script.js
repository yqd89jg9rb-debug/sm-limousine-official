/* ===================================================================
   SM LIMOUSINE — Main Script (Precision Version 2.8)
   Competitive Market Pricing (Base + Distance Logic)
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          base: 65,  perMile: 4.00, category: 'Premium sedan',    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    base: 85,  perMile: 5.00, category: 'Premium SUV',      passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/fd71bfa5f116a37ac3411b7203dbd0100bb61a10183601a25a88b96482ff917f.jpeg' },
        denali:     { name: 'GMC Denali',            base: 95,  perMile: 5.50, category: 'Premium SUV',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2b8c60feeae7034daea35ae7343d608f10d8f13b1116025c20080796380d9ff7.jpeg' },
        escalade:   { name: 'Cadillac Escalade',    base: 125, perMile: 6.50, category: 'First class',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        sprinter:   { name: 'Mercedes Sprinter',     base: 185, perMile: 9.00, category: 'Sprinter van',     passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           base: 250, perMile: 15.00, category: 'Motor coach',      passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    const MIN_HOURS = 3;
    const DISCOUNT_CODES = {
        'SMLIMO10': 0.10, // 10% off
        'VIP20': 0.20,    // 20% off
        'SMLIMO30': 0.30, // 30% off
        'WELCOME': 5.00   // $5.00 off
    };

    /* --- STATE --- */
    let leg1Miles = 0;
    let leg2Miles = 0;
    let currentTotal = 0;
    let activeDiscount = 0;
    let stripe, elements, cardNumber, cardExpiry, cardCvc;

    /* --- GOOGLE PLACES SETUP --- */
    function initAutocomplete() {
        if (typeof google === 'undefined') return;
        const options = { types: ['geocode', 'establishment'], componentRestrictions: { country: "us" } };
        const ids = [
            'pickup-oneway', 'dropoff-oneway', 
            'pickup-roundtrip', 'dropoff-roundtrip', 
            'return-pickup-roundtrip', 'return-dropoff-roundtrip', 
            'pickup-hourly'
        ];

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
        const origin1 = document.getElementById(`pickup-${mode}`).value;
        const dest1 = document.getElementById(`dropoff-${mode}`).value;
        
        if (!origin1 || !dest1) return;

        const service = new google.maps.DistanceMatrixService();
        
        // Calculate Leg 1
        leg1Miles = await getLegMiles(service, origin1, dest1);

        if (mode === 'roundtrip') {
            const origin2 = document.getElementById('return-pickup-roundtrip').value;
            const dest2 = document.getElementById('return-dropoff-roundtrip').value;
            
            if (origin2 && dest2) {
                leg2Miles = await getLegMiles(service, origin2, dest2);
            } else {
                leg2Miles = leg1Miles; // Fallback: Default return leg to same as outbound
            }
        }

        updateUI(mode);
    }

    function getLegMiles(service, origin, dest) {
        return new Promise((resolve) => {
            service.getDistanceMatrix({
                origins: [origin], destinations: [dest], 
                travelMode: 'DRIVING', unitSystem: google.maps.UnitSystem.IMPERIAL
            }, (response, status) => {
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
        if (mode === 'roundtrip') {
            const total = leg1Miles + leg2Miles;
            distVal.innerHTML = `<div style='font-size:0.8rem'>Outbound: ${leg1Miles} mi | Return: ${leg2Miles} mi</div><div>Total: ${total.toFixed(1)} mi</div>`;
        } else {
            distVal.textContent = leg1Miles + ' mi';
        }
    }

    /* --- FORM SUBMISSION --- */
    document.querySelectorAll('.booking-widget__form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.booking-widget__submit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Calculating...';

            const type = form.id.replace('form-', '');
            const hours = parseInt(form.querySelector('[data-field="hours"]')?.value || MIN_HOURS);
            
            await refreshDistances(type);
            openVehicleSelector(type, hours);

            submitBtn.disabled = false;
            submitBtn.textContent = 'Get a Quote';
        });
    });

    function openVehicleSelector(type, hours) {
        vsList.innerHTML = '';
        vsContinueBtn.disabled = true;
        
        const totalMiles = type === 'roundtrip' ? (leg1Miles + leg2Miles) : leg1Miles;
        const finalMiles = totalMiles || 20;

        document.getElementById('vs-distance-summary').textContent = (type !== 'hourly') ? `Total Journey: ${finalMiles.toFixed(1)} miles` : `Duration: ${hours} hours`;

        Object.keys(VEHICLE_RATES).forEach(key => {
            const v = VEHICLE_RATES[key];
            let total = 0;

            if (type === 'hourly') {
                total = v.hourly * hours;
            } else if (type === 'roundtrip') {
                total = (v.base * 2) + (v.perMile * totalMiles);
            } else {
                total = v.base + (v.perMile * totalMiles);
            }

            const card = document.createElement('div');
            card.className = 'vs-card';
            card.innerHTML = `
                <div class="vs-card__info">
                    <div class="vs-card__category">${v.category}</div>
                    <div class="vs-card__name">${v.name}</div>
                    <div class="vs-card__price">$${total.toFixed(2)} USD</div>
                    <div class="vs-card__capacity">👥 ${v.passengers}  💼 ${v.suitcases}</div>
                </div>
                <div class="vs-card__right"><img src="${v.image}"></div>`;
            
            card.onclick = () => {
                document.querySelectorAll('.vs-card').forEach(c => c.classList.remove('vs-card--selected'));
                card.classList.add('vs-card--selected');
                vsContinueBtn.disabled = false;
                vsContinueBtn.onclick = () => {
                    vsOverlay.classList.remove('active');
                    currentTotal = total;
                    activeDiscount = 0;
                    openPayment(v.name, total);
                };
            };
            vsList.appendChild(card);
        });
        vsOverlay.classList.add('active');
    }

    /* --- STRIPE --- */
    async function openPayment(vehicle, total) {
        document.getElementById('pay-vehicle').textContent = vehicle;
        document.getElementById('pay-total').textContent = `$${total.toFixed(2)}`;
        document.getElementById('discount-display').style.display = 'none';
        document.getElementById('discount-input').value = '';
        document.getElementById('paymentOverlay').classList.add('active');

        setTimeout(() => {
            if (!stripe) {
                stripe = Stripe('pk_live_51IbYKJDTuAQjzzxkZ1M0ux67FkazoNNlIBETCNDKY4ZGNPyvvhLQ6uUjmllR00Hx6974pr4g0x7PJH0UCMJo5UFiQW008pn1ZBYX');
                elements = stripe.elements();
                const style = { base: { color: '#ffffff', fontSize: '16px' } };
                cardNumber = elements.create('cardNumber', { style });
                cardNumber.mount('#card-number-element');
                cardExpiry = elements.create('cardExpiry', { style });
                cardExpiry.mount('#card-expiry-element');
                cardCvc = elements.create('cardCvc', { style });
                cardCvc.mount('#card-cvc-element');
            }
        }, 500);
    }

    // DISCOUNT LOGIC
    document.getElementById('apply-discount-btn').onclick = () => {
        const code = document.getElementById('discount-input').value.toUpperCase().trim();
        const display = document.getElementById('discount-display');
        const totalEl = document.getElementById('pay-total');

        if (DISCOUNT_CODES[code]) {
            const discount = DISCOUNT_CODES[code];
            let newTotal = currentTotal;
            
            if (discount <= 1) {
                // Percentage
                newTotal = currentTotal * (1 - discount);
                display.textContent = `Discount Applied: ${(discount * 100)}% Off!`;
            } else {
                // Flat Amount
                newTotal = currentTotal - discount;
                display.textContent = `Discount Applied: $${discount.toFixed(2)} Off!`;
            }

            if (newTotal < 0) newTotal = 0;
            totalEl.textContent = `$${newTotal.toFixed(2)}`;
            display.style.display = 'block';
            activeDiscount = discount;
            alert('Discount Code Applied Successfully!');
        } else {
            alert('Invalid Discount Code. Please check and try again.');
            display.style.display = 'none';
            totalEl.textContent = `$${currentTotal.toFixed(2)}`;
        }
    };

    document.getElementById('payBtn').onclick = async () => {
        const btn = document.getElementById('payBtn');
        btn.disabled = true;
        btn.textContent = 'Authorizing...';
        const {token, error} = await stripe.createToken(cardNumber);
        if (token) {
            alert('Success! Your reservation has been sent to dispatch. We will contact you shortly.');
            document.getElementById('paymentOverlay').classList.remove('active');
        } else {
            alert('Error: ' + error.message);
        }
        btn.disabled = false;
        btn.textContent = 'Book Now';
    };

    document.getElementById('paymentClose').onclick = () => document.getElementById('paymentOverlay').classList.remove('active');
    document.getElementById('vsBackBtn').onclick = () => vsOverlay.classList.remove('active');

    const tabs = document.querySelectorAll('.booking-widget__tab');
    tabs.forEach(t => t.onclick = () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.querySelectorAll('.booking-widget__form').forEach(f => f.classList.remove('active'));
        document.getElementById('form-' + t.dataset.tab).classList.add('active');
        initAutocomplete();
        leg1Miles = 0; leg2Miles = 0;
    });
});
