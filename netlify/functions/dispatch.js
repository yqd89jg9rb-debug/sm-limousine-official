const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const EMAIL_PASS = process.env.EMAIL_PASSWORD;
    const DISPATCH_TO = process.env.DISPATCH_TO;

    let bookingSummary = '';
    let subject = '';

    if (data.type === 'FEEDBACK') {
        const { name, rating, comment, bookingId } = data;
        subject = `⭐ FEEDBACK: ${rating}-Star from ${name}`;
        bookingSummary = `⭐ NEW CLIENT FEEDBACK\n\nClient: ${name}\nRating: ${rating}/5 Stars\nBooking ID: ${bookingId}\n\nComment: ${comment}`;
    } else {
        const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;
        subject = `🚨 Booking: ${name} - ${vehicle}`;
        bookingSummary = `🚨 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers} Pax, ${luggage} Bags`;

        const { returnDate, returnTime, returnPickup, returnDropoff } = data;
        if (returnDate && returnDate !== 'N/A') {
          bookingSummary += `\n\nReturn Trip: ${returnPickup} TO ${returnDropoff}\nReturn Date/Time: ${returnDate} @ ${returnTime}`;
        }
    }

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

    let smsStatus = 'pending';
    try {
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      await client.messages.create({
        body: bookingSummary,
        from: process.env.TWILIO_FROM,
        to: DISPATCH_TO
      });
      smsStatus = 'sent';
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
