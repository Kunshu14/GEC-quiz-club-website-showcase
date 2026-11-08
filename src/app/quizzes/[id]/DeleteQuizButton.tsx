"use client";

import { useTransition } from "react";
import { Button, TrashIcon } from "@/components/ui";
import { deleteQuiz } from "../actions";

export function DeleteQuizButton({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${quizTitle}"? This will remove the quiz and its running order log. This action cannot be undone.`)) {
      startTransition(async () => {
        await deleteQuiz(quizId);
      });
    }
  };

  return (
    <Button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      variant="underline"
      className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
    >
      {isPending ? "Deleting..." : (
        <>
          <TrashIcon size={12} /> Delete Quiz
        </>
      )}
    </Button>
  );
}
