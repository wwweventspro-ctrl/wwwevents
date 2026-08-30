import React, { useState, useEffect } from "react";

const MAX_PLAYERS = 4;

const emptyPlayer = () => ({ prenom: "", numero: "" });

export default function TournoiInscription() {
  const [step, setStep] = useState("form"); // form | recap | done
  const [teamName, setTeamName] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [players, setPlayers] = useState([emptyPlayer(), emptyPlayer(), emptyPlayer()]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [teamCount, setTeamCount] = useState(null);
  const [pot, setPot] = useState(0);
  const [acceptReglement, setAcceptReglement] = useState(false);
  const [acceptImage, setAcceptImage] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);

  const PRIX_BASE = 60;
  const PRIX_OPTION_4EME = 20;
  const CASH_PRIZE_FIXE = 1000; // Garanti par l'organisateur, ne dépend pas du nombre d'inscriptions
  const MAX_EQUIPES = 96;

  useEffect(() => {
    loadStats();
    setPot(CASH_PRIZE_FIXE);
  }, []);

  async function loadStats() {
    // TEMPORAIRE : compte stocké dans le navigateur (localStorage), pas partagé entre visiteurs.
    // À remplacer par HelloAsso ou une vraie base de données quand le paiement sera connecté.
    try {
      const raw = localStorage.getItem("le-www-equipes");
      const list = raw ? JSON.parse(raw) : [];
      setTeamCount(list.length);
    } catch (e) {
      setTeamCount(0);
    }
  }

  function updatePlayer(idx, field, value) {
    const next = [...players];
    next[idx] = { ...next[idx], [field]: value };
    setPlayers(next);
  }

  const has4eme = players.length === 4;
  const totalPrix = PRIX_BASE + (has4eme ? PRIX_OPTION_4EME : 0);
  const complet = teamCount !== null && teamCount >= MAX_EQUIPES;

  function addPlayer() {
    if (players.length < MAX_PLAYERS) setPlayers([...players, emptyPlayer()]);
  }

  function removePlayer(idx) {
    if (players.length <= 3) return;
    setPlayers(players.filter((_, i) => i !== idx));
  }

  function validate() {
    const errs = {};
    if (!teamName.trim()) errs.teamName = "Nom d'équipe requis";
    if (!captainPhone.trim()) errs.captainPhone = "Numéro du capitaine requis";
    players.forEach((p, i) => {
      if (!p.prenom.trim()) errs[`prenom-${i}`] = "Prénom requis";
      if (!p.numero.trim()) errs[`numero-${i}`] = "N° maillot requis";
      else if (!/^\d{1,2}$/.test(p.numero.trim())) errs[`numero-${i}`] = "0 à 99";
    });
    const numeros = players.map((p) => p.numero.trim()).filter(Boolean);
    const doublons = numeros.filter((n, i) => numeros.indexOf(n) !== i);
    if (doublons.length) {
      players.forEach((p, i) => {
        if (doublons.includes(p.numero.trim())) errs[`numero-${i}`] = "Numéro déjà pris dans l'équipe";
      });
    }
    if (!acceptReglement) errs.acceptReglement = "Tu dois accepter le règlement pour continuer";
    if (!acceptImage) errs.acceptImage = "Tu dois accepter le droit à l'image pour continuer";
    if (!acceptAge) errs.acceptAge = "Tu dois confirmer l'âge des joueurs pour continuer";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleContinue() {
    if (validate()) setStep("recap");
  }

  async function handlePayer() {
    setLoading(true);
    try {
      const id = `equipe:${teamName.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      const record = {
        teamName: teamName.trim(),
        captainPhone: captainPhone.trim(),
        players,
        createdAt: new Date().toISOString(),
        prix: totalPrix,
        option4eme: has4eme,
        acceptReglement: true,
        acceptImage: true,
        acceptAge: true,
      };
      const raw = localStorage.getItem("le-www-equipes");
      const list = raw ? JSON.parse(raw) : [];
      list.push({ id, ...record });
      localStorage.setItem("le-www-equipes", JSON.stringify(list));
      await loadStats();
      setStep("done");
    } catch (e) {
      alert("Erreur d'enregistrement, réessaie.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTeamName("");
    setCaptainPhone("");
    setPlayers([emptyPlayer(), emptyPlayer(), emptyPlayer()]);
    setErrors({});
    setAcceptReglement(false);
    setAcceptImage(false);
    setAcceptAge(false);
    setStep("form");
  }

  return (
    <div style={styles.page}>
      <div style={styles.court} aria-hidden="true" />
      <div style={styles.wrap}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>WWW EVENTS · PLAYGROUND CARPENTIER · AVRIL</div>
          <h1 style={styles.title}>
            LE <span style={styles.titleAccent}>WWW</span>
          </h1>
          <p style={styles.subtitle}>Who Want Win — 3v3, 3 terrains, 6 paniers. Poules + élimination directe.</p>
        </header>

        <div style={styles.potCard}>
          <div style={styles.potTop}>
            <span style={styles.potLabel}>CASH PRIZE GARANTI</span>
            <span style={styles.potValue}>{pot.toLocaleString("fr-FR")} €</span>
          </div>
          <div style={styles.potBadge}>✓ Déjà réuni — financé par l'organisation</div>
          <div style={styles.potBottom}>
            <span>
              {teamCount === null ? "…" : teamCount} / {MAX_EQUIPES} équipes inscrites
            </span>
          </div>
        </div>

        {complet && (
          <div style={styles.fullBanner}>Inscriptions closes — les {MAX_EQUIPES} équipes sont au complet.</div>
        )}

        {step === "form" && !complet && (
          <div style={styles.card}>
            <SectionLabel n="01" text="Équipe" />
            <Field label="Nom de l'équipe" error={errors.teamName}>
              <input
                style={styles.input}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex : Les Ballers du 9-4"
                maxLength={30}
              />
            </Field>
            <Field label="Téléphone du capitaine" error={errors.captainPhone}>
              <input
                style={styles.input}
                value={captainPhone}
                onChange={(e) => setCaptainPhone(e.target.value)}
                placeholder="06 XX XX XX XX"
                inputMode="tel"
              />
            </Field>

            <SectionLabel n="02" text="Joueurs (3 titulaires, 4e en option)" />
            {players.map((p, i) => (
              <div key={i} style={styles.playerRow}>
                <div style={styles.playerNum}>{i + 1}</div>
                <div style={styles.playerFields}>
                  <Field label="Prénom" error={errors[`prenom-${i}`]} compact>
                    <input
                      style={styles.input}
                      value={p.prenom}
                      onChange={(e) => updatePlayer(i, "prenom", e.target.value)}
                      placeholder="Prénom"
                      maxLength={20}
                    />
                  </Field>
                  <Field label="N° maillot" error={errors[`numero-${i}`]} compact narrow>
                    <input
                      style={styles.input}
                      value={p.numero}
                      onChange={(e) => updatePlayer(i, "numero", e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="00"
                      inputMode="numeric"
                      maxLength={2}
                    />
                  </Field>
                </div>
                {players.length > 3 && (
                  <button
                    onClick={() => removePlayer(i)}
                    style={styles.removeBtn}
                    aria-label="Retirer ce joueur"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {players.length < MAX_PLAYERS && (
              <button onClick={addPlayer} style={styles.addBtn} type="button">
                + Ajouter un 4e joueur (remplaçant) — +{PRIX_OPTION_4EME} €
              </button>
            )}

            <div style={styles.priceRow}>
              <span style={styles.priceLabel}>
                Inscription équipe{has4eme ? " + 4e joueur" : ""}
              </span>
              <span style={styles.priceValue}>{totalPrix} €</span>
            </div>
            {has4eme && (
              <p style={styles.priceNote}>60 € équipe (3 joueurs) + 20 € option 4e joueur.</p>
            )}
            <p style={styles.priceNote}>Maillot inclus, numéro attribué selon ta saisie ci-dessus.</p>

            <SectionLabel n="03" text="Conditions" />
            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={acceptReglement}
                onChange={(e) => setAcceptReglement(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkText}>
                J'ai lu et j'accepte le <a href="#" style={styles.link}>règlement du tournoi</a> (format, discipline, arbitrage).
              </span>
            </label>
            {errors.acceptReglement && <div style={styles.error}>{errors.acceptReglement}</div>}

            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={acceptImage}
                onChange={(e) => setAcceptImage(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkText}>
                J'autorise l'organisation à me photographier et filmer pendant le tournoi (photographes,
                caméramans, vidéastes) et à utiliser ces images, y compris pour des interviews, sur les
                réseaux sociaux et supports de promotion.
              </span>
            </label>
            {errors.acceptImage && <div style={styles.error}>{errors.acceptImage}</div>}

            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={acceptAge}
                onChange={(e) => setAcceptAge(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkText}>
                Je certifie que tous les joueurs de mon équipe ont au moins 16 ans. Une pièce
                d'identité pourra être demandée à l'accueil le jour du tournoi.
              </span>
            </label>
            {errors.acceptAge && <div style={styles.error}>{errors.acceptAge}</div>}

            <button style={styles.cta} onClick={handleContinue} type="button">
              Vérifier mon inscription →
            </button>
          </div>
        )}

        {step === "recap" && (
          <div style={styles.card}>
            <SectionLabel n="03" text="Récapitulatif" />
            <RecapRow label="Équipe" value={teamName} />
            <RecapRow label="Capitaine" value={captainPhone} />
            {players.map((p, i) => (
              <RecapRow key={i} label={`Joueur ${i + 1}`} value={`${p.prenom} — #${p.numero}`} />
            ))}
            <div style={styles.priceRow}>
              <span style={styles.priceLabel}>Total à payer</span>
              <span style={styles.priceValue}>{totalPrix} €</span>
            </div>
            <p style={styles.priceNote}>
              Paiement sécurisé (démo — à connecter à HelloAsso ou Stripe pour la version finale).
            </p>
            <div style={styles.btnRow}>
              <button style={styles.secondaryBtn} onClick={() => setStep("form")} type="button">
                ← Modifier
              </button>
              <button style={styles.cta} onClick={handlePayer} disabled={loading} type="button">
                {loading ? "…" : `Payer ${totalPrix} € et confirmer`}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={styles.card}>
            <div style={styles.doneIcon}>✓</div>
            <h2 style={styles.doneTitle}>Équipe inscrite</h2>
            <p style={styles.doneText}>
              <strong>{teamName}</strong> est engagée pour le tournoi. Le capitaine recevra les
              infos (horaires de poule, terrain) par SMS avant le jour J.
            </p>
            <button style={styles.cta} onClick={resetForm} type="button">
              Inscrire une autre équipe
            </button>
          </div>
        )}

        <footer style={styles.footer}>Le WWW · Playground Carpentier · Paris · Vacances d'avril</footer>
      </div>
    </div>
  );
}

function SectionLabel({ n, text }) {
  return (
    <div style={styles.sectionLabel}>
      <span style={styles.sectionN}>{n}</span>
      <span style={styles.sectionText}>{text}</span>
    </div>
  );
}

function Field({ label, error, children, compact, narrow }) {
  return (
    <div style={{ marginBottom: compact ? 0 : 18, flex: narrow ? "0 0 88px" : compact ? 1 : undefined }}>
      <label style={styles.label}>{label}</label>
      {children}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function RecapRow({ label, value }) {
  return (
    <div style={styles.recapRow}>
      <span style={styles.recapLabel}>{label}</span>
      <span style={styles.recapValue}>{value}</span>
    </div>
  );
}

const ORANGE = "#FF6B1A";
const INK = "#12130F";
const CREAM = "#F2EFE6";

const styles = {
  page: {
    minHeight: "100vh",
    background: INK,
    position: "relative",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    color: CREAM,
    overflow: "hidden",
  },
  court: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(242,239,230,0.035) 39px, rgba(242,239,230,0.035) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(242,239,230,0.035) 39px, rgba(242,239,230,0.035) 40px)",
    pointerEvents: "none",
  },
  wrap: {
    position: "relative",
    maxWidth: 480,
    margin: "0 auto",
    padding: "32px 20px 60px",
  },
  header: { marginBottom: 22 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.14em",
    color: ORANGE,
    fontWeight: 700,
    marginBottom: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: 900,
    letterSpacing: "-0.02em",
    margin: 0,
    lineHeight: 1,
    fontStyle: "italic",
  },
  titleAccent: { color: ORANGE },
  subtitle: { color: "rgba(242,239,230,0.6)", fontSize: 14, marginTop: 10 },
  potCard: {
    background: "linear-gradient(135deg, #1c1d17, #14150f)",
    border: "1px solid rgba(255,107,26,0.25)",
    borderRadius: 14,
    padding: "18px 18px 16px",
    marginBottom: 24,
  },
  potTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  potLabel: { fontSize: 11, letterSpacing: "0.1em", color: "rgba(242,239,230,0.55)", fontWeight: 700 },
  potValue: { fontSize: 24, fontWeight: 900, color: ORANGE, fontStyle: "italic" },
  potBarTrack: {
    height: 8,
    borderRadius: 4,
    background: "rgba(242,239,230,0.1)",
    overflow: "hidden",
    marginBottom: 8,
  },
  potBarFill: {
    height: "100%",
    background: `linear-gradient(90deg, ${ORANGE}, #FFA458)`,
    borderRadius: 4,
    transition: "width 0.5s ease",
  },
  potBottom: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "rgba(242,239,230,0.5)",
  },
  potBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    color: "#7CD68C",
    background: "rgba(124,214,140,0.1)",
    border: "1px solid rgba(124,214,140,0.3)",
    borderRadius: 6,
    padding: "3px 8px",
    marginBottom: 10,
  },
  fullBanner: {
    background: "rgba(255,122,110,0.1)",
    border: "1px solid rgba(255,122,110,0.3)",
    color: "#FF7A6E",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 20,
  },
  checkRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
    cursor: "pointer",
  },
  checkbox: {
    marginTop: 3,
    flexShrink: 0,
    width: 16,
    height: 16,
    accentColor: ORANGE,
    cursor: "pointer",
  },
  checkText: {
    fontSize: 12.5,
    color: "rgba(242,239,230,0.7)",
    lineHeight: 1.5,
  },
  link: { color: ORANGE, textDecoration: "underline" },
  card: {
    background: "#181914",
    border: "1px solid rgba(242,239,230,0.08)",
    borderRadius: 16,
    padding: 22,
  },
  sectionLabel: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 4 },
  sectionN: {
    fontSize: 11,
    fontWeight: 900,
    color: ORANGE,
    border: `1px solid ${ORANGE}`,
    borderRadius: 4,
    padding: "2px 6px",
  },
  sectionText: { fontSize: 12, letterSpacing: "0.08em", color: "rgba(242,239,230,0.55)", fontWeight: 700 },
  label: {
    display: "block",
    fontSize: 11,
    color: "rgba(242,239,230,0.55)",
    marginBottom: 6,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0f100c",
    border: "1px solid rgba(242,239,230,0.15)",
    borderRadius: 8,
    padding: "11px 12px",
    color: CREAM,
    fontSize: 15,
    outline: "none",
  },
  error: { color: "#FF7A6E", fontSize: 11, marginTop: 4 },
  playerRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(242,239,230,0.06)",
  },
  playerNum: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "rgba(255,107,26,0.15)",
    color: ORANGE,
    fontSize: 12,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  playerFields: { display: "flex", gap: 10, flex: 1 },
  removeBtn: {
    background: "none",
    border: "none",
    color: "rgba(242,239,230,0.4)",
    fontSize: 22,
    cursor: "pointer",
    marginTop: 16,
    lineHeight: 1,
    padding: "0 4px",
  },
  addBtn: {
    background: "none",
    border: "1px dashed rgba(242,239,230,0.25)",
    color: "rgba(242,239,230,0.6)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    cursor: "pointer",
    width: "100%",
    marginBottom: 20,
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid rgba(242,239,230,0.1)",
    paddingTop: 16,
    marginTop: 6,
  },
  priceLabel: { fontSize: 14, color: "rgba(242,239,230,0.7)" },
  priceValue: { fontSize: 22, fontWeight: 900, color: ORANGE },
  priceNote: { fontSize: 11, color: "rgba(242,239,230,0.4)", marginTop: 6, marginBottom: 18 },
  cta: {
    width: "100%",
    background: ORANGE,
    color: "#12130F",
    border: "none",
    borderRadius: 10,
    padding: "15px 18px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryBtn: {
    flex: 1,
    background: "transparent",
    color: CREAM,
    border: "1px solid rgba(242,239,230,0.2)",
    borderRadius: 10,
    padding: "15px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnRow: { display: "flex", gap: 10 },
  recapRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "9px 0",
    borderBottom: "1px solid rgba(242,239,230,0.06)",
    fontSize: 13,
  },
  recapLabel: { color: "rgba(242,239,230,0.5)" },
  recapValue: { color: CREAM, fontWeight: 600 },
  doneIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: ORANGE,
    color: "#12130F",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 900,
    margin: "6px auto 16px",
  },
  doneTitle: { textAlign: "center", fontSize: 22, fontWeight: 900, fontStyle: "italic", margin: "0 0 10px" },
  doneText: {
    textAlign: "center",
    fontSize: 14,
    color: "rgba(242,239,230,0.65)",
    lineHeight: 1.5,
    marginBottom: 22,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "rgba(242,239,230,0.3)",
    marginTop: 28,
    letterSpacing: "0.06em",
  },
};
