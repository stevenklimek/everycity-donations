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
        
        const customerEmail = session.customer_details?.email;
        const amount = session.amount_total / 100; // Convert cents to dollars
        const customerName = session.customer_details?.name || 'Coffee Supporter';
        
        try {
            // 1. Insert into Supabase database
            const { data, error } = await supabase
                .from('donations')
                .insert([{ 
                    amount: amount, 
                    stripe_id: session.id,
                    customer_email: customerEmail,
                    customer_name: customerName
                    // created_at will use the default now() value
                }]);
            
            if (error) {
                console.error('Supabase insert error:', error);
                // Log error but continue with email
            } else {
                console.log('Successfully inserted donation:', data);
            }

            // 2. Send personalized thank you email
            if (customerEmail) {
                try {
                    const emailResponse = await resend.emails.send({
                        from: 'steven@everycitywhispers.com',
                        to: customerEmail,
                        subject: `Thanks for the coffee, ${customerName}! ☕`,
                        html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
                                <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                    <!-- Header -->
                                    <div style="background: linear-gradient(135deg, #000568 0%, #56a0d3 100%); color: white; padding: 40px 30px; text-align: center;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Thank You, ${customerName}! ☕</h1>
                                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your coffee support means everything!</p>
                                    </div>
                                    
                                    <!-- Donation Amount -->
                                    <div style="padding: 30px; text-align: center;">
                                        <div style="background: linear-gradient(135deg, #000568 0%, #56a0d3 100%); color: white; padding: 20px; border-radius: 15px; margin-bottom: 30px;">
                                            <h2 style="margin: 0; font-size: 18px; font-weight: 600; opacity: 0.9;">Donation Confirmed</h2>
                                            <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: 800; color: #FFFF00;">$${amount.toFixed(2)}</p>
                                        </div>
                                        
                                        <!-- Message -->
                                        <div style="text-align: left; color: #374151; line-height: 1.6; font-size: 16px;">
                                            <p>Hey ${customerName},</p>
                                            <p>Wow, thank you so much for buying me coffee! 🙌 Your support truly keeps the creative energy flowing and helps me produce better content for everyone.</p>
                                            <p>This contribution will go directly toward:</p>
                                            <ul style="margin: 15px 0; padding-left: 20px;">
                                                <li>Quality equipment and software</li>
                                                <li>Research and preparation time</li>
                                                <li>And yes, lots of actual coffee! ☕</li>
                                            </ul>
                                            <p>I'm genuinely grateful for supporters like you who make this whole thing possible. Keep an eye out for new episodes coming soon!</p>
                                        </div>
                                        
                                        <!-- Call to Action -->
                                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
                                            <p style="margin: 0; color: #6b7280; font-style: italic; font-size: 14px;">
                                                "Every great episode starts with great coffee" ☕
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <!-- Footer -->
                                    <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                                        <p style="margin: 0;">Questions or just want to say hi? Just reply to this email!</p>
                                        <p style="margin: 5px 0 0 0; font-weight: 600;">- Steven 🎙️</p>
                                    </div>
                                </div>
                            </div>
                        `
                    });
                    
                    console.log('Thank you email sent successfully:', emailResponse.data?.id);
                } catch (emailError) {
                    console.error('Failed to send thank you email:', emailError);
                    // Don't fail the webhook - log the error but continue
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
