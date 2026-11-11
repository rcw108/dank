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
import {
  toInvestorPayload,
  toIsoDate,
  toNumber,
} from "../../src/lib/sync/mapping";
import { syncRequestSchema } from "../../src/lib/sync/snapshot";
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
  const payload = toInvestorPayload(
    first.snapshots[0],
    "00000000-0000-0000-0000-000000000000",
  );
  check("maps $89,384.16 → 89384.16", payload.current_capital === 89384.16);
  check("maps ACF total_invested", payload.total_invested === 50500);
  check("maps appeal Mrs → Mrs.", payload.appeal === "Mrs.");
  check(
    "keeps names from WordPress",
    payload.first_name === "Ana" && payload.last_name === "Lopez",
  );
  check(
    "unknown figures stay empty, not 0",
    payload.interest_received === null,
  );
}
const second = syncRequestSchema.parse(JSON.parse(requests[1].body));
check(
  "role removal arrives as is_investor: false",
  second.type === "snapshots" && second.snapshots[0].is_investor === false,
);

check(
  "toNumber handles 1,234.50 / junk",
  toNumber("1,234.50") === 1234.5 && toNumber("n/a") === null,
);
check(
  "toIsoDate handles ACF 20181107 and 07/11/2018",
  toIsoDate("20181107") === "2018-11-07" &&
    toIsoDate("07/11/2018") === "2018-11-07",
);

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
