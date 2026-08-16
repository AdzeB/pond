import { Logo } from "@pond/ui/logo";

export function Wordmark({ size = 16 }: { size?: number }) {
  return (
    <span className="wordmark">
      <Logo size={size + 2} />
      Pond
    </span>
  );
}
