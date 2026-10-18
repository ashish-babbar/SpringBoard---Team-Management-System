import nodemailer from 'nodemailer';
let transporter;
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
}
function getTransporter() {
  if (!mailConfigured()) return null;
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000
  });
  return transporter;
}
export async function sendPasswordSetupEmail({ to, name, link, subject = 'Set up your SprintBoard account' }) {
  const transport = getTransporter();
  const text = `Hi ${name},\n\nUse this one-time link to set or reset your SprintBoard password. It expires in 30 minutes:\n${link}\n\nIf you did not request this, you can ignore this email.`;
  if (!transport) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured.');
    console.info(`[development-only email preview] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
