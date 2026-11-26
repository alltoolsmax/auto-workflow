# Cập nhật hosting Auto WorkFlow – chỉ upload + giải nén đè

File zip này chỉ chứa FILE MỚI (không trùng bất kỳ file nào của Video AI / Voice AI / GCloud Hub / Max AI), nên giải nén đè là an toàn.

## Cách làm
1. Upload `hosting-autoworkflow.zip` vào thư mục GỐC chứa `active.mrhuynh.net/` và `active_private/` (cùng cấp).
2. Giải nén, chọn "ghi đè". Xong.
3. Vào trang quản trị riêng: `https://active.mrhuynh.net/admin/awf.html` (đăng nhập cùng mật khẩu quản trị cũ). Có nút "← Quản trị chung" quay lại trang cũ.

## Tự động
- `active_private/autoworkflow/config.php` + khóa ký (seed) được TỰ TẠO ở lần chạy đầu và KHÔNG nằm trong zip → cập nhật lần sau không mất. Hãy sao lưu file này.
- Cơ sở dữ liệu SQLite tự tạo trong `active_private/autoworkflow/data/`.
- Thư mục `active_private/autoworkflow` cần quyền ghi cho PHP.

## Không đụng tới
Không sửa `admin/index.html`, `admin/api.php` hay webhook dùng chung.

## Sau khi upload
- Khóa công khai cho app: `https://active.mrhuynh.net/autoworkflow/v1/pubkey` → dán vào GitHub Secret `AWF_PUBLIC_KEY`.
- Nhận tiền: webhook SePay riêng `https://active.mrhuynh.net/autoworkflow/v1/sepay`. Nếu SePay chỉ cho 1 webhook, thêm nhánh trong webhook chung: nếu `AutoWorkflow\order_exists($code)` thì gọi `AutoWorkflow\handle_payment($d)`.
- Đặt link Mở ứng dụng / video YouTube ở tab "Liên kết & video".
