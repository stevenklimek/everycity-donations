import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
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
          unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://your-website.com/thank-you?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://your-website.com/donation-cancelled',
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
      details: error.message 
    });
  }
}
