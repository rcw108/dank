<?php
/**
 * Golden test: the figures the plugin sends must be exactly what the site's
 * account page prints. Renders the real account-template.php on WordPress/ACF
 * stubs, reads the numbers out of its HTML, and compares them with
 * DankSync\Account\calculate() for the same investors, character by character.
 *
 *   php wordpress/dank-sync/tests/account-test.php [path to hello-theme-dank]
 *
 * Needs a copy of the theme (wordpress/theme-src/, not in git); skipped otherwise.
 */

define('ABSPATH', __DIR__);
$theme = $argv[1] ?? __DIR__ . '/../../theme-src/hello-theme-dank';
if (!is_file("$theme/account-template.php")) {
    echo "skipped: theme copy not found at $theme\n";
    exit(0);
}
define('THEME_DIR', realpath($theme));
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE & ~E_DEPRECATED);
date_default_timezone_set('UTC'); // as WordPress sets it

// ---- WordPress / ACF stubs -------------------------------------------------
class WP_User
{
    public $ID; public $user_login; public $user_email = ''; public $first_name = ''; public $last_name = '';
    public $display_name = ''; public $roles = ['investor']; public $data; public array $meta = [];
    public function __get($key) { return $this->meta[$key] ?? ''; }
}
function make_user(int $id, string $login, string $first, string $last, array $meta = []): WP_User
{
    $u = new WP_User();
    $u->ID = $id; $u->user_login = $login; $u->first_name = $first; $u->last_name = $last; $u->meta = $meta;
    $u->display_name = trim("$first $last");
    $u->data = (object) ['ID' => $id, 'user_login' => $login, 'display_name' => $u->display_name];
    return $u;
}
$GLOBALS['users'] = []; $GLOBALS['acf'] = []; $GLOBALS['loops'] = []; $GLOBALS['loop'] = null;
function wp_get_current_user() { return $GLOBALS['current']; }
function is_user_logged_in() { return true; }
function get_userdata($id) { return $GLOBALS['users'][$id] ?? false; }
function get_users($args) { return array_values($GLOBALS['users']); }
function get_field($key, $post_id = null)
{
    if ($post_id === 'option') return '';
    $id = (int) substr((string) $post_id, 5);
    return $GLOBALS['acf'][$id][$key] ?? null;
}
function have_rows($key, $post_id)
{
    $loop = "$key|$post_id";
    if (!isset($GLOBALS['loops'][$loop])) {
        $GLOBALS['loops'][$loop] = ['rows' => (array) (get_field($key, $post_id) ?: []), 'i' => -1];
    }
    $GLOBALS['loop'] = $loop;
    if ($GLOBALS['loops'][$loop]['i'] + 1 < count($GLOBALS['loops'][$loop]['rows'])) return true;
    unset($GLOBALS['loops'][$loop]);
    return false;
}
function the_row() { $GLOBALS['loops'][$GLOBALS['loop']]['i']++; }
function get_sub_field($name)
{
    $loop = $GLOBALS['loops'][$GLOBALS['loop'] ?? ''] ?? null;
    return $loop ? ($loop['rows'][$loop['i']][$name] ?? null) : false;
}
function get_locale() { return 'en_US'; }
function locate_template($file) { return THEME_DIR . '/' . $file; }
function _e($text) { echo $text; }
function __($text) { return $text; }
function get_header() {}
function get_footer() {}
function get_theme_mod($k) { return ''; }
function get_bloginfo($k = '') { return ''; }
function do_shortcode($s) { return ''; }
function gravity_form(...$a) {}

require THEME_DIR . '/inc/functions-to-use.php';
require __DIR__ . '/../includes/account.php';

// ---- Investors -------------------------------------------------------------
function inv(string $date, $size, string $notes = ''): array { return ['investment_date' => "$date 00:00:00", 'investment_size' => (string) $size, 'notes' => $notes, 'contract_link' => '']; }
function wd(string $date, $size, string $notes = ''): array { return ['withdraw_date' => "$date 00:00:00", 'withdraw_size' => (string) $size, 'notes' => $notes, 'contract_link' => '']; }
function terms($rate, string $period = 'yearly', $months = '12'): array { return ['payment_periods' => $period, 'investment_period' => (string) $months, 'interest-a-year' => (string) $rate]; }
function change(string $date, $rate): array { return ['date_of_change' => "$date 00:00:00", 'interest_a_year' => (string) $rate]; }
function investor(int $id, string $login, array $fields, array $meta = []): void
{
    $GLOBALS['users'][$id] = make_user($id, $login, ucfirst($login), 'Test', $meta + ['appeal' => 'Mr.', 'referred_by' => 'none']);
    $GLOBALS['acf'][$id] = $fields + ['investment' => false, 'withdraw' => false, 'investments_terms' => false, 'investment_terms_changes' => false, 'referral_bonus' => '', 'referral_has_year_return' => [], 'company_name' => '', 'color_theme' => false];
}

$today = new DateTime('now', new DateTimeZone('America/Mexico_City'));
$future = fn (string $mod) => (clone $today)->modify($mod)->format('Y-m-d');

// 146: the test investor from the preview (dates around today, some in the future).
investor(146, 'testinv', [
    'investment' => [inv('2026-11-04', 1000), inv('2026-11-11', 10000), inv('2026-11-28', 1000)],
    'withdraw' => [wd('2026-11-26', 101), wd('2026-11-26', 101), wd('2026-11-26', 101)],
    'investments_terms' => terms(9),
]);
// 113: long history, partial withdrawals, two terms changes, notes.
investor(113, 'longhistory', [
    'investment' => [inv('2017-03-15', 50000, 'Initial deposit'), inv('2018-01-31', 500), inv('2019-06-01', 25000), inv('2021-10-20', 12000)],
    'withdraw' => [wd('2018-07-18', 5348, 'Bank transfer'), wd('2022-02-10', 20000)],
    'investments_terms' => terms(9),
    'investment_terms_changes' => [change('2019-01-01', 10), change('2023-05-15', 8.5)],
]);
// 120: no terms of investment yet.
investor(120, 'noterms', ['investment' => [inv('2024-01-10', 70000)]]);
// 121: quarterly payments, one deposit, no withdrawals.
investor(121, 'quarterly', ['investment' => [inv('2023-02-28', 100000)], 'investments_terms' => terms(12, 'quarterly', '3')]);
// 130/131: referral bonus with yearly return (sees the Referral Bonus table).
investor(130, 'danklara', ['investment' => [inv('2020-05-05', 80000)], 'investments_terms' => terms(9), 'referral_bonus' => '5', 'referral_has_year_return' => ['yes']]);
investor(131, 'referred1', ['investment' => [inv('2021-03-03', 20000), inv('2022-08-19', 4000)], 'investments_terms' => terms(9)], ['referred_by' => 'danklara']);
// 140/141: referral bonus without return, not one of the Referral-table logins.
investor(140, 'bonusonly', ['investment' => [inv('2019-09-09', 60000)], 'investments_terms' => terms(9), 'referral_bonus' => '3']);
investor(141, 'referred2', ['investment' => [inv('2020-02-02', 10000)], 'investments_terms' => terms(9)], ['referred_by' => 'bonusonly']);
// 150: an incomplete investment row (no size), skipped by the page.
investor(150, 'incomplete', ['investment' => [inv('2022-04-04', 30000), inv('2023-04-04', '')], 'investments_terms' => terms(9)]);

// ---- Render the real page and read it --------------------------------------
function render_page(WP_User $user): DOMXPath
{
    $GLOBALS['current'] = $user;
    $tz = date_default_timezone_get();
    ob_start();
    (function () { include THEME_DIR . '/account-template.php'; })();
    $html = ob_get_clean();
    date_default_timezone_set($tz);
    $doc = new DOMDocument();
    @$doc->loadHTML('<?xml encoding="utf-8"?>' . $html);
    return new DOMXPath($doc);
}
function text(?DOMNode $node): string { return $node ? trim(preg_replace('/\s+/u', ' ', $node->textContent)) : ''; }

function page_figures(DOMXPath $x): array
{
    $rows = [];
    foreach ($x->query("//div[contains(@class,'investor-overview')]//tbody/tr") as $tr) {
        $tds = $x->query('./td', $tr);
        $tip = $x->query(".//span[contains(@class,'info-symbol-for-note')]", $tr)->item(0);
        $rows[] = [
            'class' => $tr->getAttribute('class'),
            'cells' => [text($tds->item(0)), text($tds->item(1)), text($tds->item(2))],
            'note'  => $tip ? $tip->getAttribute('title') : null,
            'dir'   => $tds->item(2) ? $tds->item(2)->getAttribute('class') : '',
        ];
    }
    $blocks = [];
    foreach ($x->query("//div[contains(@class,'block-side')][h6]") as $block) {
        $blocks[text($x->query('./h6', $block)->item(0))] = $block;
    }
    $number = fn (string $h) => isset($blocks[$h]) ? text($x->query(".//div[contains(@class,'total-number')]", $blocks[$h])->item(0)) : null;
    $returnTip = isset($blocks['Net Annualized Return']) ? $x->query(".//span[contains(@class,'info-symbol-for-note')]", $blocks['Net Annualized Return'])->item(0) : null;

    $referral = null;
    if ($table = $x->query("//div[contains(@class,'referral-table')]/table")->item(0)) {
        $referral = text($table);
    }
    return [
        'header_capital'    => text($x->query("//div[contains(@class,'diamond-header2-price')]//strong")->item(0)),
        'return'            => $number('Net Annualized Return'),
        'return_note'       => $returnTip ? $returnTip->getAttribute('title') : null,
        'interest_received' => $number('Interest Received USD'),
        'current_capital'   => $number('Current Capital USD'),
        'total_invested'    => $number('Total Invested USD'),
        'total_withdrawn'   => $number('Total Withdraw USD'),
        'rows'              => $rows,
        'referral'          => $referral,
    ];
}

// ---- The same, from what the plugin sends ------------------------------------
function usd(float $v): string { return '$' . number_format($v, 2, '.', ','); }
function day(string $iso): string { return (new DateTime($iso))->format('M j, Y'); }

function plugin_figures(array $a): array
{
    $rows = array_map(fn ($r) => match ($r['type']) {
        'deposit'    => ['class' => $r['muted'] ? 'mutted' : '', 'cells' => [day($r['date']), usd($r['amount']), usd($r['present_capital'])], 'note' => $r['note'], 'dir' => ''],
        'withdrawal' => ['class' => 'withdraw', 'cells' => [day($r['date']), 'Withdraw', '- ' . usd($r['amount'])], 'note' => $r['note'], 'dir' => ''],
        'terms'      => ['class' => 'terms', 'cells' => [day($r['date']), 'Your terms changed to', $r['rate'] . '%'], 'note' => null, 'dir' => (string) $r['direction']],
    }, $a['rows']);

    $referral = null;
    if ($a['referral'] !== null) {
        $ref = $a['referral'];
        $parts = [];
        foreach ($ref['investors'] as $investor) {
            $parts[] = $investor['name'];
            foreach ($investor['bonuses'] as $b) {
                $parts[] = usd($b['amount']) . '/' . day($b['date']) . ($ref['with_returns'] ? ' ' . usd($b['returned']) : '');
            }
        }
        if ($ref['has_referrals']) {
            $parts[] = 'Total Bonus ' . usd($ref['total_bonus']) . ($ref['with_returns'] ? ' ' . usd($ref['total_returned']) : '');
        } else {
            $parts[] = 'You do not have any referrals yet.';
        }
        $referral = $parts;
    }

    return [
        'header_capital'    => usd($a['current_capital']),
        'return'            => $a['net_annualized_return'],
        'return_note'       => $a['return_note'],
        'interest_received' => usd($a['interest_received']),
        'current_capital'   => usd($a['current_capital']),
        'total_invested'    => usd($a['total_invested']),
        'total_withdrawn'   => usd($a['total_withdrawn']),
        'rows'              => $rows,
        'referral'          => $referral,
    ];
}

// ---- Compare -----------------------------------------------------------------
$failures = 0;
function check(string $name, bool $ok, $detail = null): void
{
    global $failures;
    echo ($ok ? 'ok   ' : 'FAIL ') . $name . PHP_EOL;
    if (!$ok) {
        $failures++;
        if ($detail !== null) echo '     ' . json_encode($detail, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    }
}

$sentAll = [];
check('theme copy matches the calculation in the plugin', DankSync\Account\theme_changes() === [], DankSync\Account\theme_changes());

foreach ([146, 113, 120, 121, 130, 140, 150] as $id) {
    $user = $GLOBALS['users'][$id];
    $label = "#$id {$user->user_login}";

    // Where the page itself crashes (it depends on the PHP version), the
    // plugin must fail the same way rather than send different numbers.
    try {
        $page = page_figures(render_page($user));
    } catch (Throwable $pageError) {
        while (ob_get_level() > 0) ob_end_clean();
        date_default_timezone_set('UTC');
        try {
            DankSync\Account\calculate($user);
            check("$label page fails, plugin must fail too", false, $pageError->getMessage());
        } catch (Throwable $pluginError) {
            check("$label page and plugin fail the same way: " . $pageError->getMessage(), $pluginError->getMessage() === $pageError->getMessage());
        }
        check("$label timezone restored after failure", date_default_timezone_get() === 'UTC');
        continue;
    }
    $sent = DankSync\Account\calculate($user);
    $sentAll[$user->user_login] = $sent;
    $mine = plugin_figures($sent);

    foreach (['header_capital', 'return', 'return_note', 'interest_received', 'current_capital', 'total_invested', 'total_withdrawn'] as $field) {
        check("$label $field: {$page[$field]}", $page[$field] === $mine[$field], ['page' => $page[$field], 'plugin' => $mine[$field]]);
    }
    check("$label table: " . count($page['rows']) . ' rows identical', $page['rows'] === $mine['rows'], ['page' => $page['rows'], 'plugin' => $mine['rows']]);

    if ($page['referral'] === null) {
        check("$label no Referral Bonus table", $mine['referral'] === null);
    } else {
        $expected = implode(' ', $mine['referral'] ?? []);
        check("$label Referral Bonus table", $page['referral'] === $expected, ['page' => $page['referral'], 'plugin' => $expected]);
    }
    check("$label timezone restored", date_default_timezone_get() === 'UTC');
    check("$label as_of is today in Mexico City", $sent['as_of'] === (new DateTime('now', new DateTimeZone('America/Mexico_City')))->format('Y-m-d'));
}

// The app's contract test checks these against its schema.
if ($out = getenv('DANK_ACCOUNTS_OUT')) {
    file_put_contents($out, json_encode($sentAll));
}

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit($failures ? 1 : 0);
