<?php
// php wordpress/dank-sync/tests/core-test.php
require __DIR__ . '/../includes/core.php';

use function DankSync\Core\{sign, verify, is_excluded_key};

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

// Which meta changes trigger a send.
check('business fields trigger a send', !is_excluded_key('investment_0_investment_size') && !is_excluded_key('appeal'));
check('session tokens / capabilities ignored', is_excluded_key('session_tokens') && is_excluded_key('wp_capabilities'));
check('private ACF refs ignored', is_excluded_key('_investment'));
check('bank and card keys ignored', is_excluded_key('bank_account_number') && is_excluded_key('card_number'));
check('noise keys ignored', is_excluded_key('managenav-menuscolumnshidden') && is_excluded_key('rich_editing'));

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit($failures ? 1 : 0);
