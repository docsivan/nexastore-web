import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export interface MailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendMail(opts: MailOptions): Promise<void> {
  const transport = createTransport()
  await transport.sendMail({
    from: `"NexaStore Admin" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ''),
  })
}

export function welcomeEmailHtml(name: string, email: string, tempPassword: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a2e4a">
    <h2 style="color:#0D0D0D">Welcome to NexaStore Admin</h2>
    <p>Hi ${name},</p>
    <p>An admin account has been created for you. Use the credentials below to sign in:</p>
    <div style="background:#f4f8ff;border:1px solid #c5d9f0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:4px 0"><strong>Email:</strong> ${email}</p>
      <p style="margin:4px 0"><strong>Temporary password:</strong> <code style="background:#e8eef7;padding:2px 6px;border-radius:4px">${tempPassword}</code></p>
    </div>
    <p>You will be asked to change your password on first login.</p>
    <p style="margin-top:24px;font-size:12px;color:#888">
      NexaStore · Medical Equipment Distributors · Oman
    </p>
  </div>
  `
}

export function otpEmailHtml(otp: string, requestedBy: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a2e4a">
    <h2 style="color:#0D0D0D">Admin Password Reset OTP</h2>
    <p>A password reset was requested by: <strong>${requestedBy}</strong></p>
    <div style="background:#f4f8ff;border:1px solid #c5d9f0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0D0D0D;margin:0">${otp}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#666">Valid for 15 minutes</p>
    </div>
    <p>If you did not request this, please secure your account immediately.</p>
    <p style="margin-top:24px;font-size:12px;color:#888">
      NexaStore · Medical Equipment Distributors · Oman
    </p>
  </div>
  `
}
