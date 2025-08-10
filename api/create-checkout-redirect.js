import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS headers handled by vercel.json, but keeping OPTIONS handler
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get amount from query params (GET) or body (POST)
  const amount = req.method === 'GET' ? req.query.amount : req.body?.amount;
  
  console.log('Received amount:', amount);
  
  if (!amount || isNaN(amount) || parseFloat(amount) < 1) {
    return res.status(400).json({ error: 'Invalid amount provided' });
  }

  // Validate amount range
  const numAmount = parseFloat(amount);
  if (numAmount > 999) {
    return res.status(400).json({ error: 'Amount exceeds maximum limit' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Coffee Support - $${amount}`,
            description: 'Thanks for supporting the podcast with coffee! ☕',
          },
          unit_amount: Math.round(numAmount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://everycitywhispers.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://everycitywhispers.com/cancel',
      metadata: {
        amount: amount,
        type: 'coffee_support'
      }
    });

    console.log('Stripe session created:', session.id);
    
    // Redirect directly to Stripe checkout
    res.redirect(302, session.url);
    
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
