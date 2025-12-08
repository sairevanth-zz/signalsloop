
echo "\nTesting /api/demo/spec/generate endpoint..."

# Make a POST request with streaming
curl -N -X POST http://localhost:3000/api/demo/spec/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build a simple to-do list app"}'

echo "\n\nTest complete."
