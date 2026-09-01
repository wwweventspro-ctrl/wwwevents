// Tâche planifiée Vercel (cron) — tourne une fois par jour automatiquement
// Vérifie les versements à échéance dans 3 jours ou en retard, et prévient l'organisation.
// ⚠️ Les rappels DIRECTS aux capitaines sont prêts mais désactivés (voir plus bas) tant
// qu'aucun domaine n'est vérifié sur Resend — même limitation que api/send-email.js.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://thvpqlfwczdubpwkoeuq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AbLHV6sZXYpMe5E8JjP4rA_cd5veEbB";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = "wwwevents.pro@gmail.com";
const FROM_EMAIL = "Le WWW <onboarding@resend.dev>";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function sendResendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
  return res.json();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  try {
    const targetDate = daysFromNow(3); // rappel 3 jours avant échéance
    const todayDate = daysFromNow(0);

    // Versements à échéance dans 3 jours, non payés, pas encore rappelés
    const { data: upcoming, error: e1 } = await supabase
      .from("installments")
      .select("*, teams(team_name, captain_email, captain_phone), tournaments(name)")
      .eq("paid", false)
      .eq("due_date", targetDate)
      .eq("reminder_sent", false);

    // Versements en retard (échéance passée), non payés
    const { data: overdue, error: e2 } = await supabase
      .from("installments")
      .select("*, teams(team_name, captain_email, captain_phone), tournaments(name)")
      .eq("paid", false)
      .lt("due_date", todayDate);

    if (e1 || e2) throw e1 || e2;

    const upcomingList = upcoming || [];
    const overdueList = overdue || [];

    if (RESEND_API_KEY && (upcomingList.length > 0 || overdueList.length > 0)) {
      const rows = (list, label) =>
        list
          .map(
            (i) =>
              `<li>${label} — <strong>${i.teams?.team_name}</strong> (${i.tournaments?.name}) — ${i.label} — ${i.amount} € — échéance ${i.due_date} — tél: ${i.teams?.captain_phone}</li>`
          )
          .join("");

      await sendResendEmail({
        to: NOTIFY_EMAIL,
        subject: `Rappels de paiement — ${upcomingList.length} à venir, ${overdueList.length} en retard`,
        html: `
          <div style="font-family:sans-serif;line-height:1.6">
            <h2>Rappels de versements</h2>
            ${overdueList.length > 0 ? `<h3>⚠️ En retard</h3><ul>${rows(overdueList, "Retard")}</ul>` : ""}
            ${upcomingList.length > 0 ? `<h3>⏳ Échéance dans 3 jours</h3><ul>${rows(upcomingList, "Bientôt")}</ul>` : ""}
          </div>
        `,
      });

      // Marque les rappels "à venir" comme envoyés pour ne pas les renvoyer chaque jour
      if (upcomingList.length > 0) {
        await supabase
          .from("installments")
          .update({ reminder_sent: true })
          .in("id", upcomingList.map((i) => i.id));
      }

      // ⚠️ Rappel direct au capitaine — DÉSACTIVÉ tant qu'aucun domaine n'est vérifié sur Resend.
      // Une fois un domaine vérifié, décommente ce bloc et adapte FROM_EMAIL :
      /*
      for (const i of upcomingList) {
        if (i.teams?.captain_email) {
          await sendResendEmail({
            to: i.teams.captain_email,
            subject: `Rappel — versement "${i.label}" bientôt dû`,
            html: `<p>Salut, un rappel : le versement "${i.label}" de ${i.amount} € pour ton équipe ${i.teams.team_name} est dû le ${i.due_date}.</p>`,
          });
        }
      }
      */
    }

    res.status(200).json({ ok: true, upcoming: upcomingList.length, overdue: overdueList.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
