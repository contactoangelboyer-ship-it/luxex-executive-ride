import { Resend } from "resend";
import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
  import QRCode from "qrcode";
  
import { logger } from "./logger";

if (!process.env.RESEND_API_KEY) {
  console.error("[mailer] CRITICAL: RESEND_API_KEY is not set — ALL emails will be silently skipped. Set this environment variable to enable email delivery.");
}
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_BOOKINGS = "LuxEx Bookings <bookings@luxexride.com>";
const FROM_INFO     = "LuxEx Executive Ride <info@luxexride.com>";
const REPLY_TO      = "contact@luxexride.com";

function buildAdminEmails(): string[] {
  const external = (process.env.ADMIN_EMAIL ?? "").split(",").map(e => e.trim()).filter(Boolean);
  if (external.length > 0) {
    // Explicit list set — use exactly those, nothing else
    return [...new Set(external)];
  }
  // Fallback: warn loudly so it's obvious in logs
  console.warn("[mailer] WARNING: ADMIN_EMAIL env var is not set — admin notifications will NOT be sent.");
  return [];
}
const ADMIN_EMAILS: string[] = buildAdminEmails();
if (ADMIN_EMAILS.length > 0) {
  console.info(`[mailer] Admin notification recipients (${ADMIN_EMAILS.length}): ${ADMIN_EMAILS.join(", ")}`);
}

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
  .header img { display:block; margin:0 auto; max-width:150px; height:auto; }
  .divider { height:4px; background:linear-gradient(90deg,#C9A84C 0%,#A8892E 100%); }
  .body { padding:40px; }
  h1 { margin:0 0 8px; font-size:26px; font-weight:800; color:#0a0a0a; line-height:1.2; }
  .sub { color:#777; font-size:15px; margin:0 0 32px; line-height:1.5; }
  .code-box { background:#fafafa; border:1px solid #eaeaea; border-left:5px solid #C9A84C; padding:22px 24px; margin:24px 0; }
  .code-label { font-size:11px; color:#aaa; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:10px; }
  .code-val { font-size:30px; font-weight:900; letter-spacing:0.22em; color:#0a0a0a; font-family:'Courier New',monospace; }
  table.details { width:100%; border-collapse:collapse; margin:16px 0; }
  table.details td { padding:11px 4px; font-size:14px; border-bottom:1px solid #f0f0f0; vertical-align:top; }
  table.details td.lbl { color:#999; font-weight:600; white-space:nowrap; padding-right:16px; width:38%; }
  table.details td.val { color:#1a1a1a; font-weight:600; }
  .section-title { font-size:11px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:#aaa; margin:28px 0 10px; }
  .alert { border-radius:2px; padding:16px 20px; margin:24px 0; font-size:14px; line-height:1.6; }
  .alert-info { background:#fffbeb; border:1px solid #C9A84C; color:#5a4400; }
  .alert-success { background:#f0fff4; border:1px solid #86efac; color:#14532d; }
  .alert-driver { background:#eff6ff; border:1px solid #93c5fd; color:#1e3a5f; }
  .alert-reminder { background:#faf5ff; border:1px solid #c4b5fd; color:#3b0764; }
  .btn { display:inline-block; background:#C9A84C; color:#0a0a0a !important; font-weight:900; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; text-decoration:none; padding:16px 36px; margin:24px 0 8px; border-radius:1px; }
  .footer { background:#0a0a0a; padding:28px 40px; text-align:center; border-top:1px solid #1a1a1a; }
  .footer p { color:#555; font-size:12px; margin:5px 0; }
  .footer a { color:#C9A84C; text-decoration:none; }
  .note { font-size:13px; color:#aaa; margin-top:28px; line-height:1.6; }
  .price-row { display:flex; justify-content:space-between; padding:8px 0; font-size:14px; border-bottom:1px solid #f0f0f0; }
  .price-total { display:flex; justify-content:space-between; padding:12px 0; font-size:16px; font-weight:900; border-top:2px solid #0a0a0a; margin-top:8px; }
  .stars { color:#C9A84C; font-size:22px; letter-spacing:4px; margin:12px 0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="https://www.luxexride.com/logo.png" alt="LuxEx Executive Ride" width="150" style="max-width:150px;height:auto;display:block;margin:0 auto;" />
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

function parseStops(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.filter(Boolean) : []; }
  catch { return []; }
}

function stopsRows(b: any): string {
  const stops = parseStops(b.additionalStops);
  return stops.map((s, i) => detailRow(`Stop ${i + 1}`, s)).join("\n");
}

function bookingTable(b: any): string {
  return `<table class="details">
    ${detailRow("Confirmation #", `<strong style="color:#0a0a0a;font-family:'Courier New',monospace;letter-spacing:0.1em;">${b.confirmationCode}</strong>`)}
    ${detailRow("Service", titleCase(b.service ?? ""))}
    ${detailRow("Date", b.date)}
    ${detailRow("Time", fmtTime(b.time))}
    ${b.hours ? detailRow("Duration", `${b.hours} hours`) : ""}
    ${detailRow("Pickup", b.pickupAddress)}
    ${stopsRows(b)}
    ${b.dropoffAddress ? detailRow("Drop-off", b.dropoffAddress) : ""}
    ${detailRow("Vehicle", titleCase(b.vehicleType ?? ""))}
    ${detailRow("Passengers", b.passengers)}
    ${b.flightNumber ? detailRow("Flight #", b.flightNumber + (b.flightType ? ` (${titleCase(b.flightType)})` : "")) : ""}
    ${b.meetAndGreet ? detailRow("Add-ons", "Meet & Greet") : ""}
    ${b.childSeat ? detailRow("Child Seat", "Yes") : ""}
    ${b.notes ? detailRow("Notes", b.notes) : ""}
    ${Number(b.totalAmount ?? 0) > 0
      ? detailRow("Total", `<strong>${Number(b.totalAmount).toFixed(2)}</strong>`)
      : detailRow("Total", `<span style="color:#999;font-style:italic;">Estimate pending</span>`)}
  </table>`;
}

function bookingTableDriver(b: any): string {
  return `<table class="details">
    ${detailRow("Confirmation #", `<strong style="color:#0a0a0a;font-family:'Courier New',monospace;letter-spacing:0.1em;">${b.confirmationCode}</strong>`)}
    ${detailRow("Service", titleCase(b.service ?? ""))}
    ${detailRow("Date", b.date)}
    ${detailRow("Time", fmtTime(b.time))}
    ${b.hours ? detailRow("Duration", `${b.hours} hours`) : ""}
    ${detailRow("Pickup", b.pickupAddress)}
    ${stopsRows(b)}
    ${b.dropoffAddress ? detailRow("Drop-off", b.dropoffAddress) : ""}
    ${detailRow("Vehicle", titleCase(b.vehicleType ?? ""))}
    ${detailRow("Passengers", b.passengers)}
    ${b.flightNumber ? detailRow("Flight #", b.flightNumber + (b.flightType ? ` (${titleCase(b.flightType)})` : "")) : ""}
    ${b.meetAndGreet ? detailRow("Add-ons", "Meet & Greet") : ""}
    ${b.childSeat ? detailRow("Child Seat", "Yes") : ""}
    ${b.notes ? detailRow("Notes", b.notes) : ""}
  </table>`;
}


  // ── PDF Confirmation Generation ──────────────────────────────────────────────

  async function generateBookingPDF(booking: any): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page   = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();

    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const GOLD  = rgb(0.788, 0.659, 0.298); // #C9A84C
    const DARK  = rgb(0.039, 0.039, 0.039); // #0a0a0a
    const WHITE = rgb(1, 1, 1);
    const GRAY  = rgb(0.6, 0.6, 0.6);
    const LGRAY = rgb(0.97, 0.97, 0.97);

    // ── Header (dark bg + logo) ─────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: DARK });
    page.drawRectangle({ x: 0, y: height - 94, width, height: 4,  color: GOLD });

    let logoEmbedded = false;
    try {
      const logoRes = await fetch("https://www.luxexride.com/logo.png");
      if (logoRes.ok) {
        const logoBytes = await logoRes.arrayBuffer();
        const logoImg   = await pdfDoc.embedPng(logoBytes);
        const dims      = logoImg.scaleToFit(140, 60);
        page.drawImage(logoImg, {
          x: 40, y: height - 90 + (90 - dims.height) / 2,
          width: dims.width, height: dims.height,
        });
        logoEmbedded = true;
      }
    } catch { /* no-op — fall back to text */ }

    if (!logoEmbedded) {
      page.drawText("LUXEX",          { x: 40, y: height - 50, size: 28, font: fontBold, color: GOLD  });
      page.drawText("EXECUTIVE RIDE", { x: 40, y: height - 70, size: 10, font: fontReg,  color: WHITE });
    }

    const confLabel  = "BOOKING CONFIRMATION";
    const confLabelW = fontBold.widthOfTextAtSize(confLabel, 11);
    page.drawText(confLabel, { x: width - 40 - confLabelW, y: height - 48, size: 11, font: fontBold, color: GOLD });

    const dateStr  = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const dateStrW = fontReg.widthOfTextAtSize(dateStr, 9);
    page.drawText(dateStr, { x: width - 40 - dateStrW, y: height - 66, size: 9, font: fontReg, color: GRAY });

    // ── QR Code ─────────────────────────────────────────────────────────────────
    const qrPng = await QRCode.toBuffer(booking.confirmationCode, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 200,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }) as unknown as Buffer;
    const qrImage = await pdfDoc.embedPng(qrPng);
    const qrSize  = 110;
    const qrX     = width - 36 - qrSize;
    const boxTop  = height - 94 - 20;
    const qrY     = boxTop - qrSize - 6;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    const scanTxt = "Scan to verify";
    page.drawText(scanTxt, {
      x: qrX + (qrSize - fontReg.widthOfTextAtSize(scanTxt, 8)) / 2,
      y: qrY - 14, size: 8, font: fontReg, color: GRAY,
    });

    // ── Confirmation Code Box ───────────────────────────────────────────────────
    const boxH = 80;
    const boxW = width - 72 - qrSize - 16;
    page.drawRectangle({ x: 36, y: boxTop - boxH, width: boxW, height: boxH, color: LGRAY, borderColor: GOLD, borderWidth: 1 });
    page.drawRectangle({ x: 36, y: boxTop - 3,   width: 44,   height: 3,   color: GOLD });
    page.drawText("CONFIRMATION CODE", { x: 52, y: boxTop - 20, size: 8, font: fontReg, color: GRAY });
    page.drawText(booking.confirmationCode ?? "—", { x: 52, y: boxTop - 56, size: 26, font: fontBold, color: DARK });

    // ── Trip Details ─────────────────────────────────────────────────────────────
    let curY = boxTop - boxH - 40;
    page.drawText("TRIP DETAILS", { x: 40, y: curY, size: 10, font: fontBold, color: DARK });
    page.drawRectangle({ x: 40, y: curY - 6, width: 38, height: 2, color: GOLD });
    curY -= 24;

    const rows: [string, string][] = [
      ["Passenger",         booking.passengerName    ?? "—"],
      ["Date",              booking.date             ?? "—"],
      ["Pickup Time",       fmtTime(booking.time)],
      ["Pickup Location",   booking.pickupLocation   ?? "—"],
      ["Dropoff Location",  booking.dropoffLocation  ?? "—"],
      ["Passengers",        String(booking.passengers ?? 1)],
      ["Vehicle Type",      titleCase(booking.vehicleType ?? "sedan")],
    ];
    if (booking.flightNumber)    rows.push(["Flight #",         booking.flightNumber]);
    if (booking.specialRequests) rows.push(["Special Requests", booking.specialRequests]);

    const rowH  = 26;
    const maxVW = width - 220 - 52;
    rows.forEach(([label, rawVal], i) => {
      const rowY = curY - i * rowH;
      if (i % 2 === 0) page.drawRectangle({ x: 36, y: rowY - rowH + 8, width: width - 72, height: rowH, color: LGRAY });
      page.drawText(label, { x: 44, y: rowY, size: 10, font: fontReg, color: GRAY });
      let val = String(rawVal);
      while (val.length > 4 && fontBold.widthOfTextAtSize(val, 10) > maxVW) val = val.slice(0, -1);
      if (val !== String(rawVal)) val += "…";
      page.drawText(val, { x: 220, y: rowY, size: 10, font: fontBold, color: DARK });
    });

    curY -= rows.length * rowH + 28;

    // ── Price Box ────────────────────────────────────────────────────────────────
    page.drawRectangle({ x: 36, y: curY - 54, width: width - 72, height: 64, color: DARK });
    page.drawText("TOTAL", { x: 52, y: curY - 22, size: 9, font: fontReg, color: GRAY });
    const hasPrice = Number(booking.totalAmount ?? 0) > 0;
    const totalStr = hasPrice ? `${Number(booking.totalAmount).toFixed(2)}` : "ESTIMATE PENDING";
    const totalSize = hasPrice ? 28 : 14;
    const totalW   = fontBold.widthOfTextAtSize(totalStr, totalSize);
    page.drawText(totalStr, { x: width - 52 - totalW, y: curY - 44, size: totalSize, font: fontBold, color: GOLD });

    // ── Footer ───────────────────────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: 0, width, height: 56, color: DARK });
    page.drawRectangle({ x: 0, y: 56, width, height: 2, color: GOLD });
    const f1 = "LuxEx Executive Ride  ·  contact@luxexride.com  ·  www.luxexride.com";
    const f2 = "This document serves as your official booking confirmation. Thank you for choosing LuxEx.";
    page.drawText(f1, { x: (width - fontReg.widthOfTextAtSize(f1, 8.5)) / 2, y: 36, size: 8.5, font: fontReg, color: GRAY });
    page.drawText(f2, { x: (width - fontReg.widthOfTextAtSize(f2, 8))   / 2, y: 18, size: 8,   font: fontReg, color: rgb(0.45, 0.45, 0.45) });

    return pdfDoc.save();
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
      <h1>We've received your reservation.</h1>
      <p class="sub">Thank you for choosing LuxEx, <strong>${booking.passengerName}</strong>. We've received your request and our team will review it shortly. You will receive your trip estimate and full confirmation soon.</p>

      <div class="code-box">
        <div class="code-label">Confirmation Code</div>
        <div class="code-val">${booking.confirmationCode}</div>
      </div>

      <div class="section-title">Trip Details</div>
      ${bookingTable(booking)}

      <div class="section-title">Contact Information</div>
      <table class="details">
        ${detailRow("Phone on File", `<a href="tel:${booking.passengerPhone}" style="color:#0a0a0a;">${booking.passengerPhone}</a>`)}
      </table>

      <div class="alert alert-info">
        <strong>What happens next?</strong><br>
        Our team will review your booking and send a trip estimate. Once confirmed, you will receive a separate email with your final price and assigned chauffeur details.
      </div>

      <div class="alert alert-info" style="margin-top:12px;">
        <strong>Need to make changes?</strong><br>
        Reply to this email or contact us at <a href="mailto:contact@luxexride.com" style="color:#5a4400;">contact@luxexride.com</a>.
        Cancellations must be made at least 24 hours in advance.
      </div>

      <p class="note">Please ensure your phone is reachable at the number provided so our team can reach you.</p>
    </div>
  `);

  // Generate PDF booking confirmation
  let pdfAttachments: { filename: string; content: Buffer }[] = [];
  try {
    const pdfBytes = await generateBookingPDF(booking);
    pdfAttachments = [{ filename: `LuxEx-Confirmation-${booking.confirmationCode}.pdf`, content: Buffer.from(pdfBytes) }];
  } catch (pdfErr) {
    logger.warn({ err: pdfErr }, "[mailer] PDF generation failed — sending confirmation without attachment");
  }

  try {
    const result = await resend.emails.send({
      from: FROM_BOOKINGS,
      replyTo: REPLY_TO,
      to: [booking.passengerEmail],
      subject: `Booking Confirmed — ${booking.confirmationCode} · LuxEx Executive Ride`,
      html,
      attachments: pdfAttachments,
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

// ── Status labels for emails ──────────────────────────────────────────────────

const STATUS_EMAIL_MAP: Record<string, { title: string; passengerMsg: string; adminMsg: string; alertClass: string; subjectVerb: string }> = {
  confirmed: {
    title: "Your booking has been confirmed.",
    passengerMsg: "Your reservation is confirmed and a chauffeur is being arranged for your trip.",
    adminMsg: "The booking has been confirmed.",
    alertClass: "alert-success",
    subjectVerb: "Confirmed",
  },
  assigned: {
    title: "A driver has been assigned to your trip.",
    passengerMsg: "Great news — a chauffeur has been assigned to your reservation. They will contact you before the trip.",
    adminMsg: "A driver has been assigned to this booking.",
    alertClass: "alert-driver",
    subjectVerb: "Driver Assigned",
  },
  en_route: {
    title: "Your driver is on the way.",
    passengerMsg: "Your chauffeur is heading to your pickup location. Please be ready at the pickup address.",
    adminMsg: "The driver has marked themselves as En Route to the pickup location.",
    alertClass: "alert-driver",
    subjectVerb: "Driver En Route",
  },
  on_site: {
    title: "Your driver has arrived.",
    passengerMsg: "Your chauffeur is at the pickup location and waiting for you. Please proceed to the vehicle.",
    adminMsg: "The driver has arrived at the pickup location and is waiting for the passenger.",
    alertClass: "alert-success",
    subjectVerb: "Driver On Site",
  },
  in_progress: {
    title: "Your trip has started.",
    passengerMsg: "You are now on your way. Sit back and enjoy the ride.",
    adminMsg: "The trip has started. The passenger is on their way.",
    alertClass: "alert-success",
    subjectVerb: "Trip Started",
  },
  cancelled: {
    title: "Your booking has been cancelled.",
    passengerMsg: "Your reservation has been cancelled. If you believe this is an error, please contact us immediately.",
    adminMsg: "A booking has been cancelled. Please review and follow up as needed.",
    alertClass: "alert-info",
    subjectVerb: "Cancelled",
  },
  completed: {
    title: "Thank you for riding with us.",
    passengerMsg: "We hope you enjoyed your experience with LuxEx Executive Ride. We look forward to serving you again.",
    adminMsg: "The trip has been marked as completed by the driver.",
    alertClass: "alert-success",
    subjectVerb: "Completed",
  },
};

// ── Booking Status Update to Passenger ───────────────────────────────────────

export async function sendStatusUpdate(
  booking: any,
  newStatus: string,
  driver?: { name: string; phone?: string | null } | null,
): Promise<void> {
  if (!resend) return;

  const info = STATUS_EMAIL_MAP[newStatus];
  if (!info) return;

  const driverBlock = driver
    ? `<div class="section-title">Your Chauffeur</div>
       <table class="details">
         ${detailRow("Name", driver.name)}
         ${driver.phone ? detailRow("Phone", `<a href="tel:${driver.phone}" style="color:#0a0a0a;">${driver.phone}</a>`) : ""}
       </table>`
    : "";

  // ── Passenger email ──
  if (booking.passengerEmail) {
    const passengerHtml = baseTemplate(`
      <div class="body">
        <h1>${info.title}</h1>
        <p class="sub">${info.passengerMsg}</p>

        <div class="code-box">
          <div class="code-label">Confirmation Code</div>
          <div class="code-val">${booking.confirmationCode}</div>
        </div>

        <div class="section-title">Trip Details</div>
        ${bookingTable(booking)}

        ${driverBlock}

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
        subject: `${info.subjectVerb} — ${booking.confirmationCode} · LuxEx Executive Ride`,
        html: passengerHtml,
      });
      logger.info({ status: newStatus, code: booking.confirmationCode }, "[mailer] passenger status email sent");
    } catch (err) {
      logger.error({ err }, "[mailer] Failed to send passenger status update email");
    }
  }

  // ── Admin email ──
  await sendAdminStatusUpdate(booking, newStatus, driver).catch((err) =>
    logger.error({ err }, "[mailer] Failed to send admin status update email"),
  );
}

// ── Admin Status Change Notification ─────────────────────────────────────────

export async function sendAdminStatusUpdate(
  booking: any,
  newStatus: string,
  driver?: { name: string; phone?: string | null } | null,
): Promise<void> {
  if (!resend) return;

  const info = STATUS_EMAIL_MAP[newStatus];
  if (!info) return;

  const statusColors: Record<string, string> = {
    en_route: "#fbbf24", on_site: "#34d399", in_progress: "#34d399",
    completed: "#34d399", cancelled: "#f87171", confirmed: "#60a5fa",
    assigned: "#818cf8",
  };
  const badgeColor = statusColors[newStatus] ?? "#aaa";

  const adminHtml = baseTemplate(`
    <div class="body">
      <h1>Booking Status Changed</h1>
      <p class="sub">${info.adminMsg}</p>

      <div style="display:inline-block;background:${badgeColor}22;border:1px solid ${badgeColor}55;padding:10px 20px;margin:16px 0;">
        <span style="font-size:13px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:${badgeColor};">${info.subjectVerb}</span>
      </div>

      <div class="code-box">
        <div class="code-label">Confirmation Code</div>
        <div class="code-val">${booking.confirmationCode}</div>
      </div>

      ${driver ? `<div class="section-title">Driver</div>
      <table class="details">
        ${detailRow("Name", driver.name)}
        ${driver.phone ? detailRow("Phone", `<a href="tel:${driver.phone}" style="color:#0a0a0a;">${driver.phone}</a>`) : ""}
      </table>` : ""}

      <div class="section-title">Trip Details</div>
      ${bookingTable(booking)}

      <div class="section-title">Passenger</div>
      <table class="details">
        ${detailRow("Name", booking.passengerName)}
        ${detailRow("Phone", booking.passengerPhone)}
        ${detailRow("Email", booking.passengerEmail)}
      </table>

      <a href="https://www.luxexride.com/admin/bookings" class="btn">View in Admin Panel</a>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_BOOKINGS,
      to: ADMIN_EMAILS,
      subject: `[${info.subjectVerb.toUpperCase()}] Booking ${booking.confirmationCode} — ${booking.date} ${fmtTime(booking.time)}`,
      html: adminHtml,
    });
    logger.info({ status: newStatus, code: booking.confirmationCode }, "[mailer] admin status email sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send admin status update email");
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

  const html = baseTemplate(`
    <div class="body">
      <h1>Thank you for riding with LuxEx.</h1>
      <p class="sub">We hope your experience was exceptional, <strong>${booking.passengerName}</strong>. Here is a summary of your trip.</p>

      <div class="section-title">Trip Summary</div>
      ${bookingTable(booking)}

      <div class="stars">★★★★★</div>
      <p style="font-size:14px;color:#555;margin-top:8px;">We'd love to hear about your experience. Reply to this email with any feedback.</p>

      <div class="alert alert-success" style="margin-top:24px;">
        <strong>Book your next ride</strong> at <a href="https://www.luxexride.com" style="color:#14532d;">www.luxexride.com</a>
        or reply to this email and we'll take care of you.
      </div>
    </div>
  `);

  try {
    await resend.emails.send({
      from: FROM_INFO,
      replyTo: REPLY_TO,
      to: [booking.passengerEmail],
      subject: `Trip Complete — Thank you for riding with LuxEx · ${booking.confirmationCode}`,
      html,
    });
    logger.info({ code: booking.confirmationCode }, "[mailer] post-trip summary sent");
  } catch (err) {
    logger.error({ err }, "[mailer] Failed to send post-trip summary");
  }
}
