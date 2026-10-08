
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "VITE_SUPABASE_URL غير موجود في ملف البيئة .env"
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "VITE_SUPABASE_PUBLISHABLE_KEY غير موجود في ملف البيئة .env"
  );
}

export const supabase = createClient(
  supabaseUrl.trim(),
  supabasePublishableKey.trim()
);