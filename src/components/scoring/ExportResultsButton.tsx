"use client";

import { useState } from "react";
import { Button, SpreadsheetIcon } from "@/components/ui";
import { ExportResultsModal } from "./ExportResultsModal";

interface ExportResultsButtonProps {
  quizId: string;
  quizTitle: string;
}

export function ExportResultsButton({ quizId, quizTitle }: ExportResultsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        variant="alt"
        className="cursor-pointer font-bold border-2 border-ink bg-yellow hover:bg-yellow/90 shadow-[2px_2px_0_var(--ink)] flex items-center gap-1.5"
      >
        <SpreadsheetIcon size={15} />
        Export Results
      </Button>
      <ExportResultsModal
        quizId={quizId}
        quizTitle={quizTitle}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
