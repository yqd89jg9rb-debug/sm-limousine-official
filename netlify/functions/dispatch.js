const twilio = require('twilio');

// Credentials are set as Netlify environment variables in the dashboard.
// Required vars: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, DISPATCH_TO
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;

    const TWILIO_SID   = process.env.TWILIO_SID;
    const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
    const TWILIO_FROM  = process.env.TWILIO_FROM;
    const DISPATCH_TO  = process.env.DISPATCH_TO;

    const client = twilio(TWILIO_SID, TWILIO_TOKEN);

    const smsBody = `\uD83D\uDEA8 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers} Pax, ${luggage} Bags`;

    await client.messages.create({
      body: smsBody,
      from: TWILIO_FROM,
      to: DISPATCH_TO
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Dispatch notified' })
    };
  } catch (error) {
    console.error('Dispatch Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
