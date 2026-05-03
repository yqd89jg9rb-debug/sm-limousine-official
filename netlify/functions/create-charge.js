const stripe = require('stripe')(process.env.STRIPE_SK);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { token, amount, email, description } = JSON.parse(event.body);

    const charge = await stripe.charges.create({
      amount: Math.round(parseFloat(amount) * 100), // amount in cents
      currency: 'usd',
      source: token,
      description: description,
      receipt_email: email
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, chargeId: charge.id })
    };
  } catch (error) {
    console.error('Stripe Charge Error:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
