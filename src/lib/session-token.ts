import crypto from "crypto";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET no está configurado correctamente.");
  }
  return secret;
}

export function firmarToken(userId: number): string {
  const payload = `${userId}.${Date.now()}`;
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verificarToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userIdString, timestamp, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", getSecret())
    .update(`${userIdString}.${timestamp}`)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const userId = Number(userIdString);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}
