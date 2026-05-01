/* ===================================================================
   SM LIMOUSINE — Main Script (Production Version)
   Active Stripe Payment Engine
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          hourly: 95,  perMile: 4.50, category: 'Premium sedan',    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    hourly: 100, perMile: 4.50, category: 'Premium SUV',      passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/fd71bfa5f116a37ac3411b7203dbd0100bb61a10183601a25a88b96482ff917f.jpeg' },
        denali:     { name: 'GMC Denali',            hourly: 110, perMile: 4.50, category: 'Premium SUV',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/2b8c60feeae7034daea35ae7343d608f10d8f13b1116025c20080796380d9ff7.jpeg' },
        escalade:   { name: 'Cadillac Escalade',    hourly: 125, perMile: 4.50, category: 'First class',      passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        sprinter:   { name: 'Mercedes Sprinter',     hourly: 160, perMile: 4.50, category: 'Sprinter van',     passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           hourly: 290, perMile: 4.50, category: 'Motor coach',      passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    const DISTANCE_RATE = 4.50;
    const FIXED_MILES = 20;
    const MIN_HOURS = 3;

    /* --- STRIPE LIVE CONFIG --- */
    const STRIPE_PK = 'pk_live_51IbYKJDTuAQjzzxkZ1M0ux67FkazoNNlIBETCNDKY4ZGNPyvvhLQ6uUjmllR00Hx6974pr4g0x7PJH0UCMJo5UFiQW008pn1ZBYX';
    let stripe, elements, cardNumber, cardExpiry, cardCvc;

    /* --- UI ELEMENTS --- */
    const vsOverlay = document.getElementById('vsOverlay');
    const vsList = document.getElementById('vsList');
    const vsContinueBtn = document.getElementById('vsContinueBtn');
    const payOverlay = document.getElementById('paymentOverlay');

    /* --- FORM SUBMISSION --- */
    document.querySelectorAll('.booking-widget__form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = form.id.replace('form-', '');
            const hours = parseInt(form.querySelector('[data-field="hours"]')?.value || MIN_HOURS);
            openVehicleSelector(type, hours);
        });
    });

    function openVehicleSelector(type, hours) {
        vsList.innerHTML = '';
        vsContinueBtn.disabled = true;

        Object.keys(VEHICLE_RATES).forEach(key => {
            const v = VEHICLE_RATES[key];
            const total = type === 'hourly' ? v.hourly * hours : DISTANCE_RATE * FIXED_MILES;
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
                    openPayment(v.name, total);
                };
            };
            vsList.appendChild(card);
        });
        vsOverlay.classList.add('active');
    }

    /* --- ACTIVATE STRIPE --- */
    async function openPayment(vehicle, total) {
        document.getElementById('pay-vehicle').textContent = vehicle;
        document.getElementById('pay-total').textContent = `$${total.toFixed(2)}`;
        payOverlay.classList.add('active');

        // Wait for modal to be visible before mounting
        setTimeout(async () => {
            if (!stripe) {
                stripe = Stripe(STRIPE_PK);
                elements = stripe.elements();
                const style = { base: { color: '#ffffff', fontSize: '16px', '::placeholder': { color: '#888888' } } };

                cardNumber = elements.create('cardNumber', { style });
                cardNumber.mount('#card-number-element');

                cardExpiry = elements.create('cardExpiry', { style });
                cardExpiry.mount('#card-expiry-element');

                cardCvc = elements.create('cardCvc', { style });
                cardCvc.mount('#card-cvc-element');
                
                console.log('Stripe Elements mounted.');
            } else {
                // Re-mount to ensure they are active if modal was closed/re-opened
                cardNumber.mount('#card-number-element');
                cardExpiry.mount('#card-expiry-element');
                cardCvc.mount('#card-cvc-element');
            }
        }, 500);
    }

    document.getElementById('payBtn').onclick = async () => {
        const {token, error} = await stripe.createToken(cardNumber);
        if (token) alert('Success! Payment Authorized.');
        else alert('Error: ' + error.message);
    };

    document.getElementById('paymentClose').onclick = () => payOverlay.classList.remove('active');
    document.getElementById('vsBackBtn').onclick = () => vsOverlay.classList.remove('active');
    
    const tabs = document.querySelectorAll('.booking-widget__tab');
    tabs.forEach(t => t.onclick = () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.querySelectorAll('.booking-widget__form').forEach(f => f.classList.remove('active'));
        document.getElementById('form-' + t.dataset.tab).classList.add('active');
    });
});
