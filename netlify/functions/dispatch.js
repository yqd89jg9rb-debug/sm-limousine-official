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

    // --- TURBO EMAIL TASK (Simultaneous Port Attempt) ---
    const doEmail = async () => {
        const sendOnPort = async (port, secure) => {
            const transporter = nodemailer.createTransport({
                host: 'smtp.mail.com',
                port: port,
                secure: secure,
                auth: { user: 'smlimo@mail.com', pass: EMAIL_PASS },
                connectionTimeout: 5000
            });
            return transporter.sendMail({
                from: 'smlimo@mail.com',
                to: `smlimo@mail.com, smlimo2@yahoo.com, ${email}`,
                subject: `🚨 Booking: ${name} - ${vehicle}`,
                text: bookingSummary
            });
        };

        // Race all three ports simultaneously - fastest one wins
        return Promise.any([
            sendOnPort(465, true),
            sendOnPort(587, false),
            sendOnPort(2525, false)
        ]);
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

    // Fire everything in parallel
    const [emailRes, smsRes] = await Promise.allSettled([doEmail(), doSMS()]);

    const emailStatus = emailRes.status === 'fulfilled' ? 'SENT' : 'FAILED';
    const emailErr = emailRes.status === 'rejected' ? 'Connection timeout' : null;
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
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};