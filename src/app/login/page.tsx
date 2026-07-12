import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ll email you a link to sign in. This email is also where
          you&apos;ll get pick reminders and results.
        </p>
        <form
          className="mt-6 flex flex-col gap-3"
          action={async (formData) => {
            "use server";
            await signIn("resend", {
              email: formData.get("email"),
              redirectTo: "/dashboard",
            });
          }}
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="h-11 rounded-lg border border-zinc-300 bg-white px-4 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="h-11 rounded-full bg-foreground text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Send magic link
          </button>
        </form>
      </div>
    </div>
  );
}
