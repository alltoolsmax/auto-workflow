<?php
declare(strict_types=1);
// Webhook SePay CHUNG cho Voice AI + Video AI + Auto WorkFlow + Auto Flow (1 tài khoản ngân hàng, 1 webhook).
//  - Mã đơn thuộc Auto WorkFlow → tạo key Auto WorkFlow (app của khách tự kích hoạt).
//  - Mã đơn thuộc Auto Flow     → tạo key Auto Flow (app của khách tự kích hoạt).
//  - Mã đơn thuộc Video AI      → tạo key Video AI.
//  - Mọi trường hợp khác        → chuyển NGUYÊN VẸN sang voice_studio_webhook.php của Voice AI (không sửa file đó).
// Khai báo trên SePay: https://active.mrhuynh.net/webhook.php · Chứng thực API Key (giống Voice AI).
$awfLib = (getenv('AWF_PRIVATE') ?: __DIR__ . '/../active_private/autoworkflow') . '/lib.php';
$afLib = (getenv('AF_PRIVATE') ?: __DIR__ . '/../active_private/autoflow') . '/lib.php';
$videoLib = (getenv('VIDEOAI_PRIVATE') ?: __DIR__ . '/../active_private/video') . '/lib.php';
$isPost = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
$raw = $isPost ? (string)file_get_contents('php://input') : '';

if ($isPost && is_file($awfLib)) {
    require_once $awfLib;
    try {
        $d = json_decode($raw, true);
        if (is_array($d) && \AutoWorkflow\order_exists(\AutoWorkflow\code_from($d))) {
            if (!\AutoWorkflow\sepay_authorized(\AutoWorkflow\request_auth_header())) {
                \AutoWorkflow\log_line('Webhook chung: sai API Key');
                \AutoWorkflow\json_out(['success' => false, 'error' => 'unauthorized'], 401);
            }
            $r = \AutoWorkflow\handle_payment($d);
            \AutoWorkflow\json_out(['success' => true, 'product' => 'autoworkflow', 'result' => $r]);
        }
    } catch (Throwable $e) {
        \AutoWorkflow\log_line('Webhook chung LỖI: ' . $e->getMessage());
        \AutoWorkflow\json_out(['success' => false, 'error' => 'server error'], 500);   // SePay tự gửi lại
    }
}

if ($isPost && is_file($afLib)) {
    require_once $afLib;
    try {
        $d = json_decode($raw, true);
        if (is_array($d) && \AutoFlow\order_exists(\AutoFlow\code_from($d))) {
            if (!\AutoFlow\sepay_authorized(\AutoFlow\request_auth_header())) {
                \AutoFlow\log_line('Webhook chung: sai API Key');
                \AutoFlow\json_out(['success' => false, 'error' => 'unauthorized'], 401);
            }
            $r = \AutoFlow\handle_payment($d);
            \AutoFlow\json_out(['success' => true, 'product' => 'autoflow', 'result' => $r]);
        }
    } catch (Throwable $e) {
        \AutoFlow\log_line('Webhook chung LỖI: ' . $e->getMessage());
        \AutoFlow\json_out(['success' => false, 'error' => 'server error'], 500);   // SePay tự gửi lại
    }
}

if ($isPost && is_file($videoLib)) {
    require_once $videoLib;
    try {
        $d = json_decode($raw, true);
        if (is_array($d) && \VideoAI\order_exists(\VideoAI\code_from($d))) {
            if (!\VideoAI\sepay_authorized(\VideoAI\request_auth_header())) {
                \VideoAI\log_line('Webhook chung: sai API Key');
                \VideoAI\json_out(['success' => false, 'error' => 'unauthorized'], 401);
            }
            $r = \VideoAI\handle_payment($d);
            \VideoAI\json_out(['success' => true, 'product' => 'videoai', 'result' => $r]);
        }
    } catch (Throwable $e) {
        \VideoAI\log_line('Webhook chung LỖI: ' . $e->getMessage());
        \VideoAI\json_out(['success' => false, 'error' => 'server error'], 500);   // SePay tự gửi lại
    }
}
require __DIR__ . '/voice_studio_webhook.php';
