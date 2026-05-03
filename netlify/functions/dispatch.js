const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;

    const EMAIL_PASS = process.env.EMAIL_PASSWORD;
    const DISPATCH_TO = process.env.DISPATCH_TO;

    const bookingSummary = `🚨 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers} Pax, ${luggage} Bags`;

    // --- SMART EMAIL DISPATCH (Try Port 587 first, then 465) ---
    const sendEmail = async (port, secure) => {
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.com',
        port: port,
        secure: secure,
        auth: { user: 'smlimo@mail.com', pass: EMAIL_PASS },
        connectionTimeout: 5000
      });
      return transporter.sendMail({
        from: '"SM DISPATCH" <smlimo@mail.com>',
        to: 'smlimo@mail.com, smlimo2@yahoo.com',
        subject: `🚨 Booking: ${name} - ${vehicle}`,
        text: bookingSummary
      });
    };

    let emailStatus = 'pending';
    try {
      await sendEmail(587, false);
      emailStatus = 'sent (587)';
    } catch (e1) {
      try {
        await sendEmail(465, true);
        emailStatus = 'sent (465)';
      } catch (e2) {
        emailStatus = `failed: ${e2.message}`;
      }
    }

    // --- SMS DISPATCH ---
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
        sms_status: smsStatus,
        debug_pass_exists: !!EMAIL_PASS
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
