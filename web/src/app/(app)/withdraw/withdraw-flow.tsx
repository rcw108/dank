"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { CreditCard } from "lucide-react";
import { Landmark } from "lucide-react";
import { Mail } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/section";
import { formatUsd } from "@/lib/format";
import { METHODS, methodSchema, type Method } from "@/lib/withdrawal";
import { sendWithdrawalCode, submitWithdrawal } from "./actions";

type Props = {
  capital: number;
  minimumBalance: number;
  cardDailyLimit: number;
  email: string;
  demoCode: string | null;
};

type Details = Record<string, string>;
type Errors = Record<string, string | undefined>;

const STEPS = ["Amount", "Payout details", "Review"] as const;
const METHOD_ICONS = { card: CreditCard, wire: Landmark, check: Mail } as const;

export function WithdrawFlow({
  capital,
  minimumBalance,
  cardDailyLimit,
  email,
  demoCode,
}: Props) {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("wire");
  const [details, setDetails] = useState<Details>({});
  const [errors, setErrors] = useState<Errors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eligible = capital > minimumBalance;
  const amountValue = Number(amount);

  if (reference) {
    return <Done reference={reference} amount={amountValue} email={email} />;
  }

  if (!eligible) {
    return (
      <Card className="p-6">
        <h2 className="text-lg">Withdrawals aren&apos;t available yet</h2>
        <p className="mt-2 text-muted">
          Withdrawals open when your balance is above{" "}
          {formatUsd(minimumBalance)}. Your current capital is{" "}
          {formatUsd(capital)}.
        </p>
        <LinkButton href="/faq" variant="outline" className="mt-6 w-full">
          Read the FAQ
        </LinkButton>
      </Card>
    );
  }

  function validateAmount(): boolean {
    let error: string | undefined;
    if (!amount || !(amountValue > 0)) error = "Enter an amount above zero.";
    else if (amountValue > capital)
      error = `You can withdraw up to ${formatUsd(capital)}.`;
    setErrors({ amount: error });
    return !error;
  }

  function validateDetails(): boolean {
    const result = methodSchema.safeParse({ method, ...details });
    if (result.success) {
      if (method === "card" && amountValue > cardDailyLimit) {
        setErrors({
          method: `Card withdrawals are limited to ${formatUsd(cardDailyLimit)} per day. Lower the amount or choose another method.`,
        });
        return false;
      }
      setErrors({});
      return true;
    }
    const next: Errors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "method");
      next[key] ??= issue.message;
    }
    setErrors(next);
    return false;
  }

  function goNext() {
    if (step === 0 && validateAmount()) setStep(1);
    if (step === 1 && validateDetails()) setStep(2);
  }

  function sendCode() {
    startTransition(async () => {
      const result = await sendWithdrawalCode();
      if (result.ok) setCodeSent(true);
      else setSubmitError("Your session has ended. Log in again.");
    });
  }

  function submit() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitWithdrawal({
        amount: amountValue,
        details: { method, ...details },
        confirmed,
        code,
      });
      if (result.ok) setReference(result.reference);
      else setSubmitError(result.error);
    });
  }

  const set = (key: string) => (event: { target: { value: string } }) =>
    setDetails((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <div>
      <Progress step={step} />

      {step === 0 ? (
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <p className="text-sm text-muted">Available capital</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {formatUsd(capital)}
            </p>
          </Card>
          <Field label="Amount, USD" name="amount" error={errors.amount}>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
              >
                $
              </span>
              <Input
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^\d.]/g, ""))
                }
                error={errors.amount}
                className="pl-8 font-display text-xl tabular-nums"
                autoFocus
              />
            </div>
          </Field>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              Withdrawals are available while your balance is above{" "}
              {formatUsd(minimumBalance)}.
            </li>
            <li>
              Card withdrawals are limited to {formatUsd(cardDailyLimit)} per
              day.
            </li>
          </ul>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-6">
          <fieldset>
            <legend className="mb-3 text-sm text-muted">
              Where should we send the money?
            </legend>
            <div className="grid gap-3">
              {(Object.keys(METHODS) as Method[]).map((key) => {
                const Icon = METHOD_ICONS[key];
                const selected = method === key;
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-4 rounded-card border p-4 transition-colors ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-line bg-surface hover:border-fg/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={key}
                      checked={selected}
                      onChange={() => {
                        setMethod(key);
                        setErrors({});
                      }}
                      className="sr-only"
                    />
                    <Icon
                      size={22}
                      aria-hidden
                      className={selected ? "text-accent" : "text-muted"}
                    />
                    <span className="flex-1">
                      <span className="block font-medium">
                        {METHODS[key].label}
                      </span>
                      <span className="block text-sm text-muted">
                        {METHODS[key].detail}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`flex size-5 items-center justify-center rounded-full border ${selected ? "border-accent bg-accent text-on-accent" : "border-line"}`}
                    >
                      {selected ? <Check size={13} strokeWidth={3} /> : null}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.method ? (
              <p className="mt-3 text-sm text-negative">{errors.method}</p>
            ) : null}
          </fieldset>

          {method === "card" ? (
            <>
              <Field label="Bank name" name="bankName" error={errors.bankName}>
                <Input
                  name="bankName"
                  autoComplete="off"
                  value={details.bankName ?? ""}
                  onChange={set("bankName")}
                  error={errors.bankName}
                />
              </Field>
              <Field
                label="Card number"
                name="cardNumber"
                error={errors.cardNumber}
              >
                <Input
                  name="cardNumber"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={details.cardNumber ?? ""}
                  onChange={set("cardNumber")}
                  error={errors.cardNumber}
                />
              </Field>
            </>
          ) : null}

          {method === "wire" ? (
            <>
              <Field label="Bank name" name="bankName" error={errors.bankName}>
                <Input
                  name="bankName"
                  autoComplete="off"
                  value={details.bankName ?? ""}
                  onChange={set("bankName")}
                  error={errors.bankName}
                />
              </Field>
              <Field
                label="Account holder name"
                name="accountHolder"
                error={errors.accountHolder}
              >
                <Input
                  name="accountHolder"
                  autoComplete="name"
                  value={details.accountHolder ?? ""}
                  onChange={set("accountHolder")}
                  error={errors.accountHolder}
                />
              </Field>
              <Field
                label="Account number"
                name="accountNumber"
                error={errors.accountNumber}
              >
                <Input
                  name="accountNumber"
                  autoComplete="off"
                  value={details.accountNumber ?? ""}
                  onChange={set("accountNumber")}
                  error={errors.accountNumber}
                />
              </Field>
              <Field
                label="Routing number"
                name="routingNumber"
                hint="For transfers within the US"
              >
                <Input
                  name="routingNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  value={details.routingNumber ?? ""}
                  onChange={set("routingNumber")}
                />
              </Field>
              <Field
                label="SWIFT code"
                name="swift"
                error={errors.swift}
                hint="For international transfers"
              >
                <Input
                  name="swift"
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={details.swift ?? ""}
                  onChange={set("swift")}
                  error={errors.swift}
                />
              </Field>
            </>
          ) : null}

          {method === "check" ? (
            <>
              <Field
                label="Make the check payable to"
                name="payableTo"
                error={errors.payableTo}
              >
                <Input
                  name="payableTo"
                  autoComplete="name"
                  value={details.payableTo ?? ""}
                  onChange={set("payableTo")}
                  error={errors.payableTo}
                />
              </Field>
              <Field
                label="Delivery address"
                name="deliveryAddress"
                error={errors.deliveryAddress}
              >
                <Textarea
                  name="deliveryAddress"
                  autoComplete="street-address"
                  value={details.deliveryAddress ?? ""}
                  onChange={set("deliveryAddress")}
                />
              </Field>
            </>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-6">
          <Card className="px-5">
            <dl className="divide-y divide-line">
              <ReviewRow label="Amount" value={formatUsd(amountValue)} strong />
              <ReviewRow label="Method" value={METHODS[method].label} />
              {summarize(method, details).map(([label, value]) => (
                <ReviewRow key={label} label={label} value={value} />
              ))}
            </dl>
          </Card>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-accent"
            />
            <span>The amount and payout details are correct.</span>
          </label>

          <div className="flex flex-col gap-3">
            {codeSent ? (
              <Field
                label={`Code sent to ${email}`}
                name="code"
                hint={demoCode ? `Demo mode: use code ${demoCode}` : undefined}
              >
                <Input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="tracking-[0.5em]"
                />
              </Field>
            ) : (
              <p className="text-sm text-muted">
                To protect your account, we&apos;ll email you a code to confirm
                this request.
              </p>
            )}
          </div>

          {submitError ? (
            <p
              role="alert"
              className="rounded-field border border-negative/40 bg-negative/10 p-3 text-sm text-negative"
            >
              {submitError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={pending}
            className="flex-1"
          >
            Back
          </Button>
        ) : null}
        {step < 2 ? (
          <Button onClick={goNext} className="flex-1 uppercase">
            Continue
          </Button>
        ) : codeSent ? (
          <Button
            onClick={submit}
            disabled={pending || !confirmed || code.length !== 6}
            className="flex-1 uppercase"
          >
            {pending ? "Sending…" : "Send request"}
          </Button>
        ) : (
          <Button
            onClick={sendCode}
            disabled={pending || !confirmed}
            className="flex-1 uppercase"
          >
            {pending ? "Sending code…" : "Email me a code"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-baseline justify-between text-sm">
        <span className="font-medium">{STEPS[step]}</span>
        <span className="text-muted">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden>
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`h-1 rounded-full ${index <= step ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={`text-right ${strong ? "font-display text-xl font-semibold tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function summarize(method: Method, d: Details): [string, string][] {
  if (method === "card") {
    const digits = (d.cardNumber ?? "").replace(/\D/g, "");
    return [
      ["Bank", d.bankName ?? ""],
      ["Card", `•••• ${digits.slice(-4)}`],
    ];
  }
  if (method === "wire") {
    return [
      ["Bank", d.bankName ?? ""],
      ["Account holder", d.accountHolder ?? ""],
      ["Account", `•••• ${(d.accountNumber ?? "").slice(-4)}`],
      ...(d.routingNumber
        ? [["Routing number", d.routingNumber] as [string, string]]
        : []),
      ...(d.swift ? [["SWIFT", d.swift] as [string, string]] : []),
    ];
  }
  return [
    ["Payable to", d.payableTo ?? ""],
    ["Deliver to", d.deliveryAddress ?? ""],
  ];
}

function Done({
  reference,
  amount,
  email,
}: {
  reference: string;
  amount: number;
  email: string;
}) {
  return (
    <div className="flex flex-col items-center pt-6 text-center animate-rise">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent text-on-accent">
        <Check size={32} strokeWidth={2.5} aria-hidden />
      </span>
      <h2 className="mt-6 text-2xl">Request sent</h2>
      <p className="mt-3 max-w-sm text-muted">
        We received your request to withdraw {formatUsd(amount)}. Our team will
        review it and reply to {email}.
      </p>
      <p className="mt-4 text-sm text-faint">Reference {reference}</p>
      <div className="mt-8 grid w-full gap-3">
        <LinkButton href="/overview" className="uppercase">
          Back to overview
        </LinkButton>
        <Link href="/operations" className="py-2 text-sm text-accent">
          View operations
        </Link>
      </div>
    </div>
  );
}
