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

## Gắn vào TRANG QUẢN TRỊ CHUNG (nút "🔀 Auto WorkFlow" cạnh Video AI · Voice AI · GCloud Hub · Max AI)
1. Upload `admin/awf-admin.js` và `admin/awf-install.php` (ghi đè).
2. Mở `https://active.mrhuynh.net/admin/awf-install.php`, nhập mật khẩu quản trị, bấm **Gắn vào quản trị chung**.
   Trình cài chỉ thêm đúng 1 dòng `<script src="awf-admin.js"></script>` vào `admin/index.html`, sao lưu file cũ
   thành `index.html.bak-awf-<ngày giờ>`; chạy lại không thêm trùng; có nút **Gỡ**.
3. Mở trang quản trị chung, bấm **🔀 Auto WorkFlow**. Trang riêng `awf.html` vẫn dùng được.
Lưu ý: sau này nếu thay `admin/index.html` bằng bản mới (vd. khi cập nhật Video AI / Max AI), chạy lại bước 2.

## Không đụng tới
Không sửa `admin/api.php` hay webhook dùng chung (lệnh của Auto WorkFlow đi qua `admin/awf.php` riêng).

## Sau khi upload
- Khóa công khai cho app: `https://active.mrhuynh.net/autoworkflow/v1/pubkey` → dán vào GitHub Secret `AWF_PUBLIC_KEY`.
- Nhận tiền: webhook SePay riêng `https://active.mrhuynh.net/autoworkflow/v1/sepay`. Nếu SePay chỉ cho 1 webhook, thêm nhánh trong webhook chung: nếu `AutoWorkflow\order_exists($code)` thì gọi `AutoWorkflow\handle_payment($d)`.
- Đặt link Mở ứng dụng / video YouTube ở tab "Liên kết & video".
