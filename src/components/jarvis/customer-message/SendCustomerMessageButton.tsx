"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SendCustomerMessageModal } from "@/components/jarvis/customer-message/SendCustomerMessageModal";
import type { CustomerMessageTarget } from "@/lib/jarvis/customer-message/types";
import { cn } from "@/lib/utils";

interface SendCustomerMessageButtonProps {
  target: CustomerMessageTarget;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  className?: string;
  onSent?: () => void;
}

export function SendCustomerMessageButton({
  target,
  size = "sm",
  variant = "outline",
  className,
  onSent,
}: SendCustomerMessageButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn(className)}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        Nachricht vorbereiten
      </Button>
      <SendCustomerMessageModal
        open={open}
        onClose={() => setOpen(false)}
        target={target}
        onSent={onSent}
      />
    </>
  );
}
