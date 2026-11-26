<?php
declare(strict_types=1);
// Auto WorkFlow - Mr. Huỳnh · gắn mục Auto WorkFlow vào TRANG QUẢN TRỊ CHUNG (admin/index.html).
// Mở https://active.mrhuynh.net/admin/awf-install.php, nhập mật khẩu quản trị, bấm "Gắn vào quản trị chung".
// Việc làm: thêm đúng 1 dòng <script src="awf-admin.js"></script> trước </body> của index.html (có sao lưu file cũ).
// Chạy lại bao nhiêu lần cũng được (đã gắn thì không thêm nữa). Có nút "Gỡ" để trả index.html về như cũ.

$priv = getenv('ACTIVE_PRIVATE') ?: __DIR__ . '/../../active_private';
require_once (getenv('VIDEOAI_PRIVATE') ?: $priv . '/video') . '/lib.php';

use VideoAI as VA;

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');

const AWF_LINE = '<script src="awf-admin.js"></script>';
$index = __DIR__ . '/index.html';
$msg = '';
$ok = false;

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pass = (string)(VA\cfg()['admin_password'] ?? '');
    $token = (string)($_POST['tok'] ?? '');
    if (strlen($pass) < 10 || !hash_equals($pass, $token)) {
        $msg = VA\limited('admin_fail:' . VA\client_ip(), 8, 600) ? 'Thử sai quá nhiều lần, đợi 10 phút.' : 'Sai mật khẩu quản trị.';
    } elseif (!is_file($index) || !is_writable($index)) {
        $msg = 'Không ghi được admin/index.html (kiểm tra quyền ghi của file).';
    } else {
        $html = (string)file_get_contents($index);
        $has = str_contains($html, AWF_LINE);
        $act = (string)($_POST['act'] ?? 'install');
        if ($act === 'install') {
            if ($has) {
                $ok = true;
                $msg = 'Đã gắn từ trước – không cần làm gì thêm. Mở trang quản trị chung, bấm nút “🔀 Auto WorkFlow”.';
            } elseif (stripos($html, '</body>') === false) {
                $msg = 'Không tìm thấy </body> trong index.html – không sửa gì.';
            } else {
                $bak = $index . '.bak-awf-' . date('Ymd-His');
                copy($index, $bak);
                $pos = strripos($html, '</body>');
                $new = substr($html, 0, $pos) . AWF_LINE . "\n" . substr($html, $pos);
                file_put_contents($index, $new, LOCK_EX);
                $ok = true;
                $msg = 'Đã gắn Auto WorkFlow vào trang quản trị chung. Bản cũ được sao lưu: ' . basename($bak);
            }
        } elseif ($act === 'remove') {
            if (!$has) {
                $ok = true;
                $msg = 'Trang quản trị chung chưa gắn Auto WorkFlow.';
            } else {
                copy($index, $index . '.bak-awf-' . date('Ymd-His'));
                file_put_contents($index, str_replace(AWF_LINE, '', str_replace(AWF_LINE . "\n", '', $html)), LOCK_EX);
                $ok = true;
                $msg = 'Đã gỡ Auto WorkFlow khỏi trang quản trị chung (trang riêng awf.html vẫn dùng được).';
            }
        }
    }
}
$installed = is_file($index) && str_contains((string)file_get_contents($index), AWF_LINE);
?><!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Gắn Auto WorkFlow vào quản trị chung</title>
<style>
body{margin:0;background:#070b24;color:#eef1ff;font:14px/1.5 "Segoe UI",system-ui,sans-serif}
.b{max-width:460px;margin:10vh auto;background:#0e1438;border:1px solid #26306a;border-radius:12px;padding:28px}
input,button{font:inherit;color:#eef1ff;background:#151d4a;border:1px solid #26306a;border-radius:6px;padding:9px 12px;width:100%;margin-top:10px}
button{cursor:pointer;background:linear-gradient(135deg,#ff8a1f,#ff6a00);border:none;font-weight:600}button.g{background:#151d4a;border:1px solid #26306a}
.mu{color:#9aa3d6}.m{margin-top:14px;padding:10px 12px;border-radius:8px}.ok{background:#123d2a;color:#2fd27a}.er{background:#4a1520;color:#ff5a6a}
a{color:#ff8a1f}
</style></head><body><div class="b">
<h2 style="margin:0 0 6px">🔀 Gắn Auto WorkFlow vào quản trị chung</h2>
<div class="mu">Trạng thái: <b style="color:<?= $installed ? '#2fd27a' : '#ffc94a' ?>"><?= $installed ? 'đã gắn' : 'chưa gắn' ?></b>.
Thêm nút “Auto WorkFlow” cạnh Video AI · Voice AI · GCloud Hub · Max AI. File cũ được sao lưu trước khi sửa.</div>
<form method="post">
<input name="tok" type="password" placeholder="Mật khẩu quản trị" required autofocus>
<button name="act" value="install">Gắn vào quản trị chung</button>
<button name="act" value="remove" class="g">Gỡ khỏi quản trị chung</button>
</form>
<?php if ($msg !== ''): ?><div class="m <?= $ok ? 'ok' : 'er' ?>"><?= h($msg) ?></div><?php endif; ?>
<p class="mu" style="margin-top:16px"><a href="./">← Mở trang quản trị chung</a></p>
</div></body></html>
