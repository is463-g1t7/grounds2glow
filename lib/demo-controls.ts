/**
 * Reset, Sync and Simulate change shared data for everyone, and have no login in front of them.
 * They stay off unless NEXT_PUBLIC_DEMO_CONTROLS=true is set when the app is built or started.
 */
export const demoControlsEnabled = process.env.NEXT_PUBLIC_DEMO_CONTROLS === "true";

export function demoControlsDisabledResponse() {
  return Response.json({ error: "Demo controls are turned off." }, { status: 403 });
}
