import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount } = req.query;
  
  if (!amount || isNaN(amount) || amount < 1) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Coffee Support',
            description: `Thanks for buying me coffee! ☕`,
          },
          unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://your-success-page.com',
      cancel_url: 'https://your-cancel-page.com',
    });

    // Direct redirect to Stripe
    res.redirect(302, session.url);
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Payment setup failed' });
  }
}
