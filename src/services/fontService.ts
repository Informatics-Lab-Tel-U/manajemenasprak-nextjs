'use server';

import { requireRoleApi } from '@/lib/auth';

export async function generateFont(labId: string): Promise<string | null> {
  try {
    const guard = await requireRoleApi(['ADMIN', 'ASLAB']);
    if (!guard.ok) {
      throw new Error('Unauthorized');
    }

    const internalApiKey = process.env.INTERNAL_API_KEY || '';
    if (!internalApiKey) {
      console.error('INTERNAL_API_KEY is not configured for fontService');
      return null;
    }

    const response = await fetch(
      `${process.env.HONO_BACKEND_URL || 'http://localhost:8787'}/api/fonts/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': internalApiKey,
        },
        body: JSON.stringify({ lab_id: labId }),
      }
    );

    if (!response.ok) {
      console.error('Failed to generate font, status:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (e) {
    console.error('Error in font service action:', e);
    return null;
  }
}
