<?php
declare(strict_types=1);
// Auto WorkFlow - Mr. Huỳnh · phần trang quản trị CHUNG (active.mrhuynh.net/admin) cho Auto WorkFlow.
// api.php gọi file này cho mọi lệnh bắt đầu bằng "w_" (vd. w_stats, w_installs, w_links, w_release_publish).
// Đã đăng nhập bằng admin_password của Video AI trước khi vào đây. Dữ liệu riêng: active_private/autoworkflow/data/autoworkflow.sqlite.

use AutoWorkflow as V;

$maxLib = (getenv('AWF_PRIVATE') ?: $priv . '/autoworkflow') . '/lib.php';
if (!is_file($maxLib)) {
    bad('Không thấy module Auto WorkFlow (active_private/autoworkflow/lib.php)');
}
require_once $maxLib;

(function (string $a, array $b) use ($gh) {
    $t = V\now();
    $pdo = V\db();
    $one = function (string $sql, array $args = []) use ($pdo) {
        $q = $pdo->prepare($sql);
        $q->execute($args);
        return $q->fetchColumn();
    };
    $dlDir = __DIR__ . '/../autoworkflow/download';                 // (tùy chọn) bộ cài tải lên hosting thay vì GitHub
    $host = preg_match('/^[a-z0-9.-]+(:\d+)?$/i', (string)($_SERVER['HTTP_HOST'] ?? '')) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $dlBase = 'https://' . $host . '/autoworkflow/download/';
    $repo = (string)V\opt('github_repo', 'alltoolsmax/auto-workflow');

    switch ($a) {
        case 'info':
            out(['ok' => true, 'pubkey' => V\public_key_b64url(), 'repo' => $repo,
                 'payment' => (bool)(V\bank() && V\opt('sepay_api_key'))]);
        case 'stats':
            $d0 = strtotime('today');
            out(['ok' => true,
                'active' => (int)$one('SELECT COUNT(*) FROM keys WHERE status="active" AND (expires_at=0 OR expires_at>?)', [$t]),
                'unused' => (int)$one('SELECT COUNT(*) FROM keys WHERE status="new"'),
                'pending' => (int)$one('SELECT COUNT(*) FROM orders WHERE status="pending" AND expires_at>?', [$t]),
                'review' => (int)$one('SELECT COUNT(*) FROM orders WHERE status="review"'),
                'revenue_today' => (int)$one('SELECT COALESCE(SUM(price),0) FROM keys WHERE created_at>? AND status!="revoked"', [$d0]),
                'revenue_30d' => (int)$one('SELECT COALESCE(SUM(price),0) FROM keys WHERE created_at>? AND status!="revoked"', [$t - 30 * V\DAY]),
                'revenue_all' => (int)$one('SELECT COALESCE(SUM(price),0) FROM keys WHERE status!="revoked"'),
                'payment' => (bool)(V\bank() && V\opt('sepay_api_key'))]);
        case 'installs':             // số máy đã cài / đang hoạt động + danh sách máy
            out(['ok' => true, 'stats' => V\install_stats(), 'list' => V\install_list((int)($b['limit'] ?? 200))]);
        case 'keys':
            $q = '%' . trim((string)($_GET['q'] ?? '')) . '%';
            $st = $pdo->prepare('SELECT * FROM keys WHERE key LIKE ? OR IFNULL(customer,"") LIKE ? OR IFNULL(note,"") LIKE ? OR IFNULL(machine,"") LIKE ? ORDER BY id DESC LIMIT 300');
            $st->execute([$q, $q, $q, $q]);
            out(['ok' => true, 'keys' => $st->fetchAll(), 'now' => $t]);
        case 'create':
            $p = V\plan((string)($b['plan'] ?? ''));
            if (!$p) {
                bad('Gói không tồn tại');
            }
            $n = min(max((int)($b['count'] ?? 1), 1), 200);
            $days = ($b['days'] ?? '') !== '' ? (int)$b['days'] : (int)$p['days'];
            $price = ($b['price'] ?? '') !== '' ? (int)$b['price'] : (int)$p['price'];
            $made = [];
            $st = $pdo->prepare('INSERT INTO keys (key, plan, days, price, customer, note, created_at) VALUES (?,?,?,?,?,?,?)');
            for ($i = 0; $i < $n; $i++) {
                $k = V\new_key();
                $st->execute([$k, $p['code'], $days, $price, ($b['customer'] ?? '') ?: null, ($b['note'] ?? '') ?: null, $t]);
                $made[] = $k;
            }
            V\event('admin_create', $made[0], null, "$n key {$p['code']}");
            out(['ok' => true, 'keys' => $made]);
        case 'revoke':
            $pdo->prepare('UPDATE keys SET status="revoked" WHERE key=?')->execute([$b['key'] ?? '']);
            V\event('admin_revoke', $b['key'] ?? '');
            out(['ok' => true]);
        case 'unrevoke':
            $pdo->prepare('UPDATE keys SET status=CASE WHEN machine IS NULL THEN "new" ELSE "active" END WHERE key=? AND status="revoked"')->execute([$b['key'] ?? '']);
            out(['ok' => true]);
        case 'extend':
            $k = V\key_row((string)($b['key'] ?? ''));
            if (!$k) {
                bad('Không thấy key');
            }
            $d = (int)($b['days'] ?? 0);
            if ($k['status'] === 'new') {
                $pdo->prepare('UPDATE keys SET days=days+? WHERE id=?')->execute([$d, $k['id']]);
            } elseif ((int)$k['expires_at'] !== 0) {
                $pdo->prepare('UPDATE keys SET expires_at=? WHERE id=?')->execute([max((int)$k['expires_at'], $t) + $d * V\DAY, $k['id']]);
            }
            V\event('admin_extend', $k['key'], null, "+$d");
            out(['ok' => true]);
        case 'reset_machine':
            $pdo->prepare('UPDATE keys SET machine=NULL, last_transfer_at=NULL WHERE key=?')->execute([$b['key'] ?? '']);
            V\event('admin_reset', $b['key'] ?? '');
            out(['ok' => true]);
        case 'note':
            $pdo->prepare('UPDATE keys SET customer=?, note=? WHERE key=?')->execute([($b['customer'] ?? '') ?: null, ($b['note'] ?? '') ?: null, $b['key'] ?? '']);
            out(['ok' => true]);
        case 'links':                // tất cả link trong app + giá gói VĨNH VIỄN (lưu 1 lần, app của khách tự nhận)
            if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
                try {
                    V\links_save((array)($b['links'] ?? []));
                } catch (RuntimeException $e) {
                    bad($e->getMessage());
                }
                if (isset($b['price']) && $b['price'] !== '') {
                    $price = (int)preg_replace('/\D+/', '', (string)$b['price']);
                    if ($price < 1000) {
                        bad('Giá gói VĨNH VIỄN phải từ 1.000đ');
                    }
                    $pdo->prepare('UPDATE plans SET price=? WHERE code="life"')->execute([$price]);
                }
                V\event('admin_links');
            }
            out(['ok' => true, 'links' => V\links_get(), 'defaults' => V\LINK_DEFAULTS,
                 'price' => (int)$one('SELECT price FROM plans WHERE code="life"')]);
        case 'plans':
            if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
                $st = $pdo->prepare('UPDATE plans SET name=?, days=?, price=?, badge=?, active=? WHERE code=?');
                foreach (($b['plans'] ?? []) as $p) {
                    $st->execute([(string)$p['name'], (int)$p['days'], (int)$p['price'], ($p['badge'] ?? '') ?: null, !empty($p['active']) ? 1 : 0, (string)$p['code']]);
                }
            }
            out(['ok' => true, 'plans' => $pdo->query('SELECT * FROM plans ORDER BY sort')->fetchAll()]);
        case 'guides':
            if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
                foreach (($b['guides'] ?? []) as $page => $u) {
                    $u = trim((string)$u);
                    if (!preg_match('/^[a-z0-9_]{2,40}$/', (string)$page)) {
                        continue;
                    }
                    if ($u === '') {
                        $pdo->prepare('DELETE FROM guides WHERE page=?')->execute([$page]);
                        continue;
                    }
                    if (!preg_match('#^https://#i', $u)) {
                        bad("Link của \"$page\" phải bắt đầu bằng https://");
                    }
                    $pdo->prepare('INSERT INTO guides (page, url, updated_at) VALUES (?,?,?) ON CONFLICT(page) DO UPDATE SET url=excluded.url, updated_at=excluded.updated_at')
                        ->execute([$page, $u, $t]);
                }
                V\event('admin_guides');
            }
            out(['ok' => true, 'guides' => $pdo->query('SELECT page, url, updated_at FROM guides')->fetchAll()]);
        case 'orders':
            out(['ok' => true, 'orders' => $pdo->query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300')->fetchAll(),
                'transactions' => $pdo->query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50')->fetchAll(), 'now' => $t]);
        case 'order_paid':           // xác nhận tay đơn chờ / thiếu tiền → tạo key
            $q = $pdo->prepare('SELECT * FROM orders WHERE code=?');
            $q->execute([(string)($b['code'] ?? '')]);
            $o = $q->fetch();
            if (!$o || $o['status'] === 'paid') {
                bad('Không thấy đơn hoặc đơn đã thanh toán');
            }
            $p = V\plan($o['plan']);
            $k = V\new_key();
            $pdo->prepare('INSERT INTO keys (key, plan, days, price, order_code, note, created_at) VALUES (?,?,?,?,?,?,?)')
                ->execute([$k, $o['plan'], $p ? (int)$p['days'] : 30, (int)($o['paid_amount'] ?: $o['amount']), $o['code'], 'Xác nhận tay', $t]);
            $pdo->prepare('UPDATE orders SET status="paid", key=?, paid_at=?, note=? WHERE code=?')->execute([$k, $t, 'Xác nhận tay', $o['code']]);
            V\event('admin_order_paid', $k, null, $o['code']);
            out(['ok' => true, 'key' => $k]);
        case 'events':
            out(['ok' => true, 'events' => $pdo->query('SELECT * FROM events ORDER BY id DESC LIMIT 300')->fetchAll()]);
        case 'releases':             // bản đã phát hành + bản GitHub đã build + file .exe trong autoworkflow/download/
            $files = [];
            foreach (glob($dlDir . '/*.exe') ?: [] as $f) {
                $files[] = ['name' => basename($f), 'size' => filesize($f), 'mtime' => filemtime($f),
                    'version' => preg_match('/(\d+\.\d+(?:\.\d+){0,2})\.exe$/i', basename($f), $mm) ? $mm[1] : ''];
            }
            usort($files, fn($x, $y) => $y['mtime'] <=> $x['mtime']);
            $latest = V\latest_release();
            $latestMac = V\latest_release('mac');
            out(['ok' => true, 'releases' => $pdo->query('SELECT * FROM releases ORDER BY id DESC LIMIT 100')->fetchAll(),
                'files' => $files, 'latest_id' => $latest ? (int)$latest['id'] : 0, 'latest_mac_id' => $latestMac ? (int)$latestMac['id'] : 0,
                'base' => $dlBase, 'dir_ok' => is_dir($dlDir), 'repo' => $repo,
                'mac_github' => V\mac_github_release(), 'win_github' => $gh($repo, 'awf_win.json')]);
        case 'release_publish':      // phát hành bản Windows: bản GitHub đã build (khuyên dùng) · file trong autoworkflow/download/ · link https
            $ver = trim((string)($b['version'] ?? ''));
            if (!V\valid_version($ver)) {
                bad('Số phiên bản phải dạng 1.5.0');
            }
            $min = trim((string)($b['min_version'] ?? ''));
            if ($min !== '' && !V\valid_version($min)) {
                bad('"Bắt buộc với bản thấp hơn" phải dạng 1.5.0 hoặc để trống');
            }
            $file = basename((string)($b['file'] ?? ''));
            $url = trim((string)($b['url'] ?? ''));
            $sha = strtolower(trim((string)($b['sha256'] ?? '')));
            $size = 0;
            if (!empty($b['github'])) {      // GitHub build: bộ cài tải thẳng từ GitHub Releases, SHA-256 trong awf_win.json
                $g = $gh($repo, 'awf_win.json', 0);
                if (!$g || empty($g['sha256'])) {
                    bad('Chưa đọc được bản Windows trên GitHub (' . $repo . ' › Releases) – GitHub build xong chưa?');
                }
                if (version_compare((string)$g['version'], $ver) !== 0) {
                    bad('Bản Windows mới nhất trên GitHub là ' . $g['version'] . ' nhưng bạn ghi ' . $ver . '. Hãy ghi đúng ' . $g['version'] . '.');
                }
                $sha = strtolower((string)$g['sha256']);
                $size = (int)($g['size'] ?? 0);
                $url = $g['_base'] . 'auto_workflow_win.exe';
            } elseif ($file !== '') {
                $path = $dlDir . '/' . $file;
                if (!preg_match('/\.exe$/i', $file) || !is_file($path)) {
                    bad('Không thấy file ' . $file . ' trong thư mục autoworkflow/download/');
                }
                if (preg_match('/(\d+\.\d+(?:\.\d+){0,2})\.exe$/i', $file, $fm) && version_compare($fm[1], $ver) !== 0) {
                    bad('File ' . $file . ' là bản ' . $fm[1] . ' nhưng bạn ghi số phiên bản ' . $ver . '. Hãy ghi đúng ' . $fm[1] . '.');
                }
                if (filesize($path) < 5 << 20) {
                    bad('File ' . $file . ' quá nhỏ, không phải bộ cài Auto WorkFlow (AutoWorkflow-Setup-x.y.z.exe).');
                }
                @set_time_limit(300);
                $sha = hash_file('sha256', $path);
                $size = filesize($path);
                $url = $dlBase . rawurlencode($file);
            } else {
                if (!preg_match('#^https://\S+$#i', $url)) {
                    bad('Chọn bản GitHub, một file bộ cài, hoặc dán link tải bắt đầu bằng https://');
                }
                if (!preg_match('/^[0-9a-f]{64}$/', $sha)) {
                    bad('Dán link thì phải kèm mã SHA-256 (64 ký tự 0-9a-f) để phần mềm kiểm tra file tải về.');
                }
            }
            $pdo->prepare('INSERT INTO releases (version, url, sha256, size, notes, mandatory, min_version, active, created_at, os) VALUES (?,?,?,?,?,?,?,1,?,?)')
                ->execute([$ver, $url, $sha ?: null, $size ?: null, mb_substr(trim((string)($b['notes'] ?? '')), 0, 4000),
                    !empty($b['mandatory']) ? 1 : 0, $min ?: null, $t, 'win']);
            V\event('admin_release', null, null, 'win ' . $ver . ' ' . $url);
            out(['ok' => true, 'version' => $ver, 'sha256' => $sha, 'size' => $size, 'url' => $url]);
        case 'release_toggle':       // ngừng phát hành (khách không nhận bản này nữa) / phát hành lại
            $pdo->prepare('UPDATE releases SET active=? WHERE id=?')->execute([!empty($b['active']) ? 1 : 0, (int)($b['id'] ?? 0)]);
            V\event('admin_release_toggle', null, null, (int)($b['id'] ?? 0) . ' → ' . (!empty($b['active']) ? 'on' : 'off'));
            out(['ok' => true]);
    }
    bad('Lệnh Auto WorkFlow không hợp lệ: ' . $a, 404);
})(substr($a, 2), $b);
