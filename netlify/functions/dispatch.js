const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const EMAIL_PASS = process.env.EMAIL_PASSWORD;
    const DISPATCH_TO_PRIMARY = process.env.DISPATCH_TO;
    const DISPATCH_TO_SECONDARY = '+12146385030'; 

    let bookingSummary = '';
    let subject = '';
    let emailRecipient = 'smlimousine2026@gmail.com'; // Default to admin

    if (data.type === 'SEND_INVOICE') {
        const { name, amount, email, link } = data;
        emailRecipient = email;
        subject = `Invoice from SM LIMOUSINE - $${amount}`;
        bookingSummary = `Dear ${name},\n\nPlease find your invoice from SM LIMOUSINE for your upcoming travel.\n\nTotal Amount: $${amount}\n\nYou can view your invoice and pay securely online using the link below:\n${link}\n\nThank you for choosing SM LIMOUSINE.\n\nBest regards,\nSam Boulos\n(817) 723-4592`;
    } else if (data.type === 'FEEDBACK') {
        const { name, rating, comment, bookingId } = data;
        subject = `⭐ FEEDBACK: ${rating}-Star from ${name}`;
        bookingSummary = `⭐ NEW CLIENT FEEDBACK\n\nClient: ${name}\nRating: ${rating}/5 Stars\nBooking ID: ${bookingId}\n\nComment: ${comment}`;
    } else if (data.type === 'DRIVER_STATUS') {
        const { id, n, status } = data;
        subject = `🚙 STATUS: ${status} - ${n}`;
        bookingSummary = `🚙 DRIVER STATUS UPDATE\n\nReservation: ${id}\nPassenger: ${n}\nStatus: ${status}`;
    } else if (data.type === 'PAYMENT_RECEIVED') {
        const { name, total, email } = data;
        subject = `💰 PAYMENT: $${total} - ${name}`;
        bookingSummary = `💰 PAYMENT RECEIVED\n\nClient: ${name}\nEmail: ${email}\nTotal: $${total}\n\nStatus: Live Stripe Payment Verified.`;
    } else {
        const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;
        subject = `🚨 Booking: ${name} - ${vehicle}`;
        bookingSummary = `🚨 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers || 0} Pax, ${luggage || 0} Bags`;
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'smlimousine2026@gmail.com', pass: EMAIL_PASS }
    });

    const mailOptions = {
      from: '"SM LIMOUSINE" <smlimousine2026@gmail.com>',
      to: emailRecipient,
      subject: subject,
      text: bookingSummary
    };

    await transporter.sendMail(mailOptions);

    // Only send SMS for staff notifications (not for sending invoices to clients)
    if (data.type !== 'SEND_INVOICE') {
        try {
          const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
          const recipients = [DISPATCH_TO_PRIMARY, DISPATCH_TO_SECONDARY];
          const smsPromises = recipients.filter(Boolean).map(phone => {
            return client.messages.create({
              body: bookingSummary,
              from: process.env.TWILIO_FROM,
              to: phone
            });
          });
          await Promise.all(smsPromises);
        } catch (e) { console.log('SMS Snag'); }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
