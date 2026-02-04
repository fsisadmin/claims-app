// Health check endpoint for monitoring and keep-alive
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
