"use client";

import { Button, type ButtonProps } from "@pond/ui";

type LinkButtonProps = Omit<ButtonProps, "nativeButton" | "render"> & {
  href: string;
  external?: boolean;
};

export function LinkButton({
  href,
  external,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Button
      {...props}
      nativeButton={false}
      render={
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        />
      }
    >
      {children}
    </Button>
  );
}
