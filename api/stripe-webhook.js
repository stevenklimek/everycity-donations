import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const buf = await buffer(req);
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log('Processing completed checkout:', session.id);
        
        // Get customer email from the session
        const customerEmail = session.customer_details?.email;
        const amount = session.amount_total / 100;
        
        try {
            // 1. Insert into Supabase database
            const { data, error } = await supabase
                .from('donations')
                .insert([{ 
                    amount: amount, 
                    stripe_id: session.id,
                    customer_email: customerEmail // Optional: store email in DB too
                }]);
            
            if (error) {
                console.error('Supabase insert error:', error);
                // Don't return here - still try to send email
            } else {
                console.log('Successfully inserted donation:', data);
            }

            // 2. Send thank you email via Resend
            if (customerEmail) {
                try {
                    const emailResponse = await resend.emails.send({
                        from: 'thank-you@yourdomain.com', // Replace with your verified domain
                        to: customerEmail,
                        subject: 'Thank you for buying me coffee! ☕',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h1 style="color: #000568; margin-bottom: 10px;">Thank You for the Coffee! ☕</h1>
                                    <p style="color: #666; font-size: 16px;">Your support means the world to me!</p>
                                </div>
                                
                                <div style="background: linear-gradient(135deg, #000568 0%, #56a0d3 100%); 
                                           color: white; padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
                                    <h2 style="margin: 0; margin-bottom: 10px;">Donation Confirmed</h2>
                                    <p style="font-size: 24px; font-weight: bold; margin: 0;">$${amount}</p>
                                </div>
                                
                                <p style="color: #333; line-height: 1.6;">
                                    Thanks to your generous support, I can keep creating great content! 
                                    Your coffee contribution will fuel the next episode and help me continue bringing you quality content.
                                </p>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <p style="color: #666; font-style: italic;">"Every great episode starts with great coffee" ☕</p>
                                </div>
                                
                                <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
                                    <p>Questions? Just reply to this email - I'd love to hear from you!</p>
                                    <p style="margin: 0;">- [Your Name]</p>
                                </div>
                            </div>
                        `
                    });
                    
                    console.log('Thank you email sent successfully:', emailResponse.data?.id);
                } catch (emailError) {
                    console.error('Failed to send thank you email:', emailError);
                    // Log error but don't fail the webhook - database update succeeded
                }
            } else {
                console.log('No customer email found in session');
            }
            
        } catch (err) {
            console.error('Webhook processing failed:', err);
            return res.status(500).json({ error: 'Webhook processing failed' });
        }
    }

    res.json({ received: true });
}
