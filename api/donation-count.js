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
    // Simple approach: just get all records and count them in JavaScript
    const response = await fetch(
      'https://cwccgwjvphpluyzxqzxh.supabase.co/rest/v1/donations', 
      {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Y2Nnd2p2cGhwbHV5enhxenhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjcyMDcsImV4cCI6MjA3MDI0MzIwN30.zfX9vl-mv68ceT9FcobLibMuhZOxR3cs9tBlNcpmxeo',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Y2Nnd2p2cGhwbHV5enhxenhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjcyMDcsImV4cCI6MjA3MDI0MzIwN30.zfX9vl-mv68ceT9FcobLibMuhZOxR3cs9tBlNcpmxeo'
        }
      }
    );
    
    console.log('Supabase response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    if (response.status === 401) {
      console.error('Authentication failed - API key may be expired or invalid');
      throw new Error('Supabase authentication failed');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error response:', errorText);
      throw new Error(`Supabase error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Supabase data:', data);
    console.log('Number of records:', data.length);
    
    // Simply count the array length
    const count = Array.isArray(data) ? data.length : 2;
    
    res.status(200).json({ 
      count: count,
      records: data.length,
      timestamp: new Date().toISOString(),
      success: true
    });
    
  } catch (error) {
    console.error('Count error details:', error.message);
    res.status(200).json({ 
      count: 2, 
      error: 'Failed to fetch count',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
