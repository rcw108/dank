"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestCode, verifyCode, type LoginState } from "./actions";

const RESEND_AFTER_SECONDS = 30;

export function LoginForm() {
  const [emailState, sendCode, sending] = useActionState(requestCode, {
    step: "email",
  } as LoginState);

  if (emailState.step === "code") {
    // Remount the code form for every new code so its state starts fresh.
    return (
      <CodeForm
        key={emailState.sentAt}
        initial={emailState}
        resend={sendCode}
        resending={sending}
      />
    );
  }

  return (
    <form action={sendCode} className="flex flex-col gap-6" noValidate>
      <Field label="Email" name="email" error={emailState.error}>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          placeholder="you@example.com"
          defaultValue={emailState.email}
          error={emailState.error}
          required
          autoFocus
        />
      </Field>
      <Button type="submit" disabled={sending} className="uppercase">
        {sending ? "Sending code…" : "Send code"}
      </Button>
    </form>
  );
}

function CodeForm({
  initial,
  resend,
  resending,
}: {
  initial: Extract<LoginState, { step: "code" }>;
  resend: (formData: FormData) => void;
  resending: boolean;
}) {
  const [state, verify, verifying] = useActionState(
    verifyCode,
    initial as LoginState,
  );
  const email = initial.email;
  const secondsLeft = useCountdown(initial.sentAt, RESEND_AFTER_SECONDS);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-fg">{email}</span>. It expires in 10
        minutes.
      </p>

      <form action={verify} className="flex flex-col gap-6" noValidate>
        <Field label="One-time code" name="code" error={state.error}>
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="••••••"
            error={state.error}
            className="tracking-[0.5em]"
            required
            autoFocus
          />
        </Field>
        <Button type="submit" disabled={verifying} className="uppercase">
          {verifying ? "Checking…" : "Log in"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-1 text-sm">
        <form action={resend}>
          <input type="hidden" name="email" value={email} />
          <Button
            type="submit"
            variant="ghost"
            disabled={secondsLeft > 0 || resending}
            className="min-h-10"
          >
            {secondsLeft > 0
              ? `Send a new code in ${secondsLeft}s`
              : "Send a new code"}
          </Button>
        </form>
        <a
          href="/login"
          className="text-muted underline-offset-4 hover:underline"
        >
          Use a different email
        </a>
      </div>
    </div>
  );
}

function useCountdown(startedAt: number, seconds: number) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, seconds - Math.floor((now - startedAt) / 1000));
}
