<?php
/**
 * Runs the real plugin on minimal WordPress stubs.
 *   php wordpress/dank-sync/tests/plugin-test.php <signed-check.json> <out-requests.json>
 * <signed-check.json> is produced by the app's contract test (Node signs,
 * PHP verifies); captured requests are verified by Node afterwards.
 */

define('ABSPATH', __DIR__);
[$_, $signedCheckFile, $outFile] = $argv + [null, null, null];

// ---- WordPress stubs --------------------------------------------------------
class WP_User { public $ID; public $user_email; public $user_login; public $first_name = ''; public $last_name = ''; public $display_name = ''; public $roles = []; }
class WP_Error { public function __construct(public $code = '', public $message = '', public $data = []) {} }
class WP_REST_Request {
    public function __construct(private array $headers, private string $body) {}
    public function get_header($k) { return $this->headers[strtolower($k)] ?? null; }
    public function get_body() { return $this->body; }
}
$GLOBALS['hooks'] = []; $GLOBALS['options'] = []; $GLOBALS['requests'] = []; $GLOBALS['scheduled'] = [];
$GLOBALS['http_status'] = 200;
function add_action($h, $cb, $p = 10, $n = 1) { $GLOBALS['hooks'][$h][] = [$cb, $n]; }
function do_action($h, ...$args) { foreach ($GLOBALS['hooks'][$h] ?? [] as [$cb, $n]) { $cb(...array_slice($args, 0, $n)); } }
function register_activation_hook($f, $cb) { $GLOBALS['activate'] = $cb; }
function register_deactivation_hook($f, $cb) {}
function get_option($k, $d = false) { return $GLOBALS['options'][$k] ?? $d; }
function add_option($k, $v, $x = '', $a = true) { $GLOBALS['options'][$k] = $v; }
function update_option($k, $v, $a = null) { $GLOBALS['options'][$k] = $v; }
function wp_parse_args($a, $d) { return array_merge($d, $a); }
function get_userdata($id) { return $GLOBALS['users'][$id] ?? false; }
function get_user_by($f, $v) { foreach ($GLOBALS['users'] as $u) { if (strtolower($u->user_email) === strtolower($v)) return $u; } return false; }
function get_user_meta($id) { return $GLOBALS['meta'][$id] ?? []; }
function get_fields($post_id) { return $GLOBALS['acf'][$post_id] ?? false; }
function wp_json_encode($v, $f = 0) { return json_encode($v, $f); }
function untrailingslashit($s) { return rtrim($s, '/'); }
function sanitize_email($e) { return filter_var(trim($e), FILTER_VALIDATE_EMAIL) ?: ''; }
function is_wp_error($v) { return $v instanceof WP_Error; }
function wp_remote_post($url, $args) {
    $GLOBALS['requests'][] = ['url' => $url, 'headers' => $args['headers'], 'body' => $args['body']];
    $s = $GLOBALS['http_status'];
    return ['response' => ['code' => $s, 'message' => $s === 200 ? 'OK' : 'Error'], 'body' => json_encode(['ok' => $s === 200, 'message' => $s === 200 ? 'synced' : 'failed'])];
}
function wp_remote_retrieve_response_code($r) { return $r['response']['code']; }
function wp_remote_retrieve_response_message($r) { return $r['response']['message']; }
function wp_remote_retrieve_body($r) { return $r['body']; }
function wp_schedule_single_event($t, $h, $a) { $GLOBALS['scheduled'][] = [$h, $a]; }
function wp_clear_scheduled_hook($h) {}
function register_rest_route($ns, $route, $args) { $GLOBALS['routes']["$ns$route"] = $args; }
function get_users($args) { return array_keys(array_filter($GLOBALS['users'], fn ($u) => in_array($args['role'], $u->roles, true))); }

function user($id, $email, $roles, $first = '', $last = '') {
    $u = new WP_User(); $u->ID = $id; $u->user_email = $email; $u->user_login = "user$id";
    $u->first_name = $first; $u->last_name = $last; $u->display_name = trim("$first $last"); $u->roles = $roles;
    return $u;
}
$GLOBALS['users'] = [
    113 => user(113, 'Investor@Example.com', ['investor'], 'Ana', 'Lopez'),
    200 => user(200, 'subscriber@example.com', ['subscriber']),
];
$GLOBALS['meta'] = [
    113 => [
        'first_name' => ['Ana'],
        'current_capital' => ['$89,384.16'],
        'net_annualized_return' => ['9.38'],
        'phone' => ['+52 624 555 0100'],
        'session_tokens' => ['a:1:{s:3:"abc";a:0:{}}'],
        'bank_account_number' => ['000123'],
        'wp_capabilities' => ['a:1:{s:8:"investor";b:1;}'],
    ],
];
$GLOBALS['acf'] = ['user_113' => ['total_invested' => '50500', 'appeal' => 'Mrs', 'card_number' => '4111']];
$GLOBALS['options']['dank_sync_secret'] = 'contract-test-secret';

require __DIR__ . '/../dank-sync.php';
do_action('rest_api_init');

$failures = 0;
function check(string $name, bool $ok): void { global $failures; echo ($ok ? 'ok   ' : 'FAIL ') . $name . PHP_EOL; if (!$ok) $failures++; }

// ---- REST check endpoint ------------------------------------------------------
check('route registered', isset($GLOBALS['routes']['dank-sync/v1/check']));
$route = $GLOBALS['routes']['dank-sync/v1/check'];
$signed = json_decode(file_get_contents($signedCheckFile), true);
$req = new WP_REST_Request(['x-dank-timestamp' => $signed['timestamp'], 'x-dank-signature' => $signed['signature']], $signed['body']);
check('accepts request signed by the app (Node)', ($route['permission_callback'])($req) === true);
$forged = new WP_REST_Request(['x-dank-timestamp' => $signed['timestamp'], 'x-dank-signature' => $signed['signature']], '{"email":"other@example.com"}');
check('rejects tampered body', ($route['permission_callback'])($forged) instanceof WP_Error);
check('rejects unsigned request', ($route['permission_callback'])(new WP_REST_Request([], $signed['body'])) instanceof WP_Error);

$answer = ($route['callback'])($req);
check('investor email → investor: true', $answer['investor'] === true);
check('snapshot email lower-cased', $answer['snapshot']['email'] === 'investor@example.com');
check('snapshot has meta and ACF', isset($answer['snapshot']['meta']['current_capital'], $answer['snapshot']['acf']['total_invested']));
check('no session tokens / bank / card data', !isset($answer['snapshot']['meta']['session_tokens']) && !isset($answer['snapshot']['meta']['bank_account_number']) && !isset($answer['snapshot']['acf']['card_number']));
$sub = ($route['callback'])(new WP_REST_Request([], '{"email":"subscriber@example.com"}'));
check('non-investor → investor: false, no data', $sub === ['investor' => false]);
$none = ($route['callback'])(new WP_REST_Request([], '{"email":"nobody@example.com"}'));
check('unknown email → investor: false', $none === ['investor' => false]);

// ---- Push on change ----------------------------------------------------------
do_action('updated_user_meta', 1, 113, 'current_capital');
do_action('updated_user_meta', 2, 113, 'phone');
do_action('updated_user_meta', 3, 113, 'session_tokens');   // noise: ignored
do_action('updated_user_meta', 4, 200, 'first_name');       // not an investor: ignored
check('nothing sent before the request ends', count($GLOBALS['requests']) === 0);
do_action('shutdown');
check('one request for several field changes', count($GLOBALS['requests']) === 1);
$pushed = json_decode($GLOBALS['requests'][0]['body'], true);
check('push goes to /api/wp-sync', str_ends_with($GLOBALS['requests'][0]['url'], '/api/wp-sync'));
check('push contains only the investor', array_column($pushed['snapshots'], 'wp_user_id') === [113]);

// Role removed → app must hear about it.
$GLOBALS['users'][113]->roles = ['subscriber'];
do_action('set_user_role', 113, 'subscriber', ['investor']);
do_action('shutdown');
$revoked = json_decode(end($GLOBALS['requests'])['body'], true)['snapshots'][0];
check('role removal is sent with is_investor: false', count($GLOBALS['requests']) === 2 && $revoked['is_investor'] === false);
$GLOBALS['users'][113]->roles = ['investor'];

// App down → retry scheduled.
$GLOBALS['http_status'] = 500;
do_action('acf/save_post', 'user_113');
do_action('shutdown');
check('failed push schedules a retry', ($GLOBALS['scheduled'][0][0] ?? '') === 'dank_sync_retry');
$GLOBALS['http_status'] = 200;

file_put_contents($outFile, json_encode(array_slice($GLOBALS['requests'], 0, 2)));
echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit($failures ? 1 : 0);
