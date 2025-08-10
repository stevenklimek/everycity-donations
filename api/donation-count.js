export default async function handler(req, res) {
  // CORS headers are handled by vercel.json
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(
      'https://cwccgwjvphpluyzxqzxh.supabase.co/rest/v1/donations?select=count(*)', 
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    const data = await response.json();
    const count = data[0]?.count || 2;
    
    res.status(200).json({ 
      count: count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Count error:', error);
    res.status(200).json({ 
      count: 2, 
      error: 'Failed to fetch count',
      timestamp: new Date().toISOString()
    });
  }
}
