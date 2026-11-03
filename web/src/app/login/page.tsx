import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/brand/logo.png";
import { BrandBackdrop } from "@/components/app/brand-backdrop";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="relative isolate flex flex-1 flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <BrandBackdrop />

      <Link href="/" className="mx-auto" aria-label="DANK Capital home">
        <Image src={logo} alt="DANK Capital" width={72} height={72} priority />
      </Link>

      <div className="mx-auto mt-12 w-full max-w-sm animate-rise">
        <h1 className="text-center text-[2rem] font-bold">Log in</h1>
        <span
          aria-hidden
          className="mx-auto mt-4 mb-8 block h-[3px] w-[34px] bg-accent"
        />
        <LoginForm />
      </div>

      <p className="mx-auto mt-auto max-w-sm pt-10 text-center text-xs text-faint">
        Use the email of your dank.capital account. New to DANK Capital?{" "}
        <a
          href="https://dank.capital/work-with-us/"
          className="text-muted underline underline-offset-4"
        >
          Contact us
        </a>
        .
      </p>
    </main>
  );
}
