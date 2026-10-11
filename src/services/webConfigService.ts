'use server';

import { revalidatePath } from 'next/cache';
import { honoFetch } from '@/lib/honoClient';

export async function getActiveScheduleTerm(): Promise<string | null> {
  try {
    const result = await honoFetch<string | null>('/api/web-config/active_schedule_term');
    
    if (!result.ok) {
      console.error('[webConfigService] Error fetching active schedule term:', result.error);
      return null;
    }

    return result.data || null;
  } catch (error) {
    console.error('[webConfigService] Exception fetching active schedule term:', error);
    return null;
  }
}

export async function updateActiveScheduleTerm(term: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await honoFetch('/api/web-config/active_schedule_term', {
      method: 'PUT',
      body: JSON.stringify({ term: term.trim() })
    });

    if (!result.ok) {
      console.error('[webConfigService] Error updating active schedule term:', result.error);
      return { success: false, error: result.error };
    }

    revalidatePath('/manage-post/config');
    return { success: true };
  } catch (error: any) {
    console.error('[webConfigService] Exception updating active schedule term:', error);
    return { success: false, error: error.message };
  }
}

export async function getAslabTeamData(): Promise<any | null> {
  try {
    const result = await honoFetch<any>('/api/web-config/aslab_team_data');
    
    if (!result.ok) {
      console.error('[webConfigService] Error fetching aslab team data:', result.error);
      return { koordinator: [], wakil_koordinator: [], asisten: [] };
    }

    return result.data || { koordinator: [], wakil_koordinator: [], asisten: [] };
  } catch (error) {
    console.error('[webConfigService] Exception fetching aslab team data:', error);
    return { koordinator: [], wakil_koordinator: [], asisten: [] };
  }
}

export async function updateAslabTeamData(teamData: any): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await honoFetch('/api/web-config/aslab_team_data', {
      method: 'PUT',
      body: JSON.stringify(teamData)
    });

    if (!result.ok) {
      console.error('[webConfigService] Error updating aslab team data:', result.error);
      return { success: false, error: result.error };
    }

    revalidatePath('/manage-post/config');
    return { success: true };
  } catch (error: any) {
    console.error('[webConfigService] Exception updating aslab team data:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}

export interface HeroImageItem {
  id: string;
  image: string;
  title?: string;
  alt?: string;
  order?: number;
}

export async function getHeroImagesData(): Promise<HeroImageItem[]> {
  try {
    const result = await honoFetch<HeroImageItem[]>('/api/web-config/hero_images');
    if (!result.ok) {
      console.error('[webConfigService] Error fetching hero images:', result.error);
      return [
        { id: 'default-1', image: '/backgrounds/bg-1.jpeg', alt: 'Hero Showcase', title: 'Informatics Laboratory' }
      ];
    }
    return result.data || [];
  } catch (error) {
    console.error('[webConfigService] Exception fetching hero images:', error);
    return [
      { id: 'default-1', image: '/backgrounds/bg-1.jpeg', alt: 'Hero Showcase', title: 'Informatics Laboratory' }
    ];
  }
}

export async function updateHeroImagesData(heroImages: HeroImageItem[]): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await honoFetch('/api/web-config/hero_images', {
      method: 'PUT',
      body: JSON.stringify(heroImages)
    });

    if (!result.ok) {
      console.error('[webConfigService] Error updating hero images:', result.error);
      return { success: false, error: result.error };
    }

    revalidatePath('/manage-post/config');
    return { success: true };
  } catch (error: any) {
    console.error('[webConfigService] Exception updating hero images:', error);
    return { success: false, error: error.message || 'Network error' };
  }
}
