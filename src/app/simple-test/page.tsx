export default function SimpleTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-100 p-4 rounded">
          <p>This is a simple static page without any JavaScript.</p>
        </div>
        
        <div className="bg-green-100 p-4 rounded">
          <p>If you can see this, the page is loading correctly.</p>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded">
          <p>This page has no client-side JavaScript at all.</p>
        </div>
        
        <div className="mt-6">
          <a 
            href="/test-project/board" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Test Board
          </a>
        </div>
      </div>
    </div>
  );
}
