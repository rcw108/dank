import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Questions and answers" };

// Copied from dank.capital/faqs. Step 2+: load from WordPress so edits on the
// site appear here too.
const FAQ = [
  [
    "Is DANK Capital an investment broker or a bank?",
    "No, DANK Capital is a private investment management firm. We invest both our own funds and the resources entrusted to us by our clients. We are incorporated under Mexican law as a Sociedad Anónima Promotora de Inversiones de Capital Variable (SAPI de CV), a legal structure specific to private investment firms.",
  ],
  [
    "Can anyone invest in DANK Capital?",
    "Generally, yes. Both institutional and individual domestic clients can invest with us, subject to a management agreement and approval of our investment terms and conditions. U.S.-based clients are encouraged to contact us directly to discuss specific legal and structural requirements.",
  ],
  [
    "Where is DANK Capital legally formed?",
    "DANK Capital is legally incorporated in Mexico as a Sociedad Anónima Promotora de Inversiones de Capital Variable (SAPI de CV), a corporate structure established under Mexican law specifically for private investment entities.",
  ],
  [
    "In which geographies does DANK Capital operate?",
    "DANK Capital primarily operates in the U.S., focusing on liquid equities and real estate, and in Mexico, with a focus on commercial real estate. We also conduct some minor operations in the Canadian market.",
  ],
  [
    "Is DANK Capital an active or passive investment manager?",
    "DANK Capital is an active investment manager across all areas of investment. Our objective is to outperform the relevant market benchmarks in each of our investment areas.",
  ],
  [
    "Do investors have a guarantee for their capital?",
    "DANK Capital offers certain products (with fixed-income-like returns) where it could, in particular cases, provide real estate-backed guarantees to its investors.",
  ],
  [
    "Can I get partial payments of realized returns? Are there any restrictions to capital withdrawals?",
    "Yes, we offer investment structures that allow investors to receive partial and periodic payments of realized returns. In general, there are some restrictions on capital withdrawals for our investors.",
  ],
  [
    "In which currency are the investments made?",
    "All equity investments are made in USD, and returns are also provided in USD.",
  ],
  [
    "What is the minimum investment period?",
    "Most investment structures are designed for long-term commitments.",
  ],
  [
    "How can I invest?",
    "Contact us to receive the investment documentation package, which must be completed by both the investor and DANK. This includes a valid ID, proof of address, and other customary KYC requirements. During this process, DANK and the investor will assess the investor’s financial situation and design an investment structure, including specific terms and conditions for the investment contract.",
  ],
] as const;

export default function FaqPage() {
  return (
    <>
      <PageHeader
        title="Questions and answers"
        back={{ href: "/settings", label: "Account" }}
      />
      <div className="divide-y divide-line rounded-card border border-line bg-surface">
        {FAQ.map(([question, answer]) => (
          <details key={question} className="group px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
              {question}
              <span
                aria-hidden
                className="shrink-0 text-xl leading-none text-accent transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-5 leading-relaxed text-muted">{answer}</p>
          </details>
        ))}
      </div>
    </>
  );
}
