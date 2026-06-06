import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendConfirmation, sendReminder } from "@/lib/twilio";

export const dynamic = "force-dynamic";

// POST /api/appointments — create a new appointment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_name, phone_number, appointment_time } = body;

    if (!customer_name || !phone_number || !appointment_time) {
      return NextResponse.json(
        { error: "customer_name, phone_number, and appointment_time are required" },
        { status: 400 }
      );
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from("appointments")
      .insert([{ customer_name, phone_number, appointment_time }])
      .select()
      .single();

    if (error) throw error;

    // Send WhatsApp confirmation & immediate reminder if scheduled within 1 hour
    const now = new Date();
    const apptTime = new Date(appointment_time);
    const timeDiffMs = apptTime.getTime() - now.getTime();
    const isWithinOneHour = timeDiffMs <= 60 * 60 * 1000;

    const updates: { confirmation_sent?: boolean; reminder_sent?: boolean } = {};

    const errors: string[] = [];

    // Try sending confirmation
    try {
      await sendConfirmation(phone_number, customer_name, appointment_time);
      updates.confirmation_sent = true;
    } catch (twilioErr) {
      console.error("Twilio confirmation failed:", twilioErr);
      errors.push("Confirmation failed (" + (twilioErr instanceof Error ? twilioErr.message : twilioErr) + ")");
    }

    // Try sending reminder if scheduled for within 1 hour
    if (isWithinOneHour) {
      try {
        await sendReminder(phone_number, customer_name, appointment_time);
        updates.reminder_sent = true;
      } catch (reminderErr) {
        console.error("Twilio reminder failed on booking:", reminderErr);
        errors.push("Reminder failed (" + (reminderErr instanceof Error ? reminderErr.message : reminderErr) + ")");
      }
    }

    // Update notification flags in Supabase
    if (Object.keys(updates).length > 0) {
      try {
        await supabase
          .from("appointments")
          .update(updates)
          .eq("id", data.id);
      } catch (dbErr) {
        console.error("Failed to update notification flags in database:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      appointment: data,
      warning: errors.length > 0 ? errors.join(", ") : undefined
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/appointments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/appointments — return all appointments, newest first
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_time", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ appointments: data });
  } catch (err) {
    console.error("GET /api/appointments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
