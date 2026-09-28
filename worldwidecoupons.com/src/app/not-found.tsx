import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-black text-brand-gradient">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">That page has expired</h1>
      <p className="mt-2 text-body">
        The offer or store you were after is not here any more. Plenty of live
        ones are.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/coupons">Browse all offers</ButtonLink>
        <ButtonLink href="/stores" variant="secondary">
          All stores
        </ButtonLink>
      </div>
      <Link href="/" className="mt-6 text-sm font-semibold text-brand-600 hover:underline">
        ← Back home
      </Link>
    </div>
  );
}
