import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export interface Profile {
  id: string;
  username: string;
  nickname: string;
  email?: string;
  coins: number;
  created_at: string;
  is_admin?: boolean;
  favoriteVehicle?: string;  // stored as favorite_vehicle in DB
}
