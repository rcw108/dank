<?php
/**
 * Pure helpers with no WordPress dependency: request signing and cleaning
 * user meta before it leaves the site. Covered by tests/core-test.php.
 */

namespace DankSync\Core;

/** Signed requests older or newer than this many seconds are rejected. */
const SIGNATURE_WINDOW = 300;

/**
 * Keys that must never leave WordPress, at any depth (passwords, tokens,
 * bank and card details).
 */
const SENSITIVE_KEY = '/(pass(word)?|token|secret|session|nonce|card_?(number|num|no)|cvv|iban|swift|routing|account_?(number|num|no)|ssn|tax_?id|rfc_?number)/i';

/** WordPress and plugin bookkeeping that is useless to the app. */
const NOISE_KEY = '/(capabilities$|user_level$|user-settings|dismissed_wp_pointers|community-events-location|admin_color|rich_editing|syntax_highlighting|comment_shortcuts|show_admin_bar|use_ssl|^locale$|closedpostboxes|metaboxhidden|meta-box-order|screen_layout|columnshidden|_per_page$|^wpsec|^apbct|^ct_|^elementor_|^wp_dashboard|^nav_menu|^managenav)/i';

function sign(string $secret, string $timestamp, string $body): string
{
    return hash_hmac('sha256', $timestamp . '.' . $body, $secret);
}

function verify(string $secret, ?string $timestamp, ?string $signature, string $body, ?int $now = null): bool
{
    if ($secret === '' || $timestamp === null || $signature === null || !ctype_digit($timestamp)) {
        return false;
    }
    $now = $now ?? time();
    if (abs($now - (int) $timestamp) > SIGNATURE_WINDOW) {
        return false;
    }
    return hash_equals(sign($secret, $timestamp, $body), strtolower(trim($signature)));
}

function is_excluded_key(string $key): bool
{
    return $key === ''
        || $key[0] === '_'                       // private meta, incl. ACF field references
        || preg_match(SENSITIVE_KEY, $key) === 1
        || preg_match(NOISE_KEY, $key) === 1;
}

/** Unserialize PHP-serialized meta without ever instantiating objects. */
function unserialize_value($value)
{
    if (!is_string($value) || !preg_match('/^(a|s|i|d|b|N):/', $value)) {
        return $value;
    }
    $result = @unserialize($value, ['allowed_classes' => false]);
    return ($result !== false || $value === 'b:0;') ? $result : $value;
}

/** Remove sensitive keys at every depth (ACF repeaters, serialized arrays). */
function scrub($value)
{
    if (!is_array($value)) {
        return $value;
    }
    $clean = [];
    foreach ($value as $key => $item) {
        if (is_string($key) && preg_match(SENSITIVE_KEY, $key) === 1) {
            continue;
        }
        $clean[$key] = scrub($item);
    }
    return $clean;
}

/**
 * get_user_meta($id) output → flat, safe map: one value per key, values
 * unserialized, sensitive and noise keys removed, sorted by key.
 *
 * @param array<string, array<int, mixed>> $all
 * @return array<string, mixed>
 */
function normalize_meta(array $all): array
{
    $out = [];
    foreach ($all as $key => $values) {
        $key = (string) $key;
        if (is_excluded_key($key)) {
            continue;
        }
        $values = array_map(__NAMESPACE__ . '\\unserialize_value', (array) $values);
        $out[$key] = scrub(count($values) === 1 ? $values[0] : array_values($values));
    }
    ksort($out);
    return $out;
}
