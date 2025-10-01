export async function GET() {
  return new Response(JSON.stringify({ 
    message: 'Ultra simple API working',
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
