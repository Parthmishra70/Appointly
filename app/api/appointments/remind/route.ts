import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendReminder } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Fetch appointment
    const { data: appt, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !appt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // If reminder already sent, return success early to prevent duplicate sending
    if (appt.reminder_sent) {
      return NextResponse.json({ success: true, message: "Reminder already sent" });
    }

    // Verify the appointment is indeed scheduled for less than 1 hour from now.
    // We allow a minor buffer (62 minutes) to ensure that timing drift or polling intervals
    // doesn't block the reminder from firing.
    const now = new Date();
    const apptTime = new Date(appt.appointment_time);
    const timeDiffMs = apptTime.getTime() - now.getTime();
    const isWithinOneHour = timeDiffMs <= 62 * 60 * 1000;

    if (!isWithinOneHour) {
      return NextResponse.json(
        { error: "Appointment is not scheduled within 1 hour" },
        { status: 400 }
      );
    }

    // Send WhatsApp reminder
    await sendReminder(appt.phone_number, appt.customer_name, appt.appointment_time);

    // Mark reminder as sent in database
    await supabase
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", id);

    return NextResponse.json({ success: true, message: "Reminder sent successfully" });
  } catch (err) {
    console.error("POST /api/appointments/remind error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
