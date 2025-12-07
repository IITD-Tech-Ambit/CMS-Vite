export type AppRole = 'admin' | 'user';
export type MagazineStatus = 'pending' | 'approved' | 'disapproved';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Magazine {
  id: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
  hero_thumbnail_url: string | null;
  body_markdown: string;
  author_name: string;
  author_id: string;
  read_time_minutes: number;
  status: MagazineStatus;
  created_at: string;
  updated_at: string;
}

export interface MagazineFormData {
  title: string;
  subtitle: string;
  body_markdown: string;
  hero_image?: File | null;
}
