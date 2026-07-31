function printEmail(
  recipient: string,
  subject: string,
  body: string,
  actionUrl: string,
): void {
  console.log(`--- EMAIL ---
To: ${recipient}
Subject: ${subject}

${body}

${actionUrl}
--- END EMAIL ---`)
}

export function sendVerificationEmail(
  recipient: string,
  actionUrl: string,
): void {
  printEmail(
    recipient,
    'Verify your PQS Training Certification email',
    'Welcome to PQS Training Certification. Verify your email address by opening this link:',
    actionUrl,
  )
}

export function sendPasswordResetEmail(
  recipient: string,
  actionUrl: string,
): void {
  printEmail(
    recipient,
    'Reset your PQS Training Certification password',
    'A password reset was requested for your account. Set a new password by opening this link:',
    actionUrl,
  )
}

export function sendInvitationEmail(
  recipient: string,
  actionUrl: string,
): void {
  printEmail(
    recipient,
    'You are invited to PQS Training Certification',
    'A colleague has invited you to join PQS Training Certification. Register by opening this link:',
    actionUrl,
  )
}
