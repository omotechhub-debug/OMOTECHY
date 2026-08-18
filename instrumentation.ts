export async function register() {
  // Vercel serverless cannot keep a background timer running.
  // Midnight profit SMS: Vercel Cron only.
  // 8 AM stock + 1 PM partial-payment SMS: first admin login after those times.
}
