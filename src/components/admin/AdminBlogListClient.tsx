"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CmsBlog } from "@/lib/cms-store";
import { readEnglish } from "@/lib/cms-localize";
import type { LocalizedText } from "@/lib/localized-text";
import { sanitizeUserText } from "@/lib/user-text";

type SortOption = "newest" | "oldest" | "title";

function blogFieldText(value: string | LocalizedText | undefined): string {
  return sanitizeUserText(readEnglish(value));
}

function normalizeBlogForAdmin(blog: CmsBlog): CmsBlog {
  return {
    ...blog,
    title: blogFieldText(blog.title as string | LocalizedText),
    excerpt: blogFieldText(blog.excerpt as string | LocalizedText),
    content: blogFieldText(blog.content as string | LocalizedText),
  };
}

function normalizeBlogsForAdmin(blogs: CmsBlog[]): CmsBlog[] {
  return blogs.map(normalizeBlogForAdmin);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminBlogListClient({
  initialBlogs,
}: {
  initialBlogs: CmsBlog[];
}) {
  const [blogs, setBlogs] = useState(() =>
    normalizeBlogsForAdmin(initialBlogs),
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const visibleBlogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = blogs.filter((blog) => {
      return (
        !normalizedQuery ||
        [blog.title, blog.slug, blog.excerpt, blog.content].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        )
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "oldest")
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [blogs, query, sort]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleBlogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = visibleBlogs.length ? (currentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, visibleBlogs.length);
  const paginatedBlogs = visibleBlogs.slice(startIndex, endIndex);
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (item) =>
      item === 1 || item === totalPages || Math.abs(item - currentPage) <= 1,
  );

  const deleteBlog = async (blog: CmsBlog) => {
    const ok = window.confirm(`Delete ${blog.title}?`);
    if (!ok) return;
    setDeletingSlug(blog.slug);
    try {
      const res = await fetch(
        `/api/admin/cms/blogs?slug=${encodeURIComponent(blog.slug)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      const data = (await res.json()) as { blogs: CmsBlog[] };
      setBlogs(normalizeBlogsForAdmin(data.blogs));
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {[
          ["Total Blogs", blogs.length, "icon-edit"],
          ["Published", blogs.length, "icon-sealCheck"],
          [
            "Latest Date",
            blogs[0]?.date ? formatDate(blogs[0].date) : "-",
            "icon-calendar",
          ],
          ["CMS Source", "API", "icon-package"],
        ].map(([label, value, icon]) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon">
              <i className={String(icon)} />
            </div>
            <div>
              <div className="body-text text-secondary">{label}</div>
              <h5>{value}</h5>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap14 items-center mb-24">
        <div className="body-text text-secondary">
          Blog content loaded from CMS/backend data.
        </div>
        <Link
          href="/admin/blogs-create"
          className="tf-button text-btn-uppercase"
        >
          Create New Blog
        </Link>
      </div>

      <div className="wg-box sarjan-products-list-box">
        <div className="box-top">
          <form
            className="form-search-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <fieldset className="name">
              <input
                type="text"
                placeholder="Search by keyword"
                className="show-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </fieldset>
            <div className="button-submit">
              <button type="submit">
                <i className="icon-search-1 link" />
              </button>
            </div>
          </form>
          <div className="d-flex gap12 flex-wrap">
            <div className="tf-select">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        </div>

        <div className="wg-table list-item-function sarjan-blogs-table">
          <table>
            <thead>
              <tr>
                <th className="text-title">Image</th>
                <th className="text-title">Blog</th>
                <th className="text-title">Slug</th>
                <th className="text-title">Date</th>
                <th className="text-title">Status</th>
                <th className="text-title">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBlogs.map((blog) => (
                <tr className="tf-table-item item-row" key={blog.slug}>
                  <td>
                    <div className="sarjan-blog-table-image">
                      <img src={blog.image} alt={blog.title} />
                    </div>
                  </td>
                  <td>
                    <div className="text-title name text-line-clamp-1">
                      {blog.title}
                    </div>
                    <div className="text-caption-1 sub text-line-clamp-1">
                      {blog.excerpt}
                    </div>
                  </td>
                  <td>
                    <div className="sarjan-blog-table-slug">{blog.slug}</div>
                  </td>
                  <td className="sarjan-blog-table-date">
                    {formatDate(blog.date)}
                  </td>
                  <td>
                    <div className="box-status text-button type-completed">
                      Publish
                    </div>
                  </td>
                  <td>
                    <div className="sarjan-blog-table-actions">
                      <Link
                        href={`/blog/${blog.slug}`}
                        className="hover-tooltips tf-btn-small"
                        target="_blank"
                      >
                        <i className="icon icon-eye" />
                        <span className="tooltips text-caption-1">
                          Frontend Preview
                        </span>
                      </Link>
                      <Link
                        href={`/admin/blogs-create?slug=${encodeURIComponent(blog.slug)}`}
                        className="hover-tooltips tf-btn-small"
                      >
                        <i className="icon icon-edit" />
                        <span className="tooltips text-caption-1">Edit</span>
                      </Link>
                      <button
                        type="button"
                        className="hover-tooltips tf-btn-small btns-trash"
                        disabled={deletingSlug === blog.slug}
                        onClick={() => deleteBlog(blog)}
                      >
                        <i className="icon icon-trash" />
                        <span className="tooltips text-caption-1">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleBlogs.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="body-text text-secondary p-4">
                      No blogs found.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {visibleBlogs.length > pageSize ? (
          <div className="sarjan-products-pagination">
            <div className="body-text text-secondary">
              Showing <span>{startIndex + 1}</span>-<span>{endIndex}</span> of{" "}
              <span>{visibleBlogs.length}</span> blogs
            </div>
            <div className="sarjan-products-pagination-actions">
              <div className="tf-select sarjan-products-page-size">
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  <option value={8}>8 / page</option>
                  <option value={12}>12 / page</option>
                  <option value={20}>20 / page</option>
                </select>
              </div>
              <button
                type="button"
                className="sarjan-products-page-btn"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <i className="icon icon-chevron-left" />
              </button>
              <div className="sarjan-products-page-list">
                {pageNumbers.map((pageNumber, index) => {
                  const previous = pageNumbers[index - 1];
                  return (
                    <span
                      className="sarjan-products-page-group"
                      key={pageNumber}
                    >
                      {previous && pageNumber - previous > 1 ? (
                        <span className="sarjan-products-page-ellipsis">
                          ...
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={`sarjan-products-page-btn ${pageNumber === currentPage ? "active" : ""}`}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                className="sarjan-products-page-btn"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                <i className="icon icon-chevron-right" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
