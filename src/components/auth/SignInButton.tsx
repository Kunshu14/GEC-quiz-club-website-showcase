import { signIn } from "@/auth";
import { Button } from "@/components/ui";

async function handleSignIn() {
  "use server";
  await signIn("google", { redirectTo: "/dashboard" });
}

export function SignInButton() {
  return (
    <form action={handleSignIn}>
      <Button type="submit" variant="primary">
        Sign in with Google
      </Button>
    </form>
  );
}
