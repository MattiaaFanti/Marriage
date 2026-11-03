/* This file is public. Never put Worker secrets or guest data here. */
window.WEDDING_CONFIG = {
  apiBase: "", // Set to deployed Cloudflare Worker origin, e.g. https://rsvp.example.workers.dev
  weddingDate: "Date to be confirmed",
  weddingTime: "Time to be confirmed",
  venue: "Restaurant details coming soon",
  address: "",
  directions: "Restaurant address, transport and parking information will appear here once confirmed.",
  mapUrl: "",
  rsvpDeadline: "",
  musicFile: "../assets/music.mp3" // Requires a licensed upload; absent on public repo
};
