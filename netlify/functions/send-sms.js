exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { status, bookingId, passenger } = JSON.parse(event.body);
    
    // The Vault: These will be pulled from your Netlify settings
    const twilioSID = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    const myNumber = process.env.DISPATCH_PHONE_NUMBER;

    const message = `SM LIMO AUTO: ${status} | ID: ${bookingId} | Client: ${passenger}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSID}/Messages.json`;
    
    const auth = Buffer.from(`${twilioSID}:${twilioToken}`).toString('base64');

    try {
        const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'To': myNumber,
                'From': twilioNumber,
                'Body': message
            })
        });

        if (response.ok) {
            return { statusCode: 200, body: JSON.stringify({ message: "Text Sent Successfully" }) };
        } else {
            const errData = await response.json();
            return { statusCode: 500, body: JSON.stringify(errData) };
        }
    } catch (err) {
        return { statusCode: 500, body: err.toString() };
    }
};