import type { ReactNode, MouseEventHandler } from "react";
import { Magnetic } from "./Magnetic";

type Props = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "ghost" | "ink";
  size?: "md" | "sm";
  type?: "button" | "submit";
  onClick?: MouseEventHandler<HTMLElement>;
  magnetic?: boolean;
  icon?: "arrow" | "down" | "none";
  disabled?: boolean;
};

export function Arrow({ direction = "right" }: { direction?: "right" | "down" | "up-right" }) {
  const rotate = direction === "down" ? 90 : direction === "up-right" ? -45 : 0;
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" style={{ rotate: `${rotate}deg` }}>
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Pill button with a rolling label. Renders an <a> when given an href. */
export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  magnetic = true,
  icon = "arrow",
  disabled,
}: Props) {
  const className = `btn btn--${variant} btn--${size}`;
  const inner = (
    <>
      <span className="btn__roll">
        <span className="btn__text">{children}</span>
        <span className="btn__text" aria-hidden="true">
          {children}
        </span>
      </span>
      {icon !== "none" && (
        <span className="btn__icon">
          <Arrow direction={icon === "down" ? "down" : "right"} />
        </span>
      )}
    </>
  );

  const el = href ? (
    <a className={className} href={href} onClick={onClick}>
      {inner}
    </a>
  ) : (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );

  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
