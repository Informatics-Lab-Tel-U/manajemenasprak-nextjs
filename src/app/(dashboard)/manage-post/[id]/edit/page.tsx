import * as blogService from '@/services/blogService';
import { PostForm } from '@/components/blog/PostForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit Post',
};

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [post, categories, tags] = await Promise.all([
    blogService.getBlogPostById(id),
    blogService.getAllBlogCategories(),
    blogService.getAllBlogTags(),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link prefetch={false} href="/manage-post" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Post</h1>
          <p className="text-muted-foreground">Perbarui artikel atau pengumuman.</p>
        </div>
      </div>
      
      <div className="w-full bg-card p-6 rounded-lg border">
        <PostForm initialData={post} categories={categories || []} tags={tags || []} />
      </div>
    </div>
  );
}
