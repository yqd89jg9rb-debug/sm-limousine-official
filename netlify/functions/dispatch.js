const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const EMAIL_PASS = process.env.EMAIL_PASSWORD;
    const DISPATCH_TO_PRIMARY = process.env.DISPATCH_TO;
    const DISPATCH_TO_SECONDARY = '+12146385030'; // Added second phone number

    let bookingSummary = '';
    let subject = '';

    if (data.type === 'FEEDBACK') {
        const { name, rating, comment, bookingId } = data;
        subject = `⭐ FEEDBACK: ${rating}-Star from ${name}`;
        bookingSummary = `⭐ NEW CLIENT FEEDBACK\n\nClient: ${name}\nRating: ${rating}/5 Stars\nBooking ID: ${bookingId}\n\nComment: ${comment}`;
    } else if (data.type === 'DRIVER_STATUS') {
        const { id, n, status } = data;
        subject = `🚙 STATUS: ${status} - ${n}`;
        bookingSummary = `🚙 DRIVER STATUS UPDATE\n\nReservation: ${id}\nPassenger: ${n}\nStatus: ${status}`;
    } else {
        const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;
        subject = `🚨 Booking: ${name} - ${vehicle}`;
        bookingSummary = `🚨 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers} Pax, ${luggage} Bags`;

        const { returnDate, returnTime, returnPickup, returnDropoff } = data;
        if (returnDate && returnDate !== 'N/A') {
          bookingSummary += `\n\nReturn Trip: ${returnPickup} TO ${returnDropoff}\nReturn Date/Time: ${returnDate} @ ${returnTime}`;
        }
    }

    // --- EMAIL NOTIFICATION ---
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'smlimousine2026@gmail.com', pass: EMAIL_PASS }
    });

    const mailOptions = {
      from: '"SM DISPATCH" <smlimousine2026@gmail.com>',
      to: 'smlimousine2026@gmail.com',
      subject: subject,
      text: bookingSummary
    };

    let emailStatus = 'pending';
    try {
      await transporter.sendMail(mailOptions);
      emailStatus = 'sent (Gmail)';
    } catch (e) {
      console.log('Gmail send failed:', e.message);
      emailStatus = 'FAILED';
    }

    // --- SMS NOTIFICATION (DUAL RECIPIENTS) ---
    let smsStatus = 'pending';
    try {
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      const recipients = [DISPATCH_TO_PRIMARY, DISPATCH_TO_SECONDARY];
      
      // Send to all recipients in parallel
      const smsPromises = recipients.filter(Boolean).map(phone => {
        return client.messages.create({
          body: bookingSummary,
          from: process.env.TWILIO_FROM,
          to: phone
        });
      });
      
      await Promise.all(smsPromises);
      smsStatus = `sent to ${recipients.length} numbers`;
    } catch (e) {
      smsStatus = `snag: ${e.message}`;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true, 
        email_status: emailStatus,
        sms_status: smsStatus
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
