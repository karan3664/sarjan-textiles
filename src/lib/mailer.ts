import nodemailer from "nodemailer";

type SendDomainMailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function sendDomainMail(input: SendDomainMailInput) {
  const host = requiredEnv("SMTP_HOST");
  const user = requiredEnv("SMTP_USER");
  const pass = requiredEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM?.trim() || user;
  const port = Number(process.env.SMTP_PORT ?? 587);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter.sendMail({
    from,
    to: input.to,
    replyTo: input.replyTo || from,
    subject: input.subject,
    text: input.text,
  });
}
