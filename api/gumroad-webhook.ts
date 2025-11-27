import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mySellerId = process.env.GUMROAD_SELLER_ID;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase config');
    return new Response('Config error', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    
    // Log full payload for debugging
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });
    console.log('Gumroad Webhook Payload:', JSON.stringify(payload, null, 2));

    const licenseKey = formData.get('license_key') as string;
    const email = formData.get('email') as string;
    const sellerId = formData.get('seller_id') as string;

    // Validate Seller ID if configured
    if (mySellerId && sellerId !== mySellerId) {
      console.error(`Invalid seller_id: ${sellerId}`);
      return new Response('Unauthorized', { status: 401 });
    }
    
    if (!licenseKey) {
      console.error('No license key provided');
      return new Response('No license key', { status: 400 });
    }

    const { error } = await supabase.from('licenses').insert({
      license_key: licenseKey,
      purchase_email: email,
      tier: 'professional',
      max_devices: 3,
      is_active: true
    });

    if (error) {
      console.error('Supabase insert error:', error);
      return new Response('Database error', { status: 500 });
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response('Server error', { status: 500 });
  }
}