import * as blogService from '@/services/blogService';
import { PostForm } from '@/components/blog/PostForm';
import { POST_TEMPLATES, PostTemplateKey } from '@/config/postTemplates';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Buat Post Baru',
};

export default async function CreatePostPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const params = await searchParams;
  const templateKey = params.template as PostTemplateKey;
  const initialData = templateKey && POST_TEMPLATES[templateKey] ? POST_TEMPLATES[templateKey].initialData : undefined;

  const [categories, tags] = await Promise.all([
    blogService.getAllBlogCategories(),
    blogService.getAllBlogTags(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link prefetch={false} href="/manage-post" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Post Baru</h1>
          <p className="text-muted-foreground">Tulis artikel atau pengumuman baru.</p>
        </div>
      </div>
      
      <div className="w-full bg-card p-6 rounded-lg border">
        <PostForm categories={categories || []} tags={tags || []} initialData={initialData} />
      </div>
    </div>
  );
}
