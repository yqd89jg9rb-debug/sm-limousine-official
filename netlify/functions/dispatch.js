const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;

    const EMAIL_PASS = process.env.EMAIL_PASSWORD;
    const DISPATCH_TO = process.env.DISPATCH_TO;

    let bookingSummary = `🚨 NEW BOOKING: SM LIMOUSINE

Client: ${name}
Email: ${email}
Vehicle: ${vehicle}
Total: $${total}

Trip: ${pickup} TO ${dropoff}
Date/Time: ${date} @ ${time}
Load: ${passengers} Pax, ${luggage} Bags`;

    const { returnDate, returnTime, returnPickup, returnDropoff } = data;
    if (returnDate && returnDate !== 'N/A') {
      bookingSummary += `

Return Trip: ${returnPickup} TO ${returnDropoff}
Return Date/Time: ${returnDate} @ ${returnTime}`;
    }

    // --- HIGH-SPEED EMAIL DISPATCH (Prevent Netlify 10s Timeout) ---
    const sendEmail = async (port, secure) => {
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.com',
        port: port,
        secure: secure,
        auth: { user: 'smlimo@mail.com', pass: EMAIL_PASS },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 3000
      });
      return transporter.sendMail({
        from: 'smlimo@mail.com',
        to: 'smlimo@mail.com, smlimo2@yahoo.com, ' + email,
        subject: `🚨 Booking: ${name} - ${vehicle}`,
        text: bookingSummary
      });
    };

    let emailStatus = 'pending';
    let detailedError = null;
    let acceptedEmails = [];

    try {
      // Try 465 (Most reliable for mail.com) FIRST
      const info = await sendEmail(465, true);
      emailStatus = 'sent (465)';
      acceptedEmails = info.accepted || [];
    } catch (e1) {
      console.log('465 failed, trying 587...');
      try {
        const info = await sendEmail(587, false);
        emailStatus = 'sent (587)';
        acceptedEmails = info.accepted || [];
      } catch (e2) {
        console.log('587 failed, trying 2525 fallback...');
        try {
          const info = await sendEmail(2525, false);
          emailStatus = 'sent (2525)';
          acceptedEmails = info.accepted || [];
        } catch (e3) {
          emailStatus = 'FAILED';
          detailedError = e1.message;
        }
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
        email_error: detailedError,
        accepted_emails: acceptedEmails,
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