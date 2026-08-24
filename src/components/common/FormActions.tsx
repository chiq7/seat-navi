import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type FormActionGroupProps = {
  children: ReactNode;
  className?: string;
};

type FormActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

type FormActionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

const primaryClass =
  "zr-focus flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-4 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(255,107,157,0.18)] transition-colors disabled:cursor-not-allowed disabled:bg-accent/35 disabled:shadow-none";

const secondaryClass =
  "zr-focus flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-divider bg-white px-4 text-[12px] font-black text-muted transition-colors hover:bg-section";

/** 投稿フォーム末尾の主操作・補助操作を縦にまとめる共通レイアウト。 */
export function FormActionGroup({ children, className }: FormActionGroupProps) {
  return <div className={`mt-5 space-y-2 ${className ?? ""}`} data-form-actions>{children}</div>;
}

/** 投稿を進める・送信するための主操作、または前画面に戻る補助操作。 */
export function FormActionButton({
  variant = "primary",
  className,
  ...props
}: FormActionButtonProps) {
  return (
    <button
      {...props}
      className={`${variant === "primary" ? primaryClass : secondaryClass} ${className ?? ""}`}
      data-form-action={variant}
    />
  );
}

/** フォームを中断して前の情報画面へ戻るための補助リンク。 */
export function FormActionLink({ href, children, className }: FormActionLinkProps) {
  return (
    <Link
      href={href}
      className={`${secondaryClass} ${className ?? ""}`}
      data-form-action="secondary"
    >
      {children}
    </Link>
  );
}
