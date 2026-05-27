/* ===================================================================
   SM LIMOUSINE — Main Script
   Pricing, Live Estimates & Stripe Payment Integration
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------------------------------------------------------------
       PRICING CONFIGURATION
       --------------------------------------------------------------- */
    const VEHICLE_RATES = {
        escalade:   { name: 'Cadillac Escalade',    hourly: 125, perMile: 4.50 },
        xt6:        { name: 'Cadillac XT6',          hourly: 95,  perMile: 4.50 },
        denali:     { name: 'GMC Denali',            hourly: 110, perMile: 4.50 },
        suburban:   { name: 'Chevrolet Suburban',    hourly: 100, perMile: 4.50 },
        sprinter:   { name: 'Mercedes Sprinter',     hourly: 160, perMile: 4.50 },
        motorcoach: { name: 'Motor Coach',           hourly: 290, perMile: 4.50 }
    };

    const DISTANCE_RATE_PER_MILE = 4.50;
    const MIN_HOURS = 3;
    const PLACEHOLDER_DISTANCE_MILES = 20;

    let currentMiles = PLACEHOLDER_DISTANCE_MILES;

    /* ---------------------------------------------------------------
       GOOGLE MAPS AUTOCOMPLETE & DISTANCE
       --------------------------------------------------------------- */
    function initMaps() {
        if (typeof google === 'undefined') return;

        const autocompleteOptions = {
            componentRestrictions: { country: "us" },
            fields: ["address_components", "geometry", "name", "formatted_address"],
            types: ["address"],
        };

        const inputs = document.querySelectorAll('input[data-field="pickup"], input[data-field="dropoff"]');
        inputs.forEach(input => {
            const autocomplete = new google.maps.places.Autocomplete(input, autocompleteOptions);
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry) return;
                
                // Trigger price update after selecting address
                const form = input.closest('form');
                if (form) {
                    const serviceType = form.id.replace('form-', '');
                    calculateRealDistance(form, serviceType);
                }
            });
        });
    }

    async function calculateRealDistance(form, serviceType) {
        if (serviceType === 'hourly' || typeof google === 'undefined') return;

        const pickup = form.querySelector('[data-field="pickup"]').value;
        const dropoff = form.querySelector('[data-field="dropoff"]').value;

        if (!pickup || !dropoff) return;

        const service = new google.maps.DistanceMatrixService();
        try {
            const response = await service.getDistanceMatrix({
                origins: [pickup],
                destinations: [dropoff],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.IMPERIAL,
            });

            const result = response.rows[0].elements[0];
            if (result.status === 'OK') {
                currentMiles = result.distance.value / 1609.34;
                updatePriceEstimate(form.id, serviceType);
            }
        } catch (e) {
            console.error('Distance calculation failed', e);
        }
    }

    // Call initMaps when Google is ready
    if (typeof google !== 'undefined') {
        initMaps();
    } else {
        window.addEventListener('load', initMaps);
    }

    /* ---------------------------------------------------------------
       PRICING CALCULATOR
       --------------------------------------------------------------- */
    function calculatePrice(serviceType, vehicleKey, options) {
        if (!vehicleKey || !VEHICLE_RATES[vehicleKey]) return null;

        const vehicle = VEHICLE_RATES[vehicleKey];

        if (serviceType === 'hourly') {
            const hours = Math.max(options.hours || MIN_HOURS, MIN_HOURS);
            const total = vehicle.hourly * hours;
            return {
                total,
                breakdown: `${hours} hrs × $${vehicle.hourly}/hr`,
                vehicle: vehicle.name
            };
        }

        if (serviceType === 'oneway') {
            if (!options.hasPickup || !options.hasDropoff) return null;
            const miles = options.miles || currentMiles;
            const total = DISTANCE_RATE_PER_MILE * miles;
            return {
                total,
                breakdown: `${miles.toFixed(1)} mi × $${DISTANCE_RATE_PER_MILE.toFixed(2)}/mi`,
                vehicle: vehicle.name
            };
        }

        if (serviceType === 'roundtrip') {
            if (!options.hasPickup || !options.hasDropoff) return null;
            const miles = options.miles || currentMiles;
            const total = DISTANCE_RATE_PER_MILE * miles * 2;
            return {
                total,
                breakdown: `${miles.toFixed(1)} mi × $${DISTANCE_RATE_PER_MILE.toFixed(2)}/mi × 2 (round trip)`,
                vehicle: vehicle.name
            };
        }

        return null;
    }

    /* ---------------------------------------------------------------
       LIVE PRICE ESTIMATE — Updates UI in real-time
       --------------------------------------------------------------- */
    function updatePriceEstimate(formId, serviceType) {
        const form = document.getElementById(formId);
        if (!form) return;

        const vehicleSelect = form.querySelector('[data-field="vehicle"]');
        const vehicleKey = vehicleSelect ? vehicleSelect.value : '';

        const pickupInput = form.querySelector('[data-field="pickup"]');
        const dropoffInput = form.querySelector('[data-field="dropoff"]');
        const hoursSelect = form.querySelector('[data-field="hours"]');

        const hasPickup = pickupInput ? pickupInput.value.trim().length > 0 : false;
        const hasDropoff = dropoffInput ? dropoffInput.value.trim().length > 0 : false;
        const hours = hoursSelect ? parseInt(hoursSelect.value, 10) : MIN_HOURS;

        const result = calculatePrice(serviceType, vehicleKey, {
            hasPickup,
            hasDropoff,
            miles: currentMiles,
            hours
        });

        const amountEl = document.getElementById(`price-amount-${serviceType}`);
        const detailEl = document.getElementById(`price-detail-${serviceType}`);
        const submitBtn = document.getElementById(`submit-${serviceType}`);
        const priceBox = document.getElementById(`price-${serviceType}`);

        if (result) {
            amountEl.textContent = `$${result.total.toFixed(2)}`;
            detailEl.textContent = result.breakdown;
            priceBox.classList.add('price-estimate--active');
            submitBtn.textContent = 'Proceed to Payment';
            submitBtn.classList.add('booking-widget__submit--payment');
            submitBtn.dataset.price = result.total.toFixed(2);
            submitBtn.dataset.vehicle = result.vehicle;
            submitBtn.dataset.breakdown = result.breakdown;
            submitBtn.dataset.service = serviceType;
        } else {
            amountEl.textContent = '—';
            priceBox.classList.remove('price-estimate--active');
            submitBtn.classList.remove('booking-widget__submit--payment');
            delete submitBtn.dataset.price;

            if (!vehicleKey) {
                detailEl.textContent = serviceType === 'hourly'
                    ? 'Select a vehicle and hours'
                    : 'Select a vehicle and enter locations';
                submitBtn.textContent = 'Get a Quote';
            } else if (serviceType !== 'hourly' && (!hasPickup || !hasDropoff)) {
                detailEl.textContent = 'Enter pickup and dropoff to see estimate';
                submitBtn.textContent = 'Get a Quote';
            } else {
                detailEl.textContent = 'Select a vehicle to see estimate';
                submitBtn.textContent = 'Get a Quote';
            }
        }
    }

    /* ---------------------------------------------------------------
       BIND LIVE ESTIMATE LISTENERS
       --------------------------------------------------------------- */
    const formConfigs = [
        { formId: 'form-oneway',    serviceType: 'oneway' },
        { formId: 'form-roundtrip', serviceType: 'roundtrip' },
        { formId: 'form-hourly',    serviceType: 'hourly' }
    ];

    formConfigs.forEach(({ formId, serviceType }) => {
        const form = document.getElementById(formId);
        if (!form) return;

        const inputs = form.querySelectorAll('input[data-field], select[data-field]');
        inputs.forEach(input => {
            const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                if (eventType === 'input' && input.getAttribute('data-field') !== 'hours') {
                    // Don't calculate distance on every keystroke, let Autocomplete handle it or do it on blur
                } else {
                    updatePriceEstimate(formId, serviceType);
                }
            });
            
            if (input.tagName === 'INPUT' && (input.getAttribute('data-field') === 'pickup' || input.getAttribute('data-field') === 'dropoff')) {
                input.addEventListener('blur', () => calculateRealDistance(form, serviceType));
            }
        });

        updatePriceEstimate(formId, serviceType);
    });

    /* ---------------------------------------------------------------
       STICKY HEADER
       --------------------------------------------------------------- */
    const header = document.getElementById('header');
    const onScroll = () => {
        header.classList.toggle('header--scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------------------------------------------------------------
       MOBILE BURGER MENU
       --------------------------------------------------------------- */
    const burgerBtn = document.getElementById('burgerBtn');
    const mainNav = document.getElementById('mainNav');

    if (burgerBtn && mainNav) {
        burgerBtn.addEventListener('click', () => {
            burgerBtn.classList.toggle('open');
            mainNav.classList.toggle('open');
        });

        mainNav.querySelectorAll('.header__link').forEach(link => {
            link.addEventListener('click', () => {
                burgerBtn.classList.remove('open');
                mainNav.classList.remove('open');
            });
        });
    }

    /* ---------------------------------------------------------------
       BOOKING WIDGET TABS
       --------------------------------------------------------------- */
    const tabs = document.querySelectorAll('.booking-widget__tab');
    const forms = document.querySelectorAll('.booking-widget__form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            tab.classList.add('active');
            const targetForm = document.getElementById(`form-${target}`);
            if (targetForm) {
                targetForm.classList.add('active');
            }
        });
    });

    /* ---------------------------------------------------------------
       FLEET CARD "BOOK THIS VEHICLE" — pre-selects vehicle in form
       --------------------------------------------------------------- */
    document.querySelectorAll('.fleet-card__cta[data-vehicle]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const vehicleKey = btn.dataset.vehicle;
            const activeForm = document.querySelector('.booking-widget__form.active');
            if (activeForm) {
                const vehicleSelect = activeForm.querySelector('[data-field="vehicle"]');
                if (vehicleSelect) {
                    vehicleSelect.value = vehicleKey;
                    vehicleSelect.dispatchEvent(new Event('change'));
                }
            }
        });
    });

    /* ---------------------------------------------------------------
       FORM SUBMISSION — Opens payment modal when price is ready
       --------------------------------------------------------------- */
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('.booking-widget__submit');

            if (btn.dataset.price) {
                openPaymentModal({
                    service: btn.dataset.service,
                    vehicle: btn.dataset.vehicle,
                    breakdown: btn.dataset.breakdown,
                    total: parseFloat(btn.dataset.price)
                });
            } else {
                const btn2 = form.querySelector('.booking-widget__submit');
                const originalText = btn2.textContent;
                btn2.textContent = 'Please select a vehicle first';
                btn2.style.background = '#333';
                btn2.style.color = '#C0C0C0';
                setTimeout(() => {
                    btn2.textContent = originalText;
                    btn2.style.background = '';
                    btn2.style.color = '';
                }, 2000);
            }
        });
    });

    /* ---------------------------------------------------------------
       STRIPE PAYMENT MODAL
       --------------------------------------------------------------- */
    const overlay = document.getElementById('paymentOverlay');
    const modal = document.getElementById('paymentModal');
    const closeBtn = document.getElementById('paymentClose');
    const payBtn = document.getElementById('payBtn');
    const payBtnText = document.getElementById('payBtnText');
    const paymentSuccess = document.getElementById('paymentSuccess');
    const paymentDone = document.getElementById('paymentDone');

    let currentBooking = null;

    const SERVICE_LABELS = {
        oneway: 'One-Way Transfer',
        roundtrip: 'Round-Trip Transfer',
        hourly: 'Hourly Service'
    };

    function openPaymentModal(booking) {
        currentBooking = booking;

        document.getElementById('pay-service').textContent = SERVICE_LABELS[booking.service] || booking.service;
        document.getElementById('pay-vehicle').textContent = booking.vehicle;
        document.getElementById('pay-breakdown').textContent = booking.breakdown;
        document.getElementById('pay-total').textContent = `$${booking.total.toFixed(2)}`;
        payBtnText.textContent = `Pay $${booking.total.toFixed(2)}`;

        // Reset form state
        paymentSuccess.style.display = 'none';
        document.querySelector('.payment-modal__form').style.display = 'block';
        document.querySelector('.payment-modal__summary').style.display = 'block';
        payBtn.disabled = false;
        payBtn.classList.remove('payment-modal__pay-btn--processing');

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closePaymentModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        currentBooking = null;

        // Clear form fields
        ['pay-email', 'pay-card', 'pay-expiry', 'pay-cvc', 'pay-name'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', closePaymentModal);
    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePaymentModal();
    });
    if (paymentDone) paymentDone.addEventListener('click', closePaymentModal);

    // Card number formatting (spaces every 4 digits)
    const cardInput = document.getElementById('pay-card');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 16);
            val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = val;
        });
    }

    // Expiry formatting (MM / YY)
    const expiryInput = document.getElementById('pay-expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 4);
            if (val.length >= 2) {
                val = val.slice(0, 2) + ' / ' + val.slice(2);
            }
            e.target.value = val;
        });
    }

    // CVC — digits only
    const cvcInput = document.getElementById('pay-cvc');
    if (cvcInput) {
        cvcInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    }

    // Simulated payment processing
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            const email = document.getElementById('pay-email').value.trim();
            const card = document.getElementById('pay-card').value.replace(/\s/g, '');
            const expiry = document.getElementById('pay-expiry').value.trim();
            const cvc = document.getElementById('pay-cvc').value.trim();
            const name = document.getElementById('pay-name').value.trim();

            if (!email || !card || !expiry || !cvc || !name) {
                payBtn.classList.add('payment-modal__pay-btn--error');
                payBtnText.textContent = 'Please fill all fields';
                setTimeout(() => {
                    payBtn.classList.remove('payment-modal__pay-btn--error');
                    payBtnText.textContent = `Pay $${currentBooking.total.toFixed(2)}`;
                }, 2000);
                return;
            }

            if (card.length < 13) {
                payBtn.classList.add('payment-modal__pay-btn--error');
                payBtnText.textContent = 'Invalid card number';
                setTimeout(() => {
                    payBtn.classList.remove('payment-modal__pay-btn--error');
                    payBtnText.textContent = `Pay $${currentBooking.total.toFixed(2)}`;
                }, 2000);
                return;
            }

            // Simulate processing
            payBtn.disabled = true;
            payBtn.classList.add('payment-modal__pay-btn--processing');
            payBtnText.textContent = 'Processing…';

            setTimeout(() => {
                // Generate confirmation ID
                const confirmId = 'SM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
                document.getElementById('confirmationId').textContent = `Confirmation: ${confirmId}`;

                document.querySelector('.payment-modal__form').style.display = 'none';
                document.querySelector('.payment-modal__summary').style.display = 'none';
                paymentSuccess.style.display = 'flex';
            }, 2200);
        });
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closePaymentModal();
        }
    });

    /* ---------------------------------------------------------------
       SMOOTH REVEAL ON SCROLL (Intersection Observer)
       --------------------------------------------------------------- */
    const revealElements = document.querySelectorAll(
        '.fleet-card, .service-card, .testimonial-card, .trust-badge, .cta-section__inner'
    );

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        revealElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            revealObserver.observe(el);
        });
    }

    const style = document.createElement('style');
    style.textContent = `.revealed { opacity: 1 !important; transform: translateY(0) !important; }`;
    document.head.appendChild(style);

    /* ---------------------------------------------------------------
       SET MIN DATE TO TODAY
       --------------------------------------------------------------- */
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.setAttribute('min', today);
    });
});
