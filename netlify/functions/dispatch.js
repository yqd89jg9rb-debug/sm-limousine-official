const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;

    const EMAIL_PASS = process.env.EMAIL_PASSWORD;
    const DISPATCH_TO = process.env.DISPATCH_TO;
    const SENDER_EMAIL = 'samberiz2025@gmail.com';

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

    // --- STABLE GMAIL DISPATCH ---
    const doEmail = async () => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: SENDER_EMAIL, pass: EMAIL_PASS }
        });
        return transporter.sendMail({
            from: `"SM Limousine Dispatch" <${SENDER_EMAIL}>`,
            to: `smlimo@mail.com, smlimo2@yahoo.com, ${email}`,
            subject: `🚨 Booking: ${name} - ${vehicle}`,
            text: bookingSummary
        });
    };

    const doSMS = async () => {
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        return client.messages.create({
            body: bookingSummary,
            from: process.env.TWILIO_FROM,
            to: DISPATCH_TO
        });
    };

    const [emailRes, smsRes] = await Promise.allSettled([doEmail(), doSMS()]);

    const emailSent = emailRes.status === 'fulfilled';
    const smsSent = smsRes.status === 'fulfilled';

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true, 
        email_status: emailSent ? 'SENT' : 'FAILED',
        email_error: emailSent ? null : emailRes.reason.message,
        sms_status: smsSent ? 'SENT' : 'FAILED',
        sms_error: smsSent ? null : smsRes.reason.message,
        debug: {
            pass_len: EMAIL_PASS ? EMAIL_PASS.length : 0,
            user: SENDER_EMAIL
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};