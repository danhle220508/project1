/* ==========================================================================
   PC MON - Veteran PC Consultant Engine, Multi-Page Workflow & Real Product Photos
   ========================================================================== */

// --- 1. TIỆN ÍCH HỆ THỐNG, ĐỊNH DẠNG TIỀN TỆ & CHẾ ĐỘ SÁNG/TỐI ---
const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
});

function formatVND(amount) {
  return VND_FORMATTER.format(Number(amount) || 0);
}

/**
 * Bảo mật chống XSS khi hiển thị dữ liệu do người dùng nhập (Tên bản build, Họ tên, Thông số tùy chỉnh)
 */
function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function refreshIcons(rootElement) {
  if (!window.lucide) return;
  if (rootElement instanceof HTMLElement) {
    window.lucide.createIcons({ root: rootElement });
  } else {
    window.lucide.createIcons();
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colorMap = {
    success: 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200',
    warning: 'bg-amber-950/95 border-amber-500/50 text-amber-200',
    error: 'bg-red-950/95 border-red-500/50 text-red-200',
    info: 'bg-gray-900/95 border-blue-500/50 text-blue-100'
  };
  const iconMap = {
    success: 'check-circle-2',
    warning: 'alert-triangle',
    error: 'shield-alert',
    info: 'sparkles'
  };

  const toast = document.createElement('div');
  toast.className = `toast-slide-in pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl text-xs font-medium ${colorMap[type] || colorMap.info}`;
  toast.innerHTML = `
    <i data-lucide="${iconMap[type] || iconMap.info}" class="w-4 h-4 shrink-0 mt-0.5"></i>
    <span class="flex-1 leading-relaxed">${message}</span>
  `;

  container.appendChild(toast);
  refreshIcons(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    setTimeout(() => toast.remove(), 220);
  }, 4200);
}

// --- QUẢN LÝ GIAO DIỆN SÁNG / TỐI (MẶC ĐỊNH LÀ GIAO DIỆN TỐI) ---
const btnThemeToggle = document.getElementById('btn-theme-toggle');

function applyTheme(theme, notify = false) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  const htmlEl = document.documentElement;
  htmlEl.setAttribute('data-theme', normalized);

  if (normalized === 'dark') {
    htmlEl.classList.add('dark');
  } else {
    htmlEl.classList.remove('dark');
  }

  localStorage.setItem('pcmon_theme', normalized);

  if (btnThemeToggle) {
    const iconName = normalized === 'dark' ? 'moon' : 'sun';
    const iconColor = normalized === 'dark' ? 'text-blue-400' : 'text-amber-500';
    const labelText = normalized === 'dark' ? 'Giao diện Tối' : 'Giao diện Sáng';
    btnThemeToggle.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor}"></i>
      <span id="theme-toggle-text">${labelText}</span>
    `;
    refreshIcons(btnThemeToggle);
  }

  if (notify) {
    showToast(
      normalized === 'dark'
        ? 'Đã chuyển sang Chế độ Tối (Dark Mode)'
        : 'Đã chuyển sang Chế độ Sáng (Light Mode)',
      'info'
    );
  }
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark', true);
  });
}

// Fallback ảnh chụp sản phẩm thực tế theo từng danh mục nếu server ảnh gốc bị chặn
const CATEGORY_REAL_PHOTO_FALLBACKS = {
  cpu: "https://cdn2.cellphones.com.vn/x/media/catalog/product/c/p/cpu-intel-core-i5-12400.jpg",
  motherboard: "https://cdn2.cellphones.com.vn/x/media/catalog/product/g/r/group_315_2_.png",
  ram: "https://cdn.hstatic.net/products/200001208958/6261-ram-kingston-fury-beast-x2-1_f7609fcc47d9457795d29027c6939ba9_master.jpg",
  gpu: "https://cdn2.cellphones.com.vn/x/media/catalog/product/v/g/vga-asus-dual-geforce-rtx-3060-oc-12gb-dual-rtx3060_1_.png",
  storage: "https://media.kingston.com/kingston/press/ktc-press-fe-nv2-ssd.jpg",
  psu: "https://cdn2.cellphones.com.vn/x/media/catalog/product/t/_/t_i_xu_ng_-_2023-01-04t232846.225.png",
  case: "https://cdn2.cellphones.com.vn/x/media/catalog/product/c/a/case-may-tinh-deepcool-ch370-1.png",
  cooler: "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-ms0zfma6ggzoea"
};

window.handleImgError = function(imgEl, categoryKey) {
  if (!imgEl || imgEl.dataset.fallbackApplied === 'true') return;
  imgEl.dataset.fallbackApplied = 'true';
  imgEl.src = CATEGORY_REAL_PHOTO_FALLBACKS[categoryKey] || CATEGORY_REAL_PHOTO_FALLBACKS.gpu;
};

// --- 2. HỆ THỐNG ĐIỀU HƯỚNG ĐA TRANG (MULTI-PAGE ROUTER) ---
const VALID_PAGES = ['home', 'usage', 'budget', 'builder', 'summary', 'featured', 'account', 'cart', 'admin'];
let currentPage = 'home';
let pendingCartSaveAfterLogin = false;
let pendingCartRedirect = false;

function getPageFromLocation() {
  const hash = window.location.hash.replace('#', '').trim().toLowerCase();
  if (VALID_PAGES.includes(hash)) return hash;

  const pathSeg = window.location.pathname.replace(/^\/+|\/+$/g, '').replace('.html', '').toLowerCase();
  if (VALID_PAGES.includes(pathSeg)) return pathSeg;

  return 'home';
}

function navigateToPage(pageName, pushHistory = true) {
  let targetPage = VALID_PAGES.includes(pageName) ? pageName : 'home';

  // Bảo vệ nghiêm ngặt Khu vực Admin: Ẩn hoàn toàn nếu chưa đăng nhập đúng tài khoản Admin
  if (targetPage === 'admin') {
    const authUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!authUser || authUser.role !== 'admin') {
      targetPage = 'account';
      showToast('Khu vực Quản trị bị ẩn. Vui lòng đăng nhập đúng tài khoản Admin để mở khóa!', 'warning');
    }
  }

  // Bảo vệ Giỏ hàng: Chỉ khi đã đăng nhập tài khoản mới được phép sử dụng Giỏ hàng
  if (targetPage === 'cart') {
    const authUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!authUser) {
      pendingCartRedirect = true;
      targetPage = 'account';
      showToast('Chỉ khi đăng nhập bạn mới có thể sử dụng Giỏ hàng! Vui lòng đăng nhập hoặc đăng ký tài khoản.', 'warning');
    }
  }

  currentPage = targetPage;

  document.querySelectorAll('[data-page-view]').forEach(section => {
    if (section.dataset.pageView === targetPage) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });

  document.querySelectorAll('.nav-page-link').forEach(btn => {
    if (btn.dataset.navPage === targetPage) {
      btn.classList.add('bg-blue-600/15', 'text-blue-400', 'font-bold');
      btn.classList.remove('text-gray-300');
    } else {
      btn.classList.remove('bg-blue-600/15', 'text-blue-400', 'font-bold');
      if (btn.id !== 'btn-nav-admin') {
        btn.classList.add('text-gray-300');
      }
    }
  });

  const stepperBar = document.getElementById('workflow-stepper-bar');
  if (stepperBar) {
    if (['usage', 'budget', 'builder', 'summary'].includes(targetPage)) {
      stepperBar.classList.remove('hidden');
      ['usage', 'budget', 'builder', 'summary'].forEach((stepKey) => {
        const stepBtn = document.getElementById(`step-indicator-${stepKey}`);
        if (!stepBtn) return;
        const badge = stepBtn.querySelector('span:first-child');
        if (stepKey === targetPage) {
          stepBtn.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold bg-blue-600/15 border border-blue-500/40 text-blue-400 transition-all";
          if (badge) badge.className = "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-blue-600 text-white";
        } else {
          stepBtn.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-gray-400 hover:text-white transition-all";
          if (badge) badge.className = "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-gray-800 text-gray-400";
        }
      });
    } else {
      stepperBar.classList.add('hidden');
    }
  }

  if (targetPage === 'summary' && typeof renderSummaryAndPriceComparisonPage === 'function') {
    renderSummaryAndPriceComparisonPage();
  }
  if (targetPage === 'account' && typeof renderAccountPage === 'function') {
    renderAccountPage();
  }
  if (targetPage === 'cart' && typeof renderCartPage === 'function') {
    renderCartPage();
  }
  if (targetPage === 'admin' && typeof renderAdminDashboardPage === 'function') {
    renderAdminDashboardPage();
  }

  const mobileNav = document.getElementById('mobile-nav');
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  if (mobileNav && !mobileNav.classList.contains('hidden')) {
    mobileNav.classList.add('hidden');
    if (btnMobileMenu) btnMobileMenu.setAttribute('aria-expanded', 'false');
  }

  if (pushHistory) {
    const newUrl = targetPage === 'home' ? window.location.pathname : `#${targetPage}`;
    try {
      window.history.pushState({ page: targetPage }, '', newUrl);
    } catch (e) {
      window.location.hash = targetPage;
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (e) => {
  const navTrigger = e.target.closest('[data-nav-page]');
  if (!navTrigger) return;
  e.preventDefault();
  navigateToPage(navTrigger.dataset.navPage, true);
});

window.addEventListener('popstate', () => {
  navigateToPage(getPageFromLocation(), false);
});

// --- 3. KHO DỮ LIỆU LINH KIỆN ĐANG LƯU HÀNH & ẢNH THỰC TẾ CHÍNH XÁC CỦA TỪNG MÃ ---
const componentsDB = {
  cpu: [
    {
      id: "cpu-0",
      name: "AMD Ryzen 3 3200G (Tích hợp Radeon Vega 8)",
      price: 1690000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết tiết kiệm",
      socket: "AM4",
      cores: 4,
      threads: 4,
      hasIgpu: true,
      tdp: 65,
      tier: 1,
      gamingScore: 40,
      workScore: 40,
      specs: "4 Nhân / 4 Luồng • Có sẵn iGPU Radeon Vega 8 • Socket AM4 • TDP 65W",
      image: "https://cdn.hstatic.net/products/200000420363/r5-gen-5_f301d9ce73554b68b20b982_17636c1494bd4e2da4adea11fa38643e_grande.png"
    },
    {
      id: "cpu-1",
      name: "Intel Core i3-12100F (Box Chính Hãng)",
      price: 2090000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      socket: "LGA1700",
      cores: 4,
      threads: 8,
      hasIgpu: false,
      tdp: 65,
      tier: 1,
      gamingScore: 55,
      workScore: 45,
      specs: "4 Nhân / 8 Luồng • Xung 4.3GHz • Socket LGA1700 • Không iGPU • TDP 65W",
      image: "https://product.hstatic.net/200000420363/product/tai_xuong_52d67a3fdbfe4c92a80f7e1e2070a911_grande.jpg"
    },
    {
      id: "cpu-11",
      name: "AMD Ryzen 5 5600G (Tích hợp Radeon Vega 7)",
      price: 2790000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "AM4",
      cores: 6,
      threads: 12,
      hasIgpu: true,
      tdp: 65,
      tier: 2,
      gamingScore: 58,
      workScore: 64,
      specs: "6 Nhân / 12 Luồng • Có sẵn iGPU Radeon Vega 7 • Socket AM4 • TDP 65W",
      image: "https://cdn.hstatic.net/products/200000420363/r5-gen-5_f301d9ce73554b68b20b982_17636c1494bd4e2da4adea11fa38643e_grande.png"
    },
    {
      id: "cpu-9",
      name: "AMD Ryzen 5 5600 (Box Chính Hãng)",
      price: 2890000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "AM4",
      cores: 6,
      threads: 12,
      hasIgpu: false,
      tdp: 65,
      tier: 2,
      gamingScore: 68,
      workScore: 65,
      specs: "6 Nhân / 12 Luồng • 32MB L3 Cache • Socket AM4 • Không iGPU • TDP 65W",
      image: "https://uk.static.webuy.com/product_images/Computing/Processors%20-%20AMD/SCPUAMDR55600_l.jpg"
    },
    {
      id: "cpu-2",
      name: "Intel Core i5-12400F (Box Chính Hãng)",
      price: 2990000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết ưu đãi",
      socket: "LGA1700",
      cores: 6,
      threads: 12,
      hasIgpu: false,
      tdp: 65,
      tier: 2,
      gamingScore: 70,
      workScore: 68,
      specs: "6 Nhân / 12 Luồng • Xung 4.4GHz • Socket LGA1700 • Không iGPU • TDP 65W",
      image: "https://cdn.hstatic.net/products/200000420363/i5-12th_ef60688e685f4affa651f320_95172b46b0e74a3397888cf57ca4ad1e_grande.jpg"
    },
    {
      id: "cpu-12",
      name: "Intel Core i5-12400 (Tích hợp Intel UHD 730)",
      price: 3690000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "LGA1700",
      cores: 6,
      threads: 12,
      hasIgpu: true,
      quickSync: true,
      tdp: 65,
      tier: 2,
      gamingScore: 70,
      workScore: 72,
      specs: "6 Nhân / 12 Luồng • Có sẵn iGPU Intel UHD 730 (QuickSync) • Socket LGA1700",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/c/p/cpu-intel-core-i5-12400.jpg"
    },
    {
      id: "cpu-6",
      name: "Intel Core i5-13400F (10 Nhân / 16 Luồng)",
      price: 4590000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "LGA1700",
      cores: 10,
      threads: 16,
      hasIgpu: false,
      tdp: 65,
      tier: 3,
      gamingScore: 76,
      workScore: 80,
      specs: "10 Nhân (6P+4E) / 16 Luồng • Xung 4.6GHz • Socket LGA1700 • TDP 65W",
      image: "https://product-images.eetgroup.com/images/700px_jpg/Img_30404890.jpg"
    },
    {
      id: "cpu-4",
      name: "AMD Ryzen 5 7600 (Tích hợp Radeon Graphics)",
      price: 5190000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "AM5",
      cores: 6,
      threads: 12,
      hasIgpu: true,
      tdp: 65,
      tier: 3,
      gamingScore: 83,
      workScore: 78,
      specs: "6 Nhân / 12 Luồng • Xung 5.1GHz • Có sẵn iGPU Radeon • Socket AM5 • TDP 65W",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/g/r/group_314_4__1.png"
    },
    {
      id: "cpu-3",
      name: "Intel Core i5-14600K (14 Nhân / 20 Luồng)",
      price: 7690000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "LGA1700",
      cores: 14,
      threads: 20,
      hasIgpu: true,
      quickSync: true,
      tdp: 125,
      tier: 4,
      gamingScore: 88,
      workScore: 90,
      specs: "14 Nhân (6P+8E) / 20 Luồng • Xung 5.3GHz • Có iGPU UHD 770 • TDP 125W",
      image: "https://m.media-amazon.com/images/I/41ab2q5sgsL._SL500_.jpg"
    },
    {
      id: "cpu-7",
      name: "Intel Core i7-14700K (20 Nhân / 28 Luồng)",
      price: 10490000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động nhẹ theo tỷ giá",
      socket: "LGA1700",
      cores: 20,
      threads: 28,
      hasIgpu: true,
      quickSync: true,
      tdp: 125,
      tier: 5,
      gamingScore: 92,
      workScore: 96,
      specs: "20 Nhân (8P+12E) / 28 Luồng • Xung 5.6GHz • Có iGPU UHD 770 • TDP 125W",
      image: "https://www.bhphotovideo.com/cdn-cgi/image/fit=scale-down,width=500,quality=95/https://www.bhphotovideo.com/images/images500x500/intel_bx8071514700k_core_i7_14700k_20_core_lga_1697445940_1781467.jpg"
    },
    {
      id: "cpu-5",
      name: "AMD Ryzen 7 7800X3D (Chuyên Game 3D V-Cache)",
      price: 11490000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động tăng (Khan hàng)",
      socket: "AM5",
      cores: 8,
      threads: 16,
      hasIgpu: true,
      isX3d: true,
      tdp: 120,
      tier: 5,
      gamingScore: 98,
      workScore: 86,
      specs: "8 Nhân / 16 Luồng • 96MB 3D V-Cache • Có iGPU • Socket AM5 • TDP 120W",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/c/p/cpu-amd-ryzen-7-7800x3d_2__3.png"
    },
    {
      id: "cpu-10",
      name: "AMD Ryzen 7 9800X3D (Vua Gaming Zen 5)",
      price: 13890000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động cao (Mới ra mắt)",
      socket: "AM5",
      cores: 8,
      threads: 16,
      hasIgpu: true,
      isX3d: true,
      tdp: 120,
      tier: 5,
      gamingScore: 100,
      workScore: 91,
      specs: "8 Nhân / 16 Luồng • Zen 5 3D V-Cache 5.2GHz • Socket AM5 • TDP 120W",
      image: "https://product.hstatic.net/200000420363/product/tinhocngoisao.com1__12__74942c38dcdd40ce8a583d1ec1115bde_grande.jpg"
    },
    {
      id: "cpu-8",
      name: "Intel Core i9-14900K (24 Nhân / 32 Luồng)",
      price: 13990000,
      priceUpdatedAt: "15/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "LGA1700",
      cores: 24,
      threads: 32,
      hasIgpu: true,
      quickSync: true,
      tdp: 125,
      tier: 5,
      gamingScore: 95,
      workScore: 100,
      specs: "24 Nhân (8P+16E) / 32 Luồng • Xung 6.0GHz • Có iGPU UHD 770 • TDP 125W",
      image: "https://upload.wikimedia.org/wikipedia/commons/1/12/Intel_i9-14900K.webp"
    }
  ],
  motherboard: [
    {
      id: "mb-9",
      name: "MSI A520M-A PRO",
      price: 1390000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      socket: "AM4",
      ramType: "DDR4",
      form: "Micro-ATX",
      tier: 1,
      specs: "Socket AM4 • Hỗ trợ RAM DDR4 • Chuẩn Micro-ATX • Bền bỉ tiết kiệm",
      image: "https://cdn2.cellphones.com.vn/360x360/media/catalog/product//m/a/mainboard-msi-a520m-a-pro_1_.png"
    },
    {
      id: "mb-1",
      name: "ASUS PRIME H610M-K D4",
      price: 1750000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      socket: "LGA1700",
      ramType: "DDR4",
      form: "Micro-ATX",
      tier: 1,
      specs: "Socket LGA1700 • Hỗ trợ RAM DDR4 • Khe M.2 PCIe 3.0 • Chuẩn Micro-ATX",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/g/r/group_315_2_.png"
    },
    {
      id: "mb-7",
      name: "MSI B550M PRO-VDH WIFI",
      price: 2450000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "AM4",
      ramType: "DDR4",
      form: "Micro-ATX",
      tier: 2,
      specs: "Socket AM4 • 4 khe RAM DDR4 • Tản VRM lớn • Có sẵn Wi-Fi & Bluetooth",
      image: "https://storage-asset.msi.com/global/picture/product/product_9_20200618152239_5eeb163f6316f.webp"
    },
    {
      id: "mb-6",
      name: "Gigabyte B760M GAMING X AX DDR4",
      price: 3490000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "LGA1700",
      ramType: "DDR4",
      form: "Micro-ATX",
      tier: 3,
      specs: "Socket LGA1700 • 4 khe RAM DDR4 • 2 khe M.2 PCIe 4.0 • Wi-Fi 6E",
      image: "https://static.gigabyte.com/StaticFile/Image/Global/b1f3f93ba0acc51713c6cdec8c7389c1/ProductRemoveBg/33879"
    },
    {
      id: "mb-3",
      name: "MSI B650M GAMING PLUS WIFI",
      price: 3890000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "AM5",
      ramType: "DDR5",
      form: "Micro-ATX",
      tier: 3,
      specs: "Socket AM5 • 4 khe RAM DDR5 • Chuẩn Micro-ATX • Wi-Fi 6E",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/m/a/mainboard-msi-b650-gaming-plus-wifi-ddr5_5_.png"
    },
    {
      id: "mb-2",
      name: "MSI MAG B760M MORTAR WIFI II DDR5",
      price: 4590000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "LGA1700",
      ramType: "DDR5",
      form: "Micro-ATX",
      tier: 4,
      specs: "Socket LGA1700 • Hỗ trợ RAM DDR5 • VRM 12+1+1 Phase • Wi-Fi 6E",
      image: "https://product.hstatic.net/200000420363/product/mainboard-msi-mag-b760m-mortar-wifi-ii-5_cb801b6b837145468425dc1a6b51266e_grande.jpg"
    },
    {
      id: "mb-5",
      name: "ASUS TUF GAMING B650-PLUS WIFI",
      price: 5290000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "AM5",
      ramType: "DDR5",
      form: "ATX",
      tier: 4,
      specs: "Socket AM5 • Hỗ trợ RAM DDR5 • Chuẩn ATX Full-size • Linh kiện TUF",
      image: "https://dlcdnwebimgs.asus.com/gain/d52e1dd0-6b0b-4c62-a625-01c5e41a8b07/w800"
    },
    {
      id: "mb-4",
      name: "Gigabyte Z790 AORUS ELITE AX DDR5",
      price: 6490000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "LGA1700",
      ramType: "DDR5",
      form: "ATX",
      tier: 5,
      specs: "Socket LGA1700 • Hỗ trợ RAM DDR5 • 4 khe M.2 PCIe 4.0 • Chuẩn ATX",
      image: "https://www.gigabyte.com/FileUpload/Global/KeyFeature/2358/innergigabyteimages/specsmall01.jpg"
    },
    {
      id: "mb-8",
      name: "MSI MAG X670E TOMAHAWK WIFI",
      price: 7990000,
      priceUpdatedAt: "15/11/2026",
      priceNote: "Giá niêm yết công khai",
      socket: "AM5",
      ramType: "DDR5",
      form: "ATX",
      tier: 5,
      specs: "Socket AM5 • Hỗ trợ RAM DDR5 • Khe PCIe 5.0 • Chuẩn ATX Full-size",
      image: "https://storage-asset.msi.com/global/picture/image/feature/mb/X670E/mag-x670e-tomahawk-wifi/mag-x670e-tomahawk-wifi.png"
    }
  ],
  ram: [
    {
      id: "ram-1",
      name: "Kingston Fury Beast 16GB (2x8GB) DDR4 3200MHz",
      price: 990000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      type: "DDR4",
      capacityGB: 16,
      capacity: "16GB",
      hasRgb: false,
      tier: 1,
      specs: "Chuẩn DDR4 • Bus 3200MHz • 2x8GB Dual Channel • Tản nhiệt nhôm đen",
      image: "https://cdn.hstatic.net/products/200001208958/6261-ram-kingston-fury-beast-x2-1_f7609fcc47d9457795d29027c6939ba9_master.jpg"
    },
    {
      id: "ram-5",
      name: "Kingston Fury Beast RGB 16GB (2x8GB) DDR5 5600MHz",
      price: 1590000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      type: "DDR5",
      capacityGB: 16,
      capacity: "16GB",
      hasRgb: true,
      tier: 2,
      specs: "Chuẩn DDR5 • Bus 5600MHz • 2x8GB Dual Channel • Có LED RGB",
      image: "https://cdn.hstatic.net/products/200001208958/m-pc-kingston-fury-beast-rgb-ddr5-cfd6978e-f165-4afe-ae07-0c3feac58802_e5187c1e13604f5ea66fd87268bb2d9e_large.jpg"
    },
    {
      id: "ram-4",
      name: "Corsair Vengeance LPX 32GB (2x16GB) DDR4 3600MHz",
      price: 1890000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      type: "DDR4",
      capacityGB: 32,
      capacity: "32GB",
      hasRgb: false,
      tier: 3,
      specs: "Chuẩn DDR4 • Bus 3600MHz • 32GB (2x16GB) • Tối ưu Lập trình, Đồ họa & DAW",
      image: "https://assets.corsair.com/image/upload/c_pad,q_85,h_800,w_800,f_auto/products/Memory/CMK16GX4M2B3200C16/Gallery/VENG_LPX_BLK_00.webp"
    },
    {
      id: "ram-3",
      name: "G.Skill Ripjaws S5 32GB (2x16GB) DDR5 5600MHz",
      price: 2650000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động nhẹ theo chip nhớ",
      type: "DDR5",
      capacityGB: 32,
      capacity: "32GB",
      hasRgb: false,
      tier: 3,
      specs: "Chuẩn DDR5 • Bus 5600MHz • 32GB (2x16GB) • Tản nhiệt nhôm Low-Profile",
      image: "https://product.hstatic.net/1000333506/product/45976_rak_gsk_f5_5600u3636c16gx2_rs5_a_4bf87808422745c48b275808555b9535_grande.jpg"
    },
    {
      id: "ram-2",
      name: "Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz",
      price: 3290000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động tăng nhẹ",
      type: "DDR5",
      capacityGB: 32,
      capacity: "32GB",
      hasRgb: true,
      tier: 4,
      specs: "Chuẩn DDR5 • Bus 6000MHz CL30 • 32GB (2x16GB) • LED RGB cao cấp",
      image: "https://assets.corsair.com/image/upload/w_600,h_600,c_pad,q_auto:best/products/Memory/vengeance-rgb-ddr5-config/white/2up/Vengeance-RGB-DDR5-2UP-64GB-WHITE_01.png"
    },
    {
      id: "ram-6",
      name: "G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5 6000MHz",
      price: 5990000,
      priceUpdatedAt: "15/11/2026",
      priceNote: "Giá niêm yết công khai",
      type: "DDR5",
      capacityGB: 64,
      capacity: "64GB",
      hasRgb: true,
      tier: 5,
      specs: "Chuẩn DDR5 • 64GB (2x32GB) • Chuyên Huấn luyện AI, Dựng phim 8K & Máy ảo",
      image: "https://cdn.hstatic.net/products/200001208958/10056-ram-g-skill-trident-z5-rgb-white-f5-6000j3238f16gx2-tz5rw--1-_a18d6a2f369f4c3bb5570148ab56fb12_large.jpg"
    }
  ],
  gpu: [
    {
      id: "gpu-igpu",
      name: "Đồ họa tích hợp theo CPU (Intel UHD / AMD Radeon iGPU)",
      price: 0,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Tích hợp sẵn trong CPU (0 ₫)",
      requiresIgpuCpu: true,
      isNvidia: false,
      tdp: 15,
      vramGB: 2,
      tier: 0,
      specs: "Sử dụng nhân đồ họa tích hợp sẵn của CPU (Yêu cầu CPU không có hậu tố F)",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/c/p/cpu-intel-core-i5-12400.jpg"
    },
    {
      id: "gpu-9",
      name: "ASUS Dual GeForce GTX 1650 OC 4GB GDDR6",
      price: 3190000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      isNvidia: true,
      tdp: 75,
      vramGB: 4,
      tier: 1,
      specs: "4GB GDDR6 • TDP 75W • Không cần nguồn phụ • Chơi mượt Esports & Đồ họa 2D",
      image: "https://dlcdnwebimgs.asus.com/gain/4ba07cfc-f943-4042-b751-0d4eb2d9fc62/w692"
    },
    {
      id: "gpu-5",
      name: "ASRock AMD Radeon RX 6600 Challenger D 8GB",
      price: 5190000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết tốt nhất tầm giá",
      isNvidia: false,
      tdp: 132,
      vramGB: 8,
      tier: 2,
      specs: "8GB GDDR6 • TDP 132W • Vua hiệu năng/giá thành chiến Game Full HD 1080p",
      image: "https://www.asrock.com/Graphics-Card/photo/Radeon%20RX%206600%20Challenger%20D%208GB(M1).png"
    },
    {
      id: "gpu-1",
      name: "ASUS Dual GeForce RTX 3060 OC V2 12GB",
      price: 7390000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      isNvidia: true,
      tdp: 170,
      vramGB: 12,
      tier: 3,
      specs: "12GB GDDR6 • Nhân CUDA • TDP 170W • Tối ưu cho AI/LLM tầm trung, Dựng phim & Game",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/v/g/vga-asus-dual-geforce-rtx-3060-oc-12gb-dual-rtx3060_1_.png"
    },
    {
      id: "gpu-2",
      name: "Gigabyte GeForce RTX 4060 Eagle OC 8GB",
      price: 8490000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      isNvidia: true,
      hasAv1: true,
      tdp: 115,
      vramGB: 8,
      tier: 3,
      specs: "8GB GDDR6 • TDP 115W • 3 Fan • Hỗ trợ DLSS 3 & AV1 NVENC Livestream",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/c/a/card-ma-hinh_3.png"
    },
    {
      id: "gpu-6",
      name: "MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 16GB",
      price: 12690000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Biến động tăng (Nhu cầu AI cao)",
      isNvidia: true,
      hasAv1: true,
      tdp: 165,
      vramGB: 16,
      tier: 4,
      specs: "16GB GDDR6 • Nhân CUDA/Tensor • TDP 165W • Chuyên chạy Local LLM, AI & Premiere",
      image: "https://storage-asset.msi.com/global/picture/image/feature/vga/NVIDIA/RTX-4060-Ti-VENTUS-2X-BLACK-16G-Series/images/vga-2x-mobile.png"
    },
    {
      id: "gpu-4",
      name: "Sapphire Pure AMD Radeon RX 7800 XT 16GB",
      price: 14890000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      isNvidia: false,
      tdp: 263,
      vramGB: 16,
      tier: 4,
      specs: "16GB GDDR6 • TDP 263W • Hiệu năng thuần Gaming 2K Ultra vượt trội",
      image: "https://images-na.ssl-images-amazon.com/images/I/81gBNsRZJ+L.jpg"
    },
    {
      id: "gpu-3",
      name: "ASUS Dual GeForce RTX 4070 SUPER OC 12GB",
      price: 16990000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động tăng nhẹ",
      isNvidia: true,
      hasAv1: true,
      tdp: 220,
      vramGB: 12,
      tier: 5,
      specs: "12GB GDDR6X • TDP 220W • Chuẩn mực Gaming 2K, Livestream & Đồ họa 3D",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/v/g/vga-asus-dual-geforce-rtx-4070-super-12gb-dual-rtx4070s_1_.png"
    },
    {
      id: "gpu-7",
      name: "Gigabyte GeForce RTX 4070 Ti SUPER Windforce 16GB",
      price: 23490000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Biến động tăng (Khan hàng GPU)",
      isNvidia: true,
      hasAv1: true,
      tdp: 285,
      vramGB: 16,
      tier: 5,
      specs: "16GB GDDR6X • TDP 285W • Cân mượt 4K Gaming, Render 3D & Huấn luyện AI",
      image: "https://www.gigabyte.com/Image/88366f8b8e43ca0066a14728a35e5d28/ProductRemoveBg/39125"
    },
    {
      id: "gpu-8",
      name: "ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB",
      price: 29990000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động mạnh (Nguồn cung hạn chế)",
      isNvidia: true,
      hasAv1: true,
      tdp: 320,
      vramGB: 16,
      tier: 5,
      specs: "16GB GDDR6X • TDP 320W • Đỉnh cao đồ họa 4K & AI Workstation",
      image: "https://dlcdnwebimgs.asus.com/gain/c0ba3131-118a-4ab8-8898-f744c4bdfd56/w692"
    }
  ],
  storage: [
    {
      id: "ssd-1",
      name: "Kingston NV2 500GB PCIe 4.0 NVMe",
      price: 1090000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      capacityGB: 500,
      tier: 1,
      specs: "500GB • Chuẩn M.2 2280 NVMe • Tốc độ đọc 3500 MB/s",
      image: "https://media.kingston.com/kingston/press/ktc-press-fe-nv2-ssd.jpg"
    },
    {
      id: "ssd-4",
      name: "Kingston NV3 1TB PCIe 4.0 NVMe",
      price: 1690000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      capacityGB: 1000,
      tier: 2,
      specs: "1TB • Chuẩn M.2 2280 PCIe 4.0 • Đọc 6000 MB/s • Ghi 4000 MB/s",
      image: "https://media.kingston.com/kingston/press/ktc-ssd-nv3-1tb-s-400x400.jpg"
    },
    {
      id: "ssd-2",
      name: "Samsung 980 1TB PCIe 3.0 NVMe",
      price: 1990000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      capacityGB: 1000,
      tier: 3,
      specs: "1TB • Chuẩn M.2 2280 NVMe • Độ bền & ổn định cao",
      image: "https://images.samsung.com/is/image/samsung/p6pim/vn/mz-v8v1t0bw/gallery/vn-980-nvme-m2-ssd-mz-v8v1t0bw-539160173?$1164_776_PNG$"
    },
    {
      id: "ssd-3",
      name: "Samsung 990 PRO 1TB PCIe 4.0 NVMe",
      price: 2890000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động nhẹ theo giá NAND",
      capacityGB: 1000,
      hasDram: true,
      tier: 4,
      specs: "1TB • Đọc 7450 MB/s • Ghi 6900 MB/s • Có DRAM Cache chuyên Dựng phim/AI",
      image: "https://images.samsung.com/is/image/samsung/p6pim/vn/mz-v9p1t0bw/gallery/vn-990pro-nvme-m2-ssd-mz-v9p1t0bw-539179649?$1164_776_PNG$"
    },
    {
      id: "ssd-5",
      name: "WD Black SN850X 2TB PCIe 4.0 NVMe",
      price: 4390000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      capacityGB: 2000,
      hasDram: true,
      tier: 5,
      specs: "2TB • Đọc 7300 MB/s • Ghi 6600 MB/s • Lưu trữ Game AAA, VST & Source Code",
      image: "https://www.sandisk.com/content/dam/sandisk/en-us/assets/products/internal-storage/wd-black-sn850x-nvme-ssd/gallery/wd-black-sn850x-nvme-ssd-front.png"
    },
    {
      id: "ssd-6",
      name: "Samsung 990 PRO 2TB PCIe 4.0 NVMe",
      price: 4890000,
      priceUpdatedAt: "15/11/2026",
      priceNote: "Giá niêm yết công khai",
      capacityGB: 2000,
      hasDram: true,
      tier: 5,
      specs: "2TB • Đọc 7450 MB/s • Ghi 6900 MB/s • Flagship SSD NVMe",
      image: "https://images.samsung.com/is/image/samsung/p6pim/vn/mz-v9p1t0bw/gallery/vn-990pro-nvme-m2-ssd-mz-v9p1t0bw-539179649?$1164_776_PNG$"
    }
  ],
  psu: [
    {
      id: "psu-1",
      name: "MSI MAG A550BN 550W 80 Plus Bronze",
      price: 1150000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      wattage: 550,
      tier: 1,
      specs: "550W • Chứng nhận 80 Plus Bronze • Bảo vệ mạch OVP/OCP",
      image: "https://storage-asset.msi.com/global/picture/product/product_16264026911b468295cf2cd594cc57b1ceb5ab5d63.webp"
    },
    {
      id: "psu-2",
      name: "Deepcool PK650D 650W 80 Plus Bronze",
      price: 1450000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      wattage: 650,
      tier: 2,
      specs: "650W • Chứng nhận 80 Plus Bronze • Cáp dẹt đen dễ đi dây",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/t/_/t_i_xu_ng_-_2023-01-04t232846.225.png"
    },
    {
      id: "psu-5",
      name: "MSI MAG A750GL PCIE5 750W 80 Plus Gold",
      price: 2390000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      wattage: 750,
      tier: 3,
      specs: "750W • 80 Plus Gold • Full Modular • Có cáp 16-pin PCIe 5.0",
      image: "https://storage-asset.msi.com/global/picture/feature/power/MAG/A750GL-PCIE5/kv-power.png"
    },
    {
      id: "psu-3",
      name: "Corsair RM750e 750W 80 Plus Gold ATX 3.0",
      price: 2590000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      wattage: 750,
      isQuiet: true,
      tier: 4,
      specs: "750W • 80 Plus Gold • Chuẩn PCIe 5.0 / ATX 3.0 • Quạt Zero RPM siêu êm",
      image: "https://assets.corsair.com/image/upload/c_pad,q_85,h_800,w_800,f_auto/v1680721027/products/Power-Supply-Units/base-rme-series-psu-config/CP-9020248/Gallery/RM750e_01.webp"
    },
    {
      id: "psu-4",
      name: "Corsair RM850e 850W 80 Plus Gold ATX 3.0",
      price: 3190000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      wattage: 850,
      isQuiet: true,
      tier: 5,
      specs: "850W • 80 Plus Gold • Full Modular • Sẵn sàng cho RTX 4070Ti/4080",
      image: "https://assets.corsair.com/image/upload/c_pad,q_85,h_800,w_800,f_auto/products/Power-Supply-Units/base-rme-wht-2025-config/gallery/rm850e_wht_01.webp"
    },
    {
      id: "psu-6",
      name: "ASUS TUF Gaming 1000G 1000W 80 Plus Gold ATX 3.0",
      price: 4490000,
      priceUpdatedAt: "15/11/2026",
      priceNote: "Giá niêm yết công khai",
      wattage: 1000,
      isQuiet: true,
      tier: 5,
      specs: "1000W • 80 Plus Gold • Linh kiện chuẩn quân đội • ATX 3.0",
      image: "https://m.media-amazon.com/images/I/71xR3Be4QyL._AC_SL1500_.jpg"
    }
  ],
  case: [
    {
      id: "case-1",
      name: "Xigmatek NYX Air 3F (Kèm 3 Fan RGB)",
      price: 690000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      form: "Micro-ATX",
      supportedForms: ["Micro-ATX", "Mini-ITX"],
      tier: 1,
      specs: "Chỉ hỗ trợ main M-ATX / ITX • Mặt lưới thoáng khí • Kèm 3 Fan",
      image: "https://cdn.hstatic.net/products/200000889805/25669-ximatek_e71a9fc7426d4254893c57bedb3d85a0_master.jpg"
    },
    {
      id: "case-4",
      name: "Deepcool CH370 Micro-ATX Airflow",
      price: 1090000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      form: "Micro-ATX",
      supportedForms: ["Micro-ATX", "Mini-ITX"],
      isQuiet: true,
      tier: 2,
      specs: "Hỗ trợ main M-ATX / ITX • Khung thép dày chống ồn • Có giá đỡ VGA",
      image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/c/a/case-may-tinh-deepcool-ch370-1.png"
    },
    {
      id: "case-2",
      name: "Montech AIR 100 ARGB Black",
      price: 1190000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      form: "Micro-ATX",
      supportedForms: ["Micro-ATX", "Mini-ITX"],
      isShowcase: true,
      tier: 3,
      specs: "Chỉ hỗ trợ main M-ATX / ITX • Cửa kính bản lề • Kèm 4 Fan ARGB",
      image: "https://www.montechpc.com/images/370041/0/1100?stamp=1733986134"
    },
    {
      id: "case-5",
      name: "Corsair 4000D Airflow Tempered Glass",
      price: 2150000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      form: "ATX",
      supportedForms: ["ATX", "Micro-ATX", "Mini-ITX"],
      isQuiet: true,
      tier: 4,
      specs: "Chuẩn Mid-Tower ATX (Lắp vừa mọi loại Main) • Luồng gió tối ưu",
      image: "https://assets.corsair.com/image/upload/c_pad,q_85,h_800,w_800,f_auto/products/Cases/base-4000d-airflow-config/Gallery/4000D_AF_BLACK_01.webp"
    },
    {
      id: "case-3",
      name: "NZXT H5 Flow RGB Black",
      price: 2490000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      form: "ATX",
      supportedForms: ["ATX", "Micro-ATX", "Mini-ITX"],
      isShowcase: true,
      tier: 5,
      specs: "Chuẩn Mid-Tower ATX • Quạt đáy nghiêng thổi trực tiếp làm mát GPU",
      image: "https://nzxt.com/images/width=1000,format=auto/2fd58e865eeda02febbbcf2b1ac8d06521f7314f4d6864eadf0271e8dfe51bcb"
    },
    {
      id: "case-6",
      name: "Lian Li O11 Dynamic EVO RGB",
      price: 3690000,
      priceUpdatedAt: "15/11/2026",
      priceNote: "Giá niêm yết công khai",
      form: "ATX",
      supportedForms: ["ATX", "Micro-ATX", "Mini-ITX"],
      isShowcase: true,
      tier: 5,
      specs: "Chuẩn Full/Mid ATX 2 mặt kính bể cá vô cực • Hỗ trợ Rad 360mm",
      image: "https://lian-li.com/wp-content/uploads/2021/12/evo-600-000.jpg"
    }
  ],
  cooler: [
    {
      id: "cooler-1",
      name: "Thermalright Assassin X 120 Refined SE",
      price: 390000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết bình ổn",
      maxTdp: 105,
      tier: 1,
      specs: "Tản nhiệt khí đơn 4 ống đồng • Quạt 120mm • Phù hợp CPU TDP <= 105W",
      image: "https://www.thermalright.com/wp-content/uploads/2026/08/assassin-x-120.png"
    },
    {
      id: "cooler-4",
      name: "Thermalright Peerless Assassin 120 SE ARGB",
      price: 890000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      maxTdp: 200,
      isQuiet: true,
      tier: 3,
      specs: "Tản khí tháp đôi 6 ống đồng • 2 Fan ARGB • Cân tốt CPU TDP <= 200W",
      image: "https://www.thermalright.com/wp-content/uploads/2026/08/peerless-assassin-120.png"
    },
    {
      id: "cooler-2",
      name: "Deepcool AG620 ARGB Dual Tower",
      price: 1150000,
      priceUpdatedAt: "16/11/2026",
      priceNote: "Giá niêm yết công khai",
      maxTdp: 220,
      isQuiet: true,
      tier: 3,
      specs: "Tản tháp đôi 6 ống đồng mạ niken • Cân tốt CPU công suất lớn (TDP <= 220W)",
      image: "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-ms0zfma6ggzoea"
    },
    {
      id: "cooler-3",
      name: "Thermalright Frozen Warframe 240 ARGB LCD",
      price: 1690000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Giá niêm yết công khai",
      maxTdp: 250,
      isShowcase: true,
      tier: 4,
      specs: "Tản nhiệt nước AIO 240mm • Màn hình LCD IPS hiển thị nhiệt độ CPU",
      image: "https://www.thermalright.com/wp-content/uploads/2026/08/frozen-warframe-240-black-argb.png"
    },
    {
      id: "cooler-5",
      name: "Arctic Liquid Freezer III 360 A-RGB",
      price: 2790000,
      priceUpdatedAt: "17/11/2026",
      priceNote: "Biến động nhẹ theo lô nhập",
      maxTdp: 280,
      isQuiet: true,
      tier: 5,
      specs: "Tản nước AIO 360mm • Kèm quạt làm mát VRM • Hiệu năng tản nhiệt đỉnh cao",
      image: "https://www.arctic.de/media/9d/26/30/1725369416/Liquid_Freezer_III_360_Black_G01_eha_3_awards.png"
    },
    {
      id: "cooler-6",
      name: "NZXT Kraken Elite 360 RGB Black",
      price: 6490000,
      priceUpdatedAt: "15/11/2026",
      priceNote: "Giá niêm yết công khai",
      maxTdp: 300,
      isShowcase: true,
      tier: 5,
      specs: "Tản nước AIO 360mm • Màn LCD rộng 2.36 inch tuỳ biến ảnh GIF & nhiệt độ",
      image: "https://nzxt.com/images/width=1000,format=auto/5ada0b95ebf638f5fa5ea925580526a298229ad931755952636c053602213ccc"
    }
  ]
};

// Danh sách 8 Slot tiêu chuẩn trong một bộ máy
const slotDefinitions = [
  { key: "cpu", name: "Vi xử lý (CPU)", shortName: "CPU", icon: "cpu", weight: 0.22 },
  { key: "motherboard", name: "Bo mạch chủ (Mainboard)", shortName: "Mainboard", icon: "circuit-board", weight: 0.14 },
  { key: "ram", name: "Bộ nhớ trong (RAM)", shortName: "RAM", icon: "database", weight: 0.10 },
  { key: "gpu", name: "Card màn hình (GPU / VGA)", shortName: "GPU", icon: "monitor", weight: 0.34 },
  { key: "storage", name: "Ổ cứng lưu trữ (SSD)", shortName: "SSD", icon: "hard-drive", weight: 0.07 },
  { key: "psu", name: "Nguồn máy tính (PSU)", shortName: "PSU", icon: "power", weight: 0.06 },
  { key: "case", name: "Vỏ máy tính (Case)", shortName: "Case", icon: "box", weight: 0.04 },
  { key: "cooler", name: "Tản nhiệt (Cooler)", shortName: "Tản nhiệt", icon: "fan", weight: 0.03 }
];

// --- 4. HỒ SƠ CHUYÊN GIA TƯ VẤN PC CHO 9 NHU CẦU KHÁC NHAU ---
const EXPERT_PURPOSE_PROFILES = {
  "Gaming": {
    badge: "Tối ưu FPS & Card đồ họa rời",
    advice: "Với nhu cầu Chơi Game, chuyên gia phân bổ 42%–48% ngân sách cho Card màn hình rời (GPU) để kéo FPS cao nhất, kết hợp CPU xung nhịp đơn nhân cao (hoặc dòng 3D V-Cache) không gây nghẽn cổ chai và RAM Dual-Channel.",
    weights: { gpu: 0.45, cpu: 0.20, motherboard: 0.11, ram: 0.08, storage: 0.06, psu: 0.05, case: 0.03, cooler: 0.02 },
    upgradeOrder: ['gpu', 'cpu', 'ram', 'storage', 'motherboard', 'psu', 'cooler', 'case'],
    allowIgpuOnlyWhenBelow: 9000000
  },
  "AI Training & LLM": {
    badge: "Ưu tiên NVIDIA CUDA & VRAM 12GB-16GB",
    advice: "Với Huấn luyện AI & chạy LLM cục bộ, yếu tố sống còn là dung lượng VRAM và nhân CUDA/Tensor của NVIDIA. Chuyên gia ưu tiên tuyệt đối GPU NVIDIA RTX 12GB–16GB VRAM (RTX 3060 12GB, RTX 4060 Ti 16GB, RTX 4070Ti/4080 Super) kèm RAM 32GB–64GB.",
    weights: { gpu: 0.48, ram: 0.14, cpu: 0.14, motherboard: 0.09, storage: 0.06, psu: 0.05, cooler: 0.02, case: 0.02 },
    upgradeOrder: ['gpu', 'ram', 'storage', 'cpu', 'psu', 'motherboard', 'cooler', 'case'],
    allowIgpuOnlyWhenBelow: 9000000
  },
  "Programming": {
    badge: "Ưu tiên CPU Đa Nhân, RAM 32GB+ & SSD Nhanh",
    advice: "Với Lập trình viên (Docker, Máy ảo, Biên dịch code), chuyên gia dồn ngân sách vào CPU nhiều nhân/luồng (10–24 nhân), nâng RAM lên 32GB–64GB và ổ cứng SSD NVMe 1TB–2TB tốc độ cao thay vì lãng phí tiền vào card đồ họa chơi game đắt đỏ.",
    weights: { cpu: 0.30, ram: 0.18, storage: 0.15, motherboard: 0.14, gpu: 0.10, cooler: 0.05, psu: 0.04, case: 0.04 },
    upgradeOrder: ['ram', 'cpu', 'storage', 'motherboard', 'cooler', 'case', 'psu', 'gpu'],
    allowIgpuOnlyWhenBelow: 22000000
  },
  "Music Production": {
    badge: "Ưu tiên CPU Xử lý DSP, RAM 32GB+ & Độ ồn thấp",
    advice: "Làm nhạc phòng thu (FL Studio, Cubase, Ableton) ngốn CPU đa luồng để xử lý Audio Buffer và cần RAM 32GB–64GB nạp thư viện nhạc cụ VST/Kontakt, cộng thêm tản nhiệt & vỏ case êm ái chống ồn. Sử dụng đồ họa tích hợp hoặc card cơ bản để dồn hết tiền cho CPU + RAM + SSD.",
    weights: { cpu: 0.32, ram: 0.20, storage: 0.15, motherboard: 0.14, cooler: 0.07, case: 0.05, psu: 0.04, gpu: 0.03 },
    upgradeOrder: ['cpu', 'ram', 'storage', 'cooler', 'motherboard', 'case', 'psu', 'gpu'],
    allowIgpuOnlyWhenBelow: 28000000
  },
  "Video Editing": {
    badge: "Cân bằng CPU QuickSync/Đa nhân, GPU VRAM & SSD Gen4",
    advice: "Dựng phim Premiere & DaVinci Resolve đòi hỏi sự kết hợp đồng bộ: CPU đa nhân (ưu tiên Intel có iGPU QuickSync giải mã H.264/HEVC) + Card rời RTX 12GB–16GB VRAM + RAM 32GB–64GB + SSD PCIe 4.0 có DRAM Cache để kéo timeline 4K mượt mà.",
    weights: { gpu: 0.34, cpu: 0.24, ram: 0.14, storage: 0.11, motherboard: 0.09, psu: 0.04, cooler: 0.02, case: 0.02 },
    upgradeOrder: ['gpu', 'cpu', 'ram', 'storage', 'motherboard', 'cooler', 'psu', 'case'],
    allowIgpuOnlyWhenBelow: 9500000
  },
  "Graphic Design": {
    badge: "Tối ưu Adobe Suite 2D/3D, CPU xung cao & RAM 32GB",
    advice: "Thiết kế đồ họa (Photoshop, Illustrator, Blender) ưu tiên CPU có xung nhịp đơn nhân & đa nhân cao kết hợp RAM 32GB để xử lý file PSD/Vector nặng không tràn bộ nhớ, đi cùng GPU NVIDIA RTX hỗ trợ tăng tốc phần cứng.",
    weights: { cpu: 0.27, gpu: 0.29, ram: 0.15, motherboard: 0.11, storage: 0.09, psu: 0.04, cooler: 0.03, case: 0.02 },
    upgradeOrder: ['cpu', 'ram', 'gpu', 'storage', 'motherboard', 'cooler', 'case', 'psu'],
    allowIgpuOnlyWhenBelow: 10500000
  },
  "Streaming": {
    badge: "Ưu tiên GPU NVIDIA AV1/NVENC & CPU Đa nhiệm",
    advice: "Để vừa chơi game nặng vừa Livestream OBS/TikTok sắc nét không tụt khung hình, chuyên gia ưu tiên Card NVIDIA RTX 40-series (có bộ mã hóa phần cứng AV1 NVENC thế hệ mới) kết hợp CPU nhiều luồng và RAM 32GB.",
    weights: { gpu: 0.38, cpu: 0.23, ram: 0.12, motherboard: 0.11, storage: 0.07, psu: 0.05, cooler: 0.02, case: 0.02 },
    upgradeOrder: ['gpu', 'cpu', 'ram', 'motherboard', 'storage', 'psu', 'cooler', 'case'],
    allowIgpuOnlyWhenBelow: 9000000
  },
  "Office & Study": {
    badge: "Bền bỉ, Tiết kiệm điện & Tối ưu chi phí",
    advice: "Với Văn phòng & Học tập, chuyên gia ưu tiên sử dụng CPU có sẵn nhân đồ họa tích hợp (iGPU Intel UHD / AMD Radeon Vega) giúp tiết kiệm hàng triệu đồng tiền card rời, tập trung vào SSD NVMe tốc độ cao, RAM 16GB–32GB đa nhiệm và bộ nguồn chuẩn 80 Plus bền bỉ.",
    weights: { cpu: 0.30, motherboard: 0.20, ram: 0.18, storage: 0.15, psu: 0.08, case: 0.05, cooler: 0.04, gpu: 0.00 },
    upgradeOrder: ['cpu', 'storage', 'ram', 'motherboard', 'case', 'cooler', 'psu', 'gpu'],
    allowIgpuOnlyWhenBelow: 45000000,
    reasonableCapMultiplier: 0.85
  },
  "Custom PC Build": {
    badge: "Cân bằng Hiệu năng & Thẩm mỹ Showcase ARGB",
    advice: "Với Custom PC Build, chuyên gia cân đối giữa sức mạnh phần cứng và ngoại hình Showcase: ưu tiên Vỏ Case kính cường lực thoáng khí, Tản nhiệt nước AIO có màn hình LCD hoặc ARGB đồng bộ, RAM RGB và bo mạch chủ tản VRM đẹp mắt.",
    weights: { gpu: 0.33, cpu: 0.21, motherboard: 0.13, ram: 0.10, case: 0.08, cooler: 0.06, storage: 0.05, psu: 0.04 },
    upgradeOrder: ['gpu', 'cpu', 'cooler', 'case', 'ram', 'motherboard', 'storage', 'psu'],
    allowIgpuOnlyWhenBelow: 9500000
  }
};

function createEmptyBuild() {
  return {
    cpu: null,
    motherboard: null,
    ram: null,
    gpu: null,
    storage: null,
    psu: null,
    case: null,
    cooler: null
  };
}

function loadSavedBuild() {
  const empty = createEmptyBuild();
  try {
    const raw = localStorage.getItem('pcmon_current_build');
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty;

    slotDefinitions.forEach(({ key }) => {
      const savedItem = parsed[key];
      if (savedItem && savedItem.id && componentsDB[key]) {
        empty[key] = componentsDB[key].find(item => item.id === savedItem.id) || null;
      }
    });
    return empty;
  } catch (err) {
    console.warn('[PC MON] Dữ liệu cấu hình lưu trữ không hợp lệ, đã đặt lại mặc định.', err);
    return empty;
  }
}

function saveBuild() {
  try {
    localStorage.setItem('pcmon_current_build', JSON.stringify(currentBuild));
  } catch (err) {
    console.warn('[PC MON] Không thể lưu cấu hình vào localStorage:', err);
  }
}

let currentBuild = loadSavedBuild();
let activeModalCategory = null;
let isOtherChoicesExpanded = false;

// --- 5. DỮ LIỆU NHU CẦU SỬ DỤNG ---
const usageCategories = [
  {
    title: "Gaming",
    slug: "gaming",
    icon: "gamepad-2",
    desc: "Tối ưu hóa FPS, ưu tiên GPU mạnh mẽ (45% ngân sách) và CPU xung cao cho trải nghiệm game mượt mà.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Music Production",
    slug: "music-production",
    icon: "music",
    desc: "Ưu tiên CPU đa nhân xử lý DSP, RAM 32GB+ nạp VST plugins, SSD lớn và tản nhiệt êm ái.",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Streaming",
    slug: "streaming",
    icon: "video",
    desc: "Ưu tiên GPU NVIDIA RTX có bộ mã hóa AV1/NVENC kết hợp CPU đa luồng vừa chơi game vừa livestream.",
    image: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Programming",
    slug: "programming",
    icon: "code",
    desc: "Dồn ngân sách vào CPU nhiều nhân, RAM 32GB–64GB chạy Docker/Máy ảo và SSD NVMe tốc độ cao.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Graphic Design",
    slug: "graphic-design",
    icon: "palette",
    desc: "Xử lý mượt Adobe Suite (Photoshop, Illustrator, Blender) với CPU xung cao, RAM 32GB và GPU RTX.",
    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Video Editing",
    slug: "video-editing",
    icon: "film",
    desc: "Dựng phim 4K mượt mà với CPU Intel QuickSync/Đa nhân, GPU nhiều VRAM và SSD Gen4 có DRAM.",
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Office & Study",
    slug: "office-study",
    icon: "briefcase",
    desc: "Sử dụng CPU tích hợp sẵn iGPU tiết kiệm chi phí, RAM đa nhiệm và SSD NVMe bền bỉ, êm ái.",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Custom PC Build",
    slug: "custom",
    icon: "sliders",
    desc: "Cân bằng hiệu năng và thẩm mỹ Showcase với Vỏ Case kính, Tản nước AIO LCD và LED ARGB.",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "AI Training & LLM",
    slug: "ai-training",
    icon: "brain",
    desc: "Ưu tiên tuyệt đối GPU NVIDIA RTX có VRAM lớn (12GB–16GB) chạy CUDA/LLM cục bộ và RAM 32GB–64GB.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80"
  }
];

// --- 6. MENU MOBILE RESPONSIVE ---
const btnMobileMenu = document.getElementById('btn-mobile-menu');
const mobileNav = document.getElementById('mobile-nav');

if (btnMobileMenu && mobileNav) {
  btnMobileMenu.addEventListener('click', () => {
    const isHidden = mobileNav.classList.toggle('hidden');
    btnMobileMenu.setAttribute('aria-expanded', String(!isHidden));
  });
}

// --- 7. RENDER TRANG 1: CHỌN NHU CẦU SỬ DỤNG (KHI CHỌN LẠI SẼ RESET PHỤ KIỆN & CHUYỂN TRANG NGÂN SÁCH) ---
const usageGrid = document.getElementById('usage-grid');
const badgePurpose = document.getElementById('selected-purpose-badge');
const textPurpose = document.getElementById('selected-purpose-text');
const builderPurposeDisplay = document.getElementById('builder-purpose-display');
const budgetPagePurposeName = document.getElementById('budget-page-purpose-name');
const stepperPurposeLabel = document.getElementById('stepper-purpose-label');

if (usageGrid) {
  const fragment = document.createDocumentFragment();
  usageCategories.forEach(cat => {
    const card = document.createElement('div');
    card.className = "usage-card cursor-pointer group rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between overflow-hidden";
    card.dataset.slug = cat.slug;
    card.innerHTML = `
      <div class="relative h-36 w-full overflow-hidden bg-gray-950">
        <img src="${cat.image}" alt="${cat.title}" onerror="handleImgError(this, 'gpu')" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
        <div class="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-blue-400 group-hover:text-white group-hover:bg-blue-600 transition-all shadow-md">
          <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
        </div>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="text-base font-bold text-white mb-1.5 group-hover:text-blue-400 transition-colors">${cat.title}</h3>
          <p class="text-xs text-gray-400 leading-relaxed">${cat.desc}</p>
        </div>
        <div class="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs font-semibold text-blue-400">
          <span>Chọn nhu cầu &amp; Sang Trang Ngân Sách</span>
          <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform"></i>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      // KHI CHỌN LẠI MỤC ĐÍCH SỬ DỤNG -> RESET LẠI TOÀN BỘ PHẦN CHỌN PHỤ KIỆN
      currentBuild = createEmptyBuild();
      saveBuild();

      localStorage.setItem('pcmon_purpose', cat.title);
      updatePurposeUI(cat.title, cat.slug);
      renderBuilderSlots();
      updateBuilderDashboard();

      showToast(
        `Đã chọn nhu cầu "${cat.title}" và reset lại danh sách phụ kiện. Mời bạn chọn mức ngân sách!`,
        'info'
      );

      navigateToPage('budget', true);
    });

    fragment.appendChild(card);
  });
  usageGrid.appendChild(fragment);
}

function updatePurposeUI(title, slug) {
  if (badgePurpose && textPurpose) {
    badgePurpose.classList.remove('hidden');
    badgePurpose.classList.add('inline-flex');
    textPurpose.textContent = title;
  }
  if (builderPurposeDisplay) builderPurposeDisplay.textContent = title;
  if (budgetPagePurposeName) budgetPagePurposeName.textContent = title;
  if (stepperPurposeLabel) stepperPurposeLabel.textContent = title;

  document.querySelectorAll('.usage-card').forEach(el => {
    if (el.dataset.slug === slug) {
      el.classList.add('border-blue-500', 'bg-blue-950/20');
      el.classList.remove('border-gray-800');
    } else {
      el.classList.remove('border-blue-500', 'bg-blue-950/20');
      el.classList.add('border-gray-800');
    }
  });
}

// --- 8. RENDER TRANG 2: CHỌN MỨC NGÂN SÁCH (BUDGET PAGE) ---
const budgetRange = document.getElementById('budget-range');
const budgetDisplay = document.getElementById('budget-display');
const targetBudgetDisplay = document.getElementById('target-budget-display');
const stepperBudgetLabel = document.getElementById('stepper-budget-label');
const presetContainer = document.getElementById('preset-buttons');
const btnConfirmBuild = document.getElementById('btn-confirm-build');

const budgetPresets = [10000000, 15000000, 20000000, 28000000, 40000000, 60000000];

function syncRangeProgressUI(amount) {
  if (!budgetRange) return;
  const min = Number(budgetRange.min) || 8000000;
  const max = Number(budgetRange.max) || 80000000;
  const percentage = Math.max(0, Math.min(100, ((amount - min) / (max - min)) * 100));
  budgetRange.style.setProperty('--range-progress', `${percentage.toFixed(1)}%`);
}

function updateBudget(amount, skipDashboardUpdate = false) {
  const validAmount = Math.max(8000000, Math.min(80000000, Number(amount) || 20000000));
  const formatted = formatVND(validAmount);
  if (budgetDisplay) budgetDisplay.textContent = formatted;
  if (targetBudgetDisplay) targetBudgetDisplay.textContent = formatted;
  if (stepperBudgetLabel) stepperBudgetLabel.textContent = formatted;
  localStorage.setItem('pcmon_budget', String(validAmount));
  syncRangeProgressUI(validAmount);

  if (presetContainer) {
    presetContainer.querySelectorAll('button').forEach(btn => {
      if (Number(btn.dataset.amount) === validAmount) {
        btn.classList.add('bg-blue-600', 'border-blue-500', 'text-white');
        btn.classList.remove('bg-gray-800', 'border-gray-700', 'text-gray-200');
      } else {
        btn.classList.remove('bg-blue-600', 'border-blue-500', 'text-white');
        btn.classList.add('bg-gray-800', 'border-gray-700', 'text-gray-200');
      }
    });
  }

  if (!skipDashboardUpdate) {
    renderBuilderSlots();
    updateBuilderDashboard();
  }
}

if (presetContainer && budgetRange) {
  const fragment = document.createDocumentFragment();
  budgetPresets.forEach(amount => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.amount = amount;
    btn.className = "py-2 px-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all text-center";
    btn.textContent = `${amount / 1000000} Triệu ₫`;

    btn.addEventListener('click', () => {
      budgetRange.value = amount;
      updateBudget(amount);
    });

    fragment.appendChild(btn);
  });
  presetContainer.appendChild(fragment);
}

if (budgetRange) {
  budgetRange.addEventListener('input', (e) => {
    updateBudget(Number(e.target.value));
  });
}

if (btnConfirmBuild) {
  btnConfirmBuild.addEventListener('click', () => {
    const currentBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
    const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';
    showToast(`Chuyên gia đã lên phương án tối ưu cho nhu cầu "${purpose}" trong tầm giá ${formatVND(currentBudget)}.`, 'success');
    navigateToPage('builder', true);
  });
}

// --- 9. BỘ KIỂM TRA TƯƠNG THÍCH PHẦN CỨNG CHI TIẾT ---
function calculateBuildMetrics(build) {
  let totalPrice = 0;
  let totalTdp = 0;
  let selectedCount = 0;

  slotDefinitions.forEach(({ key }) => {
    const item = build[key];
    if (item) {
      totalPrice += item.price || 0;
      selectedCount++;
      if (item.tdp) totalTdp += item.tdp;
    }
  });

  const estimatedWattage = totalTdp > 0 ? totalTdp + 75 : 0;
  const recommendedPsu = totalTdp > 0 ? Math.ceil((estimatedWattage * 1.35) / 50) * 50 : 450;

  return { totalPrice, totalTdp, selectedCount, estimatedWattage, recommendedPsu };
}

function evaluateBuildCompatibility(build) {
  const issues = [];
  const warnings = [];
  const slotIssuesMap = {};

  function addSlotIssue(slotKey, message) {
    if (!slotIssuesMap[slotKey]) slotIssuesMap[slotKey] = [];
    slotIssuesMap[slotKey].push(message);
  }

  const { estimatedWattage, recommendedPsu } = calculateBuildMetrics(build);

  // Quy tắc 1: Socket CPU và Bo mạch chủ
  if (build.cpu && build.motherboard) {
    if (build.cpu.socket !== build.motherboard.socket) {
      const msg = `CPU ${build.cpu.name} dùng chân cắm ${build.cpu.socket}, không lắp vừa Bo mạch chủ ${build.motherboard.name} (Socket ${build.motherboard.socket}).`;
      issues.push({
        id: 'socket-mismatch',
        title: 'Xung đột Socket CPU & Bo mạch chủ',
        pairLabel: 'CPU ↔ Bo mạch chủ',
        slots: ['cpu', 'motherboard'],
        fixSlot: 'motherboard',
        fixLabel: 'Đổi Mainboard đúng Socket ' + build.cpu.socket,
        message: msg
      });
      addSlotIssue('cpu', `Lệch Socket với Mainboard (${build.cpu.socket} ≠ ${build.motherboard.socket})`);
      addSlotIssue('motherboard', `Lệch Socket với CPU (${build.motherboard.socket} ≠ ${build.cpu.socket})`);
    }
  }

  // Quy tắc 2: Chuẩn RAM giữa Bo mạch chủ và RAM
  if (build.motherboard && build.ram) {
    if (build.motherboard.ramType !== build.ram.type) {
      const msg = `Bo mạch chủ ${build.motherboard.name} chỉ hỗ trợ khe cắm ${build.motherboard.ramType}, không thể gắn thanh RAM ${build.ram.name} (Chuẩn ${build.ram.type}).`;
      issues.push({
        id: 'ram-mismatch',
        title: 'Không tương thích chuẩn bộ nhớ RAM',
        pairLabel: 'Bo mạch chủ ↔ RAM',
        slots: ['motherboard', 'ram'],
        fixSlot: 'ram',
        fixLabel: 'Đổi RAM chuẩn ' + build.motherboard.ramType,
        message: msg
      });
      addSlotIssue('motherboard', `Khe RAM ${build.motherboard.ramType} không khớp với RAM ${build.ram.type} đang chọn`);
      addSlotIssue('ram', `RAM chuẩn ${build.ram.type} không cắm vừa Mainboard ${build.motherboard.ramType}`);
    }
  }

  // Quy tắc 2B: CPU AM5 bắt buộc đi với RAM DDR5 & CPU AM4 đi với RAM DDR4
  if (build.cpu && build.ram && !build.motherboard) {
    if (build.cpu.socket === 'AM5' && build.ram.type !== 'DDR5') {
      const msg = `Vi xử lý ${build.cpu.name} (Nền tảng AM5) chỉ hỗ trợ bộ nhớ chuẩn DDR5, không tương thích với RAM ${build.ram.type}.`;
      issues.push({
        id: 'cpu-ram-mismatch-am5',
        title: 'Nền tảng CPU AM5 yêu cầu chuẩn RAM DDR5',
        pairLabel: 'CPU ↔ RAM',
        slots: ['cpu', 'ram'],
        fixSlot: 'ram',
        fixLabel: 'Đổi sang RAM DDR5',
        message: msg
      });
      addSlotIssue('cpu', `Nền tảng AM5 chỉ chạy RAM DDR5`);
      addSlotIssue('ram', `RAM ${build.ram.type} không tương thích với CPU Socket AM5`);
    } else if (build.cpu.socket === 'AM4' && build.ram.type !== 'DDR4') {
      const msg = `Vi xử lý ${build.cpu.name} (Nền tảng AM4) chỉ hỗ trợ bộ nhớ chuẩn DDR4, không tương thích với RAM ${build.ram.type}.`;
      issues.push({
        id: 'cpu-ram-mismatch-am4',
        title: 'Nền tảng CPU AM4 chỉ hỗ trợ RAM DDR4',
        pairLabel: 'CPU ↔ RAM',
        slots: ['cpu', 'ram'],
        fixSlot: 'ram',
        fixLabel: 'Đổi sang RAM DDR4',
        message: msg
      });
      addSlotIssue('cpu', `Nền tảng AM4 chỉ chạy RAM DDR4`);
      addSlotIssue('ram', `RAM ${build.ram.type} không tương thích với CPU Socket AM4`);
    }
  }

  // Quy tắc 3: CPU dòng F (không có iGPU) bắt buộc phải có Card màn hình rời
  if (build.cpu && build.gpu) {
    if (build.gpu.requiresIgpuCpu && !build.cpu.hasIgpu) {
      const msg = `CPU ${build.cpu.name} (dòng không có nhân đồ họa tích hợp) bắt buộc phải lắp Card màn hình rời để xuất hình ra màn hình!`;
      issues.push({
        id: 'igpu-missing-on-f-cpu',
        title: 'CPU không có nhân đồ họa tích hợp (iGPU)',
        pairLabel: 'CPU ↔ Card đồ họa',
        slots: ['cpu', 'gpu'],
        fixSlot: 'gpu',
        fixLabel: 'Chọn Card màn hình rời',
        message: msg
      });
      addSlotIssue('cpu', `CPU này không có iGPU, cần lắp thêm Card đồ họa rời`);
      addSlotIssue('gpu', `Không thể dùng iGPU vì ${build.cpu.name} đã cắt bỏ nhân đồ họa`);
    }
  }

  // Quy tắc 4: Kích thước Bo mạch chủ (Form Factor) và Vỏ Case
  if (build.motherboard && build.case) {
    const supported = build.case.supportedForms || (build.case.form === 'ATX' ? ['ATX', 'Micro-ATX', 'Mini-ITX'] : ['Micro-ATX', 'Mini-ITX']);
    if (!supported.includes(build.motherboard.form)) {
      const msg = `Vỏ máy ${build.case.name} chỉ hỗ trợ tối đa chuẩn ${build.case.form}, không đủ không gian lắp Bo mạch chủ kích thước lớn ${build.motherboard.form} (${build.motherboard.name}).`;
      issues.push({
        id: 'case-form-mismatch',
        title: 'Kích thước Bo mạch chủ không vừa Vỏ Case',
        pairLabel: 'Bo mạch chủ ↔ Vỏ Case',
        slots: ['motherboard', 'case'],
        fixSlot: 'case',
        fixLabel: 'Đổi Vỏ Case chuẩn ATX',
        message: msg
      });
      addSlotIssue('motherboard', `Kích thước ${build.motherboard.form} quá lớn so với Vỏ Case ${build.case.form}`);
      addSlotIssue('case', `Vỏ Case ${build.case.form} không lắp vừa Mainboard chuẩn ${build.motherboard.form}`);
    }
  }

  // Quy tắc 5: Công suất nguồn (PSU)
  if (build.psu && estimatedWattage > 0) {
    if (build.psu.wattage < estimatedWattage) {
      const msg = `Bộ nguồn ${build.psu.name} (${build.psu.wattage}W) thấp hơn công suất tiêu thụ thực tế của hệ thống (${estimatedWattage}W). Máy sẽ sập nguồn khi tải nặng, cần tối thiểu ${recommendedPsu}W.`;
      issues.push({
        id: 'psu-overload',
        title: 'Nguồn máy tính (PSU) không đủ công suất tải',
        pairLabel: 'Nguồn PSU ↔ Công suất máy',
        slots: ['psu', 'gpu', 'cpu'],
        fixSlot: 'psu',
        fixLabel: `Đổi Nguồn từ ${recommendedPsu}W trở lên`,
        message: msg
      });
      addSlotIssue('psu', `Công suất ${build.psu.wattage}W không đủ tải hệ thống (${estimatedWattage}W)`);
    } else if (build.psu.wattage < recommendedPsu) {
      const msg = `Bộ nguồn ${build.psu.name} (${build.psu.wattage}W) thấp hơn mức công suất khuyến nghị an toàn (${recommendedPsu}W) cho cấu hình tiêu thụ ${estimatedWattage}W hiện tại.`;
      issues.push({
        id: 'psu-under-recommended',
        title: 'Công suất nguồn (PSU) thấp hơn khuyến nghị an toàn',
        pairLabel: 'Nguồn PSU ↔ CPU/GPU',
        slots: ['psu', 'gpu', 'cpu'],
        fixSlot: 'psu',
        fixLabel: `Đổi Nguồn ${recommendedPsu}W trở lên`,
        message: msg
      });
      addSlotIssue('psu', `Thấp hơn công suất khuyến nghị ${recommendedPsu}W của hệ thống`);
    }
  }

  // Quy tắc 6: Tản nhiệt CPU công suất lớn
  if (build.cpu && build.cooler) {
    if (build.cpu.tdp >= 120 && build.cooler.maxTdp && build.cooler.maxTdp < build.cpu.tdp) {
      const msg = `Tản nhiệt ${build.cooler.name} (giải nhiệt tối đa ${build.cooler.maxTdp}W) không đủ khả năng làm mát cho ${build.cpu.name} (TDP ${build.cpu.tdp}W), dễ gây quá nhiệt và giảm xung nhịp.`;
      issues.push({
        id: 'cooler-insufficient',
        title: 'Tản nhiệt không đủ công suất làm mát cho CPU',
        pairLabel: 'CPU ↔ Tản nhiệt',
        slots: ['cpu', 'cooler'],
        fixSlot: 'cooler',
        fixLabel: 'Đổi Tản nhiệt Tháp đôi / AIO',
        message: msg
      });
      addSlotIssue('cpu', `Tản nhiệt đang chọn (${build.cooler.maxTdp}W) không đủ làm mát TDP ${build.cpu.tdp}W`);
      addSlotIssue('cooler', `Không đủ sức tản nhiệt cho CPU TDP ${build.cpu.tdp}W (Tối đa ${build.cooler.maxTdp}W)`);
    }
  }

  const errors = issues.map(i => i.message);
  return { issues, errors, warnings, slotIssuesMap };
}

function checkCandidateCompatibility(categoryKey, candidateItem, baseBuild = currentBuild) {
  const simulatedBuild = { ...baseBuild, [categoryKey]: candidateItem };
  const { issues, warnings, slotIssuesMap } = evaluateBuildCompatibility(simulatedBuild);
  const candidateSpecificReasons = slotIssuesMap[categoryKey] || [];
  const relevantIssues = issues.filter(iss => iss.slots.includes(categoryKey));

  const { recommendedPsu, totalTdp } = calculateBuildMetrics(simulatedBuild);
  let psuUnderRecommended = false;
  if (categoryKey === 'psu' && totalTdp > 0 && candidateItem.wattage < recommendedPsu) {
    psuUnderRecommended = true;
  }

  const isCompatible = relevantIssues.length === 0 && !psuUnderRecommended;

  let reason = '';
  if (!isCompatible) {
    if (relevantIssues.length > 0) {
      reason = relevantIssues.map(i => i.message).join(' ');
    } else if (psuUnderRecommended) {
      reason = `Công suất ${candidateItem.wattage}W thấp hơn mức khuyến nghị an toàn (${recommendedPsu}W) cho cấu hình hiện tại.`;
    }
  } else {
    const matchNotes = [];
    if (categoryKey === 'motherboard' && baseBuild.cpu) {
      matchNotes.push(`Khớp chuẩn Socket ${candidateItem.socket} với ${baseBuild.cpu.name}`);
    }
    if (categoryKey === 'cpu' && baseBuild.motherboard) {
      matchNotes.push(`Khớp chuẩn Socket ${candidateItem.socket} với ${baseBuild.motherboard.name}`);
    }
    if (categoryKey === 'ram' && baseBuild.motherboard) {
      matchNotes.push(`Đúng chuẩn RAM ${candidateItem.type} của Mainboard đã chọn`);
    }
    if (categoryKey === 'motherboard' && baseBuild.ram) {
      matchNotes.push(`Hỗ trợ chuẩn RAM ${candidateItem.ramType} bạn đã chọn`);
    }
    if (categoryKey === 'case' && baseBuild.motherboard) {
      matchNotes.push(`Lắp vừa vặn Mainboard chuẩn ${baseBuild.motherboard.form}`);
    }
    if (categoryKey === 'psu' && totalTdp > 0) {
      matchNotes.push(`Đáp ứng tốt công suất khuyến nghị (${recommendedPsu}W)`);
    }
    if (categoryKey === 'cooler' && baseBuild.cpu) {
      matchNotes.push(`Đảm bảo tản nhiệt mát mẻ cho ${baseBuild.cpu.name} (${baseBuild.cpu.tdp}W)`);
    }
    if (categoryKey === 'gpu' && candidateItem.requiresIgpuCpu && baseBuild.cpu) {
      matchNotes.push(`Khai thác sẵn nhân đồ họa tích hợp của ${baseBuild.cpu.name} (Tiết kiệm 100% chi phí VGA)`);
    }
    reason = matchNotes.length > 0
      ? matchNotes.join(' • ')
      : 'Tương thích hoàn toàn với cấu hình hiện tại';
  }

  return {
    isCompatible,
    hasWarning: warnings.length > 0,
    reason,
    shortConflict: candidateSpecificReasons[0] || (psuUnderRecommended ? `Thấp hơn khuyến nghị ${recommendedPsu}W` : '')
  };
}

// --- 10. THUẬT TOÁN CHUYÊN GIA TƯ VẤN & TỐI ƯU NGÂN SÁCH (KHÔNG BAO GIỜ VƯỢT BUDGET) ---
/**
 * Chấm điểm giá trị chuyên môn của từng linh kiện đối với riêng từng Nhu cầu
 */
function getExpertComponentUtility(purposeTitle, slotKey, item, targetBudget) {
  const profile = EXPERT_PURPOSE_PROFILES[purposeTitle] || EXPERT_PURPOSE_PROFILES["Gaming"];
  let u = item.tier * 22;

  if (slotKey === 'cpu') {
    if (purposeTitle === 'Gaming' || purposeTitle === 'Streaming') {
      u = item.gamingScore || item.tier * 20;
      if (item.isX3d) u += 35;
    } else if (purposeTitle === 'Programming' || purposeTitle === 'Music Production' || purposeTitle === 'Video Editing') {
      u = (item.workScore || item.tier * 20) + (item.cores || 4) * 3.5;
      if (purposeTitle === 'Video Editing' && item.quickSync) u += 18;
    } else if (purposeTitle === 'Office & Study') {
      u = item.hasIgpu ? 95 + item.tier * 8 : 30;
    } else if (purposeTitle === 'Graphic Design') {
      u = (item.workScore || 60) + (item.gamingScore || 60) * 0.5;
    }
  } else if (slotKey === 'gpu') {
    if (item.requiresIgpuCpu) {
      if (purposeTitle === 'Office & Study' && targetBudget <= 35000000) return 140;
      if ((purposeTitle === 'Music Production' || purposeTitle === 'Programming') && targetBudget <= profile.allowIgpuOnlyWhenBelow) {
        return 115;
      }
      if (targetBudget <= profile.allowIgpuOnlyWhenBelow) return 90;
      return 5;
    }

    if (purposeTitle === 'Gaming') {
      u = item.tier * 38 + (item.id === 'gpu-2' ? 18 : 0) + (item.vramGB || 4) * 1.5;
    } else if (purposeTitle === 'AI Training & LLM') {
      // Chuyên gia AI: Bắt buộc ưu tiên NVIDIA CUDA + VRAM 12GB-16GB
      u = (item.isNvidia ? 75 : 5) + (item.vramGB || 4) * 9 + item.tier * 14;
    } else if (purposeTitle === 'Streaming') {
      u = (item.isNvidia ? 50 : 15) + (item.hasAv1 ? 38 : 0) + item.tier * 26;
    } else if (purposeTitle === 'Video Editing') {
      u = (item.isNvidia ? 45 : 15) + (item.vramGB || 4) * 5.5 + item.tier * 22;
    } else if (purposeTitle === 'Graphic Design') {
      u = (item.isNvidia ? 40 : 25) + (item.vramGB || 4) * 3 + item.tier * 20;
    } else if (purposeTitle === 'Programming' || purposeTitle === 'Music Production') {
      // Lập trình & Làm nhạc không cần VGA quá đắt trừ khi ngân sách rất lớn
      u = item.tier <= 2 ? 75 + item.tier * 12 : 85 + item.tier * 4;
    } else if (purposeTitle === 'Office & Study') {
      u = item.tier === 1 ? 85 : 40;
    } else if (purposeTitle === 'Custom PC Build') {
      u = item.tier * 30 + (item.vramGB || 4) * 2;
    }
  } else if (slotKey === 'ram') {
    const cap = item.capacityGB || 16;
    if (['Programming', 'Music Production', 'AI Training & LLM', 'Video Editing', 'Graphic Design'].includes(purposeTitle)) {
      u = cap >= 64 ? 135 : cap >= 32 ? 105 : 45;
    } else if (purposeTitle === 'Office & Study') {
      u = cap === 16 ? 95 : cap === 32 ? 102 : 70;
    } else {
      u = cap >= 32 ? 95 + item.tier * 6 : 75;
    }
    if (purposeTitle === 'Custom PC Build' && item.hasRgb) u += 25;
  } else if (slotKey === 'storage') {
    const cap = item.capacityGB || 500;
    if (['Video Editing', 'Music Production', 'Programming', 'AI Training & LLM'].includes(purposeTitle)) {
      u = (cap >= 2000 ? 120 : cap >= 1000 ? 95 : 45) + (item.hasDram ? 25 : 0);
    } else {
      u = cap >= 1000 ? 90 + item.tier * 5 : 70;
    }
  } else if (slotKey === 'cooler') {
    if (purposeTitle === 'Music Production' && item.isQuiet) u += 30;
    if (purposeTitle === 'Custom PC Build' && item.isShowcase) u += 38;
  } else if (slotKey === 'case') {
    if (purposeTitle === 'Custom PC Build' && item.isShowcase) u += 42;
    if (purposeTitle === 'Music Production' && item.isQuiet) u += 25;
  }

  return u;
}

/**
 * Đảm bảo nguồn PSU, Tản nhiệt và Vỏ Case trong bản nháp luôn đủ chuẩn tương thích với CPU/GPU/Mainboard
 */
function enforceSupportingCompatibility(draftBuild, lockedBuild = {}) {
  // 0. Chống nghẽn cổ chai (Anti-Bottleneck): Không ghép GPU tầm trung/cao với CPU 4 nhân 4 luồng (cpu-0)
  if (draftBuild.gpu && draftBuild.cpu && !lockedBuild.cpu) {
    if (draftBuild.gpu.tier >= 2 && draftBuild.cpu.id === 'cpu-0') {
      const betterCpu = componentsDB.cpu
        .filter(c => c.socket === draftBuild.cpu.socket && c.threads >= 8)
        .sort((a, b) => a.price - b.price)[0];
      if (betterCpu) draftBuild.cpu = betterCpu;
    }
    if (draftBuild.gpu.tier >= 5 && draftBuild.cpu.tier < 3) {
      const highTierCpu = componentsDB.cpu
        .filter(c => c.socket === draftBuild.cpu.socket && c.tier >= 3)
        .sort((a, b) => a.price - b.price)[0];
      if (highTierCpu) draftBuild.cpu = highTierCpu;
    }
  }

  // 1. Kiểm tra Vỏ Case có lắp vừa Mainboard không
  if (draftBuild.motherboard && draftBuild.case && !lockedBuild.case) {
    const supported = draftBuild.case.supportedForms || ['Micro-ATX'];
    if (!supported.includes(draftBuild.motherboard.form)) {
      const validCase = componentsDB.case
        .filter(c => (c.supportedForms || []).includes(draftBuild.motherboard.form))
        .sort((a, b) => a.price - b.price)[0];
      if (validCase) draftBuild.case = validCase;
    }
  }

  // 2. Kiểm tra Tản nhiệt có đủ maxTdp cho CPU không
  if (draftBuild.cpu && draftBuild.cooler && !lockedBuild.cooler) {
    if (draftBuild.cpu.tdp >= 120 && draftBuild.cooler.maxTdp < draftBuild.cpu.tdp) {
      const validCooler = componentsDB.cooler
        .filter(c => c.maxTdp >= draftBuild.cpu.tdp)
        .sort((a, b) => a.price - b.price)[0];
      if (validCooler) draftBuild.cooler = validCooler;
    }
  }

  // 3. Kiểm tra Nguồn PSU có đủ công suất khuyến nghị không
  if (draftBuild.psu && !lockedBuild.psu) {
    const { recommendedPsu } = calculateBuildMetrics(draftBuild);
    if (draftBuild.psu.wattage < recommendedPsu) {
      const validPsu = componentsDB.psu
        .filter(p => p.wattage >= recommendedPsu)
        .sort((a, b) => a.price - b.price)[0];
      if (validPsu) draftBuild.psu = validPsu;
    }
  }

  return draftBuild;
}

/**
 * Giải bài toán chọn cấu hình 8 linh kiện tối ưu theo đúng triết lý Chuyên gia PC:
 * - Giữ nguyên các linh kiện người dùng đã chọn trong lockedBuild
 * - Không bao giờ vượt quá targetBudget (totalPrice <= targetBudget)
 * - Khác biệt rõ rệt theo từng mục đích sử dụng (purposeTitle)
 */
function solveExpertBuild(targetBudget, purposeTitle, lockedBuild = createEmptyBuild()) {
  const profile = EXPERT_PURPOSE_PROFILES[purposeTitle] || EXPERT_PURPOSE_PROFILES["Gaming"];

  // Đối với nhu cầu Văn phòng & Học tập, không tự ý tiêu hết sạch 50-80 triệu nếu người dùng kéo thanh trượt quá cao
  const effectiveMaxSpend = (purposeTitle === 'Office & Study' && targetBudget > 18000000)
    ? Math.min(targetBudget, Math.max(16500000, Math.round(targetBudget * 0.65)))
    : targetBudget;

  const platforms = [
    { socket: 'AM4', ramType: 'DDR4' },
    { socket: 'LGA1700', ramType: 'DDR4' },
    { socket: 'LGA1700', ramType: 'DDR5' },
    { socket: 'AM5', ramType: 'DDR5' }
  ];

  // Lọc các nền tảng hợp lệ với linh kiện đã khóa của người dùng
  const validPlatforms = platforms.filter(pf => {
    if (lockedBuild.cpu && lockedBuild.cpu.socket !== pf.socket) return false;
    if (lockedBuild.motherboard) {
      if (lockedBuild.motherboard.socket !== pf.socket) return false;
      if (lockedBuild.motherboard.ramType !== pf.ramType) return false;
    }
    if (lockedBuild.ram && lockedBuild.ram.type !== pf.ramType) return false;
    return true;
  });

  const platformsToTry = validPlatforms.length > 0 ? validPlatforms : [platforms[1]];
  let bestCandidateBuild = null;
  let bestCandidateScore = -Infinity;

  platformsToTry.forEach(pf => {
    // Khởi tạo cấu hình cơ sở tiết kiệm nhất trên nền tảng pf
    const draft = { ...lockedBuild };

    const cpus = componentsDB.cpu.filter(c => c.socket === pf.socket).sort((a, b) => a.price - b.price);
    const mbs = componentsDB.motherboard.filter(m => m.socket === pf.socket && m.ramType === pf.ramType).sort((a, b) => a.price - b.price);
    const rams = componentsDB.ram.filter(r => r.type === pf.ramType).sort((a, b) => a.price - b.price);
    const ssds = [...componentsDB.storage].sort((a, b) => a.price - b.price);
    const psus = [...componentsDB.psu].sort((a, b) => a.price - b.price);
    const cases = [...componentsDB.case].sort((a, b) => a.price - b.price);
    const coolers = [...componentsDB.cooler].sort((a, b) => a.price - b.price);

    if (!cpus.length || !mbs.length || !rams.length) return;

    // Quyết định có khởi đầu bằng iGPU hay GPU rời
    const useIgpuBaseline =
      targetBudget <= profile.allowIgpuOnlyWhenBelow ||
      targetBudget < 12000000 ||
      purposeTitle === 'Office & Study';

    if (!draft.cpu) {
      const igpuCpu = cpus.find(c => c.hasIgpu);
      draft.cpu = (useIgpuBaseline && igpuCpu) ? igpuCpu : cpus[0];
    }
    if (!draft.motherboard) draft.motherboard = mbs[0];
    if (!draft.ram) draft.ram = rams[0];
    if (!draft.gpu) {
      if (useIgpuBaseline && draft.cpu.hasIgpu) {
        draft.gpu = componentsDB.gpu.find(g => g.id === 'gpu-igpu');
      } else {
        const discreteGpus = componentsDB.gpu.filter(g => !g.requiresIgpuCpu).sort((a, b) => a.price - b.price);
        draft.gpu = discreteGpus[0];
      }
    }
    if (!draft.storage) draft.storage = ssds[0];
    if (!draft.psu) draft.psu = psus[0];
    if (!draft.case) draft.case = cases[0];
    if (!draft.cooler) draft.cooler = coolers[0];

    enforceSupportingCompatibility(draft, lockedBuild);

    // Nếu bản cơ sở dùng GPU rời bị vượt targetBudget, chuyển về iGPU để đảm bảo <= targetBudget
    if (calculateBuildMetrics(draft).totalPrice > targetBudget && !lockedBuild.gpu) {
      const igpuCpu = cpus.find(c => c.hasIgpu);
      if (igpuCpu && !lockedBuild.cpu) {
        draft.cpu = igpuCpu;
        draft.gpu = componentsDB.gpu.find(g => g.id === 'gpu-igpu');
        enforceSupportingCompatibility(draft, lockedBuild);
      }
    }

    if (calculateBuildMetrics(draft).totalPrice > targetBudget) {
      return;
    }

    // PASS 1: Phân bổ ngân sách theo ĐÚNG THỨ TỰ ƯU TIÊN CHUYÊN GIA của từng Nhu cầu (profile.upgradeOrder)
    // Mỗi khe được ưu tiên nâng cấp lên mức tốt nhất trong hạn mức tỷ lệ ngân sách của khe đó
    profile.upgradeOrder.forEach((slotKey) => {
      if (lockedBuild[slotKey]) return;

      const maxShareRatio = Math.min(0.62, (profile.weights[slotKey] || 0.08) * 1.45 + 0.06);
      const slotCap = effectiveMaxSpend * maxShareRatio;

      let pool = componentsDB[slotKey] || [];
      if (slotKey === 'cpu') pool = pool.filter(c => c.socket === pf.socket);
      if (slotKey === 'motherboard') pool = pool.filter(m => m.socket === pf.socket && m.ramType === pf.ramType);
      if (slotKey === 'ram') pool = pool.filter(r => r.type === pf.ramType);

      let bestCandidateForSlot = null;
      let bestUtilForSlot = getExpertComponentUtility(purposeTitle, slotKey, draft[slotKey], targetBudget);

      pool.forEach(candidate => {
        if (candidate.price > slotCap) return;

        const testClone = { ...draft, [slotKey]: candidate };
        if (testClone.gpu && testClone.gpu.requiresIgpuCpu && !testClone.cpu.hasIgpu) {
          if (!lockedBuild.gpu) {
            testClone.gpu = componentsDB.gpu.find(g => g.id === 'gpu-9');
          } else {
            return;
          }
        }

        enforceSupportingCompatibility(testClone, lockedBuild);
        const { totalPrice: newTotal } = calculateBuildMetrics(testClone);
        if (newTotal > effectiveMaxSpend || newTotal > targetBudget) return;

        const { issues } = evaluateBuildCompatibility(testClone);
        if (issues.length > 0) return;

        const candUtil = getExpertComponentUtility(purposeTitle, slotKey, candidate, targetBudget);
        if (candUtil > bestUtilForSlot) {
          bestUtilForSlot = candUtil;
          bestCandidateForSlot = testClone;
        }
      });

      if (bestCandidateForSlot) {
        Object.assign(draft, bestCandidateForSlot);
      }
    });

    // PASS 2: Tối ưu phần ngân sách dư còn lại (theo đúng thứ tự ưu tiên của nhu cầu) mà không vượt targetBudget
    let improved = true;
    let guard = 0;
    while (improved && guard < 15) {
      improved = false;
      guard++;

      for (const slotKey of profile.upgradeOrder) {
        if (lockedBuild[slotKey]) continue;
        if (purposeTitle === 'Office & Study' && slotKey === 'gpu') continue;
        if ((purposeTitle === 'Music Production' || purposeTitle === 'Programming') && slotKey === 'gpu' && targetBudget < 26000000) continue;

        const currentItem = draft[slotKey];
        const currentUtil = getExpertComponentUtility(purposeTitle, slotKey, currentItem, targetBudget);

        let pool = componentsDB[slotKey] || [];
        if (slotKey === 'cpu') pool = pool.filter(c => c.socket === pf.socket);
        if (slotKey === 'motherboard') pool = pool.filter(m => m.socket === pf.socket && m.ramType === pf.ramType);
        if (slotKey === 'ram') pool = pool.filter(r => r.type === pf.ramType);

        // Sắp xếp ứng viên tăng dần theo giá để nâng cấp từng bậc hợp lý
        const sortedPool = [...pool].sort((a, b) => a.price - b.price);
        let upgradedThisSlot = false;

        for (const candidate of sortedPool) {
          if (candidate.id === currentItem.id || candidate.price <= currentItem.price) continue;

          const testClone = { ...draft, [slotKey]: candidate };
          if (testClone.gpu && testClone.gpu.requiresIgpuCpu && !testClone.cpu.hasIgpu) {
            if (!lockedBuild.gpu) {
              testClone.gpu = componentsDB.gpu.find(g => g.id === 'gpu-9');
            } else {
              continue;
            }
          }

          enforceSupportingCompatibility(testClone, lockedBuild);
          const { totalPrice: newTotal } = calculateBuildMetrics(testClone);
          if (newTotal > effectiveMaxSpend || newTotal > targetBudget) continue;

          const { issues } = evaluateBuildCompatibility(testClone);
          if (issues.length > 0) continue;

          const candUtil = getExpertComponentUtility(purposeTitle, slotKey, candidate, targetBudget);
          if (candUtil > currentUtil + 4) {
            Object.assign(draft, testClone);
            upgradedThisSlot = true;
            improved = true;
            break;
          }
        }

        if (upgradedThisSlot) break;
      }
    }

    // Chấm điểm tổng thể của phương án sau khi nâng cấp
    const { totalPrice } = calculateBuildMetrics(draft);
    const { issues } = evaluateBuildCompatibility(draft);

    let totalExpertScore = 0;
    slotDefinitions.forEach(({ key }) => {
      if (draft[key]) {
        totalExpertScore += getExpertComponentUtility(purposeTitle, key, draft[key], targetBudget) * (profile.weights[key] || 0.05) * 10;
      }
    });

    // Thưởng điểm sử dụng hiệu quả ngân sách (nhưng phạt cực nặng nếu vượt targetBudget)
    if (totalPrice <= targetBudget) {
      const utilizationRatio = totalPrice / effectiveMaxSpend;
      totalExpertScore += Math.min(utilizationRatio, 1) * 45;
    } else {
      totalExpertScore -= (totalPrice - targetBudget) / 10000;
    }

    if (issues.length > 0) {
      totalExpertScore -= issues.length * 500;
    }

    if (totalExpertScore > bestCandidateScore) {
      bestCandidateScore = totalExpertScore;
      bestCandidateBuild = draft;
    }
  });

  return bestCandidateBuild || createEmptyBuild();
}

/**
 * Tìm linh kiện gợi ý phù hợp nhất cho 1 khe cắm tiếp theo:
 * Đảm bảo vừa tương thích 100%, vừa đúng chuyên môn Nhu cầu, vừa giữ tổng tiền toàn bộ PC <= Ngân sách!
 */
function getRecommendedItemForSlot(slotKey) {
  const targetBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';

  // Giải bài toán tổng thể từ các linh kiện người dùng đã chọn hiện tại
  const expertSolution = solveExpertBuild(targetBudget, purpose, currentBuild);
  const solvedItem = expertSolution[slotKey];

  if (solvedItem) {
    const compat = checkCandidateCompatibility(slotKey, solvedItem);
    if (compat.isCompatible) {
      return {
        item: solvedItem,
        compat,
        score: 100
      };
    }
  }

  // Fallback nếu người dùng đã chọn các món xung đột từ trước
  const items = componentsDB[slotKey] || [];
  const candidates = items
    .map(item => ({
      item,
      compat: checkCandidateCompatibility(slotKey, item),
      score: getExpertComponentUtility(purpose, slotKey, item, targetBudget)
    }))
    .filter(c => c.compat.isCompatible)
    .sort((a, b) => b.score - a.score);

  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Tính mức ngân sách tối đa có thể chi cho riêng `categoryKey` mà vẫn chừa đủ tiền cho các khe còn trống khác
 */
function getMaxAffordablePriceForSlot(categoryKey) {
  const targetBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  let spentOnOtherLockedSlots = 0;
  let minRequiredForOtherEmptySlots = 0;

  slotDefinitions.forEach(({ key }) => {
    if (key === categoryKey) return;
    if (currentBuild[key]) {
      spentOnOtherLockedSlots += currentBuild[key].price || 0;
    } else {
      const cheapestValid = (componentsDB[key] || [])
        .filter(item => !item.requiresIgpuCpu)
        .reduce((min, item) => Math.min(min, item.price), Infinity);
      minRequiredForOtherEmptySlots += (cheapestValid < Infinity ? cheapestValid : 500000);
    }
  });

  return Math.max(0, targetBudget - spentOnOtherLockedSlots - minRequiredForOtherEmptySlots);
}

// --- 11. CẬP NHẬT HỘP GÓC TƯ VẤN CHUYÊN GIA PC MON ---
function renderExpertAdvisorBox() {
  const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';
  const budget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  const profile = EXPERT_PURPOSE_PROFILES[purpose] || EXPERT_PURPOSE_PROFILES["Gaming"];

  const badgeEl = document.getElementById('expert-strategy-badge');
  const adviceEl = document.getElementById('expert-advice-text');
  const pillsEl = document.getElementById('expert-allocation-pills');

  if (badgeEl) badgeEl.textContent = profile.badge;
  if (adviceEl) {
    adviceEl.innerHTML = `<strong>Phân tích cho nhu cầu "${purpose}" (Ngân sách ${formatVND(budget)}):</strong> ${profile.advice}`;
  }

  if (pillsEl) {
    const topWeights = [
      { label: 'GPU', val: Math.round((profile.weights.gpu || 0) * 100) },
      { label: 'CPU', val: Math.round((profile.weights.cpu || 0) * 100) },
      { label: 'RAM', val: Math.round((profile.weights.ram || 0) * 100) },
      { label: 'Main', val: Math.round((profile.weights.motherboard || 0) * 100) },
      { label: 'SSD', val: Math.round((profile.weights.storage || 0) * 100) }
    ];
    pillsEl.innerHTML = topWeights.map(w => `
      <span class="px-2.5 py-1 rounded-lg bg-gray-900/90 border border-gray-700 text-[11px] font-semibold text-gray-300">
        ${w.label}: <strong class="text-blue-400">${w.val > 0 ? w.val + '%' : 'iGPU'}</strong>
      </span>
    `).join('');
  }
}

// --- 12. BÀN LẮP RÁP CẤU HÌNH (HIỂN THỊ ẢNH THỰC TẾ CHÍNH XÁC, GIÁ NIÊM YẾT & NGÀY CÔNG BỐ GIÁ) ---
const slotsContainer = document.getElementById('builder-slots-container');

function renderBuilderSlots(skipIcons = false) {
  if (!slotsContainer) return;
  slotsContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();

  const targetBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';
  const { selectedCount } = calculateBuildMetrics(currentBuild);
  const { slotIssuesMap } = evaluateBuildCompatibility(currentBuild);
  const hasStartedBuilding = selectedCount > 0;

  // Giải trước cấu hình tối ưu cho các khe còn trống để toàn bộ gợi ý phối hợp ăn khớp <= Ngân sách
  const plannedSolution = hasStartedBuilding ? solveExpertBuild(targetBudget, purpose, currentBuild) : null;

  slotDefinitions.forEach(slot => {
    const item = currentBuild[slot.key];
    const slotErrors = slotIssuesMap[slot.key] || [];
    const hasConflict = slotErrors.length > 0;

    const row = document.createElement('div');
    row.className = `p-4 sm:px-6 sm:py-5 flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center transition-colors ${
      hasConflict
        ? 'bg-red-950/20 hover:bg-red-950/30 border-l-4 border-l-red-500'
        : 'hover:bg-gray-800/20'
    }`;

    if (item) {
      const statusBadge = hasConflict
        ? `<span class="text-[10px] px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-bold uppercase flex items-center gap-1 w-fit"><i data-lucide="alert-triangle" class="w-3 h-3 text-red-400"></i> Không phù hợp</span>`
        : `<span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase w-fit">Đã chọn • Phù hợp</span>`;

      row.innerHTML = `
        <div class="sm:col-span-3 flex items-center gap-3">
          <div class="relative w-14 h-14 rounded-xl bg-white p-1 border ${hasConflict ? 'border-red-500' : 'border-blue-500/30'} overflow-hidden shrink-0 shadow-md">
            <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${slot.key}')" class="w-full h-full object-contain" loading="lazy" />
            <div class="absolute bottom-0 right-0 p-0.5 ${hasConflict ? 'bg-red-600' : 'bg-blue-600'} rounded-tl text-white">
              <i data-lucide="${slot.icon}" class="w-3 h-3"></i>
            </div>
          </div>
          <div class="space-y-1">
            <span class="text-xs text-gray-400 font-medium block">${slot.name}</span>
            ${statusBadge}
          </div>
        </div>

        <div class="sm:col-span-5 w-full">
          <p class="text-sm font-bold text-white">${item.name}</p>
          <p class="text-xs text-gray-400 mt-0.5">${item.specs}</p>
          ${
            hasConflict
              ? `<div class="mt-2 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-[11px] text-red-300 flex items-center gap-1.5">
                   <i data-lucide="x-circle" class="w-3.5 h-3.5 text-red-400 shrink-0"></i>
                   <span>${slotErrors.join(' • ')}</span>
                 </div>`
              : ''
          }
        </div>

        <div class="sm:col-span-2 w-full sm:text-right flex flex-col sm:items-end justify-center">
          <div class="flex items-center justify-between sm:justify-end w-full gap-2">
            <span class="text-xs text-gray-500 sm:hidden">Giá niêm yết:</span>
            <span class="text-sm font-extrabold ${hasConflict ? 'text-red-400' : 'text-blue-400'}">${formatVND(item.price)}</span>
          </div>
          <span class="text-[11px] text-gray-400 mt-0.5 block">Ngày công bố giá: <strong class="text-gray-300">${item.priceUpdatedAt || '17/11/2026'}</strong></span>
          ${item.priceNote ? `<span class="text-[10px] text-amber-400/90">${item.priceNote}</span>` : ''}
        </div>

        <div class="sm:col-span-2 w-full flex items-center justify-end gap-2">
          <button type="button" data-action="open-modal" data-slot="${slot.key}" class="px-3 py-1.5 rounded-lg ${
            hasConflict ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-800 hover:bg-blue-600 text-white'
          } text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span>${hasConflict ? 'Đổi lại' : 'Đổi'}</span>
          </button>
          <button type="button" data-action="remove-slot" data-slot="${slot.key}" class="p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="Xóa linh kiện này" aria-label="Xóa ${slot.name}">
            <i data-lucide="trash" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    } else {
      const recItem = plannedSolution && plannedSolution[slot.key]
        ? plannedSolution[slot.key]
        : (hasStartedBuilding ? (getRecommendedItemForSlot(slot.key) || {}).item : null);
      const recCompat = recItem ? checkCandidateCompatibility(slot.key, recItem) : null;

      if (recItem && recCompat && recCompat.isCompatible) {
        row.innerHTML = `
          <div class="sm:col-span-3 flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <i data-lucide="${slot.icon}" class="w-5 h-5"></i>
            </div>
            <div>
              <span class="text-xs text-gray-300 font-semibold block">${slot.name}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-semibold inline-block mt-0.5">Gợi ý chuẩn ngân sách</span>
            </div>
          </div>

          <div class="sm:col-span-5 w-full">
            <div class="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/25 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-11 h-11 rounded-lg bg-white p-0.5 border border-gray-700 shrink-0 overflow-hidden">
                  <img src="${recItem.image}" alt="${recItem.name}" onerror="handleImgError(this, '${slot.key}')" class="w-full h-full object-contain" loading="lazy" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">Chuyên gia khuyên dùng</span>
                    <p class="text-xs font-bold text-white truncate">${recItem.name}</p>
                  </div>
                  <p class="text-[11px] text-emerald-400/90 truncate mt-0.5">${recCompat.reason}</p>
                </div>
              </div>
              <button type="button" data-action="quick-pick" data-slot="${slot.key}" data-item-id="${recItem.id}" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 transition-colors shadow-sm" title="Chọn ngay linh kiện gợi ý này">
                + Chọn ngay
              </button>
            </div>
          </div>

          <div class="sm:col-span-2 sm:text-right text-xs text-gray-400 font-semibold hidden sm:block">
            <span class="text-[10px] text-gray-500 block">Giá niêm yết:</span>
            <span class="text-blue-400 font-extrabold block">${formatVND(recItem.price)}</span>
            <span class="text-[10px] text-gray-500 block">Công bố: ${recItem.priceUpdatedAt || '17/11/2026'}</span>
          </div>

          <div class="sm:col-span-2 w-full flex items-center justify-end">
            <button type="button" data-action="open-modal" data-slot="${slot.key}" class="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <i data-lucide="list-filter" class="w-3.5 h-3.5"></i>
              <span>Xem DS phù hợp</span>
            </button>
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="sm:col-span-3 flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center text-gray-500 shrink-0">
              <i data-lucide="${slot.icon}" class="w-5 h-5"></i>
            </div>
            <div>
              <span class="text-xs text-gray-400 font-semibold block">${slot.name}</span>
              <span class="text-[11px] text-gray-500">Bắt buộc</span>
            </div>
          </div>

          <div class="sm:col-span-5 text-xs text-gray-500 italic">
            Chọn món đầu tiên (hoặc bấm Đề xuất tự động) để chuyên gia lọc các bộ phận tiếp theo vừa khít ngân sách.
          </div>

          <div class="sm:col-span-2 sm:text-right text-xs text-gray-500 font-medium hidden sm:block">
            --
          </div>

          <div class="sm:col-span-2 w-full flex items-center justify-end">
            <button type="button" data-action="open-modal" data-slot="${slot.key}" class="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Chọn ${slot.shortName}</span>
            </button>
          </div>
        `;
      }
    }

    fragment.appendChild(row);
  });

  slotsContainer.appendChild(fragment);
  renderExpertAdvisorBox();
  if (!skipIcons) refreshIcons(slotsContainer);
}

if (slotsContainer) {
  slotsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const slotKey = btn.dataset.slot;
    if (action === 'open-modal') {
      openComponentModal(slotKey);
    } else if (action === 'remove-slot') {
      removeComponent(slotKey);
    } else if (action === 'quick-pick') {
      selectComponent(slotKey, btn.dataset.itemId);
    }
  });
}

window.removeComponent = function(key) {
  const removed = currentBuild[key];
  currentBuild[key] = null;
  saveBuild();
  renderBuilderSlots();
  updateBuilderDashboard();
  if (typeof renderSummaryAndPriceComparisonPage === 'function') {
    renderSummaryAndPriceComparisonPage();
  }
  if (removed) {
    showToast(`Đã gỡ bỏ: ${removed.name}`, 'info');
  }
};

// --- 13. CẬP NHẬT DASHBOARD & Ô THÔNG BÁO TÓM TẮT CẢNH BÁO KHÔNG PHÙ HỢP ---
function updateBuilderDashboard(skipIcons = false) {
  const { totalPrice, selectedCount, estimatedWattage, recommendedPsu } = calculateBuildMetrics(currentBuild);
  const currentBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  const remainingBudget = currentBudget - totalPrice;

  const totalPriceDisplay = document.getElementById('total-price-display');
  const totalWattageDisplay = document.getElementById('total-wattage-display');
  const recommendedPsuDisplay = document.getElementById('recommended-psu-display');
  const slotCountDisplay = document.getElementById('slot-count-display');
  const budgetProgressBar = document.getElementById('budget-progress-bar');

  if (totalPriceDisplay) totalPriceDisplay.textContent = formatVND(totalPrice);
  if (totalWattageDisplay) totalWattageDisplay.textContent = `${estimatedWattage} W`;
  if (recommendedPsuDisplay) {
    recommendedPsuDisplay.innerHTML = `Khuyến nghị nguồn: <strong class="text-white">${recommendedPsu}W trở lên</strong>`;
  }
  if (slotCountDisplay) slotCountDisplay.textContent = `${selectedCount} / 8`;

  const nextStepBox = document.getElementById('next-step-guide-box');
  const nextStepTitle = document.getElementById('next-step-guide-title');
  const nextStepDesc = document.getElementById('next-step-guide-desc');
  const remainingBudgetPill = document.getElementById('remaining-budget-pill');

  if (nextStepBox) {
    if (selectedCount > 0 && selectedCount < 8) {
      nextStepBox.classList.remove('hidden');
      const selectedNames = slotDefinitions
        .filter(s => currentBuild[s.key])
        .map(s => s.shortName)
        .join(', ');
      if (nextStepTitle) {
        nextStepTitle.textContent = `Đã chọn ${selectedCount}/8 bộ phận (${selectedNames}) — Đang gợi ý ${8 - selectedCount} bộ phận tiếp theo vừa khít ngân sách`;
      }
      if (nextStepDesc) {
        nextStepDesc.textContent = `Hệ thống đã tính toán trước chi phí của các bộ phận còn lại để tổng cấu hình không vượt ngân sách mục tiêu. Phụ kiện không hợp hoặc vượt ngân sách được chuyển vào "Lựa chọn khác".`;
      }
      if (remainingBudgetPill) {
        remainingBudgetPill.textContent = remainingBudget >= 0
          ? `Ngân sách còn lại: ${formatVND(remainingBudget)}`
          : `Vượt ngân sách: +${formatVND(Math.abs(remainingBudget))}`;
        remainingBudgetPill.className = `px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 self-start sm:self-center ${
          remainingBudget >= 0
            ? 'bg-gray-900 border-gray-800 text-blue-300'
            : 'bg-red-950/60 border-red-500/40 text-red-300'
        }`;
      }
    } else {
      nextStepBox.classList.add('hidden');
    }
  }

  if (budgetProgressBar) {
    const percent = Math.min(Math.round((totalPrice / currentBudget) * 100), 100);
    budgetProgressBar.style.width = `${percent}%`;

    if (totalPrice > currentBudget) {
      budgetProgressBar.classList.remove('bg-blue-500');
      budgetProgressBar.classList.add('bg-red-500');
      if (totalPriceDisplay) {
        totalPriceDisplay.classList.remove('text-blue-400');
        totalPriceDisplay.classList.add('text-red-400');
      }
    } else {
      budgetProgressBar.classList.remove('bg-red-500');
      budgetProgressBar.classList.add('bg-blue-500');
      if (totalPriceDisplay) {
        totalPriceDisplay.classList.remove('text-red-400');
        totalPriceDisplay.classList.add('text-blue-400');
      }
    }
  }

  const { issues, warnings } = evaluateBuildCompatibility(currentBuild);

  const alertBox = document.getElementById('compat-alert-box');
  const issueCountBadge = document.getElementById('compat-issue-count-badge');
  const summaryParagraph = document.getElementById('compat-summary-paragraph');
  const errorList = document.getElementById('compat-error-list');
  const warningSubbox = document.getElementById('compat-warning-subbox');
  const warningList = document.getElementById('compat-warning-list');
  const quickFixButtons = document.getElementById('compat-quick-fix-buttons');

  const softWarningBox = document.getElementById('compat-warning-box');
  const softSummaryText = document.getElementById('compat-soft-summary-text');
  const softWarningList = document.getElementById('compat-soft-warning-list');

  const compatDescText = document.getElementById('compat-desc-text');
  const compatContainer = document.getElementById('compat-badge-container');

  const overBudgetNote = remainingBudget < 0
    ? ` Đồng thời tổng chi phí đang vượt ngân sách mục tiêu ${formatVND(Math.abs(remainingBudget))}.`
    : '';

  if (issues.length > 0) {
    if (alertBox) alertBox.classList.remove('hidden');
    if (softWarningBox) softWarningBox.classList.add('hidden');

    const totalAlertCount = issues.length + warnings.length;
    if (issueCountBadge) {
      issueCountBadge.textContent = `${totalAlertCount} cảnh báo không phù hợp`;
    }

    const affectedSlotNames = [...new Set(issues.flatMap(i => i.slots))]
      .map(key => {
        const def = slotDefinitions.find(s => s.key === key);
        return def ? def.shortName : key;
      })
      .join(', ');

    const briefTitles = issues.map(i => i.title.toLowerCase()).join('; ');

    if (summaryParagraph) {
      summaryParagraph.innerHTML = `
        <strong>Tóm tắt cảnh báo cấu hình:</strong> Hệ thống phát hiện <strong>${issues.length} xung đột phần cứng không phù hợp</strong> liên quan trực tiếp đến <strong>${affectedSlotNames}</strong> (bao gồm: <em>${briefTitles}</em>). Nếu giữ nguyên các phụ kiện này, bạn sẽ không thể lắp vừa linh kiện hoặc máy không thể khởi động ổn định.${overBudgetNote}
      `;
    }

    if (errorList) {
      errorList.innerHTML = issues.map((iss, idx) => `
        <div class="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 flex flex-col justify-between gap-2">
          <div>
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-extrabold uppercase tracking-wider">
                #${idx + 1} • ${iss.pairLabel}
              </span>
              <span class="text-[11px] font-bold text-red-400">Không tương thích</span>
            </div>
            <h4 class="text-xs sm:text-sm font-bold text-white">${iss.title}</h4>
            <p class="text-xs text-red-200/90 mt-1 leading-relaxed">${iss.message}</p>
          </div>
        </div>
      `).join('');
    }

    if (warnings.length > 0 && warningSubbox && warningList) {
      warningSubbox.classList.remove('hidden');
      warningList.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
    } else if (warningSubbox) {
      warningSubbox.classList.add('hidden');
    }

    if (quickFixButtons) {
      const uniqueFixSlots = [];
      issues.forEach(iss => {
        if (iss.fixSlot && !uniqueFixSlots.some(u => u.slot === iss.fixSlot)) {
          uniqueFixSlots.push({ slot: iss.fixSlot, label: iss.fixLabel });
        }
      });

      quickFixButtons.innerHTML = uniqueFixSlots.map(f => `
        <button type="button" data-fix-slot="${f.slot}" class="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md">
          <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
          <span>${f.label}</span>
        </button>
      `).join('') + `
        <button type="button" data-auto-fix-all="true" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md">
          <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
          <span>Tự động đổi sang phụ kiện phù hợp</span>
        </button>
      `;
    }

    if (compatContainer) {
      compatContainer.innerHTML = `
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-bold">
          <i data-lucide="x-circle" class="w-4 h-4"></i>
          <span>Không phù hợp (${issues.length} lỗi)</span>
        </div>
      `;
    }
    if (compatDescText) {
      compatDescText.textContent = "Xem Ô thông báo tóm tắt cảnh báo màu đỏ bên dưới để kiểm tra chi tiết.";
    }
  } else {
    if (alertBox) alertBox.classList.add('hidden');

    if (warnings.length > 0 && softWarningBox) {
      softWarningBox.classList.remove('hidden');
      if (softSummaryText) {
        softSummaryText.textContent = `Các linh kiện lắp vừa vặn với nhau, nhưng có ${warnings.length} lưu ý về công suất nguồn dự phòng để máy bền bỉ hơn:`;
      }
      if (softWarningList) {
        softWarningList.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
      }
    } else if (softWarningBox) {
      softWarningBox.classList.add('hidden');
    }

    if (selectedCount >= 4) {
      if (compatContainer) {
        compatContainer.innerHTML = `
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            <span>Tương thích hoàn hảo</span>
          </div>
        `;
      }
      if (compatDescText) compatDescText.textContent = "Tất cả linh kiện đã chọn đều ăn khớp 100% và sẵn sàng lắp ráp!";
    } else {
      if (compatContainer) {
        compatContainer.innerHTML = `
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <i data-lucide="info" class="w-4 h-4"></i>
            <span>Đang chọn linh kiện (${selectedCount}/8)</span>
          </div>
        `;
      }
      if (compatDescText) compatDescText.textContent = "Hệ thống đang lọc sẵn các bộ phận tiếp theo tương thích cho bạn.";
    }
  }

  if (!skipIcons) {
    if (compatContainer) refreshIcons(compatContainer);
    if (alertBox && !alertBox.classList.contains('hidden')) refreshIcons(alertBox);
    if (softWarningBox && !softWarningBox.classList.contains('hidden')) refreshIcons(softWarningBox);
  }
}

const compatQuickFixBar = document.getElementById('compat-quick-fix-bar');
if (compatQuickFixBar) {
  compatQuickFixBar.addEventListener('click', (e) => {
    const fixSlotBtn = e.target.closest('button[data-fix-slot]');
    if (fixSlotBtn) {
      openComponentModal(fixSlotBtn.dataset.fixSlot);
      return;
    }

    const autoFixBtn = e.target.closest('button[data-auto-fix-all]');
    if (autoFixBtn) {
      const { issues } = evaluateBuildCompatibility(currentBuild);
      const fixedNames = [];
      issues.forEach(iss => {
        if (iss.fixSlot) {
          const rec = getRecommendedItemForSlot(iss.fixSlot);
          if (rec && rec.item) {
            currentBuild[iss.fixSlot] = rec.item;
            fixedNames.push(rec.item.name);
          }
        }
      });
      saveBuild();
      renderBuilderSlots();
      updateBuilderDashboard();
      if (fixedNames.length > 0) {
        showToast(`Đã tự động đổi sang linh kiện tương thích: ${fixedNames.join(', ')}`, 'success');
      }
    }
  });
}

// --- 14. MODAL CHỌN LINH KIỆN: CHỈ HIỂN THỊ ĐỒ PHÙ HỢP + TRONG TẦM NGÂN SÁCH & MỤC "LỰA CHỌN KHÁC" ---
const modal = document.getElementById('component-modal');
const modalTitle = document.getElementById('modal-category-title');
const modalList = document.getElementById('modal-component-list');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSearchInput = document.getElementById('modal-search-input');
const modalResultCount = document.getElementById('modal-result-count');
const modalContextBadge = document.getElementById('modal-context-badge');

function createModalProductCard(item, compat, isRecommendedTop, isIncompatibleSection, overBudgetWarning) {
  const isCurrent = currentBuild[activeModalCategory] && currentBuild[activeModalCategory].id === item.id;
  const card = document.createElement('div');
  const publishedDate = item.priceUpdatedAt || '17/11/2026';

  if (isIncompatibleSection) {
    const conflictNote = !compat.isCompatible
      ? compat.reason
      : overBudgetWarning;

    const badgeText = !compat.isCompatible
      ? 'Không tương thích phần cứng'
      : 'Vượt ngân sách còn lại';

    card.className = `p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
      isCurrent
        ? 'bg-red-950/35 border-red-500'
        : 'bg-red-950/15 border-red-900/40 hover:border-red-500/50'
    }`;

    card.innerHTML = `
      <div class="flex items-start sm:items-center gap-4 flex-1">
        <div class="w-16 h-16 rounded-xl bg-white p-1 border border-red-900/50 shrink-0 shadow-md overflow-hidden">
          <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${activeModalCategory}')" class="w-full h-full object-contain" loading="lazy" />
        </div>
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <h4 class="text-sm sm:text-base font-bold text-white">${item.name}</h4>
            ${isCurrent ? '<span class="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">ĐANG CHỌN</span>' : ''}
            <span class="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold flex items-center gap-1">
              <i data-lucide="alert-triangle" class="w-3 h-3 text-red-400"></i>
              ${badgeText}
            </span>
          </div>
          <p class="text-xs text-gray-400">${item.specs}</p>
          <div class="mt-2 p-2 rounded-lg bg-red-950/60 border border-red-500/30 text-[11px] text-red-200 flex items-start gap-1.5">
            <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"></i>
            <span><strong>Lưu ý:</strong> ${conflictNote}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-red-900/30">
        <div class="text-left sm:text-right">
          <span class="text-base font-extrabold text-amber-400 block">${formatVND(item.price)}</span>
          <span class="text-[11px] text-gray-400 block">Ngày công bố giá: <strong>${publishedDate}</strong></span>
          ${item.priceNote ? `<span class="text-[10px] text-amber-400/90 block">${item.priceNote}</span>` : ''}
        </div>
        <button type="button" data-select-id="${item.id}" data-is-incompatible="true" class="px-3.5 py-2 rounded-xl ${
          isCurrent
            ? 'bg-gray-800 text-gray-400 cursor-default'
            : 'bg-red-600 hover:bg-red-500 text-white font-semibold'
        } text-xs transition-colors shadow-md">
          ${isCurrent ? 'Đã thêm' : 'Vẫn chọn mua'}
        </button>
      </div>
    `;
  } else {
    card.className = `p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
      isCurrent
        ? 'bg-blue-950/30 border-blue-500'
        : isRecommendedTop
        ? 'bg-gradient-to-r from-emerald-950/25 via-blue-950/20 to-gray-950/50 border-emerald-500/40 hover:border-emerald-400'
        : 'bg-gray-950/40 border-gray-800 hover:border-blue-500/40'
    }`;

    card.innerHTML = `
      <div class="flex items-start sm:items-center gap-4 flex-1">
        <div class="w-16 h-16 rounded-xl bg-white p-1 border border-gray-700 shrink-0 shadow-md overflow-hidden">
          <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${activeModalCategory}')" class="w-full h-full object-contain" loading="lazy" />
        </div>
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <h4 class="text-sm sm:text-base font-bold text-white">${item.name}</h4>
            ${isCurrent ? '<span class="px-2 py-0.5 rounded bg-blue-500 text-white text-[10px] font-bold">ĐANG CHỌN</span>' : ''}
            ${
              isRecommendedTop
                ? '<span class="px-2 py-0.5 rounded bg-emerald-500 text-gray-950 text-[10px] font-extrabold uppercase">★ Chuyên gia khuyên dùng</span>'
                : '<span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold">Phù hợp &amp; Trong ngân sách</span>'
            }
          </div>
          <p class="text-xs text-gray-400">${item.specs}</p>
          <p class="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
            <i data-lucide="check" class="w-3.5 h-3.5 shrink-0"></i>
            <span>${compat.reason}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0">
        <div class="text-left sm:text-right">
          <span class="text-base font-extrabold text-blue-400 block">${formatVND(item.price)}</span>
          <span class="text-[11px] text-gray-400 block">Ngày công bố giá: <strong>${publishedDate}</strong></span>
          ${item.priceNote ? `<span class="text-[10px] text-amber-400/90 block">${item.priceNote}</span>` : ''}
        </div>
        <button type="button" data-select-id="${item.id}" class="px-4 py-2 rounded-xl ${
          isCurrent
            ? 'bg-gray-800 text-gray-400 cursor-default'
            : 'bg-blue-600 hover:bg-blue-500 text-white font-semibold'
        } text-xs transition-colors shadow-md">
          ${isCurrent ? 'Đã thêm' : 'Chọn linh kiện'}
        </button>
      </div>
    `;
  }

  return card;
}

function renderModalItems() {
  if (!modalList || !activeModalCategory) return;

  const items = componentsDB[activeModalCategory] || [];
  const query = (modalSearchInput ? modalSearchInput.value : '').trim().toLowerCase();
  const targetBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';
  const maxAffordableForSlot = getMaxAffordablePriceForSlot(activeModalCategory);

  // Tìm món được thuật toán chuyên gia chọn cho đúng khe này
  const expertSolution = solveExpertBuild(targetBudget, purpose, currentBuild);
  const expertBestId = expertSolution[activeModalCategory] ? expertSolution[activeModalCategory].id : null;

  const evaluated = items
    .map(item => {
      const compat = checkCandidateCompatibility(activeModalCategory, item);
      const fitsRemainingBudget = item.price <= maxAffordableForSlot;
      const overBudgetAmount = item.price - maxAffordableForSlot;
      const overBudgetWarning = !fitsRemainingBudget
        ? `Linh kiện này có giá ${formatVND(item.price)}, vượt quá hạn mức ngân sách còn lại dành cho bộ phận này (${formatVND(maxAffordableForSlot)}) để kịp mua các bộ phận khác không bị lố tổng ngân sách ${formatVND(targetBudget)}.`
        : '';

      let score = getExpertComponentUtility(purpose, activeModalCategory, item, targetBudget);
      if (item.id === expertBestId) score += 500; // Đưa lựa chọn chuẩn xác của chuyên gia lên vị trí số 1

      return {
        item,
        compat,
        fitsRemainingBudget,
        overBudgetAmount,
        overBudgetWarning,
        isTrulySuitable: compat.isCompatible && fitsRemainingBudget,
        score
      };
    })
    .filter(({ item }) => {
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.specs.toLowerCase().includes(query)
      );
    });

  // Nhóm 1: Tương thích 100% VÀ không làm tổng cấu hình vượt ngân sách
  const suitableList = evaluated
    .filter(e => e.isTrulySuitable)
    .sort((a, b) => b.score - a.score);

  // Nhóm 2: Lựa chọn khác (Không tương thích phần cứng HOẶC vượt quá ngân sách còn lại)
  const otherChoicesList = evaluated.filter(e => !e.isTrulySuitable);

  if (modalContextBadge) {
    modalContextBadge.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium shrink-0";
    modalContextBadge.innerHTML = `
      <i data-lucide="filter" class="w-3.5 h-3.5 text-emerald-400"></i>
      <span>Hiện ${suitableList.length} phù hợp &amp; vừa ngân sách • Ẩn ${otherChoicesList.length} lựa chọn khác</span>
    `;
  }

  if (modalResultCount) {
    modalResultCount.textContent = `Hạn mức tối đa cho bộ phận này: ${formatVND(maxAffordableForSlot)} (Tổng ngân sách: ${formatVND(targetBudget)})`;
  }

  modalList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  const suitableHeader = document.createElement('div');
  suitableHeader.className = "flex items-center justify-between pb-1";
  suitableHeader.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">
        Linh kiện tương thích &amp; vừa ngân sách cho nhu cầu ${purpose} (${suitableList.length})
      </h4>
    </div>
  `;
  fragment.appendChild(suitableHeader);

  if (suitableList.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = "p-6 rounded-2xl bg-gray-950/60 border border-gray-800 text-center text-gray-400 text-xs";
    emptyNotice.innerHTML = `
      <p class="font-bold text-white text-sm mb-1">Không có linh kiện nào nằm trong phần ngân sách còn lại (${formatVND(maxAffordableForSlot)})</p>
      <p>Bạn có thể mở mục <strong>"Lựa chọn khác"</strong> bên dưới hoặc tăng mức ngân sách mục tiêu.</p>
    `;
    fragment.appendChild(emptyNotice);
  } else {
    const suitableContainer = document.createElement('div');
    suitableContainer.className = "space-y-3";
    suitableList.forEach(({ item, compat }, idx) => {
      suitableContainer.appendChild(createModalProductCard(item, compat, idx === 0, false, ''));
    });
    fragment.appendChild(suitableContainer);
  }

  if (otherChoicesList.length > 0) {
    const otherSection = document.createElement('div');
    otherSection.className = "pt-4 mt-4 border-t border-gray-800";

    otherSection.innerHTML = `
      <button type="button" id="btn-toggle-other-choices" class="w-full p-3.5 rounded-2xl bg-gray-950/80 hover:bg-gray-800/80 border border-amber-500/30 text-left transition-all flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <i data-lucide="layers" class="w-4 h-4"></i>
          </div>
          <div>
            <p class="text-xs sm:text-sm font-bold text-amber-300">
              Lựa chọn khác (${otherChoicesList.length} phụ kiện không tương thích hoặc vượt ngân sách)
            </p>
            <p class="text-[11px] text-gray-400 mt-0.5">
              Hệ thống đã ẩn các phụ kiện này để tránh xung đột hoặc lố ngân sách. Bấm vào đây nếu bạn vẫn muốn xem và mua riêng.
            </p>
          </div>
        </div>
        <span class="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700 text-xs font-semibold text-gray-300 shrink-0 flex items-center gap-1">
          <span>${isOtherChoicesExpanded ? 'Thu gọn' : 'Mở lựa chọn khác'}</span>
          <i data-lucide="${isOtherChoicesExpanded ? 'chevron-up' : 'chevron-down'}" class="w-4 h-4"></i>
        </span>
      </button>

      <div id="other-choices-container" class="${isOtherChoicesExpanded ? 'block' : 'hidden'} mt-3 space-y-3">
        <div class="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
          <i data-lucide="info" class="w-4 h-4 text-amber-400 shrink-0"></i>
          <span>Các sản phẩm dưới đây không tương thích phần cứng hoặc vượt ngân sách còn lại. Bạn vẫn có thể bấm <strong>"Vẫn chọn mua"</strong>, hệ thống sẽ cảnh báo chi tiết trên bàn lắp ráp.</span>
        </div>
      </div>
    `;

    const otherListContainer = otherSection.querySelector('#other-choices-container');
    otherChoicesList.forEach(({ item, compat, overBudgetWarning }) => {
      otherListContainer.appendChild(createModalProductCard(item, compat, false, true, overBudgetWarning));
    });

    fragment.appendChild(otherSection);
  }

  modalList.appendChild(fragment);
  refreshIcons(modalList);
  if (modalContextBadge) refreshIcons(modalContextBadge);
}

window.openComponentModal = function(categoryKey) {
  activeModalCategory = categoryKey;
  isOtherChoicesExpanded = false;
  const slotDef = slotDefinitions.find(s => s.key === categoryKey);

  if (modalTitle) modalTitle.textContent = `Chọn ${slotDef ? slotDef.name : 'Linh kiện'}`;
  if (modalSearchInput) modalSearchInput.value = '';

  renderModalItems();

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (modalSearchInput) {
      setTimeout(() => modalSearchInput.focus(), 50);
    }
  }
};

window.selectComponent = function(categoryKey, itemId) {
  const item = (componentsDB[categoryKey] || []).find(i => i.id === itemId);
  if (item) {
    const compatBeforeSelect = checkCandidateCompatibility(categoryKey, item);
    currentBuild[categoryKey] = item;
    saveBuild();
    renderBuilderSlots();
    updateBuilderDashboard();
    if (typeof renderSummaryAndPriceComparisonPage === 'function') {
      renderSummaryAndPriceComparisonPage();
    }

    if (!compatBeforeSelect.isCompatible) {
      showToast(
        `Đã thêm "${item.name}" (Lựa chọn khác). Cảnh báo không phù hợp đã được tóm tắt tại Ô thông báo!`,
        'error'
      );
      const alertBox = document.getElementById('compat-alert-box');
      if (alertBox && !alertBox.classList.contains('hidden')) {
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      const { selectedCount, totalPrice } = calculateBuildMetrics(currentBuild);
      const targetBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
      if (totalPrice > targetBudget) {
        showToast(
          `Đã chọn: ${item.name}. Lưu ý: Tổng chi phí hiện tại (${formatVND(totalPrice)}) đang vượt ngân sách mục tiêu!`,
          'warning'
        );
      } else if (selectedCount === 1) {
        showToast(
          `Đã chọn món đầu tiên: ${item.name}. Chuyên gia đã tính toán các bộ phận tiếp theo vừa khít ngân sách!`,
          'success'
        );
      } else {
        showToast(`Đã chọn: ${item.name} (Tương thích & Trong ngân sách)`, 'success');
      }
    }
  }
  closeModal();
};

if (modalList) {
  modalList.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#btn-toggle-other-choices');
    if (toggleBtn) {
      isOtherChoicesExpanded = !isOtherChoicesExpanded;
      renderModalItems();
      return;
    }

    const selectBtn = e.target.closest('button[data-select-id]');
    if (!selectBtn || !activeModalCategory) return;
    selectComponent(activeModalCategory, selectBtn.dataset.selectId);
  });
}

if (modalSearchInput) {
  modalSearchInput.addEventListener('input', renderModalItems);
}

function closeModal() {
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  activeModalCategory = null;
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
    closeModal();
  }
});

// --- 15. NÚT ĐỀ XUẤT TỰ ĐỘNG TOÀN BỘ (AUTO-BUILD CHUẨN CHUYÊN GIA & KHÔNG VƯỢT BUDGET) ---
const btnAutoBuild = document.getElementById('btn-auto-build');
const btnClearBuild = document.getElementById('btn-clear-build');
const btnCopyBuild = document.getElementById('btn-copy-build');

if (btnAutoBuild) {
  btnAutoBuild.addEventListener('click', () => {
    const budget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
    const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';

    currentBuild = solveExpertBuild(budget, purpose, createEmptyBuild());
    saveBuild();
    renderBuilderSlots();
    updateBuilderDashboard();

    const { totalPrice } = calculateBuildMetrics(currentBuild);
    const savedMoney = Math.max(0, budget - totalPrice);
    showToast(
      `Chuyên gia đã lên cấu hình "${purpose}": Tổng ${formatVND(totalPrice)} (Tiết kiệm ${formatVND(savedMoney)} so với ngân sách ${formatVND(budget)})!`,
      'success'
    );
  });
}

if (btnClearBuild) {
  btnClearBuild.addEventListener('click', () => {
    const { selectedCount } = calculateBuildMetrics(currentBuild);
    if (selectedCount === 0) {
      showToast('Bàn lắp ráp hiện đang trống.', 'info');
      return;
    }
    if (confirm("Bạn có chắc chắn muốn reset và xóa toàn bộ phụ kiện đã chọn?")) {
      currentBuild = createEmptyBuild();
      saveBuild();
      renderBuilderSlots();
      updateBuilderDashboard();
      showToast('Đã reset toàn bộ phụ kiện trên bàn lắp ráp.', 'info');
    }
  });
}

if (btnCopyBuild) {
  btnCopyBuild.addEventListener('click', () => {
    const { totalPrice, estimatedWattage } = calculateBuildMetrics(currentBuild);
    const { issues } = evaluateBuildCompatibility(currentBuild);
    const purpose = localStorage.getItem('pcmon_purpose') || 'Chưa chọn';
    const budget = Number(localStorage.getItem('pcmon_budget')) || 20000000;

    let summary = `===== BÁO GIÁ CẤU HÌNH PC MON =====\n`;
    summary += `Mục đích sử dụng: ${purpose}\n`;
    summary += `Ngân sách mục tiêu: ${formatVND(budget)}\n\n`;

    slotDefinitions.forEach(slot => {
      const item = currentBuild[slot.key];
      if (item) {
        summary += `• ${slot.name}: ${item.name} - ${formatVND(item.price)} (Công bố giá: ${item.priceUpdatedAt || '17/11/2026'})\n`;
      } else {
        summary += `• ${slot.name}: [Chưa chọn]\n`;
      }
    });

    if (issues.length > 0) {
      summary += `\n[!] CẢNH BÁO KHÔNG PHÙ HỢP (${issues.length}):\n`;
      issues.forEach(iss => {
        summary += `- ${iss.title}: ${iss.message}\n`;
      });
    } else {
      summary += `\nTrạng thái: Tương thích 100%\n`;
    }

    summary += `Công suất tiêu thụ ước tính: ${estimatedWattage}W`;
    summary += `\nTổng chi phí niêm yết: ${formatVND(totalPrice)} (${totalPrice <= budget ? 'Trong ngân sách' : 'Vượt ngân sách'})\n`;
    summary += `===================================`;

    navigator.clipboard.writeText(summary).then(() => {
      showToast('Đã sao chép báo giá cấu hình PC kèm ngày công bố giá vào bộ nhớ tạm!', 'success');
    }).catch(() => {
      alert(summary);
    });
  });
}

// --- 16. TRANG LINH KIỆN NỔI BẬT (ẢNH THỰC TẾ CHÍNH XÁC CỦA TỪNG SẢN PHẨM) ---
const featuredProducts = [
  {
    category: "CPU",
    name: "AMD Ryzen 7 9800X3D (Zen 5 3D V-Cache)",
    brand: "AMD",
    specs: "8 Nhân / 16 Luồng • Socket AM5 • Zen 5 3D V-Cache 5.2GHz",
    price: 13890000,
    priceUpdatedAt: "17/11/2026",
    priceNote: "Biến động cao (Mới ra mắt)",
    targetKey: "cpu",
    targetId: "cpu-10",
    image: "https://product.hstatic.net/200000420363/product/tinhocngoisao.com1__12__74942c38dcdd40ce8a583d1ec1115bde_grande.jpg"
  },
  {
    category: "GPU",
    name: "ASUS Dual GeForce RTX 4070 SUPER OC 12GB",
    brand: "ASUS / NVIDIA",
    specs: "12GB GDDR6X • TDP 220W • Nguồn khuyến nghị 650W",
    price: 16990000,
    priceUpdatedAt: "17/11/2026",
    priceNote: "Giá niêm yết công khai",
    targetKey: "gpu",
    targetId: "gpu-3",
    image: "https://cdn2.cellphones.com.vn/x/media/catalog/product/v/g/vga-asus-dual-geforce-rtx-4070-super-12gb-dual-rtx4070s_1_.png"
  },
  {
    category: "Motherboard",
    name: "MSI MAG B760M MORTAR WIFI II DDR5",
    brand: "MSI",
    specs: "Socket LGA1700 • Hỗ trợ DDR5 • Chuẩn Micro-ATX",
    price: 4590000,
    priceUpdatedAt: "17/11/2026",
    priceNote: "Giá niêm yết công khai",
    targetKey: "motherboard",
    targetId: "mb-2",
    image: "https://product.hstatic.net/200000420363/product/mainboard-msi-mag-b760m-mortar-wifi-ii-5_cb801b6b837145468425dc1a6b51266e_grande.jpg"
  },
  {
    category: "RAM",
    name: "Corsair Vengeance RGB 32GB (2x16GB) DDR5",
    brand: "Corsair",
    specs: "DDR5 • Bus 6000MT/s CL30 • 2 thanh (Dual Channel)",
    price: 3290000,
    priceUpdatedAt: "17/11/2026",
    priceNote: "Biến động tăng nhẹ",
    targetKey: "ram",
    targetId: "ram-2",
    image: "https://assets.corsair.com/image/upload/w_600,h_600,c_pad,q_auto:best/products/Memory/vengeance-rgb-ddr5-config/white/2up/Vengeance-RGB-DDR5-2UP-64GB-WHITE_01.png"
  },
  {
    category: "Cooler",
    name: "Thermalright Frozen Warframe 240 ARGB LCD",
    brand: "Thermalright",
    specs: "Tản nước AIO 240mm • Màn hình LCD IPS hiển thị nhiệt độ CPU",
    price: 1690000,
    priceUpdatedAt: "17/11/2026",
    priceNote: "Giá niêm yết công khai",
    targetKey: "cooler",
    targetId: "cooler-3",
    image: "https://www.thermalright.com/wp-content/uploads/2026/08/frozen-warframe-240-black-argb.png"
  },
  {
    category: "SSD",
    name: "Samsung 990 PRO 1TB PCIe 4.0 NVMe",
    brand: "Samsung",
    specs: "1TB • Chuẩn M.2 2280 • Tốc độ đọc 7,450 MB/s",
    price: 2890000,
    priceUpdatedAt: "17/11/2026",
    priceNote: "Biến động nhẹ theo giá NAND",
    targetKey: "storage",
    targetId: "ssd-3",
    image: "https://images.samsung.com/is/image/samsung/p6pim/vn/mz-v9p1t0bw/gallery/vn-990pro-nvme-m2-ssd-mz-v9p1t0bw-539179649?$1164_776_PNG$"
  }
];

const featuredGrid = document.getElementById('featured-grid');

if (featuredGrid) {
  const fragment = document.createDocumentFragment();
  featuredProducts.forEach(item => {
    const card = document.createElement('div');
    card.className = "rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-purple-500/50 transition-all flex flex-col justify-between overflow-hidden group shadow-lg";
    card.innerHTML = `
      <div class="relative h-48 w-full bg-white p-4 overflow-hidden flex items-center justify-center">
        <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${item.targetKey}')" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div class="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold tracking-wide shadow">
          ${item.category}
        </div>
        <div class="absolute top-3 right-3 px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase shadow">
          GIÁ NIÊM YẾT
        </div>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <p class="text-xs text-gray-500 font-medium mb-1">${item.brand}</p>
          <h3 class="text-base font-bold text-white mb-2">${item.name}</h3>
          <p class="text-xs text-gray-400 bg-gray-950/60 p-3 rounded-lg border border-gray-800/80 mb-5">${item.specs}</p>
        </div>
        <div class="pt-4 border-t border-gray-800/80 flex items-center justify-between gap-2">
          <div>
            <p class="text-[11px] text-gray-500">${item.priceNote || 'Giá niêm yết công khai'}</p>
            <p class="text-lg font-extrabold text-blue-400">${formatVND(item.price)}</p>
            <p class="text-[11px] text-gray-400 mt-0.5">Ngày công bố giá: <strong>${item.priceUpdatedAt}</strong></p>
          </div>
          <button type="button" data-featured-key="${item.targetKey}" data-featured-id="${item.targetId}" class="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md shrink-0">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Thêm vào PC</span>
          </button>
        </div>
      </div>
    `;
    fragment.appendChild(card);
  });
  featuredGrid.appendChild(fragment);

  featuredGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-featured-key]');
    if (!btn) return;
    selectComponent(btn.dataset.featuredKey, btn.dataset.featuredId);
    navigateToPage('builder', true);
  });
}

// --- 17. PHASE 7: HỆ THỐNG TỔNG HỢP CẤU HÌNH, SO SÁNH GIÁ 5 ĐẠI LÝ & TỰ ĐỘNG CHỌN HỘ BUILD PC ---
const RETAILERS = [
  {
    id: 'gearvn',
    name: 'GearVN',
    badgeClass: 'bg-red-600 text-white',
    website: 'https://gearvn.com',
    buildPcUrl: 'https://gearvn.com/pages/build-pc',
    buildSearchUrl: (q) => `https://gearvn.com/search?type=product&q=${encodeURIComponent(q)}`,
    shippingPolicy: 'Miễn phí giao nội thành • Bảo hành 36T',
    specialtyCategories: ['gpu', 'case', 'cooler']
  },
  {
    id: 'phongvu',
    name: 'Phong Vũ',
    badgeClass: 'bg-blue-600 text-white',
    website: 'https://phongvu.vn',
    buildPcUrl: 'https://phongvu.vn/buildpc',
    buildSearchUrl: (q) => `https://phongvu.vn/search?q=${encodeURIComponent(q)}`,
    shippingPolicy: 'Miễn phí giao toàn quốc • Bảo hành chính hãng',
    specialtyCategories: ['cpu', 'motherboard']
  },
  {
    id: 'hacom',
    name: 'HACOM',
    badgeClass: 'bg-amber-500 text-gray-950',
    website: 'https://hacom.vn',
    buildPcUrl: 'https://hacom.vn/buildpc',
    buildSearchUrl: (q) => `https://hacom.vn/tim?q=${encodeURIComponent(q)}`,
    shippingPolicy: 'Hỗ trợ lắp ráp tận nơi • Hệ thống Showroom lớn',
    specialtyCategories: ['psu', 'case', 'motherboard']
  },
  {
    id: 'memoryzone',
    name: 'MemoryZone',
    badgeClass: 'bg-emerald-600 text-white',
    website: 'https://memoryzone.com.vn',
    buildPcUrl: 'https://memoryzone.com.vn/buildpc',
    buildSearchUrl: (q) => `https://memoryzone.com.vn/search?query=${encodeURIComponent(q)}`,
    shippingPolicy: 'Chuyên gia RAM/SSD • Giao siêu tốc 2H',
    specialtyCategories: ['ram', 'storage', 'cooler']
  },
  {
    id: 'cellphones',
    name: 'CellphoneS',
    badgeClass: 'bg-rose-600 text-white',
    website: 'https://cellphones.com.vn',
    buildPcUrl: 'https://cellphones.com.vn/may-tinh-de-ban/lap-rap.html',
    buildSearchUrl: (q) => `https://cellphones.com.vn/catalogsearch/result?q=${encodeURIComponent(q)}`,
    shippingPolicy: 'Ưu đãi Smember • Lỗi 1 đổi 1 trong 30 ngày',
    specialtyCategories: ['cpu', 'gpu', 'storage']
  }
];

function cleanProductSearchQuery(rawName) {
  return rawName
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tạo đường dẫn mở thẳng Trang Build PC của Đại lý ĐÃ GẮN SẴN 100% các phụ kiện người dùng đã chọn ở PC MON
 */
function buildAttachedRetailerPortalUrl(retailer, buildData) {
  const params = new URLSearchParams();
  params.set('store', retailer.id);

  slotDefinitions.forEach(({ key }) => {
    const item = buildData[key];
    if (item && item.id) {
      params.set(key + '_id', item.id);
    }
  });

  return `retailer-build.html?${params.toString()}`;
}

/**
 * Tạo đường dẫn đi thẳng tới trang Build PC gốc của đại lý kèm theo toàn bộ tham số linh kiện đã chọn hộ
 */
function buildRetailerAutoSelectUrl(retailer, buildData) {
  const params = new URLSearchParams();
  params.set('source', 'pcmon_autoselect');
  params.set('auto_select', '1');

  slotDefinitions.forEach(({ key }) => {
    const item = buildData[key];
    if (item && !item.requiresIgpuCpu) {
      params.set(key, cleanProductSearchQuery(item.name));
    }
  });

  const queryStr = params.toString();
  return queryStr ? `${retailer.buildPcUrl}?${queryStr}` : retailer.buildPcUrl;
}

function getDeterministicOffset(itemId, retailerId) {
  const str = `${itemId}:${retailerId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000;
  }
  return hash;
}

/**
 * Tạo danh sách báo giá từ 5 đại lý cho 1 sản phẩm (Product_Offers)
 */
function getRetailerOffersForProduct(slotKey, item) {
  if (!item) return [];

  if (item.requiresIgpuCpu || item.price === 0) {
    return RETAILERS.map(r => ({
      retailerId: r.id,
      retailerName: r.name,
      badgeClass: r.badgeClass,
      price: 0,
      stockStatus: 'Tích hợp sẵn theo CPU',
      isInStock: true,
      shippingPolicy: 'Không phát sinh chi phí',
      updatedAt: item.priceUpdatedAt || '17/11/2026',
      sourceType: 'Tích hợp phần cứng',
      productUrl: r.buildPcUrl,
      buildPcUrl: buildAttachedRetailerPortalUrl(r, currentBuild),
      externalBuildPcUrl: buildRetailerAutoSelectUrl(r, currentBuild),
      isLowest: true
    }));
  }

  const cleanQuery = cleanProductSearchQuery(item.name);

  const rawOffers = RETAILERS.map((retailer) => {
    const hashVal = getDeterministicOffset(item.id, retailer.id);
    const isSpecialty = retailer.specialtyCategories.includes(slotKey);

    let deltaPercent = ((hashVal % 55) - 30) / 1000;
    if (isSpecialty) {
      deltaPercent -= 0.012;
    }

    const rawPrice = item.price * (1 + deltaPercent);
    const roundedPrice = Math.max(100000, Math.round(rawPrice / 10000) * 10000);

    const stockOptions = ['Còn hàng tại kho', 'Còn hàng (Giao ngay)', 'Còn hàng', 'Sắp hết hàng'];
    const stockStatus = stockOptions[hashVal % stockOptions.length];

    return {
      retailerId: retailer.id,
      retailerName: retailer.name,
      badgeClass: retailer.badgeClass,
      price: roundedPrice,
      stockStatus,
      isInStock: true,
      shippingPolicy: retailer.shippingPolicy,
      updatedAt: item.priceUpdatedAt || '17/11/2026',
      sourceType: 'Giá niêm yết tham khảo (Demo Feed)',
      productUrl: retailer.buildSearchUrl(cleanQuery),
      buildPcUrl: buildAttachedRetailerPortalUrl(retailer, currentBuild),
      externalBuildPcUrl: buildRetailerAutoSelectUrl(retailer, currentBuild),
      isLowest: false
    };
  });

  const minPrice = Math.min(...rawOffers.map(o => o.price));
  rawOffers.forEach(o => {
    if (o.price === minPrice) o.isLowest = true;
  });

  return rawOffers.sort((a, b) => a.price - b.price);
}

// --- CỬA SỔ ĐỒNG BỘ & TỰ ĐỘNG CHỌN HỘ PHỤ KIỆN TRÊN TRANG BUILD PC ĐẠI LÝ ---
let activeRetailerModalId = null;

const retailerModal = document.getElementById('retailer-autobuild-modal');
const retailerModalBadge = document.getElementById('retailer-modal-badge');
const retailerModalTitle = document.getElementById('retailer-modal-title');
const retailerModalSubtitle = document.getElementById('retailer-modal-subtitle');
const retailerModalSlotsList = document.getElementById('retailer-autobuild-slots-list');
const retailerModalTotalPrice = document.getElementById('retailer-modal-total-price');
const retailerModalPolicy = document.getElementById('retailer-modal-policy');
const retailerModalDirectLink = document.getElementById('retailer-modal-direct-link');
const retailerModalCopyScriptBtn = document.getElementById('retailer-modal-copy-script-btn');
const retailerModalCloseBtn = document.getElementById('retailer-modal-close-btn');
const retailerAutofillToggle = document.getElementById('retailer-autofill-missing-toggle');

function getEffectiveBuildForRetailerSync() {
  const autoFillMissing = retailerAutofillToggle ? retailerAutofillToggle.checked : true;
  const budget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';

  if (!autoFillMissing) {
    return { build: { ...currentBuild }, autoFilledKeys: [] };
  }

  const solved = solveExpertBuild(budget, purpose, currentBuild);
  const autoFilledKeys = [];
  const merged = {};

  slotDefinitions.forEach(({ key }) => {
    if (currentBuild[key]) {
      merged[key] = currentBuild[key];
    } else if (solved[key]) {
      merged[key] = solved[key];
      autoFilledKeys.push(key);
    } else {
      merged[key] = null;
    }
  });

  return { build: merged, autoFilledKeys };
}

function generateRetailerAutoSelectHelperScript(retailer, buildData) {
  const itemsMap = {};
  slotDefinitions.forEach(({ key, name }) => {
    if (buildData[key] && !buildData[key].requiresIgpuCpu) {
      itemsMap[name] = cleanProductSearchQuery(buildData[key].name);
    }
  });

  return `/* Lệnh Tự Động Chọn Hộ Cấu Hình PC MON trên ${retailer.name} (${retailer.buildPcUrl}) */\n` +
    `(function(){const parts=${JSON.stringify(itemsMap)};` +
    `localStorage.setItem('pcmon_autoselect_parts',JSON.stringify(parts));` +
    `console.table(parts);` +
    `const searchInput=document.querySelector('input[type="search"], input[name="q"], input[placeholder*="Tìm"], input[placeholder*="tìm"]');` +
    `if(searchInput){searchInput.value=Object.values(parts)[0]||'';searchInput.dispatchEvent(new Event('input',{bubbles:true}));}` +
    `alert('PC MON đã nạp tự động ' + Object.keys(parts).length + ' phụ kiện đã chọn vào trang Build PC ${retailer.name}!');})();`;
}

function renderRetailerAutoBuildModal() {
  if (!retailerModalSlotsList || !activeRetailerModalId) return;
  const retailer = RETAILERS.find(r => r.id === activeRetailerModalId) || RETAILERS[0];
  const { build: syncedBuild, autoFilledKeys } = getEffectiveBuildForRetailerSync();

  if (retailerModalBadge) {
    retailerModalBadge.className = `px-2.5 py-0.5 rounded-md text-xs font-extrabold ${retailer.badgeClass}`;
    retailerModalBadge.textContent = retailer.name;
  }
  if (retailerModalTitle) {
    retailerModalTitle.textContent = `Trang Build PC ${retailer.name} — Đã Chọn Hộ Phụ Kiện Của Bạn`;
  }
  if (retailerModalSubtitle) {
    retailerModalSubtitle.innerHTML = `Hệ thống đã tự động khớp toàn bộ phụ kiện bạn chọn vào danh mục <strong>Build PC của ${retailer.name}</strong> (<code class="text-blue-300">${retailer.buildPcUrl}</code>).`;
  }

  let totalRetailerPrice = 0;
  retailerModalSlotsList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  slotDefinitions.forEach(slot => {
    const item = syncedBuild[slot.key];
    const isAutoFilled = autoFilledKeys.includes(slot.key);
    const row = document.createElement('div');
    row.className = "py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3";

    if (item) {
      const offers = getRetailerOffersForProduct(slot.key, item);
      const retailerOffer = offers.find(o => o.retailerId === retailer.id) || offers[0];
      const itemPriceAtRetailer = retailerOffer ? retailerOffer.price : item.price;
      totalRetailerPrice += itemPriceAtRetailer;
      const directPartUrl = retailer.buildSearchUrl(cleanProductSearchQuery(item.name));

      row.innerHTML = `
        <div class="flex items-center gap-3.5 flex-1 min-w-0">
          <div class="w-12 h-12 rounded-xl bg-white p-1 border border-gray-700 shrink-0 overflow-hidden shadow">
            <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${slot.key}')" class="w-full h-full object-contain" loading="lazy" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-xs font-bold text-blue-400">${slot.name}</span>
              ${
                isAutoFilled
                  ? '<span class="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold">✨ Tự chọn hộ bổ sung</span>'
                  : '<span class="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">✓ Đã chọn hộ theo ý bạn</span>'
              }
            </div>
            <p class="text-sm font-bold text-white truncate mt-0.5">${item.name}</p>
            <p class="text-[11px] text-gray-400 truncate">${item.specs}</p>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60">
          <div class="text-left sm:text-right">
            <span class="text-sm font-extrabold text-emerald-400 block">${formatVND(itemPriceAtRetailer)}</span>
            <span class="text-[10px] text-gray-400 block">${retailerOffer ? retailerOffer.stockStatus : 'Còn hàng'} • Công bố: ${item.priceUpdatedAt || '17/11/2026'}</span>
          </div>
          <a href="${directPartUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-blue-600 text-gray-200 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 shrink-0" title="Mở đúng linh kiện này trên ${retailer.name}">
            <span>Mở SP</span>
            <i data-lucide="external-link" class="w-3 h-3"></i>
          </a>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500">
            <i data-lucide="${slot.icon}" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-gray-400 block">${slot.name}</span>
            <span class="text-[11px] text-gray-500 italic">Chưa chọn phụ kiện cho khe này</span>
          </div>
        </div>
      `;
    }

    fragment.appendChild(row);
  });

  retailerModalSlotsList.appendChild(fragment);

  if (retailerModalTotalPrice) {
    retailerModalTotalPrice.textContent = formatVND(totalRetailerPrice);
  }
  if (retailerModalPolicy) {
    retailerModalPolicy.textContent = `${retailer.shippingPolicy} • Đã gồm VAT`;
  }

  const autoSelectUrl = buildAttachedRetailerPortalUrl(retailer, syncedBuild);
  if (retailerModalDirectLink) {
    retailerModalDirectLink.href = autoSelectUrl;
    retailerModalDirectLink.innerHTML = `
      <span>Đi thẳng tới Build PC ${retailer.name} (Đã gắn sẵn ${Object.values(syncedBuild).filter(Boolean).length} món)</span>
      <i data-lucide="external-link" class="w-4 h-4"></i>
    `;
  }

  if (retailerModal) refreshIcons(retailerModal);
}

window.openRetailerAutoBuildModal = function(retailerId) {
  activeRetailerModalId = retailerId;
  const retailer = RETAILERS.find(r => r.id === retailerId) || RETAILERS[0];
  renderRetailerAutoBuildModal();

  // Tự động sao chép danh sách mã linh kiện đã chọn vào bộ nhớ tạm để hỗ trợ dán nhanh trên trang Build PC của đại lý
  const { build: syncedBuild } = getEffectiveBuildForRetailerSync();
  const partLines = slotDefinitions
    .map(s => syncedBuild[s.key] ? `${s.shortName}: ${cleanProductSearchQuery(syncedBuild[s.key].name)}` : null)
    .filter(Boolean)
    .join('\n');

  if (partLines && navigator.clipboard) {
    navigator.clipboard.writeText(partLines).catch(() => {});
  }

  if (retailerModal) {
    retailerModal.classList.remove('hidden');
    retailerModal.classList.add('flex');
  }

  showToast(`Đã chọn hộ toàn bộ phụ kiện của bạn cho trang Build PC ${retailer.name}!`, 'success');
};

function closeRetailerModal() {
  if (retailerModal) {
    retailerModal.classList.add('hidden');
    retailerModal.classList.remove('flex');
  }
  activeRetailerModalId = null;
}

if (retailerModalCloseBtn) retailerModalCloseBtn.addEventListener('click', closeRetailerModal);
if (retailerAutofillToggle) retailerAutofillToggle.addEventListener('change', renderRetailerAutoBuildModal);
if (retailerModal) {
  retailerModal.addEventListener('click', (e) => {
    if (e.target === retailerModal) closeRetailerModal();
  });
}

if (retailerModalCopyScriptBtn) {
  retailerModalCopyScriptBtn.addEventListener('click', () => {
    if (!activeRetailerModalId) return;
    const retailer = RETAILERS.find(r => r.id === activeRetailerModalId) || RETAILERS[0];
    const { build: syncedBuild } = getEffectiveBuildForRetailerSync();
    const scriptText = generateRetailerAutoSelectHelperScript(retailer, syncedBuild);
    navigator.clipboard.writeText(scriptText).then(() => {
      showToast(`Đã sao chép Lệnh Tự Chọn Hộ cho trang Build PC ${retailer.name}!`, 'success');
    }).catch(() => {
      alert(scriptText);
    });
  });
}

function renderSummaryAndPriceComparisonPage() {
  const standardTotalEl = document.getElementById('summary-standard-total');
  const origBudgetEl = document.getElementById('summary-original-budget');
  const budgetDiffTextEl = document.getElementById('summary-budget-diff-text');
  const lowestTotalEl = document.getElementById('summary-lowest-total');
  const savedAmountEl = document.getElementById('summary-saved-amount');
  const bestSingleNameEl = document.getElementById('summary-best-single-retailer-name');
  const bestSinglePriceEl = document.getElementById('summary-best-single-retailer-price');
  const purposeNameEl = document.getElementById('summary-purpose-name');
  const compatBadgeEl = document.getElementById('summary-compat-badge');
  const wattageNoteEl = document.getElementById('summary-wattage-note');
  const warningBannerEl = document.getElementById('summary-warning-banner');
  const bundleContainer = document.getElementById('retailer-bundle-comparison');
  const itemsComparisonList = document.getElementById('summary-items-comparison-list');

  if (!itemsComparisonList) return;

  const budget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
  const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';
  const { totalPrice: standardTotal, selectedCount, estimatedWattage, recommendedPsu } = calculateBuildMetrics(currentBuild);
  const { issues } = evaluateBuildCompatibility(currentBuild);

  let lowestMixTotal = 0;
  const bundleTotalsByRetailer = {};
  RETAILERS.forEach(r => { bundleTotalsByRetailer[r.id] = 0; });

  const perSlotOffers = {};
  slotDefinitions.forEach(slot => {
    const item = currentBuild[slot.key];
    if (item) {
      const offers = getRetailerOffersForProduct(slot.key, item);
      perSlotOffers[slot.key] = offers;
      if (offers.length > 0) {
        lowestMixTotal += offers[0].price;
      }
      offers.forEach(off => {
        bundleTotalsByRetailer[off.retailerId] = (bundleTotalsByRetailer[off.retailerId] || 0) + off.price;
      });
    }
  });

  const savedAmount = Math.max(0, standardTotal - lowestMixTotal);

  const sortedBundles = RETAILERS.map(r => ({
    retailer: r,
    total: bundleTotalsByRetailer[r.id] || 0
  })).sort((a, b) => a.total - b.total);

  const bestSingleBundle = sortedBundles[0];

  if (standardTotalEl) standardTotalEl.textContent = formatVND(standardTotal);
  if (origBudgetEl) origBudgetEl.textContent = formatVND(budget);
  if (budgetDiffTextEl) {
    const diff = budget - lowestMixTotal;
    if (selectedCount === 0) {
      budgetDiffTextEl.textContent = 'Chưa chọn linh kiện nào';
      budgetDiffTextEl.className = 'text-[11px] text-gray-400 font-semibold mt-3';
    } else if (diff >= 0) {
      budgetDiffTextEl.textContent = `Dư ngân sách: +${formatVND(diff)} (khi mua nơi rẻ nhất)`;
      budgetDiffTextEl.className = 'text-[11px] text-emerald-400 font-semibold mt-3';
    } else {
      budgetDiffTextEl.textContent = `Vượt ngân sách: -${formatVND(Math.abs(diff))}`;
      budgetDiffTextEl.className = 'text-[11px] text-red-400 font-semibold mt-3';
    }
  }

  if (lowestTotalEl) lowestTotalEl.textContent = formatVND(lowestMixTotal);
  if (savedAmountEl) savedAmountEl.textContent = formatVND(savedAmount);

  if (bestSingleNameEl && bestSinglePriceEl) {
    if (selectedCount > 0 && bestSingleBundle) {
      bestSingleNameEl.textContent = bestSingleBundle.retailer.name;
      bestSinglePriceEl.textContent = `Trọn bộ: ${formatVND(bestSingleBundle.total)}`;
    } else {
      bestSingleNameEl.textContent = 'Chưa có dữ liệu';
      bestSinglePriceEl.textContent = '0 ₫';
    }
  }

  if (purposeNameEl) purposeNameEl.textContent = `${purpose} (${selectedCount}/8 món)`;
  if (compatBadgeEl) {
    if (issues.length > 0) {
      compatBadgeEl.textContent = `Phát hiện ${issues.length} xung đột phần cứng`;
      compatBadgeEl.className = 'text-xs font-bold text-red-400 mt-1';
    } else if (selectedCount > 0) {
      compatBadgeEl.textContent = 'Tương thích phần cứng 100%';
      compatBadgeEl.className = 'text-xs font-bold text-emerald-400 mt-1';
    } else {
      compatBadgeEl.textContent = 'Chưa chọn linh kiện';
      compatBadgeEl.className = 'text-xs font-medium text-gray-400 mt-1';
    }
  }
  if (wattageNoteEl) {
    wattageNoteEl.textContent = `Công suất ước tính: ${estimatedWattage}W (Khuyến nghị nguồn ${recommendedPsu}W)`;
  }

  if (warningBannerEl) {
    const warningsToShow = [];
    if (standardTotal > budget) {
      warningsToShow.push(`Tổng giá niêm yết (${formatVND(standardTotal)}) đang vượt ngân sách mục tiêu (${formatVND(budget)}) là ${formatVND(standardTotal - budget)}.`);
    }
    if (issues.length > 0) {
      warningsToShow.push(`Cấu hình đang có ${issues.length} lỗi xung đột phần cứng: ${issues.map(i => i.title).join(', ')}.`);
    }

    if (warningsToShow.length > 0) {
      warningBannerEl.classList.remove('hidden');
      warningBannerEl.innerHTML = `
        <div class="flex items-start gap-2.5">
          <i data-lucide="alert-triangle" class="w-5 h-5 text-red-400 shrink-0 mt-0.5"></i>
          <div>
            <strong class="font-bold text-white block mb-1">Lưu ý trước khi đặt mua linh kiện:</strong>
            <ul class="list-disc list-inside space-y-1">
              ${warningsToShow.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    } else {
      warningBannerEl.classList.add('hidden');
    }
  }

  // Render 5 thẻ so sánh hóa đơn trọn bộ tại 5 đại lý (kèm nút Đi thẳng tới Build PC & Chọn hộ phụ kiện)
  if (bundleContainer) {
    if (selectedCount === 0) {
      bundleContainer.innerHTML = `
        <div class="col-span-5 py-6 text-center text-xs text-gray-400">
          Hãy chọn linh kiện ở Trang 3 (Bàn lắp ráp) để hệ thống tự động chọn hộ phụ kiện trên trang Build PC của 5 đại lý lớn.
        </div>
      `;
    } else {
      bundleContainer.innerHTML = sortedBundles.map((b, idx) => {
        const isBestBundle = idx === 0;
        const diffFromBest = b.total - sortedBundles[0].total;
        const attachedBuildPcUrl = buildAttachedRetailerPortalUrl(b.retailer, currentBuild);

        return `
          <div class="p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            isBestBundle
              ? 'bg-emerald-950/25 border-emerald-500/50 shadow-md'
              : 'bg-gray-950/50 border-gray-800'
          }">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="px-2.5 py-0.5 rounded-md text-xs font-extrabold ${b.retailer.badgeClass}">
                  ${b.retailer.name}
                </span>
                ${
                  isBestBundle
                    ? '<span class="text-[10px] font-extrabold text-emerald-400 uppercase">★ Trọn bộ rẻ nhất</span>'
                    : `<span class="text-[10px] text-gray-400">+${formatVND(diffFromBest)}</span>`
                }
              </div>
              <p class="text-lg font-extrabold ${isBestBundle ? 'text-emerald-400' : 'text-white'}">${formatVND(b.total)}</p>
              <p class="text-[11px] text-gray-400 mt-1">${b.retailer.shippingPolicy}</p>
            </div>

            <div class="mt-3 pt-2.5 border-t border-gray-800/80 space-y-2">
              <a href="${attachedBuildPcUrl}" target="_blank" rel="noopener noreferrer" class="w-full py-2 px-3 rounded-xl ${
                isBestBundle
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              } text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                <i data-lucide="cpu" class="w-3.5 h-3.5"></i>
                <span>Vào Build PC ${b.retailer.name} (Đã gắn ${selectedCount} món)</span>
              </a>
              <button type="button" data-open-retailer-autobuild="${b.retailer.id}" class="w-full py-1.5 px-2.5 rounded-lg bg-gray-800/90 hover:bg-gray-700 text-[11px] font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors">
                <span>Xem trước &amp; Tự điền món thiếu</span>
                <i data-lucide="wand-2" class="w-3 h-3"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render danh sách từng linh kiện kèm bảng báo giá 5 cửa hàng
  itemsComparisonList.innerHTML = '';

  if (selectedCount === 0) {
    itemsComparisonList.innerHTML = `
      <div class="p-10 rounded-3xl bg-gray-900/50 border border-gray-800 text-center">
        <p class="text-base font-bold text-white mb-2">Bạn chưa chọn linh kiện nào trong cấu hình</p>
        <p class="text-xs text-gray-400 max-w-md mx-auto mb-5">Hãy quay lại Trang Gợi Ý &amp; Lắp Ráp (hoặc bấm Đề xuất tự động ngay bên dưới) để hệ thống lập bảng so sánh giá và chọn hộ phụ kiện trên trang Build PC của 5 đại lý lớn.</p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button type="button" id="btn-summary-quick-autobuild" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-all">
            ✨ Tự động lên cấu hình &amp; So sánh giá ngay
          </button>
          <button type="button" data-nav-page="builder" class="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all">
            Quay về Bàn lắp ráp
          </button>
        </div>
      </div>
    `;
    const quickBtn = document.getElementById('btn-summary-quick-autobuild');
    if (quickBtn) {
      quickBtn.addEventListener('click', () => {
        currentBuild = solveExpertBuild(budget, purpose, createEmptyBuild());
        saveBuild();
        renderBuilderSlots();
        updateBuilderDashboard();
        renderSummaryAndPriceComparisonPage();
        showToast(`Đã lên cấu hình "${purpose}" và cập nhật bảng so sánh giá 5 đại lý!`, 'success');
      });
    }
  } else {
    const fragment = document.createDocumentFragment();

    slotDefinitions.forEach(slot => {
      const item = currentBuild[slot.key];
      const card = document.createElement('div');
      card.className = "rounded-2xl bg-gray-900/50 border border-gray-800 overflow-hidden shadow-lg";

      if (!item) {
        card.innerHTML = `
          <div class="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-950/40">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400">
                <i data-lucide="${slot.icon}" class="w-5 h-5"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-gray-300 block">${slot.name}</span>
                <span class="text-xs text-gray-500 italic">Chưa chọn linh kiện cho mục này</span>
              </div>
            </div>
            <button type="button" data-summary-open-modal="${slot.key}" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors self-start sm:self-center">
              + Chọn ${slot.shortName} ngay
            </button>
          </div>
        `;
      } else {
        const offers = perSlotOffers[slot.key] || [];
        const lowestOffer = offers[0];
        const savingVsStandard = Math.max(0, item.price - (lowestOffer ? lowestOffer.price : item.price));

        card.innerHTML = `
          <!-- Thông tin linh kiện đã chọn -->
          <div class="p-4 sm:px-6 sm:py-4 bg-gray-900/90 border-b border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-xl bg-white p-1 border border-gray-700 shrink-0 overflow-hidden shadow">
                <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${slot.key}')" class="w-full h-full object-contain" loading="lazy" />
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-bold text-blue-400 uppercase">${slot.name}</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                    Nơi rẻ nhất: ${lowestOffer ? lowestOffer.retailerName : '--'} (${lowestOffer ? formatVND(lowestOffer.price) : '--'})
                  </span>
                  ${
                    savingVsStandard > 0
                      ? `<span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Tiết kiệm ${formatVND(savingVsStandard)}</span>`
                      : ''
                  }
                </div>
                <h4 class="text-base font-extrabold text-white mt-0.5">${item.name}</h4>
                <p class="text-xs text-gray-400 mt-0.5">${item.specs}</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-800">
              <div class="text-left lg:text-right mr-2">
                <span class="text-[11px] text-gray-400 block">Giá niêm yết chuẩn: <strong class="text-gray-200">${formatVND(item.price)}</strong></span>
                <span class="text-[11px] text-gray-400 block">Ngày công bố giá: <strong>${item.priceUpdatedAt || '17/11/2026'}</strong></span>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" data-summary-open-modal="${slot.key}" class="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex items-center gap-1">
                  <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                  <span>Đổi món khác</span>
                </button>
                <button type="button" data-summary-remove-slot="${slot.key}" class="p-1.5 rounded-xl bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition-colors" title="Xóa linh kiện">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Bảng 5 báo giá từ 5 cửa hàng (Product_Offers) kèm nút Đi thẳng tới Build PC & Chọn hộ -->
          <div class="p-4 sm:p-5 bg-gray-950/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            ${offers.map(off => `
              <div class="p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                off.isLowest
                  ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md'
                  : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
              }">
                <div>
                  <div class="flex items-center justify-between gap-1.5 mb-2">
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold ${off.badgeClass}">
                      ${off.retailerName}
                    </span>
                    ${
                      off.isLowest
                        ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500 text-gray-950 text-[9px] font-extrabold uppercase">Giá tốt nhất</span>'
                        : ''
                    }
                  </div>
                  <p class="text-base font-extrabold ${off.isLowest ? 'text-emerald-400' : 'text-blue-400'}">
                    ${formatVND(off.price)}
                  </p>
                  <p class="text-[11px] text-emerald-400/90 font-medium mt-1 flex items-center gap-1">
                    <i data-lucide="check-circle-2" class="w-3 h-3 shrink-0"></i>
                    <span>${off.stockStatus}</span>
                  </p>
                  <p class="text-[10px] text-gray-400 mt-1">${off.shippingPolicy}</p>
                  <p class="text-[10px] text-gray-500 mt-1">Cập nhật: ${off.updatedAt}</p>
                </div>

                <div class="mt-3 space-y-1.5">
                  <a href="${off.buildPcUrl}" target="_blank" rel="noopener noreferrer" class="w-full py-1.5 px-2.5 rounded-lg ${
                    off.isLowest
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-blue-600/90 hover:bg-blue-500 text-white'
                  } text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-sm">
                    <i data-lucide="cpu" class="w-3 h-3"></i>
                    <span>Vào Build PC ${off.retailerName} (Đã gắn)</span>
                  </a>
                  <a href="${off.productUrl}" target="_blank" rel="noopener noreferrer" class="w-full py-1 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[10px] font-semibold transition-colors flex items-center justify-center gap-1">
                    <span>Mua lẻ món này tại ${off.retailerName}</span>
                    <i data-lucide="external-link" class="w-2.5 h-2.5"></i>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      fragment.appendChild(card);
    });

    itemsComparisonList.appendChild(fragment);
  }

  renderSavedBuildsList();

  const summarySection = document.getElementById('summary-section');
  if (summarySection) refreshIcons(summarySection);
}

// Lắng nghe nút Mở Cổng Build PC Chọn Hộ trên toàn trang Tổng hợp
const summarySectionEl = document.getElementById('summary-section');
if (summarySectionEl) {
  summarySectionEl.addEventListener('click', (e) => {
    const autoBuildRetailerBtn = e.target.closest('button[data-open-retailer-autobuild]');
    if (autoBuildRetailerBtn) {
      openRetailerAutoBuildModal(autoBuildRetailerBtn.dataset.openRetailerAutobuild);
    }
  });
}
const summaryItemsComparisonListEl = document.getElementById('summary-items-comparison-list');
if (summaryItemsComparisonListEl) {
  summaryItemsComparisonListEl.addEventListener('click', (e) => {
    const openBtn = e.target.closest('button[data-summary-open-modal]');
    if (openBtn) {
      openComponentModal(openBtn.dataset.summaryOpenModal);
      return;
    }
    const removeBtn = e.target.closest('button[data-summary-remove-slot]');
    if (removeBtn) {
      removeComponent(removeBtn.dataset.summaryRemoveSlot);
    }
  });
}

// --- QUẢN LÝ LƯU CẤU HÌNH (THEO USER), CHIA SẺ BÁO GIÁ & IN ẤN ---
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('pcmon_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getAllSavedBuildsRaw() {
  try {
    const raw = localStorage.getItem('pcmon_saved_builds');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function getSavedBuilds() {
  const all = getAllSavedBuildsRaw();
  const user = getCurrentUser();
  const ownerId = user ? user.id : 'guest';
  // Phân quyền Row-Level Security: Người dùng chỉ nhìn thấy cấu hình của chính mình (hoặc cấu hình guest khi chưa đăng nhập)
  return all.filter(b => (b.userId || 'guest') === ownerId);
}

function setSavedBuilds(listForCurrentUser) {
  try {
    const all = getAllSavedBuildsRaw();
    const user = getCurrentUser();
    const ownerId = user ? user.id : 'guest';
    const others = all.filter(b => (b.userId || 'guest') !== ownerId);
    localStorage.setItem('pcmon_saved_builds', JSON.stringify([...listForCurrentUser, ...others]));
  } catch (e) {
    console.warn('[PC MON] Không thể lưu danh sách cấu hình:', e);
  }
}

function generateShareCodeForBuild(slotIds, purpose, budget) {
  const pairs = Object.entries(slotIds || {})
    .filter(([, id]) => Boolean(id))
    .map(([k, id]) => `${k}:${id}`);
  return `PCMON-${encodeURIComponent(purpose || 'Gaming')}-${budget || 20000000}-${pairs.join('|')}`;
}

function createSavedBuildCardHTML(entry) {
  const shareCode = generateShareCodeForBuild(entry.slotIds, entry.purpose, entry.budget);
  return `
    <div class="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-purple-500/40 transition-all flex flex-col justify-between gap-4 shadow-md">
      <div>
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
            ${entry.purpose}
          </span>
          <span class="text-[11px] text-gray-400">Lưu ngày: ${entry.savedAt}</span>
        </div>
        <h4 class="text-base font-extrabold text-white">${entry.name}</h4>
        <p class="text-xs text-gray-400 mt-1">Tổng niêm yết: <strong class="text-blue-400">${formatVND(entry.totalPrice)}</strong> (Ngân sách: ${formatVND(entry.budget)})</p>
        <p class="text-[11px] text-gray-400 mt-1 line-clamp-2">
          ${entry.summaryLine}
        </p>
      </div>
      <div class="pt-3 border-t border-gray-800 flex flex-wrap items-center justify-between gap-1.5">
        <button type="button" data-load-saved-id="${entry.id}" class="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors">
          Nạp &amp; Sửa
        </button>
        <button type="button" data-rename-saved-id="${entry.id}" class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors" title="Đổi tên cấu hình">
          <i data-lucide="edit-3" class="w-4 h-4"></i>
        </button>
        <button type="button" data-copy-sharecode="${shareCode}" class="p-2 rounded-xl bg-gray-800 hover:bg-emerald-600 text-gray-300 hover:text-white transition-colors" title="Sao chép Mã Chia Sẻ cấu hình">
          <i data-lucide="share-2" class="w-4 h-4"></i>
        </button>
        <button type="button" data-delete-saved-id="${entry.id}" class="p-2 rounded-xl bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition-colors" title="Xóa cấu hình đã lưu">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;
}

function renderSavedBuildsList() {
  const savedList = getSavedBuilds();
  const containers = [
    document.getElementById('saved-builds-container'),
    document.getElementById('account-saved-builds-grid')
  ].filter(Boolean);

  const countBadge = document.getElementById('account-saved-count');
  if (countBadge) countBadge.textContent = String(savedList.length);

  containers.forEach(container => {
    if (savedList.length === 0) {
      container.innerHTML = `
        <div class="col-span-3 p-6 rounded-2xl bg-gray-900/40 border border-gray-800 text-center text-xs text-gray-400">
          Chưa có cấu hình nào được lưu cho tài khoản này. Hãy bấm <strong>"Lưu cấu hình này"</strong> trên Trang Tổng Hợp để lưu lại!
        </div>
      `;
    } else {
      container.innerHTML = savedList.map(entry => createSavedBuildCardHTML(entry)).join('');
      refreshIcons(container);
    }
  });
}

function handleSavedBuildsActionClick(e) {
  const loadBtn = e.target.closest('button[data-load-saved-id]');
  if (loadBtn) {
    const targetId = loadBtn.dataset.loadSavedId;
    const found = getSavedBuilds().find(b => b.id === targetId);
    if (found && found.slotIds) {
      const loadedBuild = createEmptyBuild();
      slotDefinitions.forEach(({ key }) => {
        const itemId = found.slotIds[key];
        if (itemId && componentsDB[key]) {
          loadedBuild[key] = componentsDB[key].find(i => i.id === itemId) || null;
        }
      });
      currentBuild = loadedBuild;
      saveBuild();

      if (found.purpose) {
        localStorage.setItem('pcmon_purpose', found.purpose);
        const pObj = usageCategories.find(c => c.title === found.purpose);
        if (pObj) updatePurposeUI(pObj.title, pObj.slug);
      }
      if (found.budget) {
        if (budgetRange) budgetRange.value = found.budget;
        updateBudget(found.budget, true);
      }
      const nameInput = document.getElementById('build-name-input');
      if (nameInput) nameInput.value = found.name;

      renderBuilderSlots();
      updateBuilderDashboard();
      renderSummaryAndPriceComparisonPage();
      showToast(`Đã nạp lại cấu hình: "${found.name}"!`, 'success');
      if (currentPage === 'account') {
        navigateToPage('builder', true);
      }
    }
    return;
  }

  const renameBtn = e.target.closest('button[data-rename-saved-id]');
  if (renameBtn) {
    const targetId = renameBtn.dataset.renameSavedId;
    const list = getSavedBuilds();
    const target = list.find(b => b.id === targetId);
    if (target) {
      const newName = prompt('Nhập tên mới cho cấu hình PC của bạn:', target.name);
      if (newName && newName.trim()) {
        target.name = newName.trim();
        setSavedBuilds(list);
        renderSavedBuildsList();
        showToast(`Đã đổi tên cấu hình thành "${target.name}"!`, 'success');
      }
    }
    return;
  }

  const shareBtn = e.target.closest('button[data-copy-sharecode]');
  if (shareBtn) {
    const code = shareBtn.dataset.copySharecode;
    navigator.clipboard.writeText(code).then(() => {
      showToast('Đã sao chép Mã Chia Sẻ cấu hình vào bộ nhớ tạm! Bạn có thể gửi mã này cho bạn bè.', 'success');
    }).catch(() => {
      alert(code);
    });
    return;
  }

  const delBtn = e.target.closest('button[data-delete-saved-id]');
  if (delBtn) {
    const targetId = delBtn.dataset.deleteSavedId;
    if (confirm('Bạn có chắc chắn muốn xóa bản cấu hình đã lưu này?')) {
      const filtered = getSavedBuilds().filter(b => b.id !== targetId);
      setSavedBuilds(filtered);
      renderSavedBuildsList();
      showToast('Đã xóa cấu hình khỏi danh sách lưu.', 'info');
    }
  }
}

const savedBuildsContainerEl = document.getElementById('saved-builds-container');
if (savedBuildsContainerEl) {
  savedBuildsContainerEl.addEventListener('click', handleSavedBuildsActionClick);
}
const accountSavedBuildsGridEl = document.getElementById('account-saved-builds-grid');
if (accountSavedBuildsGridEl) {
  accountSavedBuildsGridEl.addEventListener('click', handleSavedBuildsActionClick);
}

const btnSaveBuild = document.getElementById('btn-save-build');
if (btnSaveBuild) {
  btnSaveBuild.addEventListener('click', () => {
    const { selectedCount, totalPrice } = calculateBuildMetrics(currentBuild);
    if (selectedCount === 0) {
      showToast('Vui lòng chọn ít nhất 1 linh kiện trước khi lưu cấu hình!', 'warning');
      return;
    }

    const user = getCurrentUser();
    const nameInput = document.getElementById('build-name-input');
    const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';
    const budget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
    const buildName = (nameInput && nameInput.value.trim()) || `PC ${purpose} - ${formatVND(totalPrice)}`;

    const slotIds = {};
    const partNames = [];
    slotDefinitions.forEach(({ key }) => {
      if (currentBuild[key]) {
        slotIds[key] = currentBuild[key].id;
        partNames.push(currentBuild[key].name);
      }
    });

    const newEntry = {
      id: 'build-' + Date.now(),
      userId: user ? user.id : 'guest',
      name: buildName,
      purpose,
      budget,
      totalPrice,
      savedAt: '18/11/2026',
      slotIds,
      summaryLine: partNames.join(' • ')
    };

    const list = getSavedBuilds();
    list.unshift(newEntry);
    setSavedBuilds(list.slice(0, 15));
    renderSavedBuildsList();
    showToast(`Đã lưu cấu hình "${buildName}" vào tài khoản ${user ? user.name : 'Khách'}!`, 'success');
  });
}

const btnShareBuild = document.getElementById('btn-share-build');
if (btnShareBuild) {
  btnShareBuild.addEventListener('click', () => {
    const nameInput = document.getElementById('build-name-input');
    const buildName = (nameInput && nameInput.value.trim()) || 'Cấu hình PC MON';
    const purpose = localStorage.getItem('pcmon_purpose') || 'Gaming';
    const budget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
    const { totalPrice, estimatedWattage } = calculateBuildMetrics(currentBuild);

    let lowestTotal = 0;
    let text = `===== BẢNG SO SÁNH GIÁ & BÁO GIÁ: ${buildName.toUpperCase()} =====\n`;
    text += `• Nhu cầu: ${purpose} | Ngân sách mục tiêu: ${formatVND(budget)}\n\n`;

    slotDefinitions.forEach(slot => {
      const item = currentBuild[slot.key];
      if (item) {
        const offers = getRetailerOffersForProduct(slot.key, item);
        const best = offers[0];
        lowestTotal += best ? best.price : item.price;
        text += `• ${slot.name}: ${item.name}\n`;
        text += `  - Giá niêm yết: ${formatVND(item.price)} (Công bố: ${item.priceUpdatedAt || '17/11/2026'})\n`;
        if (best) {
          text += `  - Nơi mua rẻ nhất: ${best.retailerName} - ${formatVND(best.price)} (${best.stockStatus})\n`;
        }
      } else {
        text += `• ${slot.name}: [Chưa chọn]\n`;
      }
    });

    text += `\n• Công suất ước tính: ${estimatedWattage}W\n`;
    text += `• Tổng giá niêm yết chuẩn: ${formatVND(totalPrice)}\n`;
    text += `• Tổng giá mua tại nơi rẻ nhất: ${formatVND(lowestTotal)} (Tiết kiệm: ${formatVND(Math.max(0, totalPrice - lowestTotal))})\n`;
    text += `===================================================`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Đã sao chép Bảng báo giá & So sánh nơi mua rẻ nhất vào Clipboard!', 'success');
    }).catch(() => {
      alert(text);
    });
  });
}

const btnPrintBuild = document.getElementById('btn-print-build');
if (btnPrintBuild) {
  btnPrintBuild.addEventListener('click', () => {
    window.print();
  });
}

// --- 17. PHASE 8: XÁC THỰC TÀI KHOẢN, MÃ CHIA SẺ CẤU HÌNH & BẢNG QUẢN TRỊ ADMIN (RBAC) ---
const DEFAULT_COMPONENTS_DB_SNAPSHOT = JSON.parse(JSON.stringify(componentsDB));

function loadCustomCatalogFromStorage() {
  try {
    const raw = localStorage.getItem('pcmon_custom_catalog');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    slotDefinitions.forEach(({ key }) => {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        componentsDB[key] = parsed[key];
      }
    });
  } catch (e) {
    console.warn('[PC MON] Không thể nạp kho linh kiện tùy chỉnh:', e);
  }
}

function saveCustomCatalogToStorage() {
  try {
    localStorage.setItem('pcmon_custom_catalog', JSON.stringify(componentsDB));
  } catch (e) {
    console.warn('[PC MON] Không thể lưu kho linh kiện tùy chỉnh:', e);
  }
}

const DEFAULT_USERS_SEED = [
  {
    id: 'user-sv-01',
    name: 'Sinh viên CNTT',
    email: 'sinhvien@pcmon.vn',
    password: '123456',
    role: 'user'
  },
  {
    id: 'admin-pcmon-01',
    name: 'Chuyên gia Quản trị PC MON',
    email: 'admin@pcmon.vn',
    password: 'admin123',
    role: 'admin'
  }
];

function getUsersDB() {
  try {
    const raw = localStorage.getItem('pcmon_users_db');
    if (!raw) {
      localStorage.setItem('pcmon_users_db', JSON.stringify(DEFAULT_USERS_SEED));
      return [...DEFAULT_USERS_SEED];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_USERS_SEED];
    }
    // Luôn đảm bảo các tài khoản mặc định (Thành viên & Admin) tồn tại song song với tài khoản đăng ký mới
    const merged = [...parsed];
    DEFAULT_USERS_SEED.forEach(seed => {
      if (!merged.some(u => u.email.toLowerCase() === seed.email.toLowerCase())) {
        merged.push(seed);
      }
    });
    return merged;
  } catch (e) {
    return [...DEFAULT_USERS_SEED];
  }
}

function saveUsersDB(usersList) {
  try {
    localStorage.setItem('pcmon_users_db', JSON.stringify(usersList));
  } catch (e) {
    console.warn('[PC MON] Không thể lưu danh sách tài khoản:', e);
  }
}

// --- HỆ THỐNG GIỎ HÀNG CÁ NHÂN (CHỈ SỬ DỤNG ĐƯỢC KHI ĐÃ ĐĂNG NHẬP) ---
function getAllUserCartsRaw() {
  try {
    const raw = localStorage.getItem('pcmon_user_carts');
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function getUserCart() {
  const user = getCurrentUser();
  if (!user) return []; // Chưa đăng nhập thì không có giỏ hàng
  const allCarts = getAllUserCartsRaw();
  const list = allCarts[user.id];
  return Array.isArray(list) ? list : [];
}

function saveUserCart(cartList) {
  const user = getCurrentUser();
  if (!user) return;
  try {
    const allCarts = getAllUserCartsRaw();
    allCarts[user.id] = cartList;
    localStorage.setItem('pcmon_user_carts', JSON.stringify(allCarts));
  } catch (e) {
    console.warn('[PC MON] Không thể lưu giỏ hàng:', e);
  }
  updateCartNavbarBadge();
}

function updateCartNavbarBadge() {
  const user = getCurrentUser();
  const cartCountEl = document.getElementById('nav-cart-count');
  const mobileCartBtn = document.getElementById('btn-mobile-nav-cart');
  const cart = user ? getUserCart() : [];
  const totalQty = cart.reduce((sum, entry) => sum + (Number(entry.qty) || 1), 0);

  if (cartCountEl) {
    cartCountEl.textContent = String(totalQty);
  }
  if (mobileCartBtn) {
    mobileCartBtn.textContent = user ? `🛒 Giỏ hàng của tôi (${totalQty})` : '🛒 Giỏ hàng (Cần đăng nhập)';
  }
}

/**
 * Lưu các linh kiện người dùng đã chọn trước đó trên Bàn lắp ráp (currentBuild) vào Giỏ hàng của tài khoản đang đăng nhập.
 * Nếu chưa đăng nhập -> Nhắc đăng nhập, ghi nhớ yêu cầu và tự động lưu ngay sau khi đăng nhập!
 */
function saveCurrentSelectionToCart(silentIfEmpty = false) {
  const { selectedCount } = calculateBuildMetrics(currentBuild);
  const user = getCurrentUser();

  if (!user) {
    pendingCartSaveAfterLogin = true;
    pendingCartRedirect = true;
    showToast(
      selectedCount > 0
        ? `Chỉ khi đăng nhập mới có thể sử dụng Giỏ hàng! Hãy đăng nhập để lưu ${selectedCount} linh kiện bạn vừa chọn vào giỏ hàng.`
        : 'Chỉ khi đăng nhập bạn mới có thể sử dụng Giỏ hàng! Vui lòng đăng nhập hoặc đăng ký tài khoản.',
      'warning'
    );
    navigateToPage('account', true);
    return false;
  }

  if (selectedCount === 0) {
    if (!silentIfEmpty) {
      showToast('Bạn chưa chọn linh kiện nào trên Bàn lắp ráp! Hãy chọn linh kiện trước khi lưu vào Giỏ hàng.', 'warning');
    }
    return false;
  }

  const cart = getUserCart();
  let addedCount = 0;

  slotDefinitions.forEach(slot => {
    const chosen = currentBuild[slot.key];
    if (!chosen) return;
    addedCount++;
    const existingIdx = cart.findIndex(c => c.slotKey === slot.key);
    const cartEntry = {
      id: `${slot.key}:${chosen.id}`,
      slotKey: slot.key,
      slotName: slot.name,
      itemId: chosen.id,
      name: chosen.name,
      specs: chosen.specs,
      price: chosen.price,
      priceUpdatedAt: chosen.priceUpdatedAt || '18/11/2026',
      image: chosen.image,
      qty: existingIdx !== -1 && cart[existingIdx].itemId === chosen.id ? (Number(cart[existingIdx].qty) || 1) : 1,
      addedAt: '19/11/2026'
    };
    if (existingIdx !== -1) {
      cart[existingIdx] = cartEntry;
    } else {
      cart.push(cartEntry);
    }
  });

  saveUserCart(cart);
  renderCartPage();
  showToast(`Đã lưu ${addedCount} linh kiện bạn chọn vào Giỏ hàng của ${user.name}!`, 'success');
  navigateToPage('cart', true);
  return true;
}

function renderCartPage() {
  const user = getCurrentUser();
  if (!user) return;

  const ownerBadge = document.getElementById('cart-owner-badge');
  const listEl = document.getElementById('cart-items-list');
  const totalCountEl = document.getElementById('cart-total-items-count');
  const totalPriceEl = document.getElementById('cart-total-price');
  const lowestRetailerEl = document.getElementById('cart-lowest-retailer-price');

  if (ownerBadge) {
    ownerBadge.textContent = `Giỏ hàng của ${user.name}`;
  }

  const cart = getUserCart();
  let totalItems = 0;
  let totalPrice = 0;
  let totalLowestPrice = 0;

  cart.forEach(entry => {
    const qty = Number(entry.qty) || 1;
    const liveItem = (componentsDB[entry.slotKey] || []).find(i => i.id === entry.itemId) || entry;
    const unitPrice = Number(liveItem.price) || Number(entry.price) || 0;
    totalItems += qty;
    totalPrice += unitPrice * qty;

    const offers = getRetailerOffersForProduct(entry.slotKey, liveItem);
    const lowestUnit = offers.length > 0 ? offers[0].price : unitPrice;
    totalLowestPrice += lowestUnit * qty;
  });

  if (totalCountEl) totalCountEl.textContent = `${totalItems} sản phẩm`;
  if (totalPriceEl) totalPriceEl.textContent = formatVND(totalPrice);
  if (lowestRetailerEl) lowestRetailerEl.textContent = formatVND(totalLowestPrice);

  if (!listEl) return;

  if (cart.length === 0) {
    const { selectedCount } = calculateBuildMetrics(currentBuild);
    listEl.innerHTML = `
      <div class="p-8 rounded-3xl bg-gray-900/55 border border-gray-800 text-center space-y-4">
        <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto">
          <i data-lucide="shopping-cart" class="w-7 h-7"></i>
        </div>
        <div>
          <h3 class="text-lg font-extrabold text-white">Giỏ hàng của bạn đang trống</h3>
          <p class="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            ${
              selectedCount > 0
                ? `Bạn đang có <strong>${selectedCount} linh kiện đã chọn</strong> trên Bàn lắp ráp. Bấm nút bên dưới để lưu ngay lựa chọn đó vào Giỏ hàng!`
                : 'Hãy chọn linh kiện trên Bàn lắp ráp rồi bấm "Lưu lựa chọn vào Giỏ hàng" để lưu giữ tại đây.'
            }
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
          ${
            selectedCount > 0
              ? `<button type="button" data-cart-action="import-current" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all">
                   + Lưu ngay ${selectedCount} linh kiện đã chọn vào Giỏ hàng
                 </button>`
              : ''
          }
          <button type="button" data-nav-page="builder" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
            Đi tới Bàn lắp ráp PC
          </button>
        </div>
      </div>
    `;
    refreshIcons(listEl);
    return;
  }

  listEl.innerHTML = cart.map(entry => {
    const qty = Number(entry.qty) || 1;
    const liveItem = (componentsDB[entry.slotKey] || []).find(i => i.id === entry.itemId) || entry;
    const unitPrice = Number(liveItem.price) || Number(entry.price) || 0;
    const subTotal = unitPrice * qty;
    const pubDate = liveItem.priceUpdatedAt || entry.priceUpdatedAt || '18/11/2026';

    return `
      <div class="p-4 sm:p-5 rounded-2xl bg-gray-900/65 border border-gray-800 hover:border-emerald-500/35 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          <div class="w-16 h-16 rounded-xl bg-white p-1 border border-gray-700 shrink-0 shadow-sm overflow-hidden">
            <img src="${liveItem.image || entry.image}" alt="${liveItem.name}" onerror="window.handleImgError(this, '${entry.slotKey}')" class="w-full h-full object-contain" loading="lazy">
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase">${entry.slotName}</span>
              <span class="text-[11px] text-gray-400">Công bố giá: <strong class="text-gray-300">${pubDate}</strong></span>
            </div>
            <h4 class="text-sm sm:text-base font-extrabold text-white truncate">${liveItem.name}</h4>
            <p class="text-xs text-gray-400 truncate mt-0.5">${liveItem.specs || ''}</p>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-800 shrink-0">
          <!-- Bộ chỉnh số lượng -->
          <div class="inline-flex items-center rounded-xl bg-gray-950 border border-gray-800 p-1">
            <button type="button" data-cart-qty-minus="${entry.slotKey}" class="w-7 h-7 rounded-lg hover:bg-gray-800 text-gray-300 font-bold text-xs flex items-center justify-center transition-colors">-</button>
            <span class="px-3 text-xs font-extrabold text-white">${qty}</span>
            <button type="button" data-cart-qty-plus="${entry.slotKey}" class="w-7 h-7 rounded-lg hover:bg-gray-800 text-gray-300 font-bold text-xs flex items-center justify-center transition-colors">+</button>
          </div>

          <div class="text-right min-w-[115px]">
            <span class="text-sm sm:text-base font-extrabold text-emerald-400 block">${formatVND(subTotal)}</span>
            ${qty > 1 ? `<span class="text-[10px] text-gray-400 block">${formatVND(unitPrice)} / cái</span>` : '<span class="text-[10px] text-gray-500 block">Giá niêm yết</span>'}
          </div>

          <button type="button" data-cart-remove="${entry.slotKey}" class="p-2 rounded-xl bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition-colors" title="Xóa khỏi giỏ hàng">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons(listEl);
}

const btnAddBuildToCart = document.getElementById('btn-add-build-to-cart');
if (btnAddBuildToCart) {
  btnAddBuildToCart.addEventListener('click', () => saveCurrentSelectionToCart(false));
}
const btnBuilderBottomAddCart = document.getElementById('btn-builder-bottom-add-cart');
if (btnBuilderBottomAddCart) {
  btnBuilderBottomAddCart.addEventListener('click', () => saveCurrentSelectionToCart(false));
}
const btnSummaryAddToCart = document.getElementById('btn-summary-add-to-cart');
if (btnSummaryAddToCart) {
  btnSummaryAddToCart.addEventListener('click', () => saveCurrentSelectionToCart(false));
}
const btnCartImportCurrentBuild = document.getElementById('btn-cart-import-current-build');
if (btnCartImportCurrentBuild) {
  btnCartImportCurrentBuild.addEventListener('click', () => saveCurrentSelectionToCart(false));
}

const cartItemsListEl = document.getElementById('cart-items-list');
if (cartItemsListEl) {
  cartItemsListEl.addEventListener('click', (e) => {
    const importBtn = e.target.closest('button[data-cart-action="import-current"]');
    if (importBtn) {
      saveCurrentSelectionToCart(false);
      return;
    }

    const minusBtn = e.target.closest('button[data-cart-qty-minus]');
    if (minusBtn) {
      const slotKey = minusBtn.dataset.cartQtyMinus;
      const cart = getUserCart();
      const target = cart.find(c => c.slotKey === slotKey);
      if (target) {
        if ((target.qty || 1) > 1) {
          target.qty = (target.qty || 1) - 1;
          saveUserCart(cart);
        } else {
          saveUserCart(cart.filter(c => c.slotKey !== slotKey));
        }
        renderCartPage();
      }
      return;
    }

    const plusBtn = e.target.closest('button[data-cart-qty-plus]');
    if (plusBtn) {
      const slotKey = plusBtn.dataset.cartQtyPlus;
      const cart = getUserCart();
      const target = cart.find(c => c.slotKey === slotKey);
      if (target) {
        target.qty = Math.min(10, (target.qty || 1) + 1);
        saveUserCart(cart);
        renderCartPage();
      }
      return;
    }

    const removeBtn = e.target.closest('button[data-cart-remove]');
    if (removeBtn) {
      const slotKey = removeBtn.dataset.cartRemove;
      const cart = getUserCart().filter(c => c.slotKey !== slotKey);
      saveUserCart(cart);
      renderCartPage();
      showToast('Đã xóa linh kiện khỏi Giỏ hàng.', 'info');
    }
  });
}

const btnCartClearAll = document.getElementById('btn-cart-clear-all');
if (btnCartClearAll) {
  btnCartClearAll.addEventListener('click', () => {
    const cart = getUserCart();
    if (cart.length === 0) {
      showToast('Giỏ hàng hiện đang trống.', 'info');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ linh kiện trong Giỏ hàng?')) {
      saveUserCart([]);
      renderCartPage();
      showToast('Đã xóa trống Giỏ hàng của bạn.', 'info');
    }
  });
}

const btnCartLoadToBuilder = document.getElementById('btn-cart-load-to-builder');
if (btnCartLoadToBuilder) {
  btnCartLoadToBuilder.addEventListener('click', () => {
    const cart = getUserCart();
    if (cart.length === 0) {
      showToast('Giỏ hàng đang trống! Hãy thêm linh kiện trước khi nạp ra Bàn lắp ráp.', 'warning');
      return;
    }
    const loadedBuild = createEmptyBuild();
    let count = 0;
    cart.forEach(entry => {
      const found = (componentsDB[entry.slotKey] || []).find(i => i.id === entry.itemId);
      if (found) {
        loadedBuild[entry.slotKey] = found;
        count++;
      }
    });
    currentBuild = loadedBuild;
    saveBuild();
    renderBuilderSlots();
    updateBuilderDashboard();
    renderSummaryAndPriceComparisonPage();
    showToast(`Đã nạp ${count} linh kiện từ Giỏ hàng ra Bàn Lắp Ráp PC!`, 'success');
    navigateToPage('builder', true);
  });
}

const btnCartGotoCompare = document.getElementById('btn-cart-goto-compare');
if (btnCartGotoCompare) {
  btnCartGotoCompare.addEventListener('click', () => {
    const cart = getUserCart();
    if (cart.length > 0) {
      cart.forEach(entry => {
        const found = (componentsDB[entry.slotKey] || []).find(i => i.id === entry.itemId);
        if (found) currentBuild[entry.slotKey] = found;
      });
      saveBuild();
      renderBuilderSlots();
      updateBuilderDashboard();
      renderSummaryAndPriceComparisonPage();
    }
    navigateToPage('summary', true);
  });
}

const btnCartCopyOrder = document.getElementById('btn-cart-copy-order');
if (btnCartCopyOrder) {
  btnCartCopyOrder.addEventListener('click', () => {
    const user = getCurrentUser();
    const cart = getUserCart();
    if (cart.length === 0) {
      showToast('Giỏ hàng đang trống!', 'warning');
      return;
    }
    let total = 0;
    let lines = [`===== GIỎ HÀNG PC MON CỦA ${(user ? user.name : '').toUpperCase()} =====`];
    cart.forEach(entry => {
      const qty = Number(entry.qty) || 1;
      const sub = (Number(entry.price) || 0) * qty;
      total += sub;
      lines.push(`• [${entry.slotName}] ${entry.name} x${qty}: ${formatVND(sub)} (Công bố: ${entry.priceUpdatedAt})`);
    });
    lines.push(`------------------------------------------`);
    lines.push(`TỔNG CỘNG GIỎ HÀNG: ${formatVND(total)}`);
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast('Đã sao chép danh sách Giỏ hàng vào bộ nhớ tạm!', 'success');
    }).catch(() => {
      alert(text);
    });
  });
}

function updateAuthNavbarUI() {
  const user = getCurrentUser();
  const isAdmin = Boolean(user && user.role === 'admin');
  const navLabel = document.getElementById('nav-account-label');
  const btnNavAdmin = document.getElementById('btn-nav-admin');
  const btnMobileNavAdmin = document.getElementById('btn-mobile-nav-admin');

  if (navLabel) {
    if (user) {
      navLabel.textContent = isAdmin ? `🛡️ ${user.name}` : user.name;
    } else {
      navLabel.textContent = 'Đăng nhập';
    }
  }

  // Chỉ hiển thị nút Quản trị (Admin) trên Navbar khi đã đăng nhập đúng tài khoản Admin
  if (btnNavAdmin) {
    if (isAdmin) {
      btnNavAdmin.classList.remove('hidden');
    } else {
      btnNavAdmin.classList.add('hidden');
    }
  }
  if (btnMobileNavAdmin) {
    if (isAdmin) {
      btnMobileNavAdmin.classList.remove('hidden');
    } else {
      btnMobileNavAdmin.classList.add('hidden');
    }
  }

  updateCartNavbarBadge();
}

function setCurrentUser(userObj) {
  try {
    if (userObj) {
      localStorage.setItem('pcmon_current_user', JSON.stringify(userObj));
    } else {
      localStorage.removeItem('pcmon_current_user');
    }
  } catch (e) {
    console.warn('[PC MON] Không thể cập nhật phiên đăng nhập:', e);
  }
  updateAuthNavbarUI();
  renderSavedBuildsList();
}

function switchAuthTab(tabName) {
  const forms = {
    login: document.getElementById('form-auth-login'),
    register: document.getElementById('form-auth-register'),
    reset: document.getElementById('form-auth-reset')
  };
  Object.entries(forms).forEach(([key, formEl]) => {
    if (!formEl) return;
    if (key === tabName) {
      formEl.classList.remove('hidden');
    } else {
      formEl.classList.add('hidden');
    }
  });

  const topTabsBar = document.getElementById('auth-top-tabs-bar');
  const headingEl = document.getElementById('auth-card-heading');
  const subheadingEl = document.getElementById('auth-card-subheading');

  if (tabName === 'reset') {
    if (topTabsBar) topTabsBar.classList.add('hidden');
    if (headingEl) headingEl.textContent = 'Khôi Phục Mật Khẩu';
    if (subheadingEl) subheadingEl.textContent = 'Nhập địa chỉ Email của bạn để đặt lại mật khẩu mới.';
  } else {
    if (topTabsBar) topTabsBar.classList.remove('hidden');
    if (headingEl) headingEl.textContent = 'Tài Khoản PC MON';
    if (subheadingEl) subheadingEl.textContent = 'Đăng nhập để sử dụng Giỏ hàng và lưu trữ cấu hình PC của bạn.';
  }

  document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    if (btn.dataset.authTab === tabName) {
      btn.className = 'auth-tab-btn py-2.5 rounded-lg bg-blue-600 text-white transition-all';
    } else {
      btn.className = 'auth-tab-btn py-2.5 rounded-lg text-gray-400 hover:text-white transition-all';
    }
  });
}

// Lắng nghe cả 2 tab Đăng nhập / Đăng ký lẫn nút chữ nhỏ "Quên mật khẩu?" bên dưới
document.querySelectorAll('[data-auth-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    switchAuthTab(btn.dataset.authTab || 'login');
  });
});

function renderAccountPage() {
  const user = getCurrentUser();
  const guestView = document.getElementById('auth-guest-view');
  const profileView = document.getElementById('auth-profile-view');
  const cartNoticeBanner = document.getElementById('cart-login-notice-banner');

  updateAuthNavbarUI();

  if (!user) {
    if (guestView) guestView.classList.remove('hidden');
    if (profileView) profileView.classList.add('hidden');
    if (cartNoticeBanner) {
      if (pendingCartRedirect || pendingCartSaveAfterLogin) {
        cartNoticeBanner.classList.remove('hidden');
      } else {
        cartNoticeBanner.classList.add('hidden');
      }
    }
    return;
  }

  if (guestView) guestView.classList.add('hidden');
  if (profileView) profileView.classList.remove('hidden');

  const displayNameEl = document.getElementById('profile-display-name');
  const emailTextEl = document.getElementById('profile-email-text');
  const roleBadgeEl = document.getElementById('profile-role-badge');
  const avatarBoxEl = document.getElementById('profile-avatar-box');
  const gotoAdminBtn = document.getElementById('btn-goto-admin-from-profile');

  if (displayNameEl) displayNameEl.textContent = user.name;
  if (emailTextEl) emailTextEl.textContent = user.email;

  if (avatarBoxEl) {
    const initials = (user.name || 'PC')
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map(w => w[0].toUpperCase())
      .join('');
    avatarBoxEl.textContent = initials || 'PC';
  }

  if (roleBadgeEl) {
    if (user.role === 'admin') {
      roleBadgeEl.textContent = '🛡️ Quản trị viên (Admin)';
      roleBadgeEl.className = 'px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold';
    } else {
      roleBadgeEl.textContent = 'Thành viên PC MON';
      roleBadgeEl.className = 'px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold';
    }
  }

  if (gotoAdminBtn) {
    if (user.role === 'admin') {
      gotoAdminBtn.classList.remove('hidden');
    } else {
      gotoAdminBtn.classList.add('hidden');
    }
  }

  renderSavedBuildsList();
  refreshIcons();
}

function handlePostLoginSuccess(loggedInUser) {
  const { selectedCount } = calculateBuildMetrics(currentBuild);
  const shouldSavePreviousSelection = pendingCartSaveAfterLogin || (pendingCartRedirect && selectedCount > 0);
  const shouldGoToCart = pendingCartRedirect || pendingCartSaveAfterLogin;

  pendingCartSaveAfterLogin = false;
  pendingCartRedirect = false;

  if (shouldSavePreviousSelection && selectedCount > 0) {
    saveCurrentSelectionToCart(true);
    return;
  }

  if (shouldGoToCart) {
    showToast(`Đăng nhập thành công! Chào mừng ${loggedInUser.name} đến với Giỏ hàng cá nhân.`, 'success');
    navigateToPage('cart', true);
    return;
  }

  if (loggedInUser.role === 'admin') {
    showToast(`Chào mừng Quản trị viên ${loggedInUser.name}! Đã hiển thị Khu vực Quản trị Admin.`, 'success');
    navigateToPage('admin', true);
  } else {
    showToast(`Chào mừng ${loggedInUser.name} đã đăng nhập thành công!`, 'success');
  }
}

const formAuthLogin = document.getElementById('form-auth-login');
if (formAuthLogin) {
  formAuthLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const email = (emailEl ? emailEl.value : '').trim().toLowerCase();
    const password = passEl ? passEl.value : '';

    const found = getUsersDB().find(u => u.email.toLowerCase() === email && u.password === password);
    if (!found) {
      showToast('Email hoặc mật khẩu không chính xác! Nếu chưa có tài khoản, hãy chuyển sang tab Đăng ký.', 'error');
      return;
    }

    const userSession = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role
    };
    setCurrentUser(userSession);
    renderAccountPage();
    handlePostLoginSuccess(userSession);
  });
}

const formAuthRegister = document.getElementById('form-auth-register');
if (formAuthRegister) {
  formAuthRegister.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('reg-name');
    const emailEl = document.getElementById('reg-email');
    const passEl = document.getElementById('reg-password');

    const name = (nameEl ? nameEl.value : '').trim();
    const email = (emailEl ? emailEl.value : '').trim().toLowerCase();
    const password = passEl ? passEl.value : '';

    if (!name || !email || password.length < 6) {
      showToast('Vui lòng điền đầy đủ Họ tên, Email và mật khẩu tối thiểu 6 ký tự!', 'warning');
      return;
    }

    const users = getUsersDB();
    if (users.some(u => u.email.toLowerCase() === email)) {
      showToast('Email này đã được đăng ký! Vui lòng chuyển sang Đăng nhập hoặc bấm Quên mật khẩu.', 'error');
      return;
    }

    const newUser = {
      id: 'user-' + Date.now(),
      name,
      email,
      password,
      role: 'user'
    };
    users.push(newUser);
    saveUsersDB(users);

    const userSession = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };
    setCurrentUser(userSession);
    renderAccountPage();
    handlePostLoginSuccess(userSession);
  });
}

const formAuthReset = document.getElementById('form-auth-reset');
if (formAuthReset) {
  formAuthReset.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailEl = document.getElementById('reset-email');
    const passEl = document.getElementById('reset-new-password');
    const email = (emailEl ? emailEl.value : '').trim().toLowerCase();
    const newPassword = passEl ? passEl.value : '';

    const users = getUsersDB();
    const target = users.find(u => u.email.toLowerCase() === email);
    if (!target) {
      showToast('Không tìm thấy tài khoản nào ứng với địa chỉ Email này!', 'error');
      return;
    }

    target.password = newPassword;
    saveUsersDB(users);
    switchAuthTab('login');
    const loginEmailEl = document.getElementById('login-email');
    const loginPassEl = document.getElementById('login-password');
    if (loginEmailEl) loginEmailEl.value = target.email;
    if (loginPassEl) loginPassEl.value = newPassword;
    showToast(`Đã đặt lại mật khẩu mới cho tài khoản ${target.email}! Bấm Đăng nhập để tiếp tục.`, 'success');
  });
}

const btnAuthLogout = document.getElementById('btn-auth-logout');
if (btnAuthLogout) {
  btnAuthLogout.addEventListener('click', () => {
    setCurrentUser(null);
    renderAccountPage();
    showToast('Đã đăng xuất khỏi tài khoản PC MON.', 'info');
  });
}

// --- NẠP CẤU HÌNH ĐƯỢC CHIA SẺ (IMPORT SHARE CODE) ---
const btnImportSharedCode = document.getElementById('btn-import-shared-code');
if (btnImportSharedCode) {
  btnImportSharedCode.addEventListener('click', () => {
    const inputEl = document.getElementById('shared-code-input');
    const rawCode = (inputEl ? inputEl.value : '').trim();
    if (!rawCode || !rawCode.startsWith('PCMON-')) {
      showToast('Mã chia sẻ không hợp lệ! Mã chuẩn phải bắt đầu bằng "PCMON-...".', 'warning');
      return;
    }

    try {
      const body = rawCode.slice(6); // Bỏ tiền tố PCMON-
      const firstDash = body.indexOf('-');
      const secondDash = body.indexOf('-', firstDash + 1);
      if (firstDash === -1 || secondDash === -1) {
        throw new Error('Malformed share code');
      }

      const purposeDecoded = decodeURIComponent(body.slice(0, firstDash));
      const budgetParsed = Number(body.slice(firstDash + 1, secondDash)) || 20000000;
      const slotsSegment = body.slice(secondDash + 1);

      const importedBuild = createEmptyBuild();
      let matchedCount = 0;

      slotsSegment.split('|').forEach(pair => {
        const [slotKey, itemId] = pair.split(':');
        if (slotKey && itemId && componentsDB[slotKey]) {
          const foundItem = componentsDB[slotKey].find(i => i.id === itemId);
          if (foundItem) {
            importedBuild[slotKey] = foundItem;
            matchedCount++;
          }
        }
      });

      if (matchedCount === 0) {
        showToast('Không tìm thấy linh kiện nào khớp trong mã chia sẻ này!', 'error');
        return;
      }

      if (purposeDecoded) {
        localStorage.setItem('pcmon_purpose', purposeDecoded);
        const pObj = usageCategories.find(c => c.title === purposeDecoded);
        if (pObj) updatePurposeUI(pObj.title, pObj.slug);
      }

      if (budgetRange) budgetRange.value = budgetParsed;
      updateBudget(budgetParsed, true);

      currentBuild = importedBuild;
      saveBuild();
      renderBuilderSlots();
      updateBuilderDashboard();
      renderSummaryAndPriceComparisonPage();

      showToast(`Đã nạp thành công ${matchedCount} linh kiện từ Mã Chia Sẻ vào bàn lắp ráp!`, 'success');
      navigateToPage('builder', true);
    } catch (err) {
      showToast('Không thể giải mã chuỗi cấu hình chia sẻ. Vui lòng kiểm tra lại!', 'error');
    }
  });
}

// --- BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN (PROTECTED ADMIN DASHBOARD) ---
function getTotalCatalogCount() {
  return slotDefinitions.reduce((acc, { key }) => acc + ((componentsDB[key] || []).length), 0);
}

function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-table-body');
  if (!tbody) return;

  const searchInput = document.getElementById('admin-search-input');
  const categoryFilter = document.getElementById('admin-category-filter');
  const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const catFilter = categoryFilter ? categoryFilter.value : 'all';

  const rows = [];
  slotDefinitions.forEach(slot => {
    if (catFilter !== 'all' && catFilter !== slot.key) return;
    const list = componentsDB[slot.key] || [];
    list.forEach(item => {
      if (keyword) {
        const hay = `${item.id} ${item.name} ${item.specs || ''} ${slot.name}`.toLowerCase();
        if (!hay.includes(keyword)) return;
      }
      rows.push({ slot, item });
    });
  });

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 px-4 text-center text-xs text-gray-400">
          Không tìm thấy linh kiện nào khớp với bộ lọc hiện tại.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(({ slot, item }) => `
    <tr class="hover:bg-gray-900/80 transition-colors">
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="window.handleImgError(this, '${slot.key}')" class="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-gray-700 shrink-0">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px] font-mono">${item.id}</span>
              <p class="font-bold text-white truncate max-w-[260px] sm:max-w-[340px]">${item.name}</p>
            </div>
            <p class="text-[11px] text-gray-400 truncate max-w-[280px] sm:max-w-[380px] mt-0.5">${item.specs || ''}</p>
          </div>
        </div>
      </td>
      <td class="py-3 px-3">
        <span class="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">
          ${slot.name}
        </span>
      </td>
      <td class="py-3 px-3 text-right">
        <span class="text-sm font-extrabold text-blue-400">${formatVND(item.price)}</span>
      </td>
      <td class="py-3 px-3">
        <span class="text-[11px] text-emerald-400 font-semibold block">Công bố: ${item.priceUpdatedAt || '18/11/2026'}</span>
        <span class="text-[10px] text-gray-400">${item.priceNote || 'Giá niêm yết công khai'}</span>
      </td>
      <td class="py-3 px-4 text-center">
        <div class="inline-flex items-center gap-1.5">
          <button type="button" data-admin-edit="${slot.key}:${item.id}" class="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white text-[11px] font-bold transition-colors">
            Sửa giá / TT
          </button>
          <button type="button" data-admin-delete="${slot.key}:${item.id}" class="p-1.5 rounded-lg bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition-colors" title="Xóa linh kiện">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  refreshIcons(tbody);
}

function renderAdminCategoriesPanel() {
  const panel = document.getElementById('admin-panel-categories');
  if (!panel) return;

  panel.innerHTML = slotDefinitions.map(slot => {
    const items = componentsDB[slot.key] || [];
    const prices = items.map(i => i.price);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;

    return `
      <div class="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-start justify-between gap-4">
        <div class="flex items-start gap-3.5">
          <div class="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <i data-lucide="${slot.icon}" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-sm font-extrabold text-white">${slot.name}</h4>
            <p class="text-xs text-gray-400 mt-0.5">Mã danh mục: <code class="text-blue-300">${slot.key}</code> • Số lượng: <strong>${items.length} mã lưu hành</strong></p>
            <p class="text-[11px] text-emerald-400 mt-1">Dải giá niêm yết: ${formatVND(minP)} &rarr; ${formatVND(maxP)}</p>
          </div>
        </div>
        <button type="button" data-admin-filter-cat="${slot.key}" class="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-blue-600 text-gray-200 hover:text-white text-xs font-bold shrink-0 transition-colors">
          Xem sản phẩm
        </button>
      </div>
    `;
  }).join('');

  refreshIcons(panel);
}

function renderAdminRetailersPanel() {
  const panel = document.getElementById('admin-panel-retailers');
  if (!panel) return;

  panel.innerHTML = RETAILERS.map(r => `
    <div class="p-5 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl ${r.badgeClass || 'bg-blue-600 text-white'} font-black text-xs flex items-center justify-center shrink-0 shadow-md">
          ${r.name.slice(0, 3).toUpperCase()}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-base font-extrabold text-white">${r.name}</h4>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">Đang đồng bộ báo giá</span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">${r.shippingPolicy || 'Bảo hành chính hãng'}</p>
          <p class="text-[11px] text-blue-400 mt-1">Trang Build PC đối tác: <a href="${r.buildPcUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-300">${r.buildPcUrl}</a></p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="retailer-build.html?retailer=${r.id}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors">
          Kiểm tra Cổng Build PC
        </a>
      </div>
    </div>
  `).join('');
}

function renderAdminDashboardPage() {
  const user = getCurrentUser();
  const deniedEl = document.getElementById('admin-access-denied');
  const contentEl = document.getElementById('admin-dashboard-content');

  const isAdmin = Boolean(user && user.role === 'admin');

  // Gửi kiểm tra RBAC lên API Backend (/api/admin/verify)
  fetch('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: user ? user.role : 'guest',
      email: user ? user.email : ''
    })
  }).catch(() => {});

  if (!isAdmin) {
    if (deniedEl) deniedEl.classList.remove('hidden');
    if (contentEl) contentEl.classList.add('hidden');
    refreshIcons();
    return;
  }

  if (deniedEl) deniedEl.classList.add('hidden');
  if (contentEl) contentEl.classList.remove('hidden');

  const statTotalEl = document.getElementById('admin-stat-total-products');
  const statRetailersEl = document.getElementById('admin-stat-retailers');
  const statSavedEl = document.getElementById('admin-stat-saved-builds');

  if (statTotalEl) statTotalEl.textContent = `${getTotalCatalogCount()} sản phẩm`;
  if (statRetailersEl) statRetailersEl.textContent = `${RETAILERS.length} đại lý lớn`;
  if (statSavedEl) statSavedEl.textContent = `${getAllSavedBuildsRaw().length} bản build`;

  renderAdminProductsTable();
  renderAdminCategoriesPanel();
  renderAdminRetailersPanel();
  refreshIcons();
}

function switchAdminTab(tabName) {
  const panels = {
    products: document.getElementById('admin-panel-products'),
    categories: document.getElementById('admin-panel-categories'),
    retailers: document.getElementById('admin-panel-retailers')
  };
  Object.entries(panels).forEach(([k, el]) => {
    if (!el) return;
    if (k === tabName) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    if (btn.dataset.adminTab === tabName) {
      btn.className = 'admin-tab-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2 transition-all';
    } else {
      btn.className = 'admin-tab-btn px-4 py-2 rounded-xl text-gray-300 hover:bg-gray-800 text-xs font-semibold flex items-center gap-2 transition-all';
    }
  });
}

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchAdminTab(btn.dataset.adminTab || 'products');
  });
});

const adminSearchInput = document.getElementById('admin-search-input');
if (adminSearchInput) {
  adminSearchInput.addEventListener('input', renderAdminProductsTable);
}
const adminCategoryFilter = document.getElementById('admin-category-filter');
if (adminCategoryFilter) {
  adminCategoryFilter.addEventListener('change', renderAdminProductsTable);
}

const adminPanelCategoriesEl = document.getElementById('admin-panel-categories');
if (adminPanelCategoriesEl) {
  adminPanelCategoriesEl.addEventListener('click', (e) => {
    const filterBtn = e.target.closest('button[data-admin-filter-cat]');
    if (!filterBtn) return;
    if (adminCategoryFilter) adminCategoryFilter.value = filterBtn.dataset.adminFilterCat;
    switchAdminTab('products');
    renderAdminProductsTable();
  });
}

// --- MODAL THÊM / SỬA LINH KIỆN TRONG ADMIN ---
const adminProductModal = document.getElementById('admin-product-modal');
const formAdminProduct = document.getElementById('form-admin-product');

function openAdminProductModal(categoryKey = 'cpu', existingItem = null) {
  if (!adminProductModal) return;
  const titleEl = document.getElementById('admin-modal-title');
  const idEl = document.getElementById('admin-prod-id');
  const catEl = document.getElementById('admin-prod-category');
  const priceEl = document.getElementById('admin-prod-price');
  const nameEl = document.getElementById('admin-prod-name');
  const dateEl = document.getElementById('admin-prod-date');
  const noteEl = document.getElementById('admin-prod-note');
  const specsEl = document.getElementById('admin-prod-specs');
  const socketEl = document.getElementById('admin-prod-socket');
  const ramTypeEl = document.getElementById('admin-prod-ramtype');
  const wattEl = document.getElementById('admin-prod-watt');
  const formEl = document.getElementById('admin-prod-form');
  const imageEl = document.getElementById('admin-prod-image');

  if (existingItem) {
    if (titleEl) titleEl.textContent = `Chỉnh Sửa Linh Kiện: ${existingItem.id.toUpperCase()}`;
    if (idEl) idEl.value = existingItem.id;
    if (catEl) {
      catEl.value = categoryKey;
      catEl.disabled = true;
    }
    if (priceEl) priceEl.value = existingItem.price;
    if (nameEl) nameEl.value = existingItem.name;
    if (dateEl) dateEl.value = existingItem.priceUpdatedAt || '18/11/2026';
    if (noteEl) noteEl.value = existingItem.priceNote || 'Giá niêm yết công khai';
    if (specsEl) specsEl.value = existingItem.specs || '';
    if (socketEl) socketEl.value = existingItem.socket || '';
    if (ramTypeEl) ramTypeEl.value = existingItem.ramType || existingItem.type || '';
    if (wattEl) wattEl.value = existingItem.wattage || existingItem.tdp || '';
    if (formEl) formEl.value = existingItem.form || '';
    if (imageEl) imageEl.value = existingItem.image || CATEGORY_REAL_PHOTO_FALLBACKS[categoryKey];
  } else {
    if (titleEl) titleEl.textContent = 'Thêm Linh Kiện Mới Vào Kho Dữ Liệu';
    if (idEl) idEl.value = '';
    if (catEl) {
      catEl.value = categoryKey;
      catEl.disabled = false;
    }
    if (priceEl) priceEl.value = '';
    if (nameEl) nameEl.value = '';
    if (dateEl) dateEl.value = '18/11/2026';
    if (noteEl) noteEl.value = 'Giá niêm yết công khai';
    if (specsEl) specsEl.value = '';
    if (socketEl) socketEl.value = '';
    if (ramTypeEl) ramTypeEl.value = '';
    if (wattEl) wattEl.value = '';
    if (formEl) formEl.value = '';
    if (imageEl) imageEl.value = CATEGORY_REAL_PHOTO_FALLBACKS[categoryKey] || CATEGORY_REAL_PHOTO_FALLBACKS.cpu;
  }

  adminProductModal.classList.remove('hidden');
  adminProductModal.classList.add('flex');
}

function closeAdminProductModal() {
  if (!adminProductModal) return;
  adminProductModal.classList.add('hidden');
  adminProductModal.classList.remove('flex');
}

const btnAdminAddProduct = document.getElementById('btn-admin-add-product');
if (btnAdminAddProduct) {
  btnAdminAddProduct.addEventListener('click', () => {
    const defaultCat = (adminCategoryFilter && adminCategoryFilter.value !== 'all') ? adminCategoryFilter.value : 'cpu';
    openAdminProductModal(defaultCat, null);
  });
}

const adminModalClose = document.getElementById('admin-modal-close');
if (adminModalClose) adminModalClose.addEventListener('click', closeAdminProductModal);
const adminModalCancel = document.getElementById('admin-modal-cancel');
if (adminModalCancel) adminModalCancel.addEventListener('click', closeAdminProductModal);

const adminProductsTableBody = document.getElementById('admin-products-table-body');
if (adminProductsTableBody) {
  adminProductsTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('button[data-admin-edit]');
    if (editBtn) {
      const [catKey, itemId] = editBtn.dataset.adminEdit.split(':');
      const found = (componentsDB[catKey] || []).find(i => i.id === itemId);
      if (found) {
        openAdminProductModal(catKey, found);
      }
      return;
    }

    const delBtn = e.target.closest('button[data-admin-delete]');
    if (delBtn) {
      const [catKey, itemId] = delBtn.dataset.adminDelete.split(':');
      const list = componentsDB[catKey] || [];
      const target = list.find(i => i.id === itemId);
      if (target && confirm(`Bạn có chắc chắn muốn xóa linh kiện "${target.name}" khỏi kho dữ liệu?`)) {
        componentsDB[catKey] = list.filter(i => i.id !== itemId);
        if (currentBuild[catKey] && currentBuild[catKey].id === itemId) {
          currentBuild[catKey] = null;
          saveBuild();
        }
        saveCustomCatalogToStorage();
        renderAdminDashboardPage();
        renderBuilderSlots(true);
        updateBuilderDashboard(true);
        showToast(`Đã xóa linh kiện "${target.name}" khỏi kho hệ thống!`, 'info');
      }
    }
  });
}

if (formAdminProduct) {
  formAdminProduct.addEventListener('submit', (e) => {
    e.preventDefault();
    const idVal = (document.getElementById('admin-prod-id')?.value || '').trim();
    const catKey = document.getElementById('admin-prod-category')?.value || 'cpu';
    const priceVal = Number(document.getElementById('admin-prod-price')?.value) || 0;
    const nameVal = (document.getElementById('admin-prod-name')?.value || '').trim();
    const dateVal = (document.getElementById('admin-prod-date')?.value || '18/11/2026').trim();
    const noteVal = (document.getElementById('admin-prod-note')?.value || 'Giá niêm yết công khai').trim();
    const specsVal = (document.getElementById('admin-prod-specs')?.value || '').trim();
    const socketVal = (document.getElementById('admin-prod-socket')?.value || '').trim();
    const ramTypeVal = (document.getElementById('admin-prod-ramtype')?.value || '').trim();
    const wattVal = Number(document.getElementById('admin-prod-watt')?.value) || 65;
    const formVal = (document.getElementById('admin-prod-form')?.value || '').trim();
    const imageVal = (document.getElementById('admin-prod-image')?.value || CATEGORY_REAL_PHOTO_FALLBACKS[catKey]).trim();

    if (!componentsDB[catKey]) componentsDB[catKey] = [];
    const list = componentsDB[catKey];

    if (idVal) {
      const existing = list.find(i => i.id === idVal);
      if (existing) {
        existing.name = nameVal;
        existing.price = priceVal;
        existing.priceUpdatedAt = dateVal;
        existing.priceNote = noteVal;
        existing.specs = specsVal;
        existing.image = imageVal;
        if (socketVal) existing.socket = socketVal;
        if (ramTypeVal) {
          if (catKey === 'motherboard') existing.ramType = ramTypeVal;
          if (catKey === 'ram') existing.type = ramTypeVal;
        }
        if (wattVal) {
          if (catKey === 'psu') existing.wattage = wattVal;
          else existing.tdp = wattVal;
        }
        if (formVal) existing.form = formVal;

        if (currentBuild[catKey] && currentBuild[catKey].id === idVal) {
          currentBuild[catKey] = existing;
          saveBuild();
        }
        showToast(`Đã cập nhật giá & thông số cho "${nameVal}"!`, 'success');
      }
    } else {
      const prefixMap = {
        cpu: 'cpu',
        motherboard: 'mb',
        ram: 'ram',
        gpu: 'gpu',
        storage: 'ssd',
        psu: 'psu',
        case: 'case',
        cooler: 'cool'
      };
      const newId = `${prefixMap[catKey] || catKey}-${Date.now().toString().slice(-4)}`;
      const newItem = {
        id: newId,
        name: nameVal,
        price: priceVal,
        priceUpdatedAt: dateVal,
        priceNote: noteVal,
        tier: priceVal >= 12000000 ? 4 : priceVal >= 6000000 ? 3 : priceVal >= 2500000 ? 2 : 1,
        specs: specsVal,
        image: imageVal
      };
      if (socketVal) newItem.socket = socketVal;
      if (catKey === 'motherboard') {
        newItem.socket = socketVal || 'LGA1700';
        newItem.ramType = ramTypeVal || 'DDR4';
        newItem.form = formVal || 'Micro-ATX';
        newItem.tdp = 35;
      } else if (catKey === 'cpu') {
        newItem.socket = socketVal || 'LGA1700';
        newItem.tdp = wattVal || 65;
        newItem.hasIgpu = !nameVal.toUpperCase().includes('F');
      } else if (catKey === 'ram') {
        newItem.type = ramTypeVal || 'DDR4';
        newItem.capacityGB = nameVal.includes('64GB') ? 64 : nameVal.includes('32GB') ? 32 : 16;
        newItem.tdp = 10;
      } else if (catKey === 'gpu') {
        newItem.tdp = wattVal || 160;
        newItem.vramGB = nameVal.includes('16GB') ? 16 : nameVal.includes('12GB') ? 12 : 8;
        newItem.isNvidia = nameVal.toUpperCase().includes('RTX') || nameVal.toUpperCase().includes('GTX');
      } else if (catKey === 'psu') {
        newItem.wattage = wattVal || 650;
        newItem.tdp = 0;
      } else if (catKey === 'case') {
        newItem.form = formVal || 'ATX';
        newItem.supportedForms = formVal === 'Micro-ATX' ? ['Micro-ATX', 'Mini-ITX'] : ['ATX', 'Micro-ATX', 'Mini-ITX'];
        newItem.tdp = 10;
      } else if (catKey === 'cooler') {
        newItem.maxTdp = wattVal || 200;
        newItem.tdp = 10;
      } else {
        newItem.tdp = 10;
      }

      list.unshift(newItem);
      showToast(`Đã thêm mới linh kiện "${nameVal}" vào danh mục ${catKey.toUpperCase()}!`, 'success');
    }

    saveCustomCatalogToStorage();
    closeAdminProductModal();
    renderAdminDashboardPage();
    renderBuilderSlots(true);
    updateBuilderDashboard(true);
  });
}

const btnAdminSyncTodayDate = document.getElementById('btn-admin-sync-today-date');
if (btnAdminSyncTodayDate) {
  btnAdminSyncTodayDate.addEventListener('click', () => {
    const todayStr = '18/11/2026';
    slotDefinitions.forEach(({ key }) => {
      (componentsDB[key] || []).forEach(item => {
        item.priceUpdatedAt = todayStr;
      });
    });
    saveCustomCatalogToStorage();
    renderAdminDashboardPage();
    renderBuilderSlots(true);
    updateBuilderDashboard(true);
    showToast(`Đã đồng bộ Ngày công bố giá của toàn bộ ${getTotalCatalogCount()} linh kiện sang hôm nay (${todayStr})!`, 'success');
  });
}

const btnAdminResetCatalog = document.getElementById('btn-admin-reset-catalog');
if (btnAdminResetCatalog) {
  btnAdminResetCatalog.addEventListener('click', () => {
    if (!confirm('Khôi phục toàn bộ danh mục sản phẩm và giá niêm yết về trạng thái gốc ban đầu?')) return;
    localStorage.removeItem('pcmon_custom_catalog');
    slotDefinitions.forEach(({ key }) => {
      componentsDB[key] = JSON.parse(JSON.stringify(DEFAULT_COMPONENTS_DB_SNAPSHOT[key] || []));
    });
    renderAdminDashboardPage();
    renderBuilderSlots(true);
    updateBuilderDashboard(true);
    showToast('Đã khôi phục kho dữ liệu linh kiện về mặc định ban đầu!', 'info');
  });
}

// --- 18. ĐỒNG BỘ TRẠNG THÁI KHỞI ĐỘNG BAN ĐẦU ---
loadCustomCatalogFromStorage();
getUsersDB();
updateAuthNavbarUI();

const initialTheme = localStorage.getItem('pcmon_theme') || 'dark';
applyTheme(initialTheme, false);

const savedPurpose = localStorage.getItem('pcmon_purpose') || "Gaming";
const foundPurpose = usageCategories.find(c => c.title === savedPurpose) || usageCategories[0];
if (foundPurpose) updatePurposeUI(foundPurpose.title, foundPurpose.slug);

const savedBudget = Number(localStorage.getItem('pcmon_budget')) || 20000000;
if (budgetRange) budgetRange.value = savedBudget;
updateBudget(savedBudget, true);

renderBuilderSlots(true);
updateBuilderDashboard(true);
navigateToPage(getPageFromLocation(), false);
refreshIcons();

// --- 19. PHASE 9: EXPORT PUBLIC CORE API PHỤC VỤ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE) ---
window.PCMON_CORE = {
  VALID_PAGES,
  componentsDB,
  slotDefinitions,
  usageCategories,
  EXPERT_PURPOSE_PROFILES,
  RETAILERS,
  DEFAULT_USERS_SEED,
  formatVND,
  escapeHTML,
  createEmptyBuild,
  getCurrentBuild: () => currentBuild,
  setCurrentBuild: (b) => { currentBuild = b; saveBuild(); },
  calculateBuildMetrics,
  evaluateBuildCompatibility,
  checkCandidateCompatibility,
  solveExpertBuild,
  getRecommendedItemForSlot,
  getMaxAffordablePriceForSlot,
  getRetailerOffersForProduct,
  getUsersDB,
  getCurrentUser,
  setCurrentUser,
  getUserCart,
  saveUserCart,
  saveCurrentSelectionToCart,
  getSavedBuilds,
  setSavedBuilds,
  generateShareCodeForBuild,
  navigateToPage,
  getCurrentPage: () => currentPage
};
