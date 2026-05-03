const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;

    // Credentials from Netlify
    const TWILIO_SID = process.env.TWILIO_SID;
    const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
    const TWILIO_FROM = process.env.TWILIO_FROM;
    const DISPATCH_TO = process.env.DISPATCH_TO;

    // Detailed summary for both SMS and Email
    const bookingSummary = `🚨 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers} Pax, ${luggage} Bags`;

    // --- 1. EMAIL NOTIFICATION (via Dispatch Email smlimo@mail.com) ---
    // Note: We use process.env for these as well
    const transporter = nodemailer.createTransport({
      host: 'smtp.mail.com', // standard mail.com SMTP
      port: 587,
      secure: false,
      auth: {
        user: 'smlimo@mail.com',
        pass: process.env.EMAIL_PASSWORD
      }
    });

    try {
      await transporter.sendMail({
        from: '"SM DISPATCH" <smlimo@mail.com>',
        to: 'smlimo@mail.com',
        subject: `New Booking: ${name} - ${vehicle}`,
        text: bookingSummary
      });
      console.log('Email sent successfully');
    } catch (e) {
      console.error('Email Failed:', e.message);
    }

    // --- 2. SMS NOTIFICATION (Twilio) ---
    try {
      const client = twilio(TWILIO_SID, TWILIO_TOKEN);
      await client.messages.create({
        body: bookingSummary,
        from: TWILIO_FROM,
        to: DISPATCH_TO
      });
      console.log('SMS attempt completed');
    } catch (e) {
      console.error('SMS Alert Failed (Likely Twilio Verification):', e.message);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true, 
        message: 'Dispatch notifications triggered' 
      })
    };
  } catch (error) {
    console.error('Dispatch Engine Error:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
