<?php
// php wordpress/dank-sync/tests/core-test.php
require __DIR__ . '/../includes/core.php';

use function DankSync\Core\{sign, verify, normalize_meta, is_excluded_key};

$failures = 0;
function check(string $name, bool $ok): void
{
    global $failures;
    echo ($ok ? "ok   " : "FAIL ") . $name . PHP_EOL;
    if (!$ok) $failures++;
}

$secret = 'test-secret';
$body = '{"email":"a@b.co"}';
$now = 1_800_000_000;
$ts = (string) $now;
$sig = sign($secret, $ts, $body);

check('signature is hex sha256', (bool) preg_match('/^[0-9a-f]{64}$/', $sig));
check('valid signature accepted', verify($secret, $ts, $sig, $body, $now));
check('uppercase signature accepted', verify($secret, $ts, strtoupper($sig), $body, $now));
check('tampered body rejected', !verify($secret, $ts, $sig, '{"email":"x@b.co"}', $now));
check('wrong secret rejected', !verify('other', $ts, $sig, $body, $now));
check('old timestamp rejected', !verify($secret, $ts, $sig, $body, $now + 301));
check('future timestamp rejected', !verify($secret, $ts, $sig, $body, $now - 301));
check('missing headers rejected', !verify($secret, null, null, $body, $now));
check('empty secret rejected', !verify('', $ts, sign('', $ts, $body), $body, $now));
check('non-numeric timestamp rejected', !verify($secret, '12a', $sig, $body, $now));

// Cross-check with the app's Node implementation (same vector).
check('known vector', sign('k', '1', 'b') === hash_hmac('sha256', '1.b', 'k'));

$meta = normalize_meta([
    'first_name' => ['Ana'],
    'current_capital' => ['89384.16'],
    'session_tokens' => ['a:1:{s:3:"abc";a:0:{}}'],
    'wp_capabilities' => ['a:1:{s:8:"investor";b:1;}'],
    '_current_capital' => ['field_abc'],
    'bank_account_number' => ['123'],
    'investments' => ['a:1:{i:0;a:3:{s:4:"date";s:10:"2018-07-11";s:6:"amount";s:5:"10000";s:11:"card_number";s:4:"4111";}}'],
    'tags' => ['x', 'y'],
    'evil' => ['O:8:"stdClass":0:{}'],
]);
check('keeps business fields', ($meta['first_name'] ?? null) === 'Ana' && ($meta['current_capital'] ?? null) === '89384.16');
check('drops session tokens', !isset($meta['session_tokens']));
check('drops capabilities', !isset($meta['wp_capabilities']));
check('drops private ACF refs', !isset($meta['_current_capital']));
check('drops bank account', !isset($meta['bank_account_number']));
check('unserializes arrays', ($meta['investments'][0]['date'] ?? null) === '2018-07-11');
check('scrubs nested card numbers', !isset($meta['investments'][0]['card_number']));
check('keeps multi-value meta as list', $meta['tags'] === ['x', 'y']);
check('never instantiates objects', !is_object($meta['evil']));
check('noise keys excluded', is_excluded_key('managenav-menuscolumnshidden') && is_excluded_key('rich_editing'));
check('result sorted', array_keys($meta) === array_values(array_unique(array_keys($meta))) && array_keys($meta) == (function ($k) { sort($k); return $k; })(array_keys($meta)));

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit($failures ? 1 : 0);
