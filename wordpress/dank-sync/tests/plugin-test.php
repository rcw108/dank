<?php
/**
 * Runs the real plugin on minimal WordPress stubs.
 *   php wordpress/dank-sync/tests/plugin-test.php <signed-check.json> <out-requests.json>
 * <signed-check.json> is produced by the app's contract test (Node signs,
 * PHP verifies); captured requests are verified by Node afterwards.
 * The exactness of the figures is covered by account-test.php (real theme).
 */

define('ABSPATH', __DIR__);
[$_, $signedCheckFile, $outFile] = $argv + [null, null, null];
date_default_timezone_set('UTC'); // as WordPress sets it

// ---- WordPress stubs --------------------------------------------------------
class WP_User
{
    public $ID; public $user_email; public $user_login; public $first_name = ''; public $last_name = ''; public $display_name = '';
    public $roles = []; public $data; public array $meta = [];
    public function __get($key) { return $this->meta[$key] ?? ''; }
}
class WP_Error { public function __construct(public $code = '', public $message = '', public $data = []) {} }
class WP_REST_Request {
    public function __construct(private array $headers, private string $body) {}
    public function get_header($k) { return $this->headers[strtolower($k)] ?? null; }
    public function get_body() { return $this->body; }
}
$GLOBALS['hooks'] = []; $GLOBALS['options'] = []; $GLOBALS['requests'] = []; $GLOBALS['scheduled'] = []; $GLOBALS['events'] = [];
$GLOBALS['http_status'] = 200; $GLOBALS['loops'] = []; $GLOBALS['loop'] = null;
function add_action($h, $cb, $p = 10, $n = 1) { $GLOBALS['hooks'][$h][] = [$cb, $n]; }
function do_action($h, ...$args) { foreach ($GLOBALS['hooks'][$h] ?? [] as [$cb, $n]) { $cb(...array_slice($args, 0, $n)); } }
function register_activation_hook($f, $cb) { $GLOBALS['activate'] = $cb; }
function register_deactivation_hook($f, $cb) {}
function get_option($k, $d = false) { return $GLOBALS['options'][$k] ?? $d; }
function add_option($k, $v, $x = '', $a = true) { $GLOBALS['options'][$k] = $v; }
function update_option($k, $v, $a = null) { $GLOBALS['options'][$k] = $v; }
function wp_parse_args($a, $d) { return array_merge($d, $a); }
function get_userdata($id) { return $GLOBALS['users'][$id] ?? false; }
function get_user_by($field, $value)
{
    foreach ($GLOBALS['users'] as $u) {
        if ($field === 'email' && strtolower($u->user_email) === strtolower($value)) return $u;
        if ($field === 'login' && $u->user_login === $value) return $u;
    }
    return false;
}
function get_user_meta($id, $key = '', $single = false) { return $key === '' ? [] : ($GLOBALS['users'][$id]->meta[$key] ?? ''); }
function get_users($args)
{
    $role = is_string($args) ? substr($args, 5) : $args['role'];
    $found = array_filter($GLOBALS['users'], fn ($u) => in_array($role, $u->roles, true));
    return is_array($args) && ($args['fields'] ?? '') === 'ID' ? array_keys($found) : array_values($found);
}
function get_field($key, $post_id = null) { return $GLOBALS['acf'][(int) substr((string) $post_id, 5)][$key] ?? null; }
function have_rows($key, $post_id)
{
    $loop = "$key|$post_id";
    $GLOBALS['loops'][$loop] ??= ['rows' => (array) (get_field($key, $post_id) ?: []), 'i' => -1];
    $GLOBALS['loop'] = $loop;
    if ($GLOBALS['loops'][$loop]['i'] + 1 < count($GLOBALS['loops'][$loop]['rows'])) return true;
    unset($GLOBALS['loops'][$loop]);
    return false;
}
function the_row() { $GLOBALS['loops'][$GLOBALS['loop']]['i']++; }
function get_sub_field($name) { $l = $GLOBALS['loops'][$GLOBALS['loop'] ?? ''] ?? null; return $l ? ($l['rows'][$l['i']][$name] ?? null) : false; }
function get_locale() { return 'en_US'; }
function __($text) { return $text; }
function is_user_logged_in() { return false; }
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
function wp_next_scheduled($h) { return $GLOBALS['events'][$h] ?? false; }
function wp_schedule_event($t, $recurrence, $h) { $GLOBALS['events'][$h] = $t; }
function wp_clear_scheduled_hook($h) {}
function register_rest_route($ns, $route, $args) { $GLOBALS['routes']["$ns$route"] = $args; }

// Stand-ins for the theme's helpers (inc/functions-to-use.php). The real ones
// are checked against the real account page by account-test.php.
function netPayedAnnualyInterest($years = 1, $rate = 9, $n = 12) { return round(pow(1 + $rate / $n, $n * $years), 6); }
function net_annualized_return($periods, $period, $rate) { return round((netPayedAnnualyInterest(1, $rate / 100, 12) - 1) * 100, 2) . '%'; }
function count_amount_onpresent_time($begin, $end, $rate, $capital)
{
    if ((float) $capital === 13.0) {
        throw new RuntimeException('boom: theme calculation failed');
    }
    $days = max(0, (int) $begin->diff($end)->format('%r%a'));
    return $capital * (1 + $rate / 100 / 365 * $days);
}

// ---- Data -----------------------------------------------------------------------
function user($id, $email, $roles, $first = '', $last = '', $meta = []) {
    $u = new WP_User(); $u->ID = $id; $u->user_email = $email; $u->user_login = "user$id";
    $u->first_name = $first; $u->last_name = $last; $u->display_name = trim("$first $last"); $u->roles = $roles;
    $u->meta = $meta + ['referred_by' => 'none'];
    $u->data = (object) ['ID' => $id, 'user_login' => "user$id", 'display_name' => $u->display_name];
    return $u;
}
$GLOBALS['users'] = [
    113 => user(113, 'Investor@Example.com', ['investor'], 'Ana', 'Lopez', [
        'appeal' => 'Mrs.', 'phone_number' => '+52 624 555 0100',
        'session_tokens' => 'a:1:{s:3:"abc";a:0:{}}', 'bank_account_number' => '000123', 'address' => 'Calle Secreta 1',
    ]),
    114 => user(114, 'ben@example.com', ['investor'], 'Ben', 'Ruiz', ['referred_by' => 'user113']),
    115 => user(115, 'broken@example.com', ['investor'], 'Carla', 'Diaz'),
    200 => user(200, 'subscriber@example.com', ['subscriber']),
];
$row = fn ($date, $size, $notes = '') => ['investment_date' => "$date 00:00:00", 'investment_size' => (string) $size, 'notes' => $notes, 'contract_link' => 'https://dank.capital/pdf/x'];
$out = fn ($date, $size, $notes = '') => ['withdraw_date' => "$date 00:00:00", 'withdraw_size' => (string) $size, 'notes' => $notes, 'contract_link' => ''];
$terms = ['payment_periods' => 'yearly', 'investment_period' => '12', 'interest-a-year' => '9'];
$GLOBALS['acf'] = [
    113 => [
        'investment' => [$row('2018-01-15', 50000, 'First deposit'), $row('2020-06-01', 10000)],
        'withdraw' => [$out('2021-03-10', 5000)],
        'investments_terms' => $terms,
        'investment_terms_changes' => [['date_of_change' => '2022-01-01 00:00:00', 'interest_a_year' => '10']],
        'company_name' => 'Lopez Holdings', 'color_theme' => '1', 'address' => 'Calle Secreta 1', 'card_number' => '4111',
        'referral_bonus' => '', 'referral_has_year_return' => [],
    ],
    114 => ['investment' => [$row('2023-02-02', 20000)], 'investments_terms' => $terms],
    115 => ['investment' => [$row('2023-02-02', 13)], 'investments_terms' => $terms],
];
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
$snap = $answer['snapshot'];
check('investor email → investor: true', $answer['investor'] === true);
check('snapshot email lower-cased', $snap['email'] === 'investor@example.com');
check('profile fields of the account page', $snap['profile'] === ['appeal' => 'Mrs.', 'phone' => '+52 624 555 0100', 'company_name' => 'Lopez Holdings', 'theme' => 'dark']);
check('account figures calculated', is_float($snap['account']['current_capital']) && $snap['account']['total_invested'] === 60000.0 && $snap['account']['total_withdrawn'] === 5000.0);
check('account table rows: deposits, withdrawal, terms change', array_column($snap['account']['rows'], 'type') === ['deposit', 'deposit', 'withdrawal', 'deposit', 'terms']);
check('note travels with its row', $snap['account']['rows'][0]['note'] === 'First deposit');
check('no raw meta / ACF dump', !isset($snap['meta']) && !isset($snap['acf']));
$json = json_encode($answer);
check('nothing else leaves the site (address, card, bank, tokens, contract links)', !preg_match('/Calle Secreta|4111|000123|abc|pdf\\/x/', $json));
check('timezone restored after the calculation', date_default_timezone_get() === 'UTC');
$sub = ($route['callback'])(new WP_REST_Request([], '{"email":"subscriber@example.com"}'));
check('non-investor → investor: false, no data', $sub === ['investor' => false]);
$none = ($route['callback'])(new WP_REST_Request([], '{"email":"nobody@example.com"}'));
check('unknown email → investor: false', $none === ['investor' => false]);

$broken = DankSync\snapshot(115);
check('calculation error → no figures, error reported', $broken['account'] === null && str_contains((string) $broken['account_error'], 'boom'));

// ---- Push on change ----------------------------------------------------------
do_action('updated_user_meta', 1, 113, 'investment_0_investment_size');
do_action('updated_user_meta', 2, 113, 'phone_number');
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
check('role removal is sent with is_investor: false', count($GLOBALS['requests']) === 2 && $revoked['is_investor'] === false && $revoked['account'] === null);
$GLOBALS['users'][113]->roles = ['investor'];

// A referred investor's deposits change the referrer's capital.
$before = count($GLOBALS['requests']);
do_action('acf/save_post', 'user_114');
do_action('shutdown');
$ids = [];
foreach (array_slice($GLOBALS['requests'], $before) as $request) {
    $ids = array_merge($ids, array_column(json_decode($request['body'], true)['snapshots'], 'wp_user_id'));
}
sort($ids);
check('referred investor change also sends the referrer', $ids === [113, 114]);

// Daily recalculation.
do_action('init');
check('daily send scheduled', isset($GLOBALS['events']['dank_sync_daily']));
$before = count($GLOBALS['requests']);
do_action('dank_sync_daily');
$daily = json_decode(end($GLOBALS['requests'])['body'], true);
check('daily send covers every investor', count($GLOBALS['requests']) === $before + 1 && array_column($daily['snapshots'], 'wp_user_id') === [113, 114, 115]);

// App down → retry scheduled.
$GLOBALS['http_status'] = 500;
do_action('acf/save_post', 'user_113');
do_action('shutdown');
check('failed push schedules a retry', ($GLOBALS['scheduled'][0][0] ?? '') === 'dank_sync_retry');
$GLOBALS['http_status'] = 200;

file_put_contents($outFile, json_encode(array_slice($GLOBALS['requests'], 0, 2)));
echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit($failures ? 1 : 0);
