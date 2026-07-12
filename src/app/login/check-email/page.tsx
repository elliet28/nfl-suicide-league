export default function CheckEmailPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Check your email
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        We sent you a sign-in link. Click it to continue &mdash; you can
        close this tab.
      </p>
    </div>
  );
}
