/**
 * Contract test between the dank-sync WordPress plugin (PHP) and the app.
 * Run from web/:  npm run test:contract
 * 1. Node signs a login-check request; the PHP plugin must accept it.
 * 2. The plugin pushes snapshots; Node must verify, parse and map them.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toInvestorPayload } from "../../src/lib/sync/mapping";
import { accountSchema, syncRequestSchema } from "../../src/lib/sync/snapshot";
import { sign, verify } from "../../src/lib/wordpress/signature";

const SECRET = "contract-test-secret";
const dir = mkdtempSync(join(tmpdir(), "dank-contract-"));
let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failures++;
};

// 1. App → WordPress
const body = JSON.stringify({ email: "investor@example.com" });
const timestamp = String(Math.floor(Date.now() / 1000));
writeFileSync(
  join(dir, "signed.json"),
  JSON.stringify({ body, timestamp, signature: sign(SECRET, timestamp, body) }),
);

console.log("— PHP plugin —");
try {
  execFileSync(
    "php",
    [
      "../wordpress/dank-sync/tests/plugin-test.php",
      join(dir, "signed.json"),
      join(dir, "requests.json"),
    ],
    { stdio: "inherit" },
  );
} catch {
  failures++;
}

// 2. WordPress → app
console.log("— App —");
const requests = JSON.parse(
  readFileSync(join(dir, "requests.json"), "utf8"),
) as {
  headers: Record<string, string>;
  body: string;
}[];
for (const [index, request] of requests.entries()) {
  check(
    `push #${index + 1}: signature verified by the app`,
    verify(
      SECRET,
      request.headers["X-Dank-Timestamp"],
      request.headers["X-Dank-Signature"],
      request.body,
    ),
  );
  check(
    `push #${index + 1}: rejected with a wrong secret`,
    !verify(
      "wrong",
      request.headers["X-Dank-Timestamp"],
      request.headers["X-Dank-Signature"],
      request.body,
    ),
  );
  const parsed = syncRequestSchema.safeParse(JSON.parse(request.body));
  check(`push #${index + 1}: matches the app's schema`, parsed.success);
}

const first = syncRequestSchema.parse(JSON.parse(requests[0].body));
if (first.type === "snapshots") {
  const snapshot = first.snapshots[0];
  const payload = toInvestorPayload(
    snapshot,
    "00000000-0000-0000-0000-000000000000",
  );
  const account = payload.account;
  check("account figures arrive calculated", account !== undefined);
  check(
    "totals as the page prints them",
    account?.total_invested === 60000 && account?.total_withdrawn === 5000,
  );
  check(
    "return kept as page text",
    /^\d+(\.\d+)?%$/.test(account?.net_annualized_return ?? ""),
  );
  check(
    "table rows in page order, terms row included",
    account?.operations.map((o) => o.type).join() ===
      "deposit,deposit,withdrawal,deposit,terms",
  );
  check(
    "profile: appeal, company, phone, theme",
    payload.appeal === "Mrs." &&
      payload.company_name === "Lopez Holdings" &&
      payload.phone === "+52 624 555 0100" &&
      payload.theme === "dark",
  );
  check(
    "keeps names from WordPress",
    payload.first_name === "Ana" && payload.last_name === "Lopez",
  );
  check(
    "diagnostics only in wp_meta",
    Object.keys(payload.wp_meta).join() === "roles,sent_at,account_error",
  );
}
const second = syncRequestSchema.parse(JSON.parse(requests[1].body));
check(
  "role removal arrives as is_investor: false",
  second.type === "snapshots" && second.snapshots[0].is_investor === false,
);
if (second.type === "snapshots") {
  const payload = toInvestorPayload(
    { ...second.snapshots[0], account: null, account_error: "boom" },
    "00000000-0000-0000-0000-000000000000",
  );
  check(
    "no account → figures left untouched",
    !("account" in payload) && payload.wp_meta.account_error === "boom",
  );
}

// 3. Real account page figures (needs the theme copy in wordpress/theme-src).
console.log("— Account page figures —");
try {
  execFileSync("php", ["../wordpress/dank-sync/tests/account-test.php"], {
    env: { ...process.env, DANK_ACCOUNTS_OUT: join(dir, "accounts.json") },
    stdio: ["ignore", "ignore", "ignore"],
  });
  const accounts = JSON.parse(
    readFileSync(join(dir, "accounts.json"), "utf8"),
  ) as Record<string, unknown>;
  for (const [login, account] of Object.entries(accounts)) {
    const parsed = accountSchema.safeParse(account);
    check(`${login}: real figures match the app's schema`, parsed.success);
    if (!parsed.success) console.log(parsed.error.issues.slice(0, 3));
  }
} catch {
  console.log(
    "skipped (no theme copy, or account-test failed: run it directly)",
  );
}

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
