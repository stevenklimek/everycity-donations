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

// Helper function to get donation count for an email
async function getDonationCount(email) {
    try {
        const { data, error } = await supabase
            .from('donations')
            .select('id')
            .eq('customer_email', email);
        
        if (error) {
            console.error('Error fetching donation count:', error);
            return 0;
        }
        
        return data ? data.length : 0;
    } catch (err) {
        console.error('Exception fetching donation count:', err);
        return 0;
    }
}

// Helper function to send first-time donor email
async function sendFirstTimeDonorEmail(customerEmail, firstName, amount) {
    return await resend.emails.send({
        from: 'steven@everycitywhispers.com',
        to: customerEmail,
        subject: `Thanks for the coffee, ${firstName}! ☕`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Every City Whispers - Thank You!</title>
            </head>
            <body style="background: #f0f0f0; padding: 20px;">
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
                    <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header with Logo on Pink Background -->
                        <div style="background: #ff6980; padding: 25px 30px; text-align: center;">
                            <img src="https://assets.zyrosite.com/Yg2yl7rrEViogZx1/ecw_logo_email_header_v4_small-mp8JZO2Mq5Caek3J.png" alt="Every City Whispers" style="max-width: 200px; height: auto; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        </div>
                        
                        <!-- Main Content -->
                        <div style="padding: 40px 30px;">
                            <div style="color: #374151; line-height: 1.6; font-size: 16px;">
                                <h1 style="margin: 0 0 30px 0; font-size: 28px; font-weight: 700; color: #000568;">Thank You, Thank You, THANK YOU! ☕</h1>
                                
                                <p>Hey ${firstName},</p>
                                
                                <p>Thank you (so much!) for buying me coffee! 🙌 Your support keeps the creative energy flowing and gets me one step closer to doing this EveryCity thing full-time (chasing the dream, you know?).</p>
                               
                                <p>I'll keep this short & sweet, but your contribution means more than you know. Growing a community takes time, but every little signal that someone is genuinely interested helps push me along.</p>
                                
                                <p>Questions or just want to say hi? Just reply to this email! I'd love to hear from you.</p>
                                
                                <p>Thanks again,<br>Steven 🎙️</p>
                            </div>
                            
                            <!-- Quote Section -->
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
}

// Helper function to send repeat donor email
async function sendRepeatDonorEmail(customerEmail, firstName, amount, donationCount) {
    return await resend.emails.send({
        from: 'steven@everycitywhispers.com',
        to: customerEmail,
        subject: `${firstName}, you're amazing! ☕ (Thank you again!)`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Every City Whispers - Thank You Again!</title>
            </head>
            <body style="background: #f0f0f0; padding: 20px;">
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
                    <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header with Logo -->
                        <div style="background: #ff6980; padding: 25px 30px; text-align: center;">
                            <img src="https://assets.zyrosite.com/Yg2yl7rrEViogZx1/ecw_logo_email_header_v4_small-mp8JZO2Mq5Caek3J.png" alt="Every City Whispers" style="max-width: 200px; height: auto; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                        </div>
                        
                        <!-- Main Content -->
                        <div style="padding: 40px 30px;">
                            <div style="color: #374151; line-height: 1.6; font-size: 16px;">
                                <h1 style="margin: 0 0 30px 0; font-size: 28px; font-weight: 700; color: #000568;">You're Incredible! ☕✨</h1>
                                
                                <p>Hey ${firstName},</p>
                                
                                <p>WOW! You've now supported Every City Whispers <strong>${donationCount} times</strong>! 🤯 I'm blown away. I have this stuffed animal monkey at my house ("Ty") who, weirdly, picks up on my energy. Since I saw you made another contribution, he's been running around the apartment throwing things all over the place. He can sense my excitement and Ty does everything 10x.</p>
                               
                                <p>Seriously, you are making this whole EveryCity thing possible. When someone comes back more than once... that tells me I'm actually creating something worthwhile.</p>
                                
                                <p>Your ongoing belief in what I'm building here means everything. Every time I see a familiar name pop up, it gives me that extra push to keep going, keep improving, and keep chasing this dream of making Every City Whispers something special.</p>
                                
                                <p>You're not just buying coffee at this point – you're investing in something bigger. Thank you for being part of this journey with me.</p>
                                
                                <p>As always, feel free to reply and say hi!</p>
                                
                                <p>I appreciate you 🙏,<br>Steven 🎙️</p>
                            </div>
                            
                            <!-- Special Quote for Repeat Donors -->
                            <div style="background: linear-gradient(135deg, #ff6980 0%, #ffff00 100%); padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
                                <p style="margin: 0; color: #000568; font-style: italic; font-size: 14px; font-weight: 600;">
                                    "True supporters don't just listen – they participate in the vision" 🌟
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    });
}

export default async function handler(req, res) {
    // Better method validation
    if (req.method !== 'POST') {
        console.error(`Invalid method: ${req.method}`);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const sig = req.headers['stripe-signature'];
    
    // Validate webhook signature exists
    if (!sig) {
        console.error('Missing Stripe signature');
        return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    let event;

    try {
        const buf = await buffer(req);
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log(`Webhook event received: ${event.type} - ${event.id}`);
    } catch (err) {
        console.error('Webhook signature verification failed:', {
            error: err.message,
            signature: sig ? 'Present' : 'Missing',
            timestamp: new Date().toISOString()
        });
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`Processing completed checkout: ${session.id}`);
        
        // Extract and validate session data
        const customerEmail = session.customer_details?.email;
        const rawAmount = session.amount_total;
        const customerName = session.customer_details?.name || 'Coffee Supporter';
        
        // Validate essential data
        if (!rawAmount || rawAmount <= 0) {
            console.error('Invalid amount in session:', rawAmount);
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        const amount = rawAmount / 100; // Convert cents to dollars
        const firstName = customerName.split(' ')[0];
        
        console.log(`Processing donation: $${amount} from ${customerName} (${customerEmail})`);
        
        let dbInsertSuccess = false;
        let donationCount = 0;
        
        try {
            // Step 1: Check if this is a repeat donor (before inserting new record)
            if (customerEmail) {
                donationCount = await getDonationCount(customerEmail);
                console.log(`Existing donation count for ${customerEmail}: ${donationCount}`);
            }
            
            // Step 2: Insert into Supabase database with retry logic
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries && !dbInsertSuccess) {
                try {
                    const { data, error } = await supabase
                        .from('donations')
                        .insert([{ 
                            amount: amount, 
                            stripe_id: session.id,
                            customer_email: customerEmail,
                            customer_name: customerName,
                            created_at: new Date().toISOString()
                        }])
                        .select(); // Return the inserted record
                    
                    if (error) {
                        throw error;
                    }
                    
                    console.log('Successfully inserted donation:', data);
                    dbInsertSuccess = true;
                } catch (dbError) {
                    retryCount++;
                    console.error(`Database insert attempt ${retryCount} failed:`, {
                        error: dbError.message,
                        code: dbError.code,
                        sessionId: session.id
                    });
                    
                    if (retryCount < maxRetries) {
                        // Wait before retry (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                    } else {
                        console.error('All database insert attempts failed');
                        // Continue to email sending even if DB fails
                    }
                }
            }

            // Step 3: Send personalized thank you email
            if (customerEmail) {
                try {
                    let emailResponse;
                    
                    // Determine if this is a repeat donor (donationCount will be previous donations)
                    if (donationCount > 0) {
                        console.log(`Sending repeat donor email (donation #${donationCount + 1})`);
                        emailResponse = await sendRepeatDonorEmail(customerEmail, firstName, amount, donationCount + 1);
                    } else {
                        console.log('Sending first-time donor email');
                        emailResponse = await sendFirstTimeDonorEmail(customerEmail, firstName, amount);
                    }
                    
                    console.log('Thank you email sent successfully:', emailResponse.data?.id);
                } catch (emailError) {
                    console.error('Failed to send thank you email:', {
                        error: emailError.message,
                        customerEmail,
                        sessionId: session.id,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Log specific Resend API errors
                    if (emailError.response?.data) {
                        console.error('Resend API error details:', emailError.response.data);
                    }
                    
                    // Don't fail the webhook for email errors
                }
            } else {
                console.log('No customer email found in session - skipping email');
            }
            
        } catch (err) {
            console.error('Webhook processing failed:', {
                error: err.message,
                stack: err.stack,
                sessionId: session.id,
                timestamp: new Date().toISOString()
            });
            
            // Return error but don't completely fail if partial success
            if (!dbInsertSuccess) {
                return res.status(500).json({ 
                    error: 'Critical webhook processing failed',
                    sessionId: session.id 
                });
            }
        }
        
        console.log(`Webhook processing completed for session: ${session.id}`);
    }
    
    // Handle other event types
    else if (event.type === 'payment_intent.payment_failed') {
        console.log('Payment failed:', event.data.object.id);
        // Optional: Handle failed payments, send recovery email, etc.
    }
    
    else if (event.type === 'invoice.payment_failed') {
        console.log('Invoice payment failed:', event.data.object.id);
        // Handle subscription payment failures if you add subscriptions later
    }
    
    else {
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Always return success to Stripe
    return res.status(200).json({ 
        received: true, 
        eventType: event.type,
        eventId: event.id 
    });
}
