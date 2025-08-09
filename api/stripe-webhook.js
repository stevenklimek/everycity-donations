const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  let event;

  try {
    const signature = req.headers['stripe-signature'];
    
    // Get raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const amount = session.amount_total / 100; // Convert cents to dollars

    try {
      const { error } = await supabase.from('donations').insert({
        amount,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).send('Supabase insert failed');
      }

      return res.status(200).send('Success');
    } catch (err) {
      console.error('Insert error:', err);
      return res.status(500).send('Server error');
    }
  }

  res.status(200).send('Event received');
}
