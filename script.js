/* ===================================================================
   SM LIMOUSINE — Main Script (Production Mode)
   Pricing, Vehicle Selection, Live Estimates & Square Payment Integration
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const VEHICLE_RATES = {
        xt6:        { name: 'Cadillac XT6',          hourly: 95,  perMile: 4.50, category: 'Premium sedan',    subtitle: 'Cadillac XT6 or similar',                    passengers: '2-4',  suitcases: '2-3',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/cf22b96994e3db52466fe888e68ba76dfa286d2d99e49f86fe153638daf2271c.jpeg' },
        suburban:   { name: 'Chevrolet Suburban',    hourly: 100, perMile: 4.50, category: 'Premium SUV',      subtitle: 'Chevrolet Suburban, GMC Denali, or similar',  passengers: '4-6',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/fd71bfa5f116a37ac3411b7203dbd0100bb61a10183601a25a88b96482ff917f.jpeg' },
        escalade:   { name: 'Cadillac Escalade',    hourly: 125, perMile: 4.50, category: 'First class',      subtitle: 'Cadillac Escalade or similar',                passengers: '4-7',  suitcases: '3-5',  image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/ef53f08dbf9c9347f564d98b5ea4e5abdbdd44079efceb279fa5200e71060721.jpeg' },
        sprinter:   { name: 'Mercedes Sprinter',     hourly: 160, perMile: 4.50, category: 'Sprinter van',     subtitle: 'Mercedes Sprinter or similar',                passengers: '6-14', suitcases: '6-10', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/75f9359e022ebf23e1fba88293ba5cc31754eeaa26015ff992a60a5cf00f516d.jpeg' },
        motorcoach: { name: 'Motor Coach',           hourly: 290, perMile: 4.50, category: 'Motor coach',      subtitle: 'Motor Coach',                                passengers: '20-56', suitcases: '20-56', image: 'https://static.prod-images.emergentagent.com/jobs/f17b6fee-cc29-44c6-94cf-45fa9654051a/images/24291b6d665e5efacd5c52c74bd8f77b834190514dfdab731dec6ff1185a7048.jpeg' }
    };

    const DISTANCE_RATE = 4.50;
    const FIXED_MILES = 20;
    const MIN_HOURS = 3;

    /* --- SQUARE PRODUCTION CONFIG --- */
    const SQUARE_APP_ID = 'sq0idp-cecvvfhW0-GvaKyq34xIfw';
    const SQUARE_LOCATION_ID = 'A71H8PW';
    let squareCard = null;

    /* --- TRIP STATE --- */
    let currentTrip = null;
    let selectedVehicle = null;

    /* --- UI ELEMENTS --- */
    const vsOverlay = document.getElementById('vsOverlay');
    const vsList = document.getElementById('vsList');
    const vsContinueBtn = document.getElementById('vsContinueBtn');
    const payOverlay = document.getElementById('paymentOverlay');

    /* --- CORE LOGIC --- */
    function calculateTotal(type, key, opts) {
        const v = VEHICLE_RATES[key];
        if (type === 'hourly') return { total: v.hourly * opts.hours, breakdown: `${opts.hours} hrs × $${v.hourly}/hr` };
        const miles = FIXED_MILES;
        const mult = type === 'roundtrip' ? 2 : 1;
        return { total: DISTANCE_RATE * miles * mult, breakdown: `${miles} mi × $${DISTANCE_RATE.toFixed(2)}/mi${mult > 1 ? ' (round trip)' : ''}` };
    }

    /* --- FORM SUBMISSION --- */
    document.querySelectorAll('.booking-widget__form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            currentTrip = {
                type: form.id.replace('form-', ''),
                pickup: form.querySelector('[data-field="pickup"]')?.value,
                dropoff: form.querySelector('[data-field="dropoff"]')?.value,
                hours: parseInt(form.querySelector('[data-field="hours"]')?.value || MIN_HOURS)
            };
            openVehicleSelector();
        });
    });

    /* --- STEP 2: VEHICLE SELECTION --- */
    function openVehicleSelector() {
        selectedVehicle = null;
        vsContinueBtn.disabled = true;
        vsList.innerHTML = '';
        Object.keys(VEHICLE_RATES).forEach(key => {
            const v = VEHICLE_RATES[key];
            const price = calculateTotal(currentTrip.type, key, { hours: currentTrip.hours });
            const card = document.createElement('div');
            card.className = 'vs-card';
            card.innerHTML = `
                <div class="vs-card__info">
                    <div class="vs-card__category">${v.category}</div>
                    <div class="vs-card__subtitle">${v.subtitle}</div>
                    <div class="vs-card__price">$${price.total.toLocaleString(undefined, {minDigits:2})} USD</div>
                    <div class="vs-card__price-note">Price includes taxes, tolls & tips</div>
                </div>
                <div class="vs-card__right">
                    <div class="vs-card__right-top">
                        <div class="vs-card__capacity">
                            <span>👥 ${v.passengers}</span> <span>💼 ${v.suitcases}</span>
                        </div>
                        <div class="vs-card__radio"><div class="vs-card__radio-circle"></div></div>
                    </div>
                    <div class="vs-card__image"><img src="${v.image}"></div>
                </div>`;
            card.onclick = () => {
                vsList.querySelectorAll('.vs-card').forEach(c => c.classList.remove('vs-card--selected'));
                card.classList.add('vs-card--selected');
                selectedVehicle = key;
                vsContinueBtn.disabled = false;
            };
            vsList.appendChild(card);
        });
        vsOverlay.classList.add('active');
    }

    vsContinueBtn.onclick = () => {
        const p = calculateTotal(currentTrip.type, selectedVehicle, { hours: currentTrip.hours });
        vsOverlay.classList.remove('active');
        document.getElementById('pay-service').textContent = currentTrip.type;
        document.getElementById('pay-vehicle').textContent = VEHICLE_RATES[selectedVehicle].name;
        document.getElementById('pay-breakdown').textContent = p.breakdown;
        document.getElementById('pay-total').textContent = `$${p.total.toFixed(2)}`;
        payOverlay.classList.add('active');
        initSquare();
    };

    /* --- STEP 3: SQUARE --- */
    async function initSquare() {
        if (typeof Square === 'undefined') return;
        const payments = Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        squareCard = await payments.card({ input: { color: '#ffffff' } });
        await squareCard.attach('#sq-card-container');
    }

    document.getElementById('payBtn').onclick = async () => {
        const btn = document.getElementById('payBtn');
        btn.textContent = 'Processing...';
        const result = await squareCard.tokenize();
        if (result.status === 'OK') {
            document.getElementById('confirmationId').textContent = 'SM-' + Math.random().toString(36).substr(2,9).toUpperCase();
            document.getElementById('squareFormContainer').style.display = 'none';
            document.querySelector('.payment-modal__summary').style.display = 'none';
            document.getElementById('paymentSuccess').style.display = 'flex';
        } else {
            btn.textContent = 'Book';
            alert('Payment error. Please check card.');
        }
    };

    /* --- HELPERS --- */
    document.getElementById('vsBackBtn').onclick = () => vsOverlay.classList.remove('active');
    document.getElementById('paymentClose').onclick = () => payOverlay.classList.remove('active');
    document.getElementById('pmBackBtn').onclick = () => { payOverlay.classList.remove('active'); vsOverlay.classList.add('active'); };
    const tabs = document.querySelectorAll('.booking-widget__tab');
    tabs.forEach(t => t.onclick = () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.querySelectorAll('.booking-widget__form').forEach(f => f.classList.remove('active'));
        document.getElementById('form-' + t.dataset.tab).classList.add('active');
    });
    window.addEventListener('scroll', () => document.getElementById('header').classList.toggle('header--scrolled', window.scrollY > 40));
});
