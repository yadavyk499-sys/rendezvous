const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET — fetch plan by code
    if (event.httpMethod === 'GET') {
      const code = event.queryStringParameters?.code;
      if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing code' }) };

      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('code', code)
        .single();

      if (error) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Plan not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // POST — create new plan
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const { total, host } = body;

      const code = Math.random().toString(36).substr(2, 6).toUpperCase();
      const zones = ['Hauz Khas Village','Khan Market','Connaught Place','Saket','Defence Colony','Greater Kailash','Cyberhub Gurgaon','Sector 29 Gurgaon','Noida Sector 18','Vasant Vihar'];
      const zone = zones[Math.floor(Math.random() * zones.length)];

      const slots = [
        { index: 0, ...host, joined: true },
        ...Array.from({ length: total - 1 }, (_, i) => ({ index: i + 1, joined: false }))
      ];

      const { data, error } = await supabase
        .from('plans')
        .insert({ code, total, host, slots, zone })
        .select()
        .single();

      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 201, headers, body: JSON.stringify({ code, id: data.id }) };
    }

    // PATCH — friend joins
    if (event.httpMethod === 'PATCH') {
      const code = event.queryStringParameters?.code;
      const body = JSON.parse(event.body);

      const { data: plan, error: fetchError } = await supabase
        .from('plans')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Plan not found' }) };

      const slots = plan.slots;
      const emptySlot = slots.find(s => !s.joined);
      if (!emptySlot) return { statusCode: 400, headers, body: JSON.stringify({ error: 'All slots filled' }) };

      Object.assign(emptySlot, { ...body, joined: true });

      const { data, error } = await supabase
        .from('plans')
        .update({ slots })
        .eq('code', code)
        .select()
        .single();

      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
