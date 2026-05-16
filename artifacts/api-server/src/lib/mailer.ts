import { Resend } from "resend";
import { logger } from "./logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Three sending addresses — each with a clear role
const FROM_BOOKINGS = "LuxEx Bookings <bookings@luxexride.com>";    // confirmations, reminders, driver assignments
const FROM_INFO     = "LuxEx Executive Ride <info@luxexride.com>";   // status updates, cancellations, general comms
const REPLY_TO      = "contact@luxexride.com";                       // passengers reply here

const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAIL ?? "bookings@luxexride.com")
  .split(",").map(e => e.trim()).filter(Boolean);

function fmtTime(t: string): string {
  if (!t) return t ?? "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${(m ?? 0).toString().padStart(2, "0")} ${ampm}`;
}

function titleCase(s: string): string {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function baseTemplate(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LuxEx Executive Ride</title>
<style>
  body { margin:0; padding:0; background:#f0f0f0; font-family:'Helvetica Neue',Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  .wrap { max-width:600px; margin:0 auto; background:#ffffff; }
  .header { background:#0a0a0a; padding:36px 40px; text-align:center; }
  .logo-word { font-size:24px; font-weight:900; letter-spacing:0.18em; text-transform:uppercase; }
  .logo-lux { color:#F2E147; }
  .logo-ex { color:#ffffff; }
  .logo-sub { color:#888; font-size:11px; letter-spacing:0.25em; text-transform:uppercase; margin-top:6px; }
  .divider { height:4px; background:linear-gradient(90deg,#F2E147 0%,#d4c020 100%); }
  .body { padding:40px; }
  h1 { margin:0 0 8px; font-size:26px; font-weight:800; color:#0a0a0a; line-height:1.2; }
  .sub { color:#777; font-size:15px; margin:0 0 32px; line-height:1.5; }
  .code-box { background:#fafafa; border:1px solid #eaeaea; border-left:5px solid #F2E147; padding:22px 24px; margin:24px 0; }
  .code-label { font-size:11px; color:#aaa; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:10px; }
  .code-val { font-size:30px; font-weight:900; letter-spacing:0.22em; color:#0a0a0a; font-family:'Courier New',monospace; }
  table.details { width:100%; border-collapse:collapse; margin:16px 0; }
  table.details td { padding:11px 4px; font-size:14px; border-bottom:1px solid #f0f0f0; vertical-align:top; }
  table.details td.lbl { color:#999; font-weight:600; white-space:nowrap; padding-right:16px; width:38%; }
  table.details td.val { color:#1a1a1a; font-weight:600; }
  .section-title { font-size:11px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#aaa; margin:28px 0 10px; }
  .alert { border-radius:2px; padding:16px 20px; margin:24px 0; font-size:14px; line-height:1.6; }
  .alert-info { background:#fffbeb; border:1px solid #F2E147; color:#5a4400; }
  .alert-success { background:#f0fff4; border:1px solid #86efac; color:#14532d; }
  .alert-driver { background:#eff6ff; border:1px solid #93c5fd; color:#1e3a5f; }
  .alert-reminder { background:#faf5ff; border:1px solid #c4b5fd; color:#3b0764; }
  .btn { display:inline-block; background:#F2E147; color:#0a0a0a !important; font-weight:900; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; text-decoration:none; padding:16px 36px; margin:24px 0 8px; border-radius:1px; }
  .footer { background:#0a0a0a; padding:28px 40px; text-align:center; border-top:1px solid #1a1a1a; }
  .footer p { color:#555; font-size:12px; margin:5px 0; }
  .footer a { color:#F2E147; text-decoration:none; }
  .note { font-size:13px; color:#aaa; margin-top:28px; line-height:1.6; }
  .price-row { display:flex; justify-content:space-between; padding:8px 0; font-size:14px; border-bottom:1px solid #f0f0f0; }
  .price-total { display:flex; justify-content:space-between; padding:12px 0; font-size:16px; font-weight:900; border-top:2px solid #0a0a0a; margin-top:8px; }
  .stars { color:#F2E147; font-size:22px; letter-spacing:4px; margin:12px 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo-word"><span class="logo-lux">Lux</span><span class="logo-ex">Ex</span></div>
    <div class="logo-sub">Executive Ride</div>
  </div>
  <div class="divider"></div>
  ${body}
  <div class="footer">
    <p>LuxEx Executive Ride &nbsp;·&nbsp; <a href="https://www.luxexride.com">www.luxexride.com</a></p>
    <p><a href="mailto:contact@luxexride.com">contact@luxexride.com</a> &nbsp;·&nbsp; <a href="mailto:info@luxexride.com">info@luxexride.com</a></p>
    <p style="margin-top:8px;">© ${new Date().getFullYear()} LuxEx. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

function detailRow(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`;
}

function bookingTable(b: any): string {
  return `<table class="details">
    ${detailRow("Confirmation #", `<strong style="color:#0a0a0a;font-family:'Courier New',monospace;letter-spacing:0.1em;">${b.confirmationCode}</strong>`)}
    ${detailRow("Service", titleCase(b.service ?? ""))}
    ${detailRow("Date", b.date)}
    ${detailRow("Time", fmtTime(b.time))}
    ${detailRow("Pickup", b.pickupAddress)}
    ${b.dropoffAddress ? detailRow("Drop-off", b.dropoffAddress) : ""}
    ${detailRow("Vehicle", titleCase(b.vehicleType ?? ""))}
    ${detailRow("Passengers", b.passengers)}
    ${b.flightNumber ? detailRow("Flight #", b.flightNumber + (b.flightType ? ` (${titleCase(b.flightType)})` : "")) : ""}
    ${b.meetAndGreet ? detailRow("Add-ons", "Meet & Greet") : ""}
    ${b.childSeat ? detailRow("Child Seat", "Yes") : ""}
    ${b.notes ? detailRow("Notes", b.notes) : ""}
    ${detailRow("Total (excl. gratuity)", `<strong>$${Number(b.totalAmount ?? 0).toFixed(2)}</strong>`)}
  </table>`;
}

function bookingTableDriver(b: any): string {
  return `<table class="details">
    ${detailRow("Confirmation #", `<strong style="color:#0a0a0a;font-family:'Courier New',monospace;letter-spacing:0.1em;">${b.confirmationCode}</strong>`)}
    ${detailRow("Service", titleCase(b.service ?? ""))}
    ${detailRow("Date", b.date)}
    ${detailRow("Time", fmtTime(b.time))}
    ${detailRow("Pickup", b.pickupAddress)}
    ${b.dropoffAddress ? detailRow("Drop-off", b.dropoffAddress) : ""}
    ${detailRow("Vehicle", titleCase(b.vehicleType ?? ""))}
    ${detailRow("Passengers", b.passengers)}
    ${b.flightNumber ? detailRow("Flight #", b.flightNumber + (b.flightType ? ` (${titleCase(b.flightType)})` : "")) : ""}
    ${b.meetAndGreet ? detailRow("Add-ons", "Meet & Greet") : ""}
    ${b.childSeat ? detailRow("Child Seat", "Yes") : ""}
    ${b.notes ? detailRow("Notes", b.notes) : ""}
  </table>`;
}

// ── Customer Confirmation ────────────────────────────────────────────────────

export async function sendCustomerConfirmation(booking: any): Promise<void> {
  if (!resend) {
    logger.warn("[mailer] RESEND_API_KEY not configured — skipping customer email");
    return;
  }
  if (!booking.passengerEmail) return;

  const html = baseTemplate(`
    <div class="body">
      <h1>Your ride is confirmed.</h1>
      <p class="sub">Thank you for booking with LuxEx, <strong>${booking.passengerName}</strong>. We look forward to serving you.</p>

      <div class="code-box">
        <div class="code-label">Confirmation Code</div>
        <div class="code-val">${booking.confirmationCode}</div>
      </div>

      <div class="section-title">Trip Details</div>
      ${bookingTable(booking)}

      <div class="alert alert-info">
        <strong>Need to make changes?</strong><br>
        Reply to this email or contact us at <a href="mailto:contact@luxexride.com" style="color:#5a4400;">contact@luxexride.com</a>.
        Cancellations must be made at least 24 hours in advance.
      </div>

      <p class="note">Your chauffeur will contact you before the trip. Please ensure your phone is reachable at the number provided.</p>
    </div>
  `);

  try {
    const result = await resend.emails.send({
      from: FROM_BOOKINGS,
      replyTo: REPLY_TO,
      to: [booking.passengerEmail],
      subject: `Booking Confirmed — ${booking.confirmationCode} · LuxEx Executive Ride`,
      html,
    });
    logger.info({ id: result.data?.id, to: booking.passengerEmail }, "[mailer] customer confirmation sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send customer confirmation");
    throw err;
  }
}

// ── Admin New Booking Notification ───────────────────────────────────────────

export async function sendAdminNotification(booking: any): Promise<void> {
  if (!resend) {
    logger.warn("[mailer] RESEND_API_KEY not configured — skipping admin email");
    return;
  }

  const html = baseTemplate(`
    <div class="body">
      <h1>New Booking Received</h1>
      <p class="sub">A new reservation has been submitted and is pending assignment.</p>

      <div class="section-title">Trip Details</div>
      ${bookingTable(booking)}

      <div class="section-title">Passenger Info</div>
      <table class="details">
        ${detailRow("Name", booking.passengerName)}
        ${detailRow("Phone", booking.passengerPhone)}
        ${detailRow("Email", booking.passengerEmail)}
      </table>

      <a href="https://www.luxexride.com/admin/bookings" class="btn">Manage in Admin Panel</a>

      <div class="alert alert-info">
        Assign a driver and confirm this booking as soon as possible.
      </div>
    </div>
  `);

  try {
    const result = await resend.emails.send({
      from: FROM_BOOKINGS,
      to: ADMIN_EMAILS,
      subject: `New Booking #${booking.confirmationCode} — ${booking.date} at ${fmtTime(booking.time)}`,
      html,
    });
    logger.info({ id: result.data?.id, to: ADMIN_EMAILS }, "[mailer] admin notification sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send admin notification");
    throw err;
  }
}

// ── Driver Assignment Notification (NO price info) ───────────────────────────

export async function sendDriverAssignment(booking: any, driver: { name: string; email?: string | null }): Promise<void> {
  if (!resend) {
    logger.warn("[mailer] RESEND_API_KEY not configured — skipping driver email");
    return;
  }
  if (!driver.email) return;

  const html = baseTemplate(`
    <div class="body">
      <h1>New Trip Assigned</h1>
      <p class="sub">Hello <strong>${driver.name}</strong>, you have been assigned to the following trip.</p>

      <div class="section-title">Trip Details</div>
      ${bookingTableDriver(booking)}

      <div class="section-title">Passenger Contact</div>
      <table class="details">
        ${detailRow("Name", booking.passengerName)}
        ${detailRow("Phone", `<a href="tel:${booking.passengerPhone}" style="color:#0a0a0a;">${booking.passengerPhone}</a>`)}
      </table>

      <div class="alert alert-driver">
        <strong>Action Required:</strong> Please contact the passenger before the trip to confirm pickup arrangements and share your ETA.
      </div>

      <div class="alert alert-success" style="margin-top:12px;">
        <strong>Reminder:</strong> Arrive at least 10 minutes early. For airport pickups, monitor flight status using the flight number above.
      </div>

      <p class="note">If you have any questions or need to report an issue, contact dispatch at <a href="mailto:bookings@luxexride.com">bookings@luxexride.com</a>.</p>
    </div>
  `);

  try {
    const result = await resend.emails.send({
      from: FROM_BOOKINGS,
      to: [driver.email],
      subject: `Trip Assigned — ${booking.date} at ${fmtTime(booking.time)} · ${booking.confirmationCode}`,
      html,
    });
    logger.info({ id: result.data?.id, to: driver.email }, "[mailer] driver assignment sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send driver assignment email");
  }
}

// ── Booking Status Update to Customer ────────────────────────────────────────

export async function sendStatusUpdate(booking: any, newStatus: string): Promise<void> {
  if (!resend || !booking.passengerEmail) return;

  const statusMap: Record<string, { title: string; message: string; alertClass: string }> = {
    confirmed: {
      title: "Your booking has been confirmed.",
      message: "Your reservation is confirmed and a chauffeur is being arranged for your trip.",
      alertClass: "alert-success",
    },
    cancelled: {
      title: "Your booking has been cancelled.",
      message: "Your reservation has been cancelled. If you believe this is an error, please contact us immediately.",
      alertClass: "alert-info",
    },
    completed: {
      title: "Thank you for riding with us.",
      message: "We hope you enjoyed your experience with LuxEx Executive Ride. We look forward to serving you again.",
      alertClass: "alert-success",
    },
  };

  const info = statusMap[newStatus];
  if (!info) return;

  const html = baseTemplate(`
    <div class="body">
      <h1>${info.title}</h1>
      <p class="sub">${info.message}</p>

      <div class="code-box">
        <div class="code-label">Confirmation Code</div>
        <div class="code-val">${booking.confirmationCode}</div>
      </div>

      <div class="section-title">Trip Details</div>
      ${bookingTable(booking)}

      <div class="alert ${info.alertClass}">
        Questions? Reply to this email or contact us at <a href="mailto:contact@luxexride.com" style="color:inherit;">contact@luxexride.com</a>
      </div>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_INFO,
      replyTo: REPLY_TO,
      to: [booking.passengerEmail],
      subject: `Booking ${titleCase(newStatus)} — ${booking.confirmationCode} · LuxEx`,
      html,
    });
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send status update email");
  }
}

// ── 24h Reminder — Passenger ─────────────────────────────────────────────────

export async function sendPassengerReminder24h(booking: any, driver?: { name: string; phone?: string | null } | null): Promise<void> {
  if (!resend || !booking.passengerEmail) return;

  const driverBlock = driver
    ? `<div class="section-title">Your Chauffeur</div>
       <table class="details">
         ${detailRow("Name", driver.name)}
         ${driver.phone ? detailRow("Phone", `<a href="tel:${driver.phone}" style="color:#0a0a0a;">${driver.phone}</a>`) : ""}
       </table>`
    : `<div class="alert alert-info" style="margin-top:24px;">
         A chauffeur will be assigned shortly and will contact you before the trip.
       </div>`;

  const html = baseTemplate(`
    <div class="body">
      <h1>Your ride is tomorrow.</h1>
      <p class="sub">Just a reminder, <strong>${booking.passengerName}</strong> — your LuxEx ride departs in approximately 24 hours.</p>

      <div class="section-title">Trip Details</div>
      ${bookingTable(booking)}

      ${driverBlock}

      <div class="alert alert-reminder" style="margin-top:24px;">
        <strong>Need to make changes?</strong><br>
        Please contact us at least 24 hours before your trip at
        <a href="mailto:contact@luxexride.com" style="color:#3b0764;">contact@luxexride.com</a>
        or call us directly.
      </div>

      <p class="note">Please ensure your phone is reachable at the number provided at booking time.</p>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_BOOKINGS,
      replyTo: REPLY_TO,
      to: [booking.passengerEmail],
      subject: `Reminder: Your ride is tomorrow — ${booking.date} at ${fmtTime(booking.time)} · ${booking.confirmationCode}`,
      html,
    });
    logger.info({ code: booking.confirmationCode }, "[mailer] 24h passenger reminder sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send 24h passenger reminder");
  }
}

// ── 24h Reminder — Driver ────────────────────────────────────────────────────

export async function sendDriverReminder24h(booking: any, driver: { name: string; email?: string | null }): Promise<void> {
  if (!resend || !driver.email) return;

  const html = baseTemplate(`
    <div class="body">
      <h1>Trip tomorrow — be prepared.</h1>
      <p class="sub">Hello <strong>${driver.name}</strong>, you have a trip scheduled for tomorrow. Please review the details below.</p>

      <div class="section-title">Trip Details</div>
      ${bookingTableDriver(booking)}

      <div class="section-title">Passenger Contact</div>
      <table class="details">
        ${detailRow("Name", booking.passengerName)}
        ${detailRow("Phone", `<a href="tel:${booking.passengerPhone}" style="color:#0a0a0a;">${booking.passengerPhone}</a>`)}
      </table>

      <div class="alert alert-driver">
        <strong>Checklist for tomorrow:</strong>
        <ul style="margin:8px 0 0; padding-left:18px;">
          <li>Confirm vehicle is clean and fueled</li>
          <li>Contact the passenger at least 1 hour before pickup</li>
          ${booking.flightNumber ? "<li>Monitor flight status throughout the day</li>" : ""}
          <li>Arrive at pickup location at least 10 minutes early</li>
          ${booking.meetAndGreet ? "<li>Prepare meet & greet sign with passenger name</li>" : ""}
        </ul>
      </div>

      <p class="note">Questions or issues? Contact dispatch at <a href="mailto:bookings@luxexride.com">bookings@luxexride.com</a>.</p>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_BOOKINGS,
      to: [driver.email],
      subject: `Trip Tomorrow — ${booking.date} at ${fmtTime(booking.time)} · ${booking.confirmationCode}`,
      html,
    });
    logger.info({ code: booking.confirmationCode, driver: driver.name }, "[mailer] 24h driver reminder sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send 24h driver reminder");
  }
}

// ── 2h Reminder — Passenger ──────────────────────────────────────────────────

export async function sendPassengerReminder2h(booking: any, driver?: { name: string; phone?: string | null } | null): Promise<void> {
  if (!resend || !booking.passengerEmail) return;

  const driverBlock = driver
    ? `<div class="section-title">Your Chauffeur</div>
       <table class="details">
         ${detailRow("Name", driver.name)}
         ${driver.phone ? detailRow("Phone", `<a href="tel:${driver.phone}" style="color:#0a0a0a;">${driver.phone}</a>`) : ""}
       </table>
       <p style="font-size:14px;color:#555;margin-top:12px;">Your chauffeur will contact you shortly before arrival.</p>`
    : `<div class="alert alert-info" style="margin-top:24px;">
         Your chauffeur will contact you shortly. If you have concerns, please call us directly.
       </div>`;

  const html = baseTemplate(`
    <div class="body">
      <h1>Your ride is in 2 hours.</h1>
      <p class="sub"><strong>${booking.passengerName}</strong> — your LuxEx ride departs at <strong>${fmtTime(booking.time)}</strong>. Please be ready.</p>

      <div class="section-title">Trip Details</div>
      ${bookingTable(booking)}

      ${driverBlock}

      <div class="alert alert-reminder" style="margin-top:24px;">
        <strong>Running late or need to reach us?</strong><br>
        Reply to this email or contact us immediately at
        <a href="mailto:contact@luxexride.com" style="color:#3b0764;">contact@luxexride.com</a>.
      </div>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_BOOKINGS,
      replyTo: REPLY_TO,
      to: [booking.passengerEmail],
      subject: `Your ride is in 2 hours — ${fmtTime(booking.time)} today · ${booking.confirmationCode}`,
      html,
    });
    logger.info({ code: booking.confirmationCode }, "[mailer] 2h passenger reminder sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send 2h passenger reminder");
  }
}

// ── 2h Reminder — Driver ─────────────────────────────────────────────────────

export async function sendDriverReminder2h(booking: any, driver: { name: string; email?: string | null }): Promise<void> {
  if (!resend || !driver.email) return;

  const html = baseTemplate(`
    <div class="body">
      <h1>Trip in 2 hours — depart soon.</h1>
      <p class="sub">Hello <strong>${driver.name}</strong>, your trip starts in approximately 2 hours. Time to head out.</p>

      <div class="section-title">Trip Details</div>
      ${bookingTableDriver(booking)}

      <div class="section-title">Passenger Contact</div>
      <table class="details">
        ${detailRow("Name", booking.passengerName)}
        ${detailRow("Phone", `<a href="tel:${booking.passengerPhone}" style="color:#0a0a0a;">${booking.passengerPhone}</a>`)}
      </table>

      <div class="alert alert-driver">
        <strong>Depart now if not already on the way.</strong><br>
        Contact the passenger to confirm you are en route. Arrive at least 10 minutes early.
        ${booking.flightNumber ? `<br><br>Flight: <strong>${booking.flightNumber}</strong> — check real-time status before arrival.` : ""}
      </div>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_BOOKINGS,
      to: [driver.email],
      subject: `Depart Now — Trip in 2h · ${booking.date} ${fmtTime(booking.time)} · ${booking.confirmationCode}`,
      html,
    });
    logger.info({ code: booking.confirmationCode, driver: driver.name }, "[mailer] 2h driver reminder sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send 2h driver reminder");
  }
}

// ── Post-Trip Summary — Passenger ────────────────────────────────────────────

export async function sendPostTripSummary(booking: any): Promise<void> {
  if (!resend || !booking.passengerEmail) return;

  const breakdown = [
    booking.baseAmount > 0   ? `<div class="price-row"><span>Base fare</span><span>$${Number(booking.baseAmount).toFixed(2)}</span></div>` : "",
    booking.mileageAmount > 0 ? `<div class="price-row"><span>Mileage</span><span>$${Number(booking.mileageAmount).toFixed(2)}</span></div>` : "",
    booking.surchargesAmount > 0 ? `<div class="price-row"><span>Surcharges</span><span>$${Number(booking.surchargesAmount).toFixed(2)}</span></div>` : "",
    booking.tollsAmount > 0  ? `<div class="price-row"><span>Tolls</span><span>$${Number(booking.tollsAmount).toFixed(2)}</span></div>` : "",
    booking.promoDiscount > 0 ? `<div class="price-row" style="color:#14532d;"><span>Promo (${booking.promoCode})</span><span>-$${Number(booking.promoDiscount).toFixed(2)}</span></div>` : "",
  ].filter(Boolean).join("");

  const html = baseTemplate(`
    <div class="body">
      <h1>Thank you for riding with us.</h1>
      <p class="sub"><strong>${booking.passengerName}</strong>, we hope you had an excellent experience with LuxEx Executive Ride.</p>

      <div class="section-title">Trip Summary</div>
      <table class="details">
        ${detailRow("Confirmation #", `<strong style="font-family:'Courier New',monospace;letter-spacing:0.1em;">${booking.confirmationCode}</strong>`)}
        ${detailRow("Date", booking.date)}
        ${detailRow("Time", fmtTime(booking.time))}
        ${detailRow("From", booking.pickupAddress)}
        ${booking.dropoffAddress ? detailRow("To", booking.dropoffAddress) : ""}
        ${detailRow("Vehicle", titleCase(booking.vehicleType ?? ""))}
        ${booking.distanceMiles > 0 ? detailRow("Distance", `${Number(booking.distanceMiles).toFixed(1)} miles`) : ""}
      </table>

      ${breakdown ? `<div class="section-title">Receipt</div>
      <div style="margin:16px 0;">
        ${breakdown}
        <div class="price-total">
          <span>Total charged (excl. gratuity)</span>
          <span>$${Number(booking.totalAmount ?? 0).toFixed(2)}</span>
        </div>
      </div>` : ""}

      <div class="section-title">We Value Your Feedback</div>
      <div style="text-align:center; padding:20px 0;">
        <div class="stars">★ ★ ★ ★ ★</div>
        <p style="font-size:14px;color:#555;margin:8px 0 20px;">Your feedback helps us maintain the highest standards of service.</p>
        <a href="mailto:contact@luxexride.com?subject=Feedback for booking ${booking.confirmationCode}" class="btn">Share Your Feedback</a>
      </div>

      <div class="alert alert-success">
        <strong>Book your next ride:</strong><br>
        Visit <a href="https://www.luxexride.com" style="color:#14532d;">www.luxexride.com</a> to schedule your next trip.
        As a returning passenger, mention confirmation <strong>${booking.confirmationCode}</strong> for priority service.
      </div>

      <p class="note">Questions about your trip or receipt? Contact us at <a href="mailto:contact@luxexride.com">contact@luxexride.com</a> — we respond within 24 hours.</p>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_INFO,
      replyTo: REPLY_TO,
      to: [booking.passengerEmail],
      subject: `Trip Completed — Receipt & Summary · ${booking.confirmationCode} · LuxEx`,
      html,
    });
    logger.info({ code: booking.confirmationCode }, "[mailer] post-trip summary sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send post-trip summary");
  }
}
