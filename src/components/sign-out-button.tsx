import { buttonClass } from "@/components/ui/button";
import { signOut } from "@/server/auth";

export function SignOutButton() {
  return (
    <form
      className="shrink-0"
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className={buttonClass("secondary", "sm")}>
        Sign out
      </button>
    </form>
  );
}
