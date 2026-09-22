import type { Metadata } from "next";
import { Breadcrumbs, Card, SectionHeading } from "@/components/ui/primitives";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/types";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Report a code that did not work, submit an offer, or ask about advertising. We reply to everything.",
  alternates: { canonical: "/contact" },
};

const isTopic = (value: string | undefined): value is ContactTopic =>
  CONTACT_TOPICS.includes(value as ContactTopic);

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const topic = one(params.topic);
  const coupon = one(params.coupon);
  const store = one(params.store);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <SectionHeading
        eyebrow="Get in touch"
        title="Contact us"
        subtitle="A real person reads every message. Usually a reply within one working day."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <ContactForm
            defaultTopic={isTopic(topic) ? topic : "general"}
            couponId={coupon}
            storeId={store}
          />
        </Card>

        <aside className="space-y-4">
          <Card>
            <h3 className="mb-2 text-sm font-bold">A code did not work?</h3>
            <p className="text-sm text-body">
              Tell us which store and what the checkout said. We pull dead codes
              the same day — an offer that wastes your time is worse than no
              offer at all.
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-bold">Got an offer for us?</h3>
            <p className="text-sm text-body">
              Send the store, the code and where you found it. We verify before
              anything goes on the site.
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-bold">Advertising</h3>
            <p className="text-sm text-body">
              Banner placements and featured store slots are available across
              the homepage, category and store pages. Ask for the media pack.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
