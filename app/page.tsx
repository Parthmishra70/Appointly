"use client";

import { useState, useEffect, useCallback } from "react";

type Appointment = {
  id: number;
  customer_name: string;
  phone_number: string;
  appointment_time: string;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  created_at: string;
};

type Status = "idle" | "loading" | "success" | "error";

function formatDateTime(iso: string): { date: string; time: string; relative: string } {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  let relative = "";
  if (diffMin < 0) relative = `${Math.abs(diffMin)}m ago`;
  else if (diffMin < 60) relative = `in ${diffMin}m`;
  else if (diffMin < 1440) relative = `in ${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
  else relative = `in ${Math.floor(diffMin / 1440)}d`;

  return {
    date: d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    relative,
  };
}

function getAppointmentStatus(appt: Appointment): "upcoming" | "soon" | "past" {
  const d = new Date(appt.appointment_time);
  const now = new Date();
  const diffMin = (d.getTime() - now.getTime()) / 60000;
  if (diffMin < 0) return "past";
  if (diffMin <= 60) return "soon";
  return "upcoming";
}

export default function Page() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments");
      const json = await res.json();
      if (json.appointments) setAppointments(json.appointments);
    } catch {
      // silently fail on poll
    } finally {
      setLoadingAppts(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          phone_number: phone,
          appointment_time: new Date(time).toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");

      setStatus("success");
      setName("");
      setPhone("");
      setTime("");
      fetchAppointments();

      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const filtered = appointments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return getAppointmentStatus(a) !== "past";
    return getAppointmentStatus(a) === "past";
  });

  // Min datetime = now (can't book in the past)
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoDot} />
            <span style={styles.logoText}>appointments</span>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.badge}>
              {appointments.filter(a => getAppointmentStatus(a) !== "past").length} upcoming
            </span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>

          {/* ── Booking form ── */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>New appointment</h2>
              <p style={styles.cardSub}>A WhatsApp confirmation is sent instantly</p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="name">Customer name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Priya Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="phone">WhatsApp number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
                <span style={styles.hint}>Include country code, e.g. +91 for India</span>
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="time">Appointment time</label>
                <input
                  id="time"
                  type="datetime-local"
                  value={time}
                  min={minDateTime}
                  onChange={e => setTime(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  ...styles.btn,
                  opacity: status === "loading" ? 0.7 : 1,
                  cursor: status === "loading" ? "not-allowed" : "pointer",
                }}
              >
                {status === "loading" ? (
                  <span style={styles.btnContent}>
                    <span style={styles.spinner} /> Booking…
                  </span>
                ) : "Book appointment"}
              </button>

              {status === "success" && (
                <div style={{ ...styles.alert, ...styles.alertSuccess }}>
                  <span style={styles.alertIcon}>✓</span>
                  Appointment booked! WhatsApp confirmation sent.
                </div>
              )}
              {status === "error" && (
                <div style={{ ...styles.alert, ...styles.alertError }}>
                  <span style={styles.alertIcon}>✕</span>
                  {errorMsg}
                </div>
              )}
            </form>

            {/* Info box */}
            <div style={styles.infoBox}>
              <div style={styles.infoRow}>
                <span style={styles.infoIcon}>✓</span>
                <span>Instant WhatsApp confirmation on booking</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoIcon}>⏰</span>
                <span>Automatic daily reminder for upcoming appointments</span>
              </div>
            </div>
          </section>

          {/* ── Dashboard ── */}
          <section style={styles.dashSection}>
            <div style={styles.dashHeader}>
              <h2 style={styles.cardTitle}>All appointments</h2>
              <div style={styles.filterRow}>
                {(["all", "upcoming", "past"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      ...styles.filterBtn,
                      ...(filter === f ? styles.filterBtnActive : {}),
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.apptList}>
              {loadingAppts ? (
                <div style={styles.emptyState}>
                  <div style={styles.pulse} />
                  <div style={{ ...styles.pulse, width: "80%", animationDelay: "0.1s" }} />
                  <div style={{ ...styles.pulse, width: "60%", animationDelay: "0.2s" }} />
                </div>
              ) : filtered.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyText}>No appointments yet</p>
                  <p style={styles.emptyHint}>Book one using the form</p>
                </div>
              ) : (
                filtered.map(appt => {
                  const { date, time, relative } = formatDateTime(appt.appointment_time);
                  const apptStatus = getAppointmentStatus(appt);
                  return (
                    <div key={appt.id} style={{
                      ...styles.apptCard,
                      ...(apptStatus === "past" ? styles.apptCardPast : {}),
                      ...(apptStatus === "soon" ? styles.apptCardSoon : {}),
                    }}>
                      <div style={styles.apptLeft}>
                        <div style={styles.apptName}>{appt.customer_name}</div>
                        <div style={styles.apptPhone}>{appt.phone_number}</div>
                        <div style={styles.apptBadges}>
                          {appt.confirmation_sent && (
                            <span style={{ ...styles.pill, ...styles.pillGreen }}>confirmed</span>
                          )}
                          {appt.reminder_sent && (
                            <span style={{ ...styles.pill, ...styles.pillAmber }}>reminded</span>
                          )}
                          {apptStatus === "soon" && !appt.reminder_sent && (
                            <span style={{ ...styles.pill, ...styles.pillRed }}>reminder due</span>
                          )}
                        </div>
                      </div>
                      <div style={styles.apptRight}>
                        <div style={styles.apptDate}>{date}</div>
                        <div style={styles.apptTime}>{time}</div>
                        <div style={{
                          ...styles.apptRelative,
                          color: apptStatus === "soon" ? "var(--amber)" :
                                 apptStatus === "past" ? "var(--muted)" : "var(--accent-hi)",
                        }}>{relative}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={styles.dashFooter}>
              Auto-refreshes every 15 seconds
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "var(--bg)",
  },
  header: {
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-card)",
  },
  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 8px var(--accent)",
    display: "inline-block",
  },
  logoText: {
    fontFamily: "var(--font-mono)",
    fontSize: 15,
    fontWeight: 500,
    color: "var(--text)",
    letterSpacing: "0.02em",
  },
  headerRight: {},
  badge: {
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 10px",
    borderRadius: 99,
    background: "var(--accent-bg)",
    color: "var(--accent-hi)",
    border: "1px solid var(--accent)33",
    fontFamily: "var(--font-mono)",
  },

  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "40px 24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: 28,
    alignItems: "start",
  },

  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: 28,
  },
  cardHeader: {
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: "var(--muted)",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--muted)",
    letterSpacing: "0.02em",
  },
  input: {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--text)",
    outline: "none",
    transition: "border-color 0.15s",
    fontFamily: "var(--font-sans)",
    width: "100%",
    colorScheme: "dark",
  },
  hint: {
    fontSize: 11,
    color: "var(--muted)",
  },
  btn: {
    marginTop: 6,
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius)",
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    transition: "opacity 0.15s, transform 0.1s",
    width: "100%",
  },
  btnContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid #ffffff44",
    borderTopColor: "#fff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.7s linear infinite",
  },
  alert: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    fontSize: 13,
    fontWeight: 500,
  },
  alertSuccess: {
    background: "var(--green-bg)",
    color: "var(--green)",
    border: "1px solid var(--green)33",
  },
  alertError: {
    background: "var(--red-bg)",
    color: "var(--red)",
    border: "1px solid var(--red)33",
  },
  alertIcon: {
    fontWeight: 700,
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    background: "var(--bg-input)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "var(--muted)",
  },
  infoIcon: {
    color: "var(--accent-hi)",
    fontSize: 13,
  },

  // Dashboard
  dashSection: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  dashHeader: {
    padding: "24px 24px 16px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  filterRow: {
    display: "flex",
    gap: 4,
  },
  filterBtn: {
    background: "none",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 99,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  filterBtnActive: {
    background: "var(--accent-bg)",
    borderColor: "var(--accent)55",
    color: "var(--accent-hi)",
  },
  apptList: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 200,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "48px 24px",
  },
  emptyText: {
    color: "var(--muted)",
    fontSize: 14,
    fontWeight: 500,
  },
  emptyHint: {
    color: "var(--muted)",
    fontSize: 12,
    opacity: 0.6,
  },
  pulse: {
    width: "100%",
    height: 52,
    background: "var(--bg-input)",
    borderRadius: "var(--radius)",
    animation: "pulse 1.4s ease-in-out infinite",
  },
  apptCard: {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    transition: "border-color 0.15s",
  },
  apptCardPast: {
    opacity: 0.5,
  },
  apptCardSoon: {
    borderColor: "var(--amber)44",
    background: "var(--amber-bg)",
  },
  apptLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  apptName: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text)",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  apptPhone: {
    fontSize: 12,
    color: "var(--muted)",
    fontFamily: "var(--font-mono)",
  },
  apptBadges: {
    display: "flex",
    gap: 4,
    marginTop: 2,
    flexWrap: "wrap" as const,
  },
  pill: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: 99,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
  },
  pillGreen: {
    background: "var(--green-bg)",
    color: "var(--green)",
    border: "1px solid var(--green)33",
  },
  pillAmber: {
    background: "var(--amber-bg)",
    color: "var(--amber)",
    border: "1px solid var(--amber)33",
  },
  pillRed: {
    background: "var(--red-bg)",
    color: "var(--red)",
    border: "1px solid var(--red)33",
  },
  apptRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  apptDate: {
    fontSize: 12,
    color: "var(--muted)",
  },
  apptTime: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text)",
    fontFamily: "var(--font-mono)",
  },
  apptRelative: {
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  },
  dashFooter: {
    padding: "12px 24px",
    borderTop: "1px solid var(--border)",
    fontSize: 11,
    color: "var(--muted)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
};
