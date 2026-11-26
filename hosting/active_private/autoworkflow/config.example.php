<?php
// Auto WorkFlow - Mr. Huỳnh · cấu hình máy chủ bản quyền (dùng chung hosting với Video AI / Voice AI).
// tools/prepare-hosting.js tự tạo config.php từ file này (điền sẵn seed_hex). KHÔNG đặt trong thư mục công khai.
return [
    // "Con dấu" ký giấy phép Auto WorkFlow: 64 ký tự hex (KHÁC Video AI / Voice AI). Không gửi cho ai, nhớ sao lưu.
    'seed_hex' => 'DAN_SEED_HEX_VAO_DAY',

    // Mật khẩu trang quản trị: dùng chung admin_password của Video AI (active_private/video/config.php).

    // Để trống = dùng chung của Voice AI (active_private/config.php): sepay_api_key, bank, telegram, code_prefix
    'sepay_api_key'    => '',
    'telegram_token'   => '',
    'telegram_chat_id' => '',
    'bank'             => null,

    // Bảng giá: 1 gói VĨNH VIỄN (days 0). Dùng thử miễn phí nằm trong app. Sửa giá ở trang quản trị.
    'plans' => [
        'life' => ['name' => 'VĨNH VIỄN', 'days' => 0, 'price' => 599000, 'badge' => 'Mua 1 lần, dùng mãi mãi'],
    ],

    'contact_zalo'  => 'https://zalo.me/0979007367',
    'contact_phone' => '0979007367',
    'contact_name'  => 'Mr. Huỳnh',

    'github_repo'            => 'alltoolsmax/auto-workflow',   // GitHub build bộ cài Windows + macOS
    'order_ttl_minutes'      => 30,
    'transfer_cooldown_days' => 30,   // khách tự chuyển key sang máy mới: 1 lần / N ngày
    'recheck_hours'          => 24,   // phần mềm kiểm tra lại bản quyền sau
    'offline_grace_days'     => 3,    // dùng không mạng tối đa
    'timezone'               => 'Asia/Ho_Chi_Minh',
];
