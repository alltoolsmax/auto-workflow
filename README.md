# Auto WorkFlow - Mr. Huỳnh

© 2026 Huỳnh Xuyên Sơn (Mr. Huỳnh) · Zalo 0979 007 367 · info@mrhuynh.net · mrhuynh.net

Ứng dụng desktop **Windows + macOS** (Electron). Cùng tông giao diện với GCloud Hub / Max Video AI.

## App làm gì
- **Mở ứng dụng**: mở link do bạn đặt ở trang quản trị bằng **Chrome** của người dùng (không có Chrome thì dùng trình duyệt mặc định).
  Nếu chưa kích hoạt gói VĨNH VIỄN thì hiện **bảng thanh toán QR** (VietQR + SePay, tự kích hoạt khi nhận tiền).
  Trong bảng có nút "Tiếp tục dùng thử và mở ứng dụng".
- **Dùng thử**: thẻ DÙNG THỬ luôn mở được ứng dụng, không cần key.
- **Xem video hướng dẫn**: mở link YouTube bạn đặt ở trang quản trị.
- **Khám phá tiện ích AI khác**: mở https://mrhuynh.net/tools (đổi được ở trang quản trị).
- Chân trang: tác giả, bản quyền, Zalo / Email / Website / Facebook (đổi được ở trang quản trị).
- **Tự cập nhật** như các app khác: kiểm tra khi mở và mỗi 6 giờ → tải ngầm → kiểm SHA-256 → nút "Cập nhật & khởi động lại" (bản bắt buộc thì tự cài).
- **Đếm máy**: mỗi 30 phút báo lên máy chủ mã máy đã băm + phiên bản + hệ điều hành (không có thông tin cá nhân).

## Máy chủ (active.mrhuynh.net/autoworkflow) - app gọi các đường dẫn sau
Giống hệt giao thức của Max Video AI (`product = autoworkflow`), thêm `links`:

| Đường dẫn | Ghi chú |
|---|---|
| `GET /v1/app/version?os=&arch=&v=&iid=` | `{version,url,sha256,size,notes,mandatory,released_at,guide_url,links}` |
| `links` | `{open,guide,tools,zalo,email,website,facebook}` - các link trang quản trị đặt (https://, riêng `email` là `mailto:`) |
| `GET /v1/app/ping?os=&v=&m=` | đếm máy |
| `GET /v1/plans?product=autoworkflow` | `{payment:true, plans:[{code,name,days:0,price}], contact}` - 1 gói VĨNH VIỄN (`days = 0`) |
| `POST /v1/order` `{plan}` / `GET /v1/order?code=` | tạo đơn QR / hỏi trạng thái (`paid`,`review`,`expired`) |
| `POST /v1/activate`, `POST /v1/check` | kích hoạt / kiểm tra lại key, trả giấy phép ký Ed25519 |
| `GET /v1/pubkey` | khóa công khai (dán vào `src/main/server-config.json` bằng `node tools/set-pubkey.js <khóa>` hoặc GitHub secret `AWF_PUBLIC_KEY`) |

Chưa điền khóa công khai thì app chạy chế độ **dùng thử/phát triển** (không kiểm tra bản quyền, "Mở ứng dụng" mở thẳng).

## Chạy thử / build
```
npm install
npm start                 # chạy thử
npm run dist:win          # bộ cài Windows (trên Windows)
npm run dist:mac          # .dmg macOS (trên macOS)
```
GitHub Actions (`.github/workflows/build.yml`) tự build cả Windows + macOS. Phát hành: tăng `version` trong `package.json`, rồi `git tag v1.0.1 && git push --tags`.
Tệp phát hành tên cố định: `auto_workflow_win.exe`, `auto_workflow_mac_apple.dmg`, `auto_workflow_mac_intel.dmg`.

## Máy chủ + trang quản trị
Mã máy chủ (PHP + SQLite) và mục quản trị nằm ở `hosting/`; cách cài từng bước: **`hosting/HUONG-DAN-MAY-CHU.md`**.
Trang quản trị có mục **Auto WorkFlow**: Tổng quan (máy, doanh thu), Máy đã cài, Liên kết & video (7 link + giá VĨNH VIỄN), Đơn hàng, Phát hành & cập nhật, Nhật ký.
