import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_FROM!;

function toWhatsApp(phone: string): string {
  // Accept numbers with or without whatsapp: prefix
  if (phone.startsWith("whatsapp:")) return phone;
  // Ensure E.164 format — strip spaces/dashes, add + if missing
  const digits = phone.replace(/[\s\-().]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits}`;
  return `whatsapp:${e164}`;
}

export async function sendConfirmation(
  phone: string,
  customerName: string,
  appointmentTime: string
): Promise<void> {
  const date = new Date(appointmentTime);
  const formatted = date.toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  await client.messages.create({
    from: FROM,
    to: toWhatsApp(phone),
    body:
      `Hello ${customerName}! 👋\n\n` +
      `Your appointment has been confirmed for:\n` +
      `📅 ${formatted}\n\n` +
      `We look forward to seeing you. If you need to reschedule, please contact us.`,
  });
}

export async function sendReminder(
  phone: string,
  customerName: string,
  appointmentTime: string
): Promise<void> {
  const date = new Date(appointmentTime);
  const formattedTime = date.toLocaleString("en-IN", {
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  const formattedDate = date.toLocaleString("en-IN", {
    dateStyle: "full",
    timeZone: "Asia/Kolkata",
  });

  await client.messages.create({
    from: FROM,
    to: toWhatsApp(phone),
    body:
      `Hi ${customerName}! ⏰\n\n` +
      `Friendly reminder: you have an appointment coming up on:\n` +
      `📅 ${formattedDate} at ${formattedTime}\n\n` +
      `See you soon!`,
  });
}
