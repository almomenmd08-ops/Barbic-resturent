/**
 * Returns the base URL for backend API calls.
 *
 * In development (Vite dev-server), requests go through the local proxy
 * so an empty string works.  In production (Firebase Hosting → Render),
 * VITE_BACKEND_URL must be set so the browser hits the Render origin
 * directly (CORS is configured on the server).
 */
export const API_BASE = import.meta.env.VITE_BACKEND_URL ?? '';
