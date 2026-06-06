import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Appointment = {
  id: number;
  customer_name: string;
  phone_number: string;
  appointment_time: string;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  created_at: string;
};
