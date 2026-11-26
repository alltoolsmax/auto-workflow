<?php
declare(strict_types=1);
// Auto WorkFlow - Mr. Huỳnh · API trang quản trị RIÊNG (active.mrhuynh.net/admin/awf.html).
// Không sửa api.php / index.html dùng chung của Video AI, Voice AI, GCloud Hub, Max AI.
// Đăng nhập bằng đúng admin_password của Video AI (active_private/video/config.php), gửi qua header X-Admin-Token.

$priv = getenv('ACTIVE_PRIVATE') ?: __DIR__ . '/../../active_private';
require_once (getenv('VIDEOAI_PRIVATE') ?: $priv . '/video') . '/lib.php';

use VideoAI as VA;

function out($data, int $status = 200): void
{
    VA\json_out($data, $status);
}

function bad(string $msg, int $status = 400): void
{
    VA\json_out(['ok' => false, 'message' => $msg], $status);
}

try {
    $token = (string)($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
    $pass = (string)(VA\cfg()['admin_password'] ?? '');
    if (strlen($pass) < 10 || str_starts_with($pass, 'DAT_')) {
        bad('Chưa đặt admin_password (ít nhất 10 ký tự) trong active_private/video/config.php', 500);
    }
    if (!hash_equals($pass, $token)) {
        if (VA\limited('admin_fail:' . VA\client_ip(), 8, 600)) {
            bad('Thử sai quá nhiều lần, đợi 10 phút.', 429);
        }
        bad('Sai mật khẩu quản trị', 401);
    }
    $a = preg_replace('/[^a-z_]/', '', (string)($_GET['a'] ?? ''));
    $b = json_decode((string)file_get_contents('php://input'), true) ?: [];
    if ($a === 'info') {
        out(['ok' => true, 'awf' => true]);
    }
    if (!str_starts_with($a, 'w_')) {
        bad('Lệnh không hợp lệ', 404);
    }
    $awfLib = (getenv('AWF_PRIVATE') ?: $priv . '/autoworkflow') . '/lib.php';
    if (!is_file($awfLib)) {
        bad('Chưa có module Auto WorkFlow (active_private/autoworkflow/lib.php)', 500);
    }
    require_once $awfLib;
    $gh = fn(string $repo, string $name, int $ttl = 60) => AutoWorkflow\github_latest_json($repo, $name, $ttl, (string)AutoWorkflow\opt('gh_' . $name, ''));
    require __DIR__ . '/autoworkflow_api.php';
} catch (Throwable $e) {
    @error_log('awf.php: ' . $e->getMessage());
    VA\json_out(['ok' => false, 'message' => 'Lỗi máy chủ: ' . $e->getMessage()], 500);
}
