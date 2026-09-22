"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { FormSection, ImagePicker, MultiSelect, SaveBar } from "@/components/admin/fields";
import { useAction, useAdminData } from "@/components/admin/hooks";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";
import {
  categories as categoriesApi,
  coupons as couponsApi,
  homepage as homepageApi,
  stores as storesApi,
} from "@/lib/endpoints";
import { readToken } from "@/lib/session";
import type { HomepageBanner, HomepageBlock, HomepageConfig, ImageRef } from "@/lib/types";

interface SectionState {
  category: string;
  heading: string;
  coupons: string[];
  stores: string[];
  order: number;
}

export default function AdminHomepagePage() {
  const config = useAdminData((token) => homepageApi.getConfig(token));
  const { busy, run } = useAction();

  const couponOptions = useAdminData((token) =>
    couponsApi.list({ limit: 100, status: "active", sort: "newest" }, { token })
  );
  const storeOptions = useAdminData((token) =>
    storesApi.list({ limit: 300, sort: "name" }, { token })
  );
  const categoryOptions = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));

  const [heroCoupon, setHeroCoupon] = useState("");
  const [heroHeading, setHeroHeading] = useState("");
  const [heroSubheading, setHeroSubheading] = useState("");
  const [heroImage, setHeroImage] = useState<ImageRef | null>(null);
  const [featuredCoupons, setFeaturedCoupons] = useState<string[]>([]);
  const [featuredStores, setFeaturedStores] = useState<string[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionState[]>([]);
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [announcement, setAnnouncement] = useState({ text: "", link: "", active: false });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const data = config.data;
    if (!data) return;

    setHeroCoupon(data.heroCoupon ?? "");
    setHeroHeading(data.heroHeading ?? "");
    setHeroSubheading(data.heroSubheading ?? "");
    setHeroImage(data.heroImage ?? null);
    setFeaturedCoupons(data.featuredCoupons ?? []);
    setFeaturedStores(data.featuredStores ?? []);
    setFeaturedCategories(data.featuredCategories ?? []);
    setSections(
      (data.categorySections ?? []).map((section, index) => ({
        category: section.category,
        heading: section.heading ?? "",
        coupons: section.coupons ?? [],
        stores: section.stores ?? [],
        order: section.order ?? index,
      }))
    );
    setBlocks(data.customBlocks ?? []);
    setBanners(
      (data.heroBanners ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((banner, index) => ({ ...banner, order: index }))
    );
    setAnnouncement({
      text: data.announcement?.text ?? "",
      link: data.announcement?.link ?? "",
      active: data.announcement?.active ?? false,
    });
    setDirty(false);
  }, [config.data]);

  const touch = () => setDirty(true);

  const save = () => {
    const payload: Partial<HomepageConfig> = {
      heroCoupon: heroCoupon || null,
      heroHeading: heroHeading.trim(),
      heroSubheading: heroSubheading.trim(),
      heroImage,
      featuredCoupons,
      featuredStores,
      featuredCategories,
      categorySections: sections
        .filter((section) => section.category)
        .map((section, index) => ({ ...section, order: index })),
      customBlocks: blocks.filter((block) => block.title.trim()),
      heroBanners: banners
        // A slide with neither artwork nor a headline would render as a gap.
        .filter((banner) => banner.image?.url || banner.title?.trim())
        .map((banner, index) => ({ ...banner, order: index })),
      announcement: {
        text: announcement.text.trim(),
        link: announcement.link.trim(),
        active: announcement.active,
      },
    };

    void run(() => homepageApi.updateConfig(payload, readToken("admin")), {
      success: "Homepage saved",
      onDone: async () => {
        setDirty(false);
        await config.reload();
      },
    });
  };

  if (config.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const couponChoices = (couponOptions.data?.items ?? []).map((item) => ({
    value: item._id,
    label: item.title,
  }));

  const storeChoices = (storeOptions.data?.items ?? []).map((item) => ({
    value: item._id,
    label: item.name,
  }));

  const categoryChoices = (categoryOptions.data ?? []).map((item) => ({
    value: item._id,
    label: item.name,
  }));

  return (
    <>
      <PageHeader
        title="Homepage"
        subtitle="Anything left empty falls back to an automatic query, so the page is never blank."
        action={
          <ButtonLink variant="secondary" href="/" target="_blank">
            View the homepage
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <FormSection title="Announcement bar" description="The strip above the header.">
          <Toggle
            checked={announcement.active}
            onChange={(value) => {
              setAnnouncement((previous) => ({ ...previous, active: value }));
              touch();
            }}
            label="Show the announcement"
          />
          <Input
            label="Text"
            value={announcement.text}
            onChange={(event) => {
              setAnnouncement((previous) => ({ ...previous, text: event.target.value }));
              touch();
            }}
            placeholder="Black Friday codes are live"
          />
          <Input
            label="Link"
            value={announcement.link}
            onChange={(event) => {
              setAnnouncement((previous) => ({ ...previous, link: event.target.value }));
              touch();
            }}
            placeholder="/category/black-friday"
          />
        </FormSection>

        <FormSection title="Hero" description="The banner at the top of the homepage.">
          <Input
            label="Heading"
            value={heroHeading}
            onChange={(event) => {
              setHeroHeading(event.target.value);
              touch();
            }}
            placeholder="Codes that actually work"
          />
          <Textarea
            label="Subheading"
            value={heroSubheading}
            onChange={(event) => {
              setHeroSubheading(event.target.value);
              touch();
            }}
          />
          <Select
            label="Hero offer"
            value={heroCoupon}
            onChange={(event) => {
              setHeroCoupon(event.target.value);
              touch();
            }}
            options={[{ value: "", label: "Pick automatically" }, ...couponChoices]}
          />
          <ImagePicker
            label="Hero image"
            value={heroImage}
            onChange={(value) => {
              setHeroImage(value);
              touch();
            }}
          />
        </FormSection>

        <FormSection
          title="Hero banners"
          description="The carousel at the top of the homepage. Slides cycle every 5 seconds; the artwork carries the message, so text is only drawn when no image is set."
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {banners.map((banner, index) => {
              const patch = (changes: Partial<HomepageBanner>) => {
                setBanners((previous) =>
                  previous.map((row, position) =>
                    position === index ? { ...row, ...changes } : row
                  )
                );
                touch();
              };

              const move = (delta: number) => {
                const target = index + delta;
                if (target < 0 || target >= banners.length) return;
                setBanners((previous) => {
                  const next = [...previous];
                  const [row] = next.splice(index, 1);
                  if (row) next.splice(target, 0, row);
                  return next.map((item, position) => ({ ...item, order: position }));
                });
                touch();
              };

              return (
                <div key={index} className="rounded-xl border border-[var(--border-subtle)] p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--surface-sunken)] px-2.5 py-1 text-xs font-bold text-faint">
                      Slide {index + 1}
                    </span>

                    <Toggle
                      checked={banner.active !== false}
                      onChange={(value) => patch({ active: value })}
                      label="Live"
                    />

                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => move(-1)}>
                        ↑
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => move(1)}>
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setBanners((previous) => previous.filter((_, position) => position !== index));
                          touch();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <ImagePicker
                      label="Banner artwork"
                      hint="Wide image, about 1200×300. Shown on every screen when no mobile version is set."
                      value={banner.image ?? null}
                      onChange={(value) => patch({ image: value })}
                    />
                    <ImagePicker
                      label="Mobile artwork (optional)"
                      hint="Used below 640px — roughly 800×400 works well."
                      value={banner.mobileImage ?? null}
                      onChange={(value) => patch({ mobileImage: value })}
                    />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Link"
                      value={banner.link ?? ""}
                      onChange={(event) => patch({ link: event.target.value })}
                      placeholder="/coupons?exclusive=true"
                    />
                    <Input
                      label="Title"
                      value={banner.title ?? ""}
                      onChange={(event) => patch({ title: event.target.value })}
                      placeholder="Used as the image alt text, and as the headline when there is no image"
                    />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Input
                      label="Subtitle"
                      value={banner.subtitle ?? ""}
                      onChange={(event) => patch({ subtitle: event.target.value })}
                    />
                    <Input
                      label="Button label"
                      value={banner.ctaLabel ?? ""}
                      onChange={(event) => patch({ ctaLabel: event.target.value })}
                      placeholder="Shop deals"
                    />
                    <Input
                      label="Background"
                      value={banner.background ?? ""}
                      onChange={(event) => patch({ background: event.target.value })}
                      placeholder="#F1E3D1 or a CSS gradient"
                    />
                  </div>
                </div>
              );
            })}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setBanners((previous) => [
                  ...previous,
                  { image: null, mobileImage: null, title: "", subtitle: "", link: "", ctaLabel: "", order: previous.length, active: true },
                ]);
                touch();
              }}
            >
              + Add a banner
            </Button>

            {banners.length ? null : (
              <p className="text-sm text-faint">
                No banners yet — the homepage falls back to the three shipped designs until you add one.
              </p>
            )}
          </div>
        </FormSection>

        <FormSection title="Featured offers" className="lg:col-span-2">
          <MultiSelect
            label="Offers in the featured rail"
            hint="Leave empty to rank automatically by priority and discount."
            value={featuredCoupons}
            onChange={(value) => {
              setFeaturedCoupons(value);
              touch();
            }}
            options={couponChoices}
          />
        </FormSection>

        <FormSection title="Featured stores">
          <MultiSelect
            label="Stores in the top rail"
            columns={1}
            value={featuredStores}
            onChange={(value) => {
              setFeaturedStores(value);
              touch();
            }}
            options={storeChoices}
          />
        </FormSection>

        <FormSection title="Featured categories">
          <MultiSelect
            label="Category tiles"
            columns={1}
            value={featuredCategories}
            onChange={(value) => {
              setFeaturedCategories(value);
              touch();
            }}
            options={categoryChoices}
          />
        </FormSection>

        <FormSection
          title="Category sections"
          description="Extra rows further down the page, each tied to a category."
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Category"
                    value={section.category}
                    onChange={(event) => {
                      setSections((previous) =>
                        previous.map((row, position) =>
                          position === index ? { ...row, category: event.target.value } : row
                        )
                      );
                      touch();
                    }}
                    options={[{ value: "", label: "Choose…" }, ...categoryChoices]}
                  />
                  <Input
                    label="Heading"
                    value={section.heading}
                    onChange={(event) => {
                      setSections((previous) =>
                        previous.map((row, position) =>
                          position === index ? { ...row, heading: event.target.value } : row
                        )
                      );
                      touch();
                    }}
                    placeholder="Taken from the category if blank"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSections((previous) => previous.filter((_, position) => position !== index));
                      touch();
                    }}
                  >
                    Remove section
                  </Button>
                </div>
              </div>
            ))}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSections((previous) => [
                  ...previous,
                  { category: "", heading: "", coupons: [], stores: [], order: previous.length },
                ]);
                touch();
              }}
            >
              + Add a section
            </Button>
          </div>
        </FormSection>

        <FormSection
          title="Custom blocks"
          description="Promo tiles between the rails — a landing page, a guide, a seasonal hub."
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div key={index} className="rounded-xl border border-[var(--border-subtle)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Title"
                    value={block.title}
                    onChange={(event) => {
                      setBlocks((previous) =>
                        previous.map((row, position) =>
                          position === index ? { ...row, title: event.target.value } : row
                        )
                      );
                      touch();
                    }}
                  />
                  <Input
                    label="Link"
                    value={block.link ?? ""}
                    onChange={(event) => {
                      setBlocks((previous) =>
                        previous.map((row, position) =>
                          position === index ? { ...row, link: event.target.value } : row
                        )
                      );
                      touch();
                    }}
                  />
                </div>

                <Input
                  label="Subtitle"
                  className="mt-3"
                  value={block.subtitle ?? ""}
                  onChange={(event) => {
                    setBlocks((previous) =>
                      previous.map((row, position) =>
                        position === index ? { ...row, subtitle: event.target.value } : row
                      )
                    );
                    touch();
                  }}
                />

                <div className="mt-3">
                  <ImagePicker
                    label="Image"
                    value={block.image ?? null}
                    onChange={(value) => {
                      setBlocks((previous) =>
                        previous.map((row, position) =>
                          position === index ? { ...row, image: value } : row
                        )
                      );
                      touch();
                    }}
                  />
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3"
                  onClick={() => {
                    setBlocks((previous) => previous.filter((_, position) => position !== index));
                    touch();
                  }}
                >
                  Remove block
                </Button>
              </div>
            ))}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setBlocks((previous) => [
                  ...previous,
                  { title: "", subtitle: "", link: "", image: null, order: previous.length },
                ]);
                touch();
              }}
            >
              + Add a block
            </Button>
          </div>
        </FormSection>
      </div>

      <SaveBar saving={busy} dirty={dirty} onSave={save} />
    </>
  );
}
