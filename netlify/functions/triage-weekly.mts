import type { Config } from "@netlify/functions";

export default async () => {
  await fetch(`${process.env.URL}/api/cron/triage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
};

export const config: Config = { schedule: "0 11 * * 1" };
