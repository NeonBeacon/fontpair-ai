import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Config error', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData = await req.formData();
    const licenseKey = formData.get('license_key') as string;

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
    return new Response('OK', { status: 200 });
  }
}