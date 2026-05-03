const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;

    const TWILIO_SID = process.env.TWILIO_SID;
    const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
    const TWILIO_FROM = process.env.TWILIO_FROM;
    const DISPATCH_TO = process.env.DISPATCH_TO;
    const EMAIL_PASS = process.env.EMAIL_PASSWORD;

    const bookingSummary = `\uD83D\uDEA8 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers} Pax, ${luggage} Bags`;

    // --- 1. EMAIL NOTIFICATION (Using Port 465 for SSL) ---
    const transporter = nodemailer.createTransport({
      host: 'smtp.mail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: 'smlimo@mail.com',
        pass: EMAIL_PASS
      },
      logger: false,
      debug: false
    });

    let emailError = null;
    let emailDebug = null;
    try {
      await transporter.sendMail({
        from: '"SM DISPATCH" <smlimo@mail.com>',
        to: 'smlimo@mail.com, smlimo2@yahoo.com',
        subject: `\uD83D\uDEA8 Booking: ${name} - ${vehicle}`,
        text: bookingSummary
      });
    } catch (e) {
      emailError = e.message;
      // Capture full debug details to surface in UI
      emailDebug = {
        message: e.message,
        code: e.code || null,
        command: e.command || null,
        responseCode: e.responseCode || null,
        response: e.response || null,
        stack: e.stack ? e.stack.split('\n').slice(0, 5).join(' | ') : null
      };
      console.error('Email snag:', JSON.stringify(emailDebug));
    }

    // --- 2. SMS NOTIFICATION ---
    let smsError = null;
    let smsDebug = null;
    try {
      const client = twilio(TWILIO_SID, TWILIO_TOKEN);
      await client.messages.create({
        body: bookingSummary,
        from: TWILIO_FROM,
        to: DISPATCH_TO
      });
    } catch (e) {
      smsError = e.message;
      smsDebug = {
        message: e.message,
        code: e.code || null,
        status: e.status || null
      };
      console.error('SMS snag:', JSON.stringify(smsDebug));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true, 
        email_status: emailError ? `snag: ${emailError}` : 'sent',
        email_debug: emailDebug || null,
        sms_status: smsError ? `snag: ${smsError}` : 'sent',
        sms_debug: smsDebug || null
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
