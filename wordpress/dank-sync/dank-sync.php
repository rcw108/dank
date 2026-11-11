<?php
/**
 * Plugin Name:       DANK Sync
 * Description:       Connects dank.capital to the DANK Capital investor app: confirms investors at app login and sends their custom fields to the app whenever they change.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      8.0
 * Author:            DANK Capital
 * License:           Proprietary
 */

namespace DankSync;

use WP_Error;
use WP_REST_Request;
use WP_User;

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/includes/core.php';

const VERSION        = '1.0.0';
const OPT_SETTINGS   = 'dank_sync_settings';
const OPT_SECRET     = 'dank_sync_secret';
const OPT_LOG        = 'dank_sync_log';
const LOG_SIZE       = 40;
const RETRY_HOOK     = 'dank_sync_retry';
const MAX_ATTEMPTS   = 5;
const BATCH_SIZE     = 25;
const DEFAULT_APP    = 'https://dank-nine.vercel.app';
const DEFAULT_ROLE   = 'investor';

/* -------------------------------------------------------------------------
 * Settings
 * ---------------------------------------------------------------------- */

function settings(): array
{
    $saved = get_option(OPT_SETTINGS, []);
    return wp_parse_args(is_array($saved) ? $saved : [], [
        'app_url' => DEFAULT_APP,
        'role'    => DEFAULT_ROLE,
    ]);
}

/** Shared secret; a DANK_SYNC_SECRET constant in wp-config.php wins. */
function secret(): string
{
    if (defined('DANK_SYNC_SECRET') && DANK_SYNC_SECRET) {
        return (string) DANK_SYNC_SECRET;
    }
    return (string) get_option(OPT_SECRET, '');
}

function generate_secret(): string
{
    return bin2hex(random_bytes(32));
}

register_activation_hook(__FILE__, function (): void {
    if (!get_option(OPT_SECRET)) {
        add_option(OPT_SECRET, generate_secret(), '', false);
    }
    if (!get_option(OPT_SETTINGS)) {
        add_option(OPT_SETTINGS, settings(), '', false);
    }
});

register_deactivation_hook(__FILE__, function (): void {
    wp_clear_scheduled_hook(RETRY_HOOK);
});

function is_investor(?WP_User $user): bool
{
    return $user instanceof WP_User && in_array(settings()['role'], (array) $user->roles, true);
}

/* -------------------------------------------------------------------------
 * Snapshot: everything the app needs about one investor
 * ---------------------------------------------------------------------- */

function snapshot(int $user_id): array
{
    $user = get_userdata($user_id);
    if (!$user instanceof WP_User) {
        return [
            'wp_user_id'  => $user_id,
            'email'       => '',
            'roles'       => [],
            'is_investor' => false,
            'deleted'     => true,
            'meta'        => new \stdClass(),
            'acf'         => new \stdClass(),
            'sent_at'     => time(),
        ];
    }

    $acf = [];
    if (function_exists('get_fields')) {
        $fields = get_fields('user_' . $user_id);
        $acf    = is_array($fields) ? Core\scrub($fields) : [];
    }
    $meta = Core\normalize_meta(get_user_meta($user_id));

    return [
        'wp_user_id'   => $user_id,
        'email'        => strtolower((string) $user->user_email),
        'login'        => (string) $user->user_login,
        'first_name'   => (string) $user->first_name,
        'last_name'    => (string) $user->last_name,
        'display_name' => (string) $user->display_name,
        'roles'        => array_values((array) $user->roles),
        'is_investor'  => is_investor($user),
        'deleted'      => false,
        // Empty PHP arrays encode as [], the app expects objects.
        'meta'         => $meta ?: new \stdClass(),
        'acf'          => $acf ?: new \stdClass(),
        'sent_at'      => time(),
    ];
}

/* -------------------------------------------------------------------------
 * Talking to the app
 * ---------------------------------------------------------------------- */

/** @return array{ok: bool, status: int, message: string} */
function send_to_app(array $payload): array
{
    $secret = secret();
    if ($secret === '') {
        return ['ok' => false, 'status' => 0, 'message' => 'Secret is not set'];
    }
    $body      = wp_json_encode($payload);
    $timestamp = (string) time();
    $url       = untrailingslashit(settings()['app_url']) . '/api/wp-sync';

    $response = wp_remote_post($url, [
        'timeout' => 8,
        'headers' => [
            'Content-Type'     => 'application/json',
            'X-Dank-Timestamp' => $timestamp,
            'X-Dank-Signature' => Core\sign($secret, $timestamp, $body),
        ],
        'body'    => $body,
    ]);

    if (is_wp_error($response)) {
        return ['ok' => false, 'status' => 0, 'message' => $response->get_error_message()];
    }
    $status = (int) wp_remote_retrieve_response_code($response);
    $reply  = json_decode((string) wp_remote_retrieve_body($response), true);
    $message = is_array($reply) && isset($reply['message']) ? (string) $reply['message'] : (string) wp_remote_retrieve_response_message($response);
    return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'message' => $message];
}

/** Sends investors' snapshots in batches; schedules a retry on failure. */
function push_users(array $user_ids, string $reason, int $attempt = 1): array
{
    $user_ids = array_values(array_unique(array_map('intval', $user_ids)));
    $results  = [];
    foreach (array_chunk($user_ids, BATCH_SIZE) as $chunk) {
        $result = send_to_app([
            'type'      => 'snapshots',
            'snapshots' => array_map(__NAMESPACE__ . '\\snapshot', $chunk),
        ]);
        log_event($chunk, $reason, $result);
        if (!$result['ok'] && $attempt < MAX_ATTEMPTS) {
            // 1, 2, 4, 8 minutes.
            wp_schedule_single_event(time() + 60 * (2 ** ($attempt - 1)), RETRY_HOOK, [$chunk, $attempt + 1]);
        }
        $results[] = $result;
    }
    return $results;
}

add_action(RETRY_HOOK, function ($user_ids, $attempt): void {
    push_users((array) $user_ids, 'retry #' . (int) $attempt, (int) $attempt);
}, 10, 2);

function log_event(array $user_ids, string $reason, array $result): void
{
    $log = get_option(OPT_LOG, []);
    $log = is_array($log) ? $log : [];
    array_unshift($log, [
        'time'    => time(),
        'users'   => implode(', ', $user_ids),
        'reason'  => $reason,
        'ok'      => $result['ok'],
        'status'  => $result['status'],
        'message' => mb_substr($result['message'], 0, 200),
    ]);
    update_option(OPT_LOG, array_slice($log, 0, LOG_SIZE), false);
}

/* -------------------------------------------------------------------------
 * Change detection: queue investors during the request, send once at the end
 * ---------------------------------------------------------------------- */

final class Queue
{
    /** @var array<int, string> user_id => reason */
    private static array $users = [];
    private static bool $registered = false;

    public static function add(int $user_id, string $reason): void
    {
        if ($user_id <= 0) {
            return;
        }
        self::$users[$user_id] = $reason;
        if (!self::$registered) {
            self::$registered = true;
            add_action('shutdown', [self::class, 'flush']);
        }
    }

    public static function flush(): void
    {
        $users = self::$users;
        self::$users = [];
        foreach (array_unique($users) as $reason) {
            $ids = array_keys(array_filter($users, fn ($r) => $r === $reason));
            push_users($ids, $reason);
        }
    }
}

/** Queue only investors, unless the change may have removed the role. */
function queue_if_investor(int $user_id, string $reason): void
{
    if (is_investor(get_userdata($user_id) ?: null)) {
        Queue::add($user_id, $reason);
    }
}

$on_meta = function ($meta_ids, $user_id, $meta_key): void {
    if (!Core\is_excluded_key((string) $meta_key)) {
        queue_if_investor((int) $user_id, 'field ' . $meta_key);
    }
};
add_action('added_user_meta', $on_meta, 10, 3);
add_action('updated_user_meta', $on_meta, 10, 3);
add_action('deleted_user_meta', $on_meta, 10, 3);

add_action('profile_update', fn ($user_id) => queue_if_investor((int) $user_id, 'profile'), 10, 1);
add_action('user_register', fn ($user_id) => queue_if_investor((int) $user_id, 'new user'), 10, 1);

// ACF saves user fields as "user_{ID}".
add_action('acf/save_post', function ($post_id): void {
    if (is_string($post_id) && str_starts_with($post_id, 'user_')) {
        queue_if_investor((int) substr($post_id, 5), 'ACF fields');
    }
}, 20);

// Role changes: also send when the investor role is taken away, so the app
// revokes access.
$on_role = function ($user_id, $role = '', $old_roles = []): void {
    $investor_role = settings()['role'];
    $was = in_array($investor_role, (array) $old_roles, true);
    $user = get_userdata((int) $user_id);
    if ($was || is_investor($user ?: null)) {
        Queue::add((int) $user_id, 'role');
    }
};
add_action('set_user_role', $on_role, 10, 3);
add_action('add_user_role', fn ($user_id, $role) => $role === settings()['role'] ? Queue::add((int) $user_id, 'role') : null, 10, 2);
add_action('remove_user_role', fn ($user_id, $role) => $role === settings()['role'] ? Queue::add((int) $user_id, 'role') : null, 10, 2);

// Deleted users: tell the app right away, the user is gone after this hook.
add_action('delete_user', function ($user_id): void {
    if (is_investor(get_userdata((int) $user_id) ?: null)) {
        $snapshot = snapshot((int) $user_id);
        $snapshot['is_investor'] = false;
        $snapshot['deleted']     = true;
        log_event([(int) $user_id], 'deleted', send_to_app(['type' => 'snapshots', 'snapshots' => [$snapshot]]));
    }
}, 10, 1);

/* -------------------------------------------------------------------------
 * REST: the app asks "is this email an investor?" at login
 * POST /wp-json/dank-sync/v1/check   {"email": "..."}   (signed)
 * ---------------------------------------------------------------------- */

add_action('rest_api_init', function (): void {
    register_rest_route('dank-sync/v1', '/check', [
        'methods'             => 'POST',
        'callback'            => __NAMESPACE__ . '\\rest_check',
        'permission_callback' => __NAMESPACE__ . '\\rest_verify',
    ]);
});

function rest_verify(WP_REST_Request $request)
{
    $ok = Core\verify(
        secret(),
        $request->get_header('x-dank-timestamp'),
        $request->get_header('x-dank-signature'),
        $request->get_body()
    );
    return $ok ?: new WP_Error('dank_sync_unauthorized', 'Invalid signature', ['status' => 401]);
}

function rest_check(WP_REST_Request $request): array
{
    $params = json_decode($request->get_body(), true);
    $email  = sanitize_email(is_array($params) ? (string) ($params['email'] ?? '') : '');
    $user   = $email ? get_user_by('email', $email) : false;

    if (!$user instanceof WP_User || !is_investor($user)) {
        return ['investor' => false];
    }
    return ['investor' => true, 'snapshot' => snapshot((int) $user->ID)];
}

/* -------------------------------------------------------------------------
 * Admin: Settings → DANK Sync
 * ---------------------------------------------------------------------- */

add_action('admin_menu', function (): void {
    add_options_page('DANK Sync', 'DANK Sync', 'manage_options', 'dank-sync', __NAMESPACE__ . '\\render_admin');
});

function investor_ids(): array
{
    return get_users(['role' => settings()['role'], 'fields' => 'ID', 'number' => -1]);
}

add_action('admin_post_dank_sync', function (): void {
    if (!current_user_can('manage_options')) {
        wp_die('Not allowed', 403);
    }
    check_admin_referer('dank_sync');
    $action = sanitize_key($_POST['dank_action'] ?? '');
    $notice = '';

    switch ($action) {
        case 'save':
            $url  = esc_url_raw(trim((string) wp_unslash($_POST['app_url'] ?? '')));
            $role = sanitize_key((string) wp_unslash($_POST['role'] ?? DEFAULT_ROLE));
            update_option(OPT_SETTINGS, ['app_url' => $url ?: DEFAULT_APP, 'role' => $role ?: DEFAULT_ROLE], false);
            $notice = 'Settings saved.';
            break;
        case 'regenerate':
            update_option(OPT_SECRET, generate_secret(), false);
            $notice = 'New secret generated. Put it into Vercel (WP_SYNC_SECRET) and redeploy the app.';
            break;
        case 'test':
            $result = send_to_app(['type' => 'ping']);
            $notice = $result['ok'] ? 'Connection works.' : 'Connection failed: ' . $result['status'] . ' ' . $result['message'];
            break;
        case 'push_all':
            $ids = investor_ids();
            $results = push_users($ids, 'manual: all investors');
            $failed = count(array_filter($results, fn ($r) => !$r['ok']));
            $notice = sprintf('Sent %d investors in %d batch(es); %d batch(es) failed.', count($ids), count($results), $failed);
            break;
        case 'push_one':
            $id = (int) ($_POST['user_id'] ?? 0);
            $results = push_users([$id], 'manual');
            $notice = ($results[0]['ok'] ?? false) ? "User #$id sent." : "User #$id failed: " . ($results[0]['message'] ?? '');
            break;
    }

    $preview = (int) ($_POST['user_id'] ?? 0);
    wp_safe_redirect(add_query_arg(array_filter([
        'page'           => 'dank-sync',
        'dank_notice'    => rawurlencode($notice),
        'preview'        => $preview ?: null,
    ]), admin_url('options-general.php')));
    exit;
});

function render_admin(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    $s        = settings();
    $secret   = secret();
    $from_cfg = defined('DANK_SYNC_SECRET') && DANK_SYNC_SECRET;
    $notice   = isset($_GET['dank_notice']) ? sanitize_text_field(rawurldecode((string) wp_unslash($_GET['dank_notice']))) : '';
    $preview  = isset($_GET['preview']) ? (int) $_GET['preview'] : 0;
    $ids      = investor_ids();
    $log      = get_option(OPT_LOG, []);
    $form     = function (string $action, string $label, string $extra = '', string $class = 'button') {
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="display:inline-block;margin:0 8px 8px 0">';
        wp_nonce_field('dank_sync');
        echo '<input type="hidden" name="action" value="dank_sync"><input type="hidden" name="dank_action" value="' . esc_attr($action) . '">';
        echo $extra; // phpcs:ignore -- built from escaped parts below
        echo '<button class="' . esc_attr($class) . '">' . esc_html($label) . '</button></form>';
    };
    ?>
    <div class="wrap">
        <h1>DANK Sync</h1>
        <p>Connects this site to the DANK Capital investor app. Investors with the
            <code><?php echo esc_html($s['role']); ?></code> role can log in to the app, and their fields are sent to it whenever they change.</p>

        <?php if ($notice) : ?>
            <div class="notice notice-info"><p><?php echo esc_html($notice); ?></p></div>
        <?php endif; ?>

        <h2>1. Connection</h2>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <?php wp_nonce_field('dank_sync'); ?>
            <input type="hidden" name="action" value="dank_sync"><input type="hidden" name="dank_action" value="save">
            <table class="form-table" role="presentation">
                <tr><th scope="row"><label for="app_url">App address</label></th>
                    <td><input id="app_url" name="app_url" type="url" class="regular-text" value="<?php echo esc_attr($s['app_url']); ?>"></td></tr>
                <tr><th scope="row"><label for="role">Investor role (slug)</label></th>
                    <td><input id="role" name="role" type="text" class="regular-text" value="<?php echo esc_attr($s['role']); ?>">
                        <p class="description"><?php echo esc_html(count($ids)); ?> users have this role.</p></td></tr>
                <tr><th scope="row"><label for="secret">Secret</label></th>
                    <td><input id="secret" type="password" class="regular-text code" readonly value="<?php echo esc_attr($secret); ?>"
                               onfocus="this.type='text';this.select()" onblur="this.type='password'">
                        <button type="button" class="button" onclick="navigator.clipboard.writeText(document.getElementById('secret').value);this.textContent='Copied'">Copy</button>
                        <p class="description">Add it in Vercel → project → Settings → Environment Variables as <code>WP_SYNC_SECRET</code>, then redeploy.
                            <?php echo $from_cfg ? 'Set in wp-config.php (DANK_SYNC_SECRET).' : ''; ?></p></td></tr>
            </table>
            <?php submit_button('Save settings'); ?>
        </form>
        <?php
        $form('test', 'Test connection', '', 'button button-secondary');
        if (!$from_cfg) {
            $form('regenerate', 'Generate new secret');
        }
        ?>

        <h2>2. Send data</h2>
        <p>Changes are sent automatically. Use this for the first transfer or after fixing a problem.</p>
        <?php $form('push_all', 'Send all ' . count($ids) . ' investors now', '', 'button button-primary'); ?>

        <h2>3. Investor data preview</h2>
        <p>Exactly what the app receives for one investor. Passwords, tokens and bank details are removed.</p>
        <form method="get" action="<?php echo esc_url(admin_url('options-general.php')); ?>">
            <input type="hidden" name="page" value="dank-sync">
            <select name="preview">
                <option value="">Choose an investor…</option>
                <?php foreach (array_slice($ids, 0, 500) as $id) :
                    $u = get_userdata((int) $id); ?>
                    <option value="<?php echo esc_attr($id); ?>" <?php selected($preview, (int) $id); ?>>
                        #<?php echo esc_html($id . ' ' . ($u ? $u->user_email : '')); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <button class="button">Show</button>
        </form>
        <?php if ($preview) : ?>
            <pre style="max-height:420px;overflow:auto;background:#fff;border:1px solid #ccd0d4;padding:12px"><?php
                echo esc_html(wp_json_encode(snapshot($preview), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            ?></pre>
            <?php $form('push_one', 'Send this investor now', '<input type="hidden" name="user_id" value="' . esc_attr((string) $preview) . '">'); ?>
        <?php endif; ?>

        <h2>4. Recent activity</h2>
        <table class="widefat striped">
            <thead><tr><th>Time</th><th>Users</th><th>Reason</th><th>Result</th></tr></thead>
            <tbody>
            <?php if (!$log) : ?>
                <tr><td colspan="4">Nothing sent yet.</td></tr>
            <?php endif; ?>
            <?php foreach ((array) $log as $row) : ?>
                <tr>
                    <td><?php echo esc_html(wp_date('Y-m-d H:i:s', (int) $row['time'])); ?></td>
                    <td><?php echo esc_html($row['users']); ?></td>
                    <td><?php echo esc_html($row['reason']); ?></td>
                    <td><?php echo esc_html(($row['ok'] ? 'OK' : 'Failed') . ' ' . $row['status'] . ' ' . $row['message']); ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php
}

/* -------------------------------------------------------------------------
 * WP-CLI: wp dank-sync push --all | --user=<id|email> ; wp dank-sync show --user=<id|email>
 * ---------------------------------------------------------------------- */

if (defined('WP_CLI') && WP_CLI) {
    \WP_CLI::add_command('dank-sync', new class {
        private function resolve(string $user): int
        {
            $found = is_numeric($user) ? get_userdata((int) $user) : get_user_by('email', $user);
            if (!$found) {
                \WP_CLI::error("User not found: $user");
            }
            return (int) $found->ID;
        }

        /**
         * Send investors to the app.
         *
         * [--all]
         * : Every user with the investor role.
         *
         * [--user=<id|email>]
         * : One user.
         */
        public function push($args, $assoc): void
        {
            $ids = isset($assoc['all']) ? investor_ids() : [$this->resolve((string) ($assoc['user'] ?? ''))];
            $results = push_users($ids, 'wp-cli');
            foreach ($results as $i => $r) {
                \WP_CLI::log(sprintf('Batch %d: %s %d %s', $i + 1, $r['ok'] ? 'OK' : 'FAILED', $r['status'], $r['message']));
            }
            \WP_CLI::success(sprintf('%d user(s) processed.', count($ids)));
        }

        /**
         * Print what the app receives for a user.
         *
         * --user=<id|email>
         * : The user.
         */
        public function show($args, $assoc): void
        {
            \WP_CLI::log(wp_json_encode(snapshot($this->resolve((string) $assoc['user'])), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
    });
}
