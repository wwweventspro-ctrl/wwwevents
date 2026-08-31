// Fonction serverless Vercel — envoie les emails via Resend (gratuit jusqu'à 3000 emails/mois)
// ⚠️ Nécessite la variable d'environnement RESEND_API_KEY sur Vercel (Project Settings > Environment Variables)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = "wwwevents.pro@gmail.com"; // email de l'organisation, reçoit une notif à chaque inscription
const FROM_EMAIL = "Le WWW <onboarding@resend.dev>"; // à remplacer par une adresse sur un domaine vérifié une fois configuré sur Resend

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!RESEND_API_KEY) {
    res.status(500).json({ error: "RESEND_API_KEY manquante côté serveur" });
    return;
  }

  try {
    const { type, teamName, captainEmail, captainPhone, tournamentName, prix } = req.body;

    if (type === "new_registration") {
      // ⚠️ Email de confirmation au capitaine — DÉSACTIVÉ pour l'instant.
      // Resend bloque l'envoi vers des adresses autres que celle du compte tant qu'aucun
      // domaine n'est vérifié. Dès qu'un domaine est vérifié sur resend.com/domains,
      // décommente le bloc ci-dessous et remplace FROM_EMAIL par une adresse de ce domaine.
      /*
      if (captainEmail) {
        await sendResendEmail({
          to: captainEmail,
          subject: `Inscription reçue — ${tournamentName}`,
          html: `
            <div style="font-family:sans-serif;line-height:1.6">
              <h2>Le WWW — Inscription reçue ✓</h2>
              <p>Salut,</p>
              <p>L'équipe <strong>${teamName}</strong> est bien enregistrée pour le tournoi <strong>${tournamentName}</strong>.</p>
              <p><strong>Statut : en attente de validation du paiement (${prix} €).</strong><br/>
              L'organisation te recontactera au ${captainPhone} pour les modalités de paiement.</p>
              <p>Rendez-vous le jour J avec vos pièces d'identité !</p>
              <p>— WWW Events</p>
            </div>
          `,
        });
      }
      */

      // Notification à l'organisation (fonctionne dès maintenant, sans domaine vérifié)
      await sendResendEmail({
        to: NOTIFY_EMAIL,
        subject: `Nouvelle inscription — ${teamName} (${tournamentName})`,
        html: `
          <div style="font-family:sans-serif;line-height:1.6">
            <h2>Nouvelle inscription</h2>
            <p><strong>Tournoi :</strong> ${tournamentName}</p>
            <p><strong>Équipe :</strong> ${teamName}</p>
            <p><strong>Téléphone capitaine :</strong> ${captainPhone}</p>
            <p><strong>Email capitaine :</strong> ${captainEmail}</p>
            <p><strong>Montant :</strong> ${prix} €</p>
          </div>
        `,
      });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
