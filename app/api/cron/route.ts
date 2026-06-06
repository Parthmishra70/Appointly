import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendReminder } from "@/lib/twilio";

// GET /api/cron — called by Vercel Cron every minute
// Protected by CRON_SECRET header
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find appointments within the next hour that haven't had a reminder sent
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("reminder_sent", false)
      .gte("appointment_time", now.toISOString())
      .lte("appointment_time", oneHourFromNow.toISOString());

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ sent: 0, message: "No reminders due" });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const appt of appointments) {
      try {
        await sendReminder(appt.phone_number, appt.customer_name, appt.appointment_time);
        await supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appt.id);
        sent++;
      } catch (err) {
        console.error(`Reminder failed for appointment ${appt.id}:`, err);
        errors.push(`appt ${appt.id}: ${err}`);
      }
    }

    return NextResponse.json({
      sent,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sent} reminder(s)`,
    });
  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
