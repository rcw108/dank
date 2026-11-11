<?php
/**
 * An investor's account page figures, exactly as dank.capital/account shows
 * them. The numbers come from the theme's own calculation (account-calc.php,
 * copied unchanged); this file only runs it for a given investor and reads
 * its results with the same rules the page uses to print them.
 */

namespace DankSync\Account;

use DateTime;
use WP_User;

if (!defined('ABSPATH')) {
    exit;
}

/** account-template.php shows the Referral Bonus table only to these logins. */
const REFERRAL_TABLE_LOGINS = ['danklara', 'dankalberto'];

/** Theme and ACF functions the calculation calls. Empty when all are loaded. */
function missing_dependencies(): array
{
    $missing = [];
    foreach (['count_amount_onpresent_time', 'net_annualized_return', 'netPayedAnnualyInterest'] as $function) {
        if (!function_exists($function)) {
            $missing[] = $function . '()';
        }
    }
    if (!function_exists('get_field') || !function_exists('have_rows')) {
        $missing[] = 'ACF';
    }
    if (!is_file(__DIR__ . '/account-calc.php') || !is_file(__DIR__ . '/theme-fingerprint.php')) {
        $missing[] = 'includes/account-calc.php (rebuild the plugin with tools/build.sh)';
    }
    return $missing;
}

/**
 * Theme files whose content differs from the copy in account-calc.php.
 * Non-empty means the site may now calculate differently from the app.
 */
function theme_changes(): array
{
    $file = __DIR__ . '/theme-fingerprint.php';
    if (!is_file($file)) {
        return ['includes/theme-fingerprint.php (not built)'];
    }
    $expected = require $file;
    $changed  = [];
    foreach ($expected as $file => $hash) {
        $path = function_exists('locate_template') ? locate_template($file) : '';
        if (!$path || !is_readable($path)) {
            $changed[] = $file . ' (not found)';
        } elseif (sha1_file($path) !== $hash) {
            $changed[] = $file;
        }
    }
    return $changed;
}

/**
 * @throws \RuntimeException when the theme or ACF is not loaded.
 * @throws \Throwable whatever the theme's calculation throws.
 */
function calculate(WP_User $user): array
{
    $missing = missing_dependencies();
    if ($missing) {
        throw new \RuntimeException('Account calculation unavailable, missing: ' . implode(', ', $missing) . '. Is the hello-theme-dank theme active?');
    }

    // The theme switches PHP to Mexico City time and may print warnings:
    // undo the first and swallow the second (they would break JSON replies).
    $timezone = date_default_timezone_get();
    $buffers  = ob_get_level();
    ob_start();
    try {
        return run($user);
    } finally {
        while (ob_get_level() > $buffers) {
            ob_end_clean();
        }
        date_default_timezone_set($timezone);
    }
}

/** Two decimals, as number_format(…, 2) prints them on the page. */
function money($value): float
{
    return round((float) $value, 2);
}

function run(WP_User $current_user): array
{
    include __DIR__ . '/account-calc.php';

    // ---- From here: what account-template.php prints, from the variables above.

    // Operations table (the loop that builds $investor_table_html).
    $rows = [];
    if ($TermsBeginning) {
        foreach ($investments_result_array ?? [] as $operation) {
            if (
                isset($operation['operation']) &&
                $operation['operation'] === 'investment' &&
                (!isset($operation['size']) || $operation['size'] === '' || !is_numeric($operation['size']))
            ) {
                continue;
            }
            $date = (new DateTime($operation['date']))->format('Y-m-d');
            $note = (string) ($operation['notes'] ?? '') !== '' ? (string) $operation['notes'] : null;

            switch ($operation['operation'] ?? '') {
                case 'investment':
                    $is_active = isset($operation['today']);
                    $rows[] = [
                        'type'            => 'deposit',
                        'date'            => $date,
                        'amount'          => money($operation['size']),
                        'present_capital' => money($is_active ? $operation['today'] : ($operation['before-withdraw'] ?? 0)),
                        'muted'           => !$is_active,
                        'note'            => $note,
                    ];
                    break;
                case 'withdraw':
                    $rows[] = [
                        'type'   => 'withdrawal',
                        'date'   => $date,
                        'amount' => money($operation['size']),
                        'note'   => $note,
                    ];
                    break;
                case 'terms_changed':
                    $rows[] = [
                        'type'      => 'terms',
                        'date'      => $date,
                        'rate'      => (string) ($operation['interest_a_year'] ?? ''),
                        'direction' => in_array($operation['upgrade_downgrade'] ?? null, ['upgrade', 'downgrade'], true) ? $operation['upgrade_downgrade'] : null,
                    ];
                    break;
            }
        }
    }

    // Header "Current capital" and the Current Capital block.
    if ($has_referred_user == true && $has_referred_user_and_year_return_on_it == false) {
        $capital = round($total_current_cap, 2) + round($total_referral_bonus, 2);
    } elseif ($has_referred_user == true && $has_referred_user_and_year_return_on_it == true) {
        $capital = round($total_current_cap, 2) + round($referred_bonus_returned_total, 2);
    } else {
        $capital = $total_current_cap;
    }

    // Interest Received block.
    if (($withdraw_count ?? 0) > 0) {
        $interest_received = $total_interest_received;
    } else {
        $interest_received = $total_current_cap - $total_investment;
    }

    // Net Annualized Return block, with its "terms changed" tooltip.
    $return_note = null;
    if ($TermsChanges == true) {
        $last    = $TermsChanges[count($TermsChanges) - 1];
        $changed = new DateTime($last['date_of_change']);
        $from    = round(($interest_rate ?? 0) / 12, 2, PHP_ROUND_HALF_UP);
        $to      = round($last['interest_a_year'] / 12, 2, PHP_ROUND_HALF_DOWN);
        $return_note = get_locale() == 'en_US'
            ? 'On ' . $changed->format('M j, Y') . ' We have adjusted your interest rate from ' . $from . '% to ' . $to . '% monthly'
            : 'En ' . $changed->format('M j, Y') . ' Hemos ajustado su tasa de interés de ' . $from . '% a ' . $to . '% mensual';
    }

    // Referral Bonus table (only some logins see it).
    $referral = null;
    if (in_array($current_user->user_login, REFERRAL_TABLE_LOGINS, true)) {
        $with_returns = $has_referred_user_and_year_return_on_it == true;
        $investors    = [];
        if ($has_referred_user == true) {
            for ($i = 0; $i < count($referred_investor_array); $i++) {
                $item    = $referred_investor_array[$i] ?? [];
                $list    = is_array($item['investments'] ?? null) ? $item['investments'] : [];
                $bonuses = [];
                for ($b = 0; $b < count($list); $b++) {
                    $bonuses[] = [
                        'amount'   => money($list[$b]['bonus_amount']),
                        'date'     => date('Y-m-d', strtotime($list[$b]['inv_date'])),
                        'returned' => $with_returns ? money($list[$b]['bonus_amount_returned'] ?? 0) : null,
                    ];
                }
                $investors[] = ['name' => (string) ($item['inv_fullname'] ?? ''), 'bonuses' => $bonuses];
            }
        }
        $referral = [
            'has_referrals'  => $has_referred_user == true,
            'with_returns'   => $with_returns,
            'investors'      => $investors,
            'total_bonus'    => money($total_referral_bonus),
            'total_returned' => $with_returns && $has_referred_user == true ? money($referred_bonus_returned_total) : null,
        ];
    }

    return [
        'as_of'                 => $current_date->format('Y-m-d'),
        'current_capital'       => money($capital),
        'net_annualized_return' => (string) ($net_annualized_return ?? ''),
        'return_note'           => $return_note,
        'interest_received'     => money($interest_received),
        'total_invested'        => money($total_investment),
        'total_withdrawn'       => money($total_withdraw),
        'rows'                  => $rows,
        'referral'              => $referral,
    ];
}
