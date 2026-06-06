import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendConfirmation } from "@/lib/twilio";

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

    // Send WhatsApp confirmation (non-blocking — we return success even if Twilio hiccups)
    try {
      await sendConfirmation(phone_number, customer_name, appointment_time);
      await supabase
        .from("appointments")
        .update({ confirmation_sent: true })
        .eq("id", data.id);
    } catch (twilioErr) {
      console.error("Twilio confirmation failed:", twilioErr);
      // Don't fail the request — appointment is saved
    }

    return NextResponse.json({ success: true, appointment: data }, { status: 201 });
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
