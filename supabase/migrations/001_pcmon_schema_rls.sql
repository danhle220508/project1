-- ==========================================================================
-- PC MON - Phase 8 & 9 PostgreSQL Database Migration & Row-Level Security (RLS)
-- Áp dụng cho Supabase SQL Editor hoặc PostgreSQL Production
-- ==========================================================================

-- 1. BẢNG HỒ SƠ NGƯỜI DÙNG & PHÂN QUYỀN (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BẢNG KHO LINH KIỆN PHẦN CỨNG (PRODUCTS)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler')),
  name TEXT NOT NULL,
  price BIGINT NOT NULL CHECK (price >= 0),
  price_updated_at TEXT NOT NULL DEFAULT '18/11/2026',
  price_note TEXT DEFAULT 'Giá niêm yết công khai',
  tier SMALLINT NOT NULL DEFAULT 2,
  specs TEXT NOT NULL,
  socket TEXT,
  ram_type TEXT,
  form_factor TEXT,
  tdp INTEGER DEFAULT 0,
  wattage INTEGER DEFAULT 0,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BẢNG CẤU HÌNH PC ĐÃ LƯU CỦA NGƯỜI DÙNG (SAVED_BUILDS)
CREATE TABLE IF NOT EXISTS public.saved_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  budget BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  slot_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_code TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BẢNG GIỎ HÀNG CÁ NHÂN (CART_ITEMS - CHỈ DÀNH CHO NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 20),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slot_key)
);

-- ==========================================================================
-- BẬT BẢO MẬT ROW-LEVEL SECURITY (RLS)
-- ==========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Chính sách bảng PRODUCTS: Mọi người được xem, CHỈ Admin mới được Thêm / Sửa / Xóa
CREATE POLICY "Public can read products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Only admins can update products"
  ON public.products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Only admins can delete products"
  ON public.products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Chính sách bảng SAVED_BUILDS: Người dùng chỉ nhìn thấy và chỉnh sửa bản build của chính mình
CREATE POLICY "Users can manage own saved builds"
  ON public.saved_builds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Chính sách bảng CART_ITEMS: Chỉ khi đăng nhập mới sử dụng được Giỏ hàng của chính mình
CREATE POLICY "Authenticated users can manage own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
