import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // latest as of Aug 2025
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe requires raw body to validate signatures
export const config = {
  api: {
    bodyParser: false,
  },
};

import getRawBody from 'raw-body';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

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
