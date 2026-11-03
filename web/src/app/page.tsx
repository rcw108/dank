import Image from "next/image";
import crest from "../../public/brand/crest.png";
import hall from "../../public/brand/hall.jpg";
import { MarketStrip } from "@/components/market/market-strip";

// Temporary welcome screen: proves the brand foundation (fonts, colors,
// imagery) before auth lands in step 3. The sign-in link becomes real then.
// The market strip previews the TradingView tickers; it moves to Overview in step 5.
export default function Home() {
  return (
    <main className="relative isolate flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-10 text-center">
        <Image
          src={hall}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-navy/85 via-navy/90 to-navy" />

        <Image
          src={crest}
          alt="DANK Capital crest"
          width={120}
          height={120}
          priority
          className="mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        />

        <h1 className="max-w-md text-[2rem] leading-tight">
          Your DANK Capital account, in your pocket
        </h1>
        <hr className="mx-auto mt-4 h-[3px] w-[34px] border-0 bg-teal" />
        <p className="mt-5 max-w-sm text-muted">
          Track your portfolio, returns and requests — the same data you see on
          dank.capital.
        </p>

        <span
          aria-disabled="true"
          className="mt-10 inline-flex items-center rounded-pill border border-white/35 px-8 py-3 text-sm font-medium tracking-wide uppercase opacity-80"
        >
          Log in
        </span>
      </div>

      <div className="pb-[env(safe-area-inset-bottom)]">
        <MarketStrip />
      </div>
    </main>
  );
}
