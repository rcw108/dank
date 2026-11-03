"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Moon } from "lucide-react";
import { Sun } from "lucide-react";
import { setTheme, useTheme, type Theme } from "@/components/theme/use-theme";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { InvestorProfile } from "@/lib/data/types";
import {
  requestAccountDeletion,
  requestEmailChange,
  requestProfileChange,
  type RequestState,
} from "./actions";

const idle: RequestState = { status: "idle" };

function Feedback({ state }: { state: RequestState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      className={`text-sm ${state.status === "sent" ? "text-accent" : "text-negative"}`}
    >
      {state.message}
    </p>
  );
}

export function ProfileForm({ profile }: { profile: InvestorProfile }) {
  const [state, action, pending] = useActionState(requestProfileChange, idle);

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm text-muted">Title</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["Mr.", "Ms.", "Mrs."] as const).map((appeal) => (
            <label key={appeal} className="cursor-pointer">
              <input
                type="radio"
                name="appeal"
                value={appeal}
                defaultChecked={profile.appeal === appeal}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center justify-center rounded-pill border border-line text-sm transition-colors peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                {appeal}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" name="firstName">
          <Input
            name="firstName"
            autoComplete="given-name"
            defaultValue={profile.firstName}
          />
        </Field>
        <Field label="Last name" name="lastName">
          <Input
            name="lastName"
            autoComplete="family-name"
            defaultValue={profile.lastName}
          />
        </Field>
      </div>
      <Field label="Phone" name="phone">
        <Input
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={profile.phone ?? ""}
        />
      </Field>
      <Feedback state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Request change"}
      </Button>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(requestEmailChange, idle);

  return (
    <form action={action} className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        You log in with codes sent to <span className="text-fg">{email}</span>.
      </p>
      <Field label="New email" name="email">
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
        />
      </Field>
      <Feedback state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Request email change"}
      </Button>
    </form>
  );
}

export function ThemeSwitch() {
  const theme = useTheme();
  const options: { value: Theme; label: string; Icon: typeof Moon }[] = [
    { value: "dark", label: "Dark", Icon: Moon },
    { value: "light", label: "Light", Icon: Sun },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="grid grid-cols-2 rounded-pill border border-line bg-bg p-1"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-pill text-sm font-medium transition-colors ${
            theme === value
              ? "bg-accent text-on-accent"
              : "text-muted hover:text-fg"
          }`}
        >
          <Icon size={16} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

export function DeleteAccount() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<RequestState>(idle);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => dialogRef.current?.showModal()}
        className="w-full"
      >
        Delete account
      </Button>
      <Feedback state={state} />
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(28rem,calc(100%-2.5rem))] rounded-card border border-line bg-surface p-6 text-fg backdrop:bg-black/60"
      >
        <h2 className="text-xl">Delete your account?</h2>
        <p className="mt-3 text-muted">
          We&apos;ll send a request to close your DANK Capital account. Our team
          will contact you about your remaining capital before anything is
          closed.
        </p>
        <div className="mt-6 grid gap-3">
          <Button
            variant="danger"
            className="border border-negative/50"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setState(await requestAccountDeletion());
                dialogRef.current?.close();
              })
            }
          >
            {pending ? "Sending…" : "Send deletion request"}
          </Button>
          <Button variant="outline" onClick={() => dialogRef.current?.close()}>
            Keep my account
          </Button>
        </div>
      </dialog>
    </>
  );
}
