# PC MON — Nền Tảng Xây Dựng Cấu Hình PC Thông Minh & So Sánh Giá Đại Lý (MVP)

**PC MON** là nền tảng tư vấn lắp ráp máy tính cá nhân theo từng trang tác vụ độc lập, tích hợp bộ kiểm tra tương thích phần cứng tự động 100%, thuật toán chuyên gia tối ưu ngân sách (cam kết không bao giờ vượt ngân sách mục tiêu), so sánh giá tại 5 hệ thống bán lẻ lớn, cổng Build PC gắn sẵn linh kiện, giỏ hàng cá nhân yêu cầu đăng nhập và bảng điều khiển quản trị viên bảo mật RBAC.

---

## 1. Hướng Dẫn Chạy Dự Án & Kiểm Thử Tự Động (Local & Production)

### Yêu cầu hệ thống
- **Node.js** `>= 16.0.0` (Không yêu cầu cài đặt thêm thư viện ngoài để tránh rủi ro phụ thuộc dư thừa).

### Khởi chạy máy chủ Web
```bash
npm start
```
- Truy cập trên máy tính hiện tại: `http://localhost:3000/`
- Truy cập từ thiết bị khác cùng mạng Wi-Fi/LAN: `http://<IP-LAN-của-máy>:3000/`

### Chạy bộ kiểm thử tự động (Phase 9 Automated QA Test Suite)
```bash
npm test
```
Bộ kiểm thử `tests/pcmon.test.js` tự động xác minh 18 kịch bản cốt lõi:
1. Hệ thống điều hướng 9 trang độc lập (`home`, `usage`, `budget`, `builder`, `summary`, `featured`, `account`, `cart`, `admin`).
2. Kho dữ liệu 58 linh kiện thực tế đang lưu hành, 100% ảnh sản phẩm thực tế, giá niêm yết VNĐ và ngày công bố giá (`DD/MM/YYYY`).
3. Bộ quy tắc kiểm tra tương thích phần cứng (Socket CPU/Mainboard, chuẩn RAM DDR4/DDR5, Form Factor ATX/Micro-ATX, yêu cầu iGPU trên CPU dòng F, công suất nguồn PSU, TDP tản nhiệt).
4. Thuật toán Chuyên gia tư vấn PC (`solveExpertBuild`) trên toàn bộ 9 nhu cầu sử dụng và nhiều mốc ngân sách — đảm bảo `totalPrice <= targetBudget` và `0` lỗi xung đột.
5. Bảng so sánh giá 5 đại lý lớn (`GearVN`, `Phong Vũ`, `HACOM`, `MemoryZone`, `CellphoneS`) và cổng Build PC gắn sẵn linh kiện (`retailer-build.html`).
6. Bảo mật Đăng nhập / Đăng ký, Giỏ hàng yêu cầu đăng nhập và Bảo mật phân quyền Admin (`RBAC` trên giao diện lẫn API `/api/admin/verify`).

---

## 2. Tài Khoản Kiểm Thử (Demo Credentials)

| Phân quyền | Email đăng nhập | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **🛡️ Quản trị viên (Admin)** | `admin@pcmon.vn` | `admin123` | Mở khóa nút **🛡️ Quản trị** đang ẩn trên Navbar, thêm/sửa/xóa sản phẩm, cập nhật giá niêm yết & ngày công bố giá |
| **👤 Thành viên (Member)** | `sinhvien@pcmon.vn` | `123456` | Sử dụng **Giỏ hàng cá nhân** để lưu lựa chọn trước đó, lưu cấu hình theo User, tạo và nạp Mã chia sẻ (`PCMON-...`) |

---

## 3. Hướng Dẫn Cấu Hình Biến Môi Trường, Supabase & Triển Khai Vercel

### A. Cấu hình Biến môi trường (`.env`)
1. Sao chép file `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
2. Điền thông số `PORT`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Lưu ý: **`SUPABASE_SERVICE_ROLE_KEY`** chỉ đặt trên biến môi trường phía Server, tuyệt đối không nhúng vào trình duyệt.

### B. Khởi tạo Cơ sở dữ liệu Supabase & Row-Level Security (RLS)
1. Mở **Supabase Dashboard** &rarr; **SQL Editor**.
2. Chạy toàn bộ nội dung file `supabase/migrations/001_pcmon_schema_rls.sql`.
3. Bản migration tự động tạo các bảng `profiles`, `products`, `saved_builds`, `cart_items` và bật chính sách **Row-Level Security (RLS)** đảm bảo:
   - Mọi người dùng chỉ được đọc/ghi cấu hình và giỏ hàng của chính mình (`auth.uid() = user_id`).
   - Chỉ tài khoản có `role = 'admin'` mới có quyền Thêm / Sửa / Xóa sản phẩm và giá niêm yết.

### C. Triển khai lên Vercel (1-Click Production Deployment)
Dự án đã được cấu hình sẵn file `vercel.json` hỗ trợ đầy đủ Clean URLs, SPA Rewrites và HTTP Security Headers:
```bash
npx vercel --prod
```

---

## 4. Bảng Checklist Tổng Kết Dự Án (Phase 9 Final Deliverable Checklist)

### ✅ 1. Các tính năng đã hoàn thiện 100% (Fully Implemented Features)
- **Giao diện Đa Trang & Chế độ Sáng / Tối chống chói**: 9 trang tác vụ riêng biệt, mặc định Giao diện Tối, hỗ trợ chuyển sang Giao diện Sáng tông giấy dịu mắt với độ tương phản chữ sắc nét.
- **Tự động Reset linh kiện khi chọn lại Nhu cầu**: Khi người dùng chọn/đổi mục đích sử dụng ở Trang 1, bàn lắp ráp tự động làm mới để tránh lẫn linh kiện cũ.
- **Thuật toán Chuyên gia PC (`solveExpertBuild`)**: Phân bổ cấu hình khác biệt rõ rệt cho từng nhu cầu trong 9 nhu cầu (`Gaming`, `AI Training & LLM`, `Video Editing`, `Graphic Design`, `Programming`, `Office & Study`, `Streaming`, `Music Production`, `Custom PC Build`) và cam kết tổng tiền không bao giờ vượt ngân sách mục tiêu.
- **Gợi ý linh kiện tiếp theo & Mục "Lựa chọn khác"**: Sau khi chọn món đầu tiên, hệ thống lọc chỉ hiển thị các bộ phận tiếp theo tương thích và vừa ngân sách còn lại; các phụ kiện không tương thích hoặc vượt ngân sách được gom vào mục mở rộng **"Lựa chọn khác"** kèm ô thông báo tóm tắt cảnh báo chi tiết (`#compat-alert-box`).
- **Kho 58 linh kiện thực tế kèm Ngày công bố giá**: Toàn bộ sản phẩm sử dụng ảnh chụp sản phẩm thực tế từ CDN hãng/đại lý và hiển thị rõ ngày công bố giá niêm yết bên dưới.
- **So sánh giá 5 Đại lý & Cổng Build PC gắn sẵn phụ kiện (`retailer-build.html`)**: So sánh giá lẻ rẻ nhất và tổng hóa đơn trọn bộ tại `GearVN`, `Phong Vũ`, `HACOM`, `MemoryZone`, `CellphoneS`; nạp sẵn toàn bộ 8 khe linh kiện người dùng đã chọn khi chuyển sang trang Build PC đại lý.
- **Tài khoản, Giỏ hàng yêu cầu đăng nhập & Bảo mật Admin ẩn hoàn toàn**:
  - Khu vực Admin ẩn hoàn toàn cho đến khi đăng nhập đúng tài khoản Admin (`admin@pcmon.vn`).
  - Giỏ hàng chỉ sử dụng được khi đã đăng nhập và tự động lưu các lựa chọn trước đó của người dùng ngay sau khi đăng nhập.

### ⚙️ 2. Các tính năng chạy ở chế độ Local-First Hybrid (Partially Implemented / Local Persistence)
- **Lưu trữ Phiên đăng nhập, Giỏ hàng, Cấu hình đã lưu & Kho tùy chỉnh của Admin**: Hiện đang hoạt động tức thì qua `localStorage` kết hợp API kiểm tra quyền `/api/admin/verify` trên Node.js Server để chạy độc lập không cần tài khoản Cloud ngoài. File migration SQL (`supabase/migrations/001_pcmon_schema_rls.sql`) đã sẵn sàng để đấu nối trực tiếp lên Supabase Cloud.

### 🔗 3. Các tính năng cần tích hợp API thương mại từ Đại lý (Features Requiring Real Retailer Integrations)
- **Đồng bộ giá bán & tồn kho thời gian thực (Real-time Live Price Feed)**: Báo giá của 5 đại lý hiện được tính toán minh bạch từ giá niêm yết công khai cơ sở kèm nhãn thông báo rõ ràng (`Demo/Public Feed • Đã gồm VAT`). Để lấy giá flash-sale theo từng giây, cần ký kết hợp đồng đối tác B2B hoặc cấp quyền truy cập API chính thức từ GearVN, Phong Vũ, HACOM, MemoryZone và CellphoneS.
- **Đổ giỏ hàng trực tiếp vào Session Server của Đại lý bên thứ ba**: Do chính sách bảo mật Cross-Origin (`CORS` / `SameSite Cookie`) của các website thương mại điện tử lớn, một website độc lập không thể tự ý ghi đè Cookie giỏ hàng bên trong domain của đại lý nếu chưa có OAuth/Partner API của đại lý đó. PC MON giải quyết bằng **Cổng Build PC Đại lý Đính Kèm Sẵn (`retailer-build.html`)** và lệnh Bookmarklet/Script tự điền kèm liên kết tìm kiếm chính xác từng mã linh kiện.

### ⚠️ 4. Các giới hạn đã biết (Known Limitations)
- Ảnh sản phẩm thực tế được tải trực tiếp từ CDN chính hãng của nhà sản xuất và hệ thống bán lẻ nên cần có kết nối Internet để hiển thị ảnh lần đầu (hệ thống đã có cơ chế `handleImgError` tự động chuyển sang ảnh chụp thực tế dự phòng nếu một CDN bị nghẽn).
