import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:anshu3052005@gmail.com", // or your real email
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default webpush;