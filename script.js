/* ===================================================================
   SM LIMOUSINE — Main Script (Production Version)
   Active Stripe Payment Engine
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          hourly: 95,  perMile: 4.50, category: 'Premium sedan' },
        suburban:   { name: 'Chevrolet Suburban',    hourly: 100, perMile: 4.50, category: 'Premium SUV' },
        escalade:   { name: 'Cadillac Escalade',    hourly: 125, perMile: 4.50, category: 'First class' },
        sprinter:   { name: 'Mercedes Sprinter',     hourly: 160, perMile: 4.50, category: 'Sprinter van' },
        motorcoach: { name: 'Motor Coach',           hourly: 290, perMile: 4.50, category: 'Motor coach' }
    };

    const DISTANCE_RATE = 4.50;
    const FIXED_MILES = 20;
    const MIN_HOURS = 3;

    /* --- STRIPE LIVE CONFIG --- */
    const STRIPE_PK = 'pk_live_51IbYKJDTuAQjzxkZ1N0ux67FkazoNNnIBETCNDKY4ZGNPgvvhLQ6uUjllR00Hx6974pr4g0x7PJH0UCMJo5UFiQW008pn1ZBYX';
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
            const pickup = form.querySelector('[data-field="pickup"]')?.value;
            const hours = parseInt(form.querySelector('[data-field="hours"]')?.value || MIN_HOURS);
            
            openVehicleSelector(type, hours);
        });
    });

    function openVehicleSelector(type, hours) {
        vsList.innerHTML = '';
        Object.keys(VEHICLE_RATES).forEach(key => {
            const v = VEHICLE_RATES[key];
            const total = type === 'hourly' ? v.hourly * hours : DISTANCE_RATE * FIXED_MILES;
            const card = document.createElement('div');
            card.className = 'vs-card';
            card.innerHTML = `<p>${v.category}</p><p>$${total.toFixed(2)} USD</p>`;
            card.onclick = () => {
                document.querySelectorAll('.vs-card').forEach(c => c.style.borderColor = 'transparent');
                card.style.borderColor = '#C0C0C0';
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
        }
    }

    document.getElementById('payBtn').onclick = async () => {
        const {token, error} = await stripe.createToken(cardNumber);
        if (token) alert('Payment successful! ID: ' + token.id);
        else alert('Error: ' + error.message);
    };

    document.getElementById('paymentClose').onclick = () => payOverlay.classList.remove('active');
    document.getElementById('vsBackBtn').onclick = () => vsOverlay.classList.remove('active');
});
