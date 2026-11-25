'use server';

import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import * as blogService from '@/services/blogService';

export async function createBlogPost(formData: FormData, content: any) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const excerpt = formData.get('excerpt') as string;
  const categoryRaw = formData.get('category_id') as string;
  const category_id = categoryRaw === 'none' || !categoryRaw ? null : categoryRaw;
  const status = formData.get('status') as string;
  const tagsStr = formData.get('tags') as string;
  const tags = tagsStr ? JSON.parse(tagsStr) : [];
  const publishedAtInput = formData.get('published_at') as string;
  const cover_image_url = formData.get('cover_image_url') as string | null;

  let published_at: string | null = null;
  if (publishedAtInput) {
    published_at = new Date(publishedAtInput).toISOString();
  } else if (status === 'published') {
    published_at = new Date().toISOString();
  }

  try {
    await blogService.createBlogPost({
      title,
      slug,
      excerpt,
      content,
      category_id,
      status,
      published_at,
      author_id: user.id,
      tags,
      cover_image_url,
    }, authHeader);
  } catch (error: any) {
    throw new Error(error.message);
  }

  try {
    revalidatePath('/manage-post');
  } catch (e) {}
  return { success: true };
}

export async function updateBlogPost(id: string, formData: FormData, content: any) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const excerpt = formData.get('excerpt') as string;
  const categoryRaw = formData.get('category_id') as string;
  const category_id = categoryRaw === 'none' || !categoryRaw ? null : categoryRaw;
  const status = formData.get('status') as string;
  const tagsStr = formData.get('tags') as string;
  const tags = tagsStr ? JSON.parse(tagsStr) : [];
  const publishedAtInput = formData.get('published_at') as string;
  const cover_image_url = formData.get('cover_image_url') as string | null;

  let published_at: string | null = null;
  if (publishedAtInput) {
    published_at = new Date(publishedAtInput).toISOString();
  } else {
    // If no explicit datetime input, check existing post published_at
    const existingPost = await blogService.getBlogPostById(id);
    if (existingPost?.published_at) {
      published_at = existingPost.published_at;
    } else if (status === 'published') {
      published_at = new Date().toISOString();
    }
  }

  try {
    await blogService.updateBlogPost(id, {
      title,
      slug,
      excerpt,
      content,
      category_id,
      status,
      published_at,
      tags,
      cover_image_url,
    }, authHeader);
  } catch (error: any) {
    throw new Error(error.message);
  }

  try {
    revalidatePath('/manage-post');
    revalidatePath(`/manage-post/${id}/edit`);
  } catch (e) {}
  return { success: true };
}

export async function createCategory(formData: FormData) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  
  try {
    await blogService.createBlogCategory(name, slug, authHeader);
    try { revalidatePath('/manage-post/taxonomy'); } catch {}
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  
  try {
    await blogService.updateBlogCategory(id, name, slug, authHeader);
    try { revalidatePath('/manage-post/taxonomy'); } catch {}
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteCategory(id: string) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;
  
  try {
    await blogService.deleteBlogCategory(id, authHeader);
    try { revalidatePath('/manage-post/taxonomy'); } catch {}
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function createTag(formData: FormData) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  
  try {
    await blogService.createBlogTag(name, slug, authHeader);
    try { revalidatePath('/manage-post/taxonomy'); } catch {}
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateTag(id: string, formData: FormData) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  
  try {
    await blogService.updateBlogTag(id, name, slug, authHeader);
    try { revalidatePath('/manage-post/taxonomy'); } catch {}
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteTag(id: string) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;
  
  try {
    await blogService.deleteBlogTag(id, authHeader);
    try { revalidatePath('/manage-post/taxonomy'); } catch {}
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function deleteBlogPost(id: string) {
  const user = await requireAuth();
  const authHeader = user.token ? `Bearer ${user.token}` : undefined;

  try {
    await blogService.deleteBlogPost(id, authHeader);
    revalidatePath('/manage-post');
  } catch (error: any) {
    throw new Error(error.message);
  }
}
