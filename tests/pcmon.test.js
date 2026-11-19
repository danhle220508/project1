/**
 * PC MON - Phase 9 Automated End-to-End & Unit Test Suite
 * Kiểm thử toàn diện: Điều hướng đa trang, Kho linh kiện thực tế, Bộ kiểm tra tương thích,
 * Thuật toán Chuyên gia PC không vượt ngân sách, So sánh giá 5 đại lý, Giỏ hàng yêu cầu đăng nhập & Bảo mật Admin RBAC.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const retailerHtmlContent = fs.readFileSync(path.join(ROOT_DIR, 'retailer-build.html'), 'utf8');
const jsContent = fs.readFileSync(path.join(ROOT_DIR, 'script.js'), 'utf8');

function createMockElement(id = '') {
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    checked: true,
    style: { setProperty: () => {} },
    dataset: {},
    classList: {
      _set: new Set(),
      add(...cls) { cls.forEach(c => this._set.add(c)); },
      remove(...cls) { cls.forEach(c => this._set.delete(c)); },
      toggle(c) {
        if (this._set.has(c)) { this._set.delete(c); return false; }
        this._set.add(c); return true;
      },
      contains(c) { return this._set.has(c); }
    },
    addEventListener: () => {},
    appendChild: () => {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    setAttribute: () => {},
    getAttribute: () => 'dark',
    closest: () => null,
    focus: () => {},
    scrollIntoView: () => {},
    remove: () => {}
  };
}

function createBrowserSandbox() {
  const elements = new Map();
  const sandbox = {
    Intl, Number, Math, Date, JSON, Array, Object, String, Boolean, RegExp, Error, Map, Set, Promise,
    URL, URLSearchParams,
    encodeURIComponent, decodeURIComponent,
    setTimeout: () => {}, clearTimeout: () => {},
    console,
    alert: () => {},
    confirm: () => true,
    prompt: () => 'PC Test Renamed',
    fetch: () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) }),
    HTMLElement: function() {},
    localStorage: {
      store: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; },
      clear() { this.store = {}; }
    },
    navigator: {
      clipboard: { writeText: () => Promise.resolve() }
    },
    window: null,
    lucide: { createIcons: () => {} },
    document: {
      documentElement: createMockElement('html'),
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createMockElement(id));
        return elements.get(id);
      },
      querySelector: () => createMockElement(),
      querySelectorAll: () => [createMockElement()],
      createElement: (tag) => createMockElement(tag),
      createDocumentFragment: () => createMockElement('fragment'),
      addEventListener: () => {}
    }
  };

  sandbox.window = {
    location: { hash: '', pathname: '/', origin: 'http://localhost:3000' },
    history: { pushState: () => {} },
    scrollTo: () => {},
    addEventListener: () => {},
    open: () => {},
    print: () => {},
    lucide: sandbox.lucide
  };

  vm.runInNewContext(jsContent, sandbox);
  return { sandbox, core: sandbox.window.PCMON_CORE };
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     -> ${err.message}`);
      failed++;
    }
  }

  console.log('======================================================================');
  console.log('🚀 BẮT ĐẦU CHẠY BỘ KIỂM THỬ TỰ ĐỘNG PC MON (PHASE 9 QA & DEPLOYMENT)');
  console.log('======================================================================\n');

  const { sandbox, core } = createBrowserSandbox();

  // 1. KIỂM THỬ GIAO DIỆN & ĐIỀU HƯỚNG ĐA TRANG (MULTI-PAGE ROUTER)
  await test('1.1. Tất cả 9 trang tác vụ độc lập đều tồn tại trong index.html và Router', () => {
    const expectedPages = ['home', 'usage', 'budget', 'builder', 'summary', 'featured', 'account', 'cart', 'admin'];
    expectedPages.forEach(page => {
      assert.ok(core.VALID_PAGES.includes(page), `Router thiếu trang ${page}`);
      assert.ok(htmlContent.includes(`data-page-view="${page}"`), `index.html thiếu section data-page-view="${page}"`);
    });
  });

  await test('1.2. Mọi ID phần tử tĩnh được gọi trong script.js đều khớp 100% với index.html', () => {
    const idRegex = /getElementById\('([^']+)'\)/g;
    let match;
    const dynamicIds = new Set(['btn-summary-quick-autobuild']);
    while ((match = idRegex.exec(jsContent)) !== null) {
      const id = match[1];
      if (dynamicIds.has(id)) continue;
      assert.ok(htmlContent.includes(`id="${id}"`), `Không tìm thấy id="${id}" trong index.html`);
    }
  });

  await test('1.3. Chế độ giao diện mặc định là Dark Mode và nút Admin mặc định được ẩn (hidden)', () => {
    assert.ok(htmlContent.includes('data-theme="dark"'), 'HTML phải mặc định ở chế độ tối data-theme="dark"');
    assert.ok(
      /id="btn-nav-admin"[^>]*class="[^"]*hidden/.test(htmlContent) ||
      /class="[^"]*hidden[^"]*"[^>]*id="btn-nav-admin"/.test(htmlContent),
      'Nút Admin trên Navbar phải ẩn (hidden) mặc định'
    );
  });

  // 2. KIỂM THỬ KHO DỮ LIỆU LINH KIỆN THỰC TẾ, GIÁ NIÊM YẾT & NGÀY CÔNG BỐ GIÁ
  await test('2.1. Kho dữ liệu có đủ 8 danh mục phần cứng và >= 55 sản phẩm thực tế đang lưu hành', () => {
    assert.strictEqual(core.slotDefinitions.length, 8, 'Phải có đúng 8 danh mục linh kiện chuẩn');
    let totalProducts = 0;
    core.slotDefinitions.forEach(({ key }) => {
      const list = core.componentsDB[key];
      assert.ok(Array.isArray(list) && list.length >= 6, `Danh mục ${key} phải có ít nhất 6 sản phẩm`);
      totalProducts += list.length;
    });
    assert.ok(totalProducts >= 55, `Tổng số sản phẩm (${totalProducts}) phải >= 55`);
  });

  await test('2.2. 100% sản phẩm sử dụng URL ảnh thực tế (không dùng SVG vẽ) và có Ngày công bố giá', () => {
    core.slotDefinitions.forEach(({ key }) => {
      core.componentsDB[key].forEach(item => {
        assert.ok(item.image && item.image.startsWith('https://'), `Sản phẩm ${item.id} thiếu ảnh thực tế HTTPS`);
        assert.ok(!item.image.startsWith('data:image/svg'), `Sản phẩm ${item.id} không được dùng ảnh vẽ SVG`);
        assert.ok(typeof item.price === 'number' && item.price >= 0, `Sản phẩm ${item.id} có giá không hợp lệ`);
        assert.ok(/^\d{2}\/\d{2}\/\d{4}$/.test(item.priceUpdatedAt), `Sản phẩm ${item.id} thiếu ngày công bố giá chuẩn DD/MM/YYYY`);
      });
    });
  });

  // 3. KIỂM THỬ BỘ QUY TẮC TƯƠNG THÍCH PHẦN CỨNG (COMPATIBILITY ENGINE)
  await test('3.1. Phát hiện chính xác xung đột Socket CPU (LGA1700) và Mainboard (AM5)', () => {
    const build = core.createEmptyBuild();
    build.cpu = core.componentsDB.cpu.find(c => c.socket === 'LGA1700');
    build.motherboard = core.componentsDB.motherboard.find(m => m.socket === 'AM5');
    const { issues } = core.evaluateBuildCompatibility(build);
    assert.ok(issues.some(i => i.id === 'socket-mismatch'), 'Phải báo lỗi xung đột Socket CPU & Mainboard');
  });

  await test('3.2. Phát hiện chính xác xung đột chuẩn RAM (Mainboard DDR5 lắp RAM DDR4)', () => {
    const build = core.createEmptyBuild();
    build.motherboard = core.componentsDB.motherboard.find(m => m.ramType === 'DDR5');
    build.ram = core.componentsDB.ram.find(r => r.type === 'DDR4');
    const { issues } = core.evaluateBuildCompatibility(build);
    assert.ok(issues.some(i => i.id === 'ram-mismatch'), 'Phải báo lỗi xung đột chuẩn RAM DDR4/DDR5');
  });

  await test('3.3. Phát hiện chính xác xung đột kích thước Mainboard ATX lắp vào vỏ Case Micro-ATX', () => {
    const build = core.createEmptyBuild();
    build.motherboard = core.componentsDB.motherboard.find(m => m.form === 'ATX');
    build.case = core.componentsDB.case.find(c => !c.supportedForms.includes('ATX'));
    const { issues } = core.evaluateBuildCompatibility(build);
    assert.ok(issues.some(i => i.id === 'case-form-mismatch'), 'Phải báo lỗi kích thước Mainboard ATX không vừa Case Micro-ATX');
  });

  await test('3.4. Phát hiện chính xác lỗi chọn CPU dòng F (không iGPU) nhưng dùng tùy chọn Đồ họa tích hợp', () => {
    const build = core.createEmptyBuild();
    build.cpu = core.componentsDB.cpu.find(c => !c.hasIgpu);
    build.gpu = core.componentsDB.gpu.find(g => g.requiresIgpuCpu);
    const { issues } = core.evaluateBuildCompatibility(build);
    assert.ok(issues.some(i => i.id === 'igpu-missing-on-f-cpu'), 'Phải báo lỗi CPU dòng F không có nhân đồ họa tích hợp');
  });

  await test('3.5. Phát hiện chính xác lỗi công suất nguồn PSU không đủ gánh cấu hình RTX 4080 SUPER', () => {
    const build = core.createEmptyBuild();
    build.cpu = core.componentsDB.cpu.find(c => c.tdp >= 120);
    build.gpu = core.componentsDB.gpu.find(g => g.tdp >= 280);
    build.psu = core.componentsDB.psu.find(p => p.wattage <= 550);
    const { issues } = core.evaluateBuildCompatibility(build);
    assert.ok(
      issues.some(i => i.id === 'psu-overload' || i.id === 'psu-under-recommended'),
      'Phải báo lỗi nguồn PSU thiếu công suất'
    );
  });

  // 4. KIỂM THỬ THUẬT TOÁN CHUYÊN GIA TƯ VẤN & CAM KẾT KHÔNG VƯỢT NGÂN SÁCH
  await test('4.1. Thuật toán solveExpertBuild không bao giờ vượt ngân sách và tương thích 100% trên cả 9 nhu cầu', () => {
    const testBudgets = [10000000, 15000000, 20000000, 30000000, 45000000, 65000000];
    core.usageCategories.forEach(cat => {
      testBudgets.forEach(budget => {
        const solved = core.solveExpertBuild(budget, cat.title, core.createEmptyBuild());
        const { totalPrice, selectedCount } = core.calculateBuildMetrics(solved);
        const { issues } = core.evaluateBuildCompatibility(solved);

        assert.strictEqual(selectedCount, 8, `Nhu cầu ${cat.title} (${budget}) phải chọn đủ 8 linh kiện`);
        assert.ok(
          totalPrice <= budget,
          `Nhu cầu ${cat.title} vượt ngân sách! Tổng ${totalPrice} > Ngân sách ${budget}`
        );
        assert.strictEqual(
          issues.length,
          0,
          `Nhu cầu ${cat.title} (${budget}) sinh ra lỗi tương thích: ${issues.map(i => i.id).join(', ')}`
        );
      });
    });
  });

  await test('4.2. Các nhu cầu khác nhau (Gaming vs Văn phòng vs AI Training) cho ra cấu hình chuyên biệt khác nhau', () => {
    const budget = 25000000;
    const gamingBuild = core.solveExpertBuild(budget, 'Gaming', core.createEmptyBuild());
    const officeBuild = core.solveExpertBuild(budget, 'Office & Study', core.createEmptyBuild());
    const aiBuild = core.solveExpertBuild(budget, 'AI Training & LLM', core.createEmptyBuild());

    const gamingSig = Object.values(gamingBuild).map(i => i.id).join('|');
    const officeSig = Object.values(officeBuild).map(i => i.id).join('|');
    const aiSig = Object.values(aiBuild).map(i => i.id).join('|');

    assert.notStrictEqual(gamingSig, officeSig, 'Cấu hình Gaming và Văn phòng không được giống hệt nhau');
    assert.ok(aiBuild.gpu.isNvidia, 'Cấu hình AI Training & LLM ở mức 25 triệu phải ưu tiên GPU NVIDIA CUDA');
  });

  await test('4.3. Gợi ý bộ phận tiếp theo sau khi chọn món đầu tiên luôn khớp chân cắm và trong ngân sách', () => {
    sandbox.localStorage.setItem('pcmon_budget', '22000000');
    sandbox.localStorage.setItem('pcmon_purpose', 'Gaming');
    const partialBuild = core.createEmptyBuild();
    partialBuild.cpu = core.componentsDB.cpu.find(c => c.socket === 'AM5');
    core.setCurrentBuild(partialBuild);

    const recMb = core.getRecommendedItemForSlot('motherboard');
    const recRam = core.getRecommendedItemForSlot('ram');
    assert.ok(recMb && recMb.item.socket === 'AM5', 'Chọn CPU AM5 phải gợi ý Mainboard AM5');
    assert.ok(recRam && recRam.item.type === 'DDR5', 'Chọn nền tảng AM5 phải gợi ý RAM DDR5');
  });

  // 5. KIỂM THỬ BÁO GIÁ 5 ĐẠI LÝ & CỔNG BUILD PC ĐÍNH KÈM SẴN LINH KIỆN
  await test('5.1. Hệ thống so sánh giá trả về đủ 5 đại lý lớn đã sắp xếp từ giá thấp nhất', () => {
    const sampleCpu = core.componentsDB.cpu[0];
    const offers = core.getRetailerOffersForProduct('cpu', sampleCpu);
    assert.strictEqual(offers.length, 5, 'Phải có báo giá từ đúng 5 đại lý lớn');
    assert.ok(offers[0].price <= offers[1].price, 'Báo giá phải được sắp xếp tăng dần theo giá bán');
    assert.strictEqual(offers[0].isLowest, true, 'Đại lý đầu tiên phải được gắn cờ Rẻ nhất (isLowest)');
    assert.ok(retailerHtmlContent.includes('retailer-build-slots-container'), 'Trang retailer-build.html phải có bảng 8 khe cắm đính kèm sẵn');
  });

  // 6. KIỂM THỬ ĐĂNG NHẬP, GIỎ HÀNG YÊU CẦU ĐĂNG NHẬP & BẢO MẬT ADMIN RBAC
  await test('6.1. Khi chưa đăng nhập: Khu vực Admin và Giỏ hàng đều bị chặn và chuyển hướng về trang Đăng nhập', () => {
    core.setCurrentUser(null);
    core.navigateToPage('admin', false);
    assert.strictEqual(core.getCurrentPage(), 'account', 'Khách chưa đăng nhập vào #admin phải bị chuyển về #account');

    core.navigateToPage('cart', false);
    assert.strictEqual(core.getCurrentPage(), 'account', 'Khách chưa đăng nhập vào #cart phải bị chuyển về #account');

    const canSaveCartAsGuest = core.saveCurrentSelectionToCart(true);
    assert.strictEqual(canSaveCartAsGuest, false, 'Khách chưa đăng nhập không được phép lưu giỏ hàng trực tiếp');
  });

  await test('6.2. Khi đăng nhập Thành viên: Sử dụng được Giỏ hàng để lưu lựa chọn trước đó, nhưng vẫn bị chặn vào Admin', () => {
    const memberUser = core.DEFAULT_USERS_SEED[0]; // sinhvien@pcmon.vn (role: 'user')
    core.setCurrentUser(memberUser);

    const buildToSave = core.createEmptyBuild();
    buildToSave.cpu = core.componentsDB.cpu[0];
    buildToSave.gpu = core.componentsDB.gpu[0];
    core.setCurrentBuild(buildToSave);

    const savedOk = core.saveCurrentSelectionToCart(false);
    assert.strictEqual(savedOk, true, 'Thành viên đã đăng nhập phải lưu được lựa chọn vào Giỏ hàng');
    assert.strictEqual(core.getUserCart().length, 2, 'Giỏ hàng của thành viên phải lưu đúng 2 linh kiện đã chọn');

    // Thành viên thường cố vào #admin vẫn phải bị chặn
    core.navigateToPage('admin', false);
    assert.strictEqual(core.getCurrentPage(), 'account', 'Thành viên thường (role=user) không được phép mở trang Admin');
  });

  await test('6.3. Khi đăng nhập đúng tài khoản Admin (admin@pcmon.vn): Mở khóa thành công Bảng Quản Trị Admin', () => {
    const adminUser = core.DEFAULT_USERS_SEED[1]; // admin@pcmon.vn (role: 'admin')
    core.setCurrentUser(adminUser);

    core.navigateToPage('admin', false);
    assert.strictEqual(core.getCurrentPage(), 'admin', 'Tài khoản Admin hợp lệ phải truy cập được trang #admin');
  });

  // 7. KIỂM THỬ BẢO MẬT SERVER API (/api/health & /api/admin/verify)
  await test('7.1. Server HTTP bảo mật RBAC (/api/admin/verify chặn 403 với user thường và mở 200 với admin)', async () => {
    const { EventEmitter } = require('events');
    const { server } = require('../server.js');

    function simulateServerRequest(method, urlPath, bodyObj = null) {
      return new Promise((resolve) => {
        const req = new EventEmitter();
        req.method = method;
        req.url = urlPath;
        req.headers = {};
        req.destroy = () => {};

        const res = {
          statusCode: 200,
          headers: {},
          writeHead(code, hdrs = {}) {
            this.statusCode = code;
            this.headers = hdrs;
          },
          end(payload = '') {
            resolve({
              status: this.statusCode,
              headers: this.headers,
              body: payload ? JSON.parse(payload) : {}
            });
          }
        };

        server.emit('request', req, res);
        if (method === 'POST') {
          if (bodyObj) req.emit('data', Buffer.from(JSON.stringify(bodyObj), 'utf8'));
          req.emit('end');
        }
      });
    }

    const healthRes = await simulateServerRequest('GET', '/api/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.ok, true);
    assert.strictEqual(healthRes.headers['X-Content-Type-Options'], 'nosniff');

    const deniedRes = await simulateServerRequest('POST', '/api/admin/verify', { role: 'user', email: 'sinhvien@pcmon.vn' });
    assert.strictEqual(deniedRes.status, 403, 'Server phải trả về 403 Forbidden cho tài khoản không phải Admin');

    const allowedRes = await simulateServerRequest('POST', '/api/admin/verify', { role: 'admin', email: 'admin@pcmon.vn' });
    assert.strictEqual(allowedRes.status, 200, 'Server phải trả về 200 OK cho tài khoản Admin');
    assert.strictEqual(allowedRes.body.ok, true);
  });

  await test('7.2. Vercel Serverless Functions (api/health.js & api/admin/verify.js) và vercel.json hoạt động chuẩn xác', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8'));
    assert.strictEqual(vercelConfig.version, 2);
    assert.ok(Array.isArray(vercelConfig.rewrites) && vercelConfig.rewrites.length >= 10);

    const vercelHealth = require('../api/health.js');
    const vercelVerify = require('../api/admin/verify.js');

    let resStatus = 0;
    let resBody = {};
    const mockRes = {
      statusCode: 200,
      setHeader: () => {},
      end(str) {
        resStatus = this.statusCode;
        resBody = JSON.parse(str || '{}');
      }
    };

    vercelHealth({ method: 'GET', headers: {} }, mockRes);
    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resBody.platform, 'vercel-serverless');

    vercelVerify({ method: 'POST', headers: {}, body: { role: 'user' } }, mockRes);
    assert.strictEqual(resStatus, 403);

    vercelVerify({ method: 'POST', headers: {}, body: { role: 'admin' } }, mockRes);
    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resBody.ok, true);
  });

  console.log('\n======================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ PHASE 9: ${passed} ĐẠT (PASSED) / ${failed} LỖI (FAILED)`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
