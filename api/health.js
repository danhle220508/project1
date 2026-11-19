/**
 * Vercel Serverless Function: GET /api/health
 * Kiểm tra trạng thái hoạt động của PC MON trên môi trường Production (Vercel)
 */
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    service: 'PC MON MVP',
    version: '1.0.0',
    platform: 'vercel-serverless',
    status: 'healthy',
    timestamp: new Date().toISOString()
  }));
};
