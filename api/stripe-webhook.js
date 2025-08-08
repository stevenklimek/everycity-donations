import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe + Supabase env variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-08-01' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Disable body parsing for raw Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const amountInCents = session.amount_total; // e.g., 800
    const amountInDollars = Math.round(amountInCents / 100);

    // Insert into Supabase
    const { error } = await supabase
      .from('donations')
      .insert([{ amount: amountInDollars }]);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to insert donation' });
    }

    console.log(`✅ Donation of $${amountInDollars} inserted into Supabase.`);
  }

  res.json({ received: true });
}
