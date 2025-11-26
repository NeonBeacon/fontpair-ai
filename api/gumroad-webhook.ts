import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const licenseKey = formData.get('license_key') as string;
    const email = formData.get('email') as string;
    const saleTimestamp = formData.get('sale_timestamp') as string;
    
    if (!licenseKey) {
      return new Response('No license key', { status: 400 });
    }

    await supabase.from('licenses').insert({
      license_key: licenseKey,
      tier: 'professional',
      max_devices: 3
    });

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('OK', { status: 200 });
  }
}