import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InfoPage from "@/components/site/InfoPage";
import { sitePageBySlug, sitePages } from "@/lib/site-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return sitePages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = sitePageBySlug.get(slug);

  return {
    title: page ? `${page.title} | Siddha MedBot` : "Siddha MedBot",
    description: page?.summary,
  };
}

export default async function SiteInfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = sitePageBySlug.get(slug);

  if (!page) {
    notFound();
  }

  return <InfoPage page={page} />;
}
