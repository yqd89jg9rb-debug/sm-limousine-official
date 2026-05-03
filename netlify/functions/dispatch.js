const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, email, vehicle, total, pickup, dropoff, date, time, passengers, luggage } = data;

    // Use environment variables from Netlify
    const TWILIO_SID = process.env.TWILIO_SID;
    const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
    const TWILIO_FROM = process.env.TWILIO_FROM;
    const DISPATCH_TO = process.env.DISPATCH_TO;

    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    
    // Detailed message for your phone
    const smsBody = `🚨 NEW BOOKING: SM LIMOUSINE\n\nClient: ${name}\nEmail: ${email}\nVehicle: ${vehicle}\nTotal: $${total}\n\nTrip: ${pickup} TO ${dropoff}\nDate/Time: ${date} @ ${time}\nLoad: ${passengers} Pax, ${luggage} Bags`;

    console.log('Sending SMS to:', DISPATCH_TO);

    // Attempt to send the text message
    const message = await client.messages.create({
      body: smsBody,
      from: TWILIO_FROM,
      to: DISPATCH_TO
    });

    console.log('Twilio response:', message.sid);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true, 
        message: 'Dispatch notified', 
        sid: message.sid,
        note: 'Check your phone (+1 817-723-4592) for the alert.'
      })
    };
  } catch (error) {
    console.error('Dispatch Error:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'The booking was successful, but the SMS alert failed. Check Twilio verification status.'
      })
    };
  }
};
