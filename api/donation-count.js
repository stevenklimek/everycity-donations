export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or specify your domain
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const response = await fetch('https://cwccgwjvphpluyzxqzxh.supabase.co/rest/v1/donations?select=count(*)', {
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Y2Nnd2p2cGhwbHV5enhxenhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjcyMDcsImV4cCI6MjA3MDI0MzIwN30.zfX9vl-mv68ceT9FcobLibMuhZOxR3cs9tBlNcpmxeo',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Y2Nnd2p2cGhwbHV5enhxenhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjcyMDcsImV4cCI6MjA3MDI0MzIwN30.zfX9vl-mv68ceT9FcobLibMuhZOxR3cs9tBlNcpmxeo'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({ count: data[0]?.count || 2 });
    } else {
      res.json({ count: 2 });
    }
  } catch (error) {
    console.error('Count error:', error);
    res.json({ count: 2 });
  }
}
