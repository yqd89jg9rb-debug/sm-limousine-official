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

    // --- GMAIL OPTIMIZED DISPATCH ---
    const doEmail = async () => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { 
                user: SENDER_EMAIL, 
                pass: EMAIL_PASS 
            }
        });
        return transporter.sendMail({
            from: `"SM Limousine Dispatch" <${SENDER_EMAIL}>`,
            to: `smlimo@mail.com, smlimo2@yahoo.com, ${email}`,
            subject: `🚨 Booking: ${name} - ${vehicle}`,
            text: bookingSummary
        });
    };

    // --- SMS TASK ---
    const doSMS = async () => {
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        return client.messages.create({
            body: bookingSummary,
            from: process.env.TWILIO_FROM,
            to: DISPATCH_TO
        });
    };

    // Fire in parallel
    const [emailRes, smsRes] = await Promise.allSettled([doEmail(), doSMS()]);

    const emailStatus = emailRes.status === 'fulfilled' ? 'SENT' : 'FAILED';
    const emailErr = emailRes.status === 'rejected' ? emailRes.reason.message : null;
    const accepted = emailRes.status === 'fulfilled' ? emailRes.value.accepted : [];

    const smsStatus = smsRes.status === 'fulfilled' ? 'SENT' : 'FAILED';
    const smsErr = smsRes.status === 'rejected' ? smsRes.reason.message : null;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true, 
        email_status: emailStatus,
        email_error: emailErr,
        accepted_emails: accepted,
        sms_status: smsStatus,
        sms_error: smsErr
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