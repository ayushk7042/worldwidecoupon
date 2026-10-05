"use client";

import { use } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { StatusPill } from "@/components/admin/DataTable";
import { useAdminData } from "@/components/admin/hooks";
import { BlogForm } from "@/components/admin/BlogForm";
import { Skeleton, Stat } from "@/components/ui/primitives";
import { blog } from "@/lib/endpoints";
import { formatCount, timeAgo } from "@/lib/format";

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading } = useAdminData((token) => blog.get(id, { token }), [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <PageHeader
        title="Post not found"
        subtitle="It may have been deleted."
        back={{ href: "/admin/blog", label: "Blog" }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={data.title}
        subtitle={`Updated ${timeAgo(data.updatedAt)}`}
        back={{ href: "/admin/blog", label: "Blog" }}
        action={<StatusPill status={data.status} />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Views" value={formatCount(data.views)} />
        <Stat
          label="Published"
          value={data.publishedAt ? timeAgo(data.publishedAt) : "Not yet"}
        />
      </div>

      <BlogForm post={data} />
    </>
  );
}
