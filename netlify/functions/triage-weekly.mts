import type { Config } from "@netlify/functions";

export default async () => {
  const res = await fetch(`${process.env.URL}/api/cron/triage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    redirect: "manual",
  });

  if (!res.ok) {
    throw new Error(
      `Triage semanal falló: ${res.status} ${res.statusText} — ${await res.text()}`,
    );
  }

  console.log("Triage semanal OK:", await res.text());
};

export const config: Config = { schedule: "0 11 * * 1" };
