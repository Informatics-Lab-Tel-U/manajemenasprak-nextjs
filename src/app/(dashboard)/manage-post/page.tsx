import * as blogService from '@/services/blogService';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DeletePostButton } from '@/components/blog/DeletePostButton';
import { TemplateSelectionModal } from '@/components/blog/TemplateSelectionModal';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kelola Post Lab',
};

// Lebih lega dari px-2 default di sisi tepi tabel, supaya kolom pertama dan terakhir tidak menempel ke border.
const TABLE_EDGE_PADDING =
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4';

const STATUS_LABEL: Record<string, string> = {
  published: 'Terbit',
  draft: 'Draf',
};

export default async function ManagePostPage() {
  await requireRole(['ADMIN', 'ASLAB']);

  let posts: any[] = [];
  try {
    posts = await blogService.getAllBlogPosts();
  } catch (error) {
    console.error('[ManagePostPage] SSR fetch error:', error);
  }

  return (
    <div className="container mx-auto max-w-[2000px] 2xl:px-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold tracking-tight">Kelola Post Lab</h1>
          <p className="text-sm 2xl:text-base text-muted-foreground mt-1">Manajemen konten artikel dan pengumuman lab.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center w-full md:w-auto">
          <TemplateSelectionModal />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table className={TABLE_EDGE_PADDING}>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Penulis</TableHead>
              <TableHead>Tgl Publish</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts?.map((post: any) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="px-1.5 text-muted-foreground">
                    {STATUS_LABEL[post.status] ?? post.status}
                  </Badge>
                </TableCell>
                <TableCell>{post.blog_categories?.name || '-'}</TableCell>
                <TableCell>{post.pengguna?.nama_lengkap || '-'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {post.published_at ? format(new Date(post.published_at), 'dd MMM yyyy', { locale: id }) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="border-muted-foreground/40 dark:border-muted-foreground/40"
                      asChild
                    >
                      <Link prefetch={false} href={`/manage-post/${post.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit post</span>
                      </Link>
                    </Button>
                    <DeletePostButton id={post.id} title={post.title} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!posts || posts.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada post yang dibuat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
