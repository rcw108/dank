import Image from "next/image";
import crest from "../../public/brand/crest.png";
import { BrandBackdrop } from "@/components/app/brand-backdrop";
import { LinkButton } from "@/components/ui/button";

// Entry screen for signed-out visitors (signed-in ones are sent to /overview).
export default function Welcome() {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center">
      <BrandBackdrop />

      <Image
        src={crest}
        alt="DANK Capital crest"
        width={128}
        height={128}
        priority
        className="mb-8 animate-rise drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
      />

      <h1 className="max-w-md text-[2rem] leading-tight font-bold">
        Your DANK Capital account, in your pocket
      </h1>
      <span
        aria-hidden
        className="mx-auto mt-4 block h-[3px] w-[34px] bg-accent"
      />
      <p className="mt-5 max-w-sm text-muted">
        Your capital, returns and withdrawal requests — the same account you use
        on dank.capital.
      </p>

      <LinkButton
        href="/login"
        variant="outline"
        className="mt-10 w-full max-w-xs uppercase"
      >
        Log in
      </LinkButton>
    </main>
  );
}
