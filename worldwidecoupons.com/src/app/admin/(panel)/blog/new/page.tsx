"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { BlogForm } from "@/components/admin/BlogForm";

export default function NewBlogPostPage() {
  return (
    <>
      <PageHeader
        title="New post"
        subtitle="Draft it, preview it, publish when it's ready."
        back={{ href: "/admin/blog", label: "Blog" }}
      />
      <BlogForm />
    </>
  );
}
