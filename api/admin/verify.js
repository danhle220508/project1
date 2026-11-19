/**
 * Vercel Serverless Function: POST /api/admin/verify
 * Xác thực phân quyền Quản trị viên (RBAC) phía Server trên môi trường Vercel
 */
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: '405 Method Not Allowed' }));
    return;
  }

  let bodyObj = {};
  if (req.body && typeof req.body === 'object') {
    bodyObj = req.body;
  } else if (typeof req.body === 'string' && req.body.trim()) {
    try {
      bodyObj = JSON.parse(req.body);
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: 'Dữ liệu JSON không hợp lệ' }));
      return;
    }
  }

  const role = req.headers['x-pcmon-role'] || bodyObj.role;
  if (role !== 'admin') {
    res.statusCode = 403;
    res.end(JSON.stringify({
      ok: false,
      error: '403 Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    role: 'admin',
    verifiedAt: new Date().toISOString()
  }));
};
