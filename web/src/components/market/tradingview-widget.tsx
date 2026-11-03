"use client";

import { useEffect, useRef } from "react";
import type { TickerSymbol } from "@/lib/market/symbols";
import { useResolvedTheme } from "@/components/theme/use-theme";

type WidgetKind = "tickers" | "ticker-tape";

type Props = {
  kind: WidgetKind;
  symbols: TickerSymbol[];
  /** Reserved height prevents layout shift while the iframe loads. */
  height: number;
  label: string;
};

/**
 * Embeds an official TradingView widget (same provider as dank.capital/account).
 * The embed script reads its JSON config from its own text content, so it must
 * be appended inside the container at runtime rather than via next/script.
 * Loading is deferred until after hydration so it never blocks the account data.
 */
export function TradingViewWidget({ kind, symbols, height, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Follows the app theme, so the widget re-renders on a theme switch.
  const colorTheme = useResolvedTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !colorTheme) return;

    const script = document.createElement("script");
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${kind}.js`;
    script.async = true;
    script.textContent = JSON.stringify({
      symbols,
      colorTheme,
      isTransparent: true,
      locale: "en",
      largeChartUrl: "",
      ...(kind === "ticker-tape"
        ? { displayMode: "adaptive", showSymbolLogo: true }
        : { width: "100%", height }),
    });
    container.appendChild(script);

    return () => {
      container.replaceChildren();
    };
  }, [kind, symbols, colorTheme, height]);

  // The "tickers" block lays symbols out to fit its width, so on a phone only
  // one fits. Give it room for all of them and let the investor swipe through.
  const isSwipeable = kind === "tickers";

  return (
    <section
      aria-label={label}
      className={
        isSwipeable
          ? "w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
          : "w-full overflow-hidden"
      }
    >
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        // color-scheme must match the light-scheme iframe document, otherwise
        // the browser paints an opaque white backdrop behind the transparent widget.
        style={{
          minHeight: height,
          colorScheme: "light",
          minWidth: isSwipeable ? symbols.length * 150 : undefined,
        }}
      />
    </section>
  );
}
