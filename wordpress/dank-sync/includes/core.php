<?php
/**
 * Pure helpers with no WordPress dependency: request signing and deciding
 * which user meta changes matter. Covered by tests/core-test.php.
 */

namespace DankSync\Core;

/** Signed requests older or newer than this many seconds are rejected. */
const SIGNATURE_WINDOW = 300;

/** Passwords, tokens, bank and card details: changes to them never trigger a send. */
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
