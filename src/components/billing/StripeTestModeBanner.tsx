export function StripeTestModeBanner() {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const isTest = pk.startsWith("pk_test");

  if (!isTest) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      Stripe Testmodus aktiv — es werden keine echten Zahlungen verarbeitet.
    </div>
  );
}
