'use client';

export default function EnvTestPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_URL:</h2>
          <p className="bg-gray-100 p-2 rounded font-mono text-sm">
            {supabaseUrl || 'NOT SET'}
          </p>
        </div>
        
        <div>
          <h2 className="font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY:</h2>
          <p className="bg-gray-100 p-2 rounded font-mono text-sm">
            {supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET'}
          </p>
        </div>
        
        <div>
          <h2 className="font-semibold">Status:</h2>
          <p className={`p-2 rounded ${supabaseUrl && supabaseKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {supabaseUrl && supabaseKey ? '✅ Environment variables are loaded' : '❌ Environment variables are missing'}
          </p>
        </div>
      </div>
    </div>
  );
}
