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
        
        // Extract first name only
        const firstName = customerName.split(' ')[0];
        
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
                        subject: `Thanks for the coffee, ${firstName}! ☕`,
                        html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Every City Whispers Email Preview</title>
                            </head>
                            <body style="background: #f0f0f0; padding: 20px;">
                                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
                                    <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                        
                                        <!-- Header with Logo on Pink Background -->
                                        <div style="background: #ff6980; padding: 25px 30px; text-align: center;">
                                            <!-- Your logo image -->
                                            <img src="https://assets.zyrosite.com/Yg2yl7rrEViogZx1/ecw_logo_email_header_v4_small-mp8JZO2Mq5Caek3J.png" alt="Every City Whispers" style="max-width: 200px; height: auto; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                                        </div>
                                        
                                        <!-- Main Content -->
                                        <div style="padding: 40px 30px;">
                                            <!-- Message -->
                                            <div style="color: #374151; line-height: 1.6; font-size: 16px;">
                                                <h1 style="margin: 0 0 30px 0; font-size: 28px; font-weight: 700; color: #000568;">Thank You for Your Support! ☕</h1>
                                                
                                                <p>Hey ${firstName},</p>
                                                
                                                <p>Thank you, thank you, THANK YOU (so much!) for buying me coffee! 🙌 Your support keeps the creative energy flowing and gets me one step closer to doing this EveryCity thing full-time (chasing the dream, you know?).</p>
                                               
                                                <p>I'll keep this short & sweet, but your contribution means more than you know. I've been putting a lot of time and energy into trying to make something interesting, and I am intentionally trying not to worry too much about how many people are listening (because I don't want to open the door to anything that could discourage me, and I know that growing a community takes time). But every little signal that someone is genuinely interested helps push me along.</p>
                                                
                                                <p>Questions or just want to say hi? Just reply to this email! I'd love to hear from you.</p>
                                                
                                                <p>Thanks again,<br>Steven 🎙️</p>
                                            </div>
                                            
                                            <!-- Quote Section with Brand Colors -->
                                            <div style="background: linear-gradient(135deg, #ff6980 0%, #ffff00 100%); padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
                                                <p style="margin: 0; color: #000568; font-style: italic; font-size: 14px; font-weight: 600;">
                                                    "Every great episode starts with great coffee" ☕
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </body>
                            </html>
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
