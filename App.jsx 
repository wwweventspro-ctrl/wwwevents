import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ⚠️ À REMPLIR après création du compte Supabase (Project Settings > API)
const SUPABASE_URL = "https://thvpqlfwczdubpwkoeuq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AbLHV6sZXYpMe5E8JjP4rA_cd5veEbB";

// ⚠️ Choisis TON propre mot de passe admin ici avant de déployer
const ADMIN_PASSWORD = "Sadmalick&12";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const INK = "#12130F";
const ORANGE = "#FF6B1A";
const CREAM = "#F2EFE6";

const MAX_PLAYERS = 4;
const MAX_ACTIVE_TOURNAMENTS = 2;

const EMPTY_PLAYERS = [
  { prenom: "", numero: "" },
  { prenom: "", numero: "" },
  { prenom: "", numero: "" },
];

export default function App() {
  const [view, setView] = useState("loading"); // loading, closed, select, form, recap, confirm, admin-login, admin
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [statuses, setStatuses] = useState({}); // { [id]: "ouvert" | "complet" | "ferme" }
  const [selected, setSelected] = useState(null);

  // form state
  const [teamName, setTeamName] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [players, setPlayers] = useState(EMPTY_PLAYERS);
  const [acceptReglement, setAcceptReglement] = useState(false);
  const [acceptImage, setAcceptImage] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);
  const [showReglement, setShowReglement] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // admin state
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [allTournaments, setAllTournaments] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState({}); // { [id]: teams[] | null }
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (localStorage.getItem("le-www-admin") === "yes") {
      setIsAdmin(true);
    }
    loadPublicTournaments();
  }, []);

  async function loadPublicTournaments() {
    setView("loading");
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("is_active", true)
        .order("cash_prize", { ascending: true });
      if (error) throw error;

      const list = data || [];
      const statusMap = {};
      for (const t of list) {
        if (!t.is_open) {
          statusMap[t.id] = "ferme";
          continue;
        }
        const { count } = await supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", t.id);
        statusMap[t.id] = (count || 0) >= t.team_cap ? "complet" : "ouvert";
      }
      setStatuses(statusMap);
      setActiveTournaments(list);

      if (list.length === 0) setView("closed");
      else if (list.length === 1) {
        setSelected(list[0]);
        setView("form");
      } else {
        setView("select");
      }
    } catch (e) {
      console.error(e);
      setView("closed");
    }
  }

  function chooseTournament(t) {
    setSelected(t);
    resetForm(false);
    setView("form");
  }

  function resetForm(goToSelectOrLoad = true) {
    setTeamName("");
    setCaptainPhone("");
    setPlayers(EMPTY_PLAYERS);
    setAcceptReglement(false);
    setAcceptImage(false);
    setAcceptAge(false);
    setErrors({});
    if (goToSelectOrLoad) loadPublicTournaments();
  }

  function addPlayer() {
    if (players.length < MAX_PLAYERS) setPlayers([...players, { prenom: "", numero: "" }]);
  }
  function removePlayer(idx) {
    if (players.length > 3) setPlayers(players.filter((_, i) => i !== idx));
  }
  function updatePlayer(idx, field, value) {
    const next = [...players];
    next[idx] = { ...next[idx], [field]: value };
    setPlayers(next);
  }

  const has4eme = players.length === 4;
  const totalPrix = selected ? selected.entry_price + (has4eme ? selected.option_price : 0) : 0;

  function validate() {
    const errs = {};
    if (!teamName.trim()) errs.teamName = "Nom d'équipe requis";
    if (!captainPhone.trim()) errs.captainPhone = "Numéro du capitaine requis";
    const numeros = new Set();
    players.forEach((p, i) => {
      if (!p.prenom.trim()) errs[`prenom${i}`] = "Prénom requis";
      if (p.numero === "" || p.numero < 0 || p.numero > 99) errs[`numero${i}`] = "N° entre 0 et 99";
      if (numeros.has(p.numero)) errs[`numero${i}`] = "Numéro déjà pris";
      numeros.add(p.numero);
    });
    if (!acceptReglement) errs.acceptReglement = "Tu dois accepter le règlement pour continuer";
    if (!acceptImage) errs.acceptImage = "Tu dois accepter le droit à l'image pour continuer";
    if (!acceptAge) errs.acceptAge = "Tu dois confirmer l'âge des joueurs pour continuer";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleContinue() {
    if (validate()) setView("recap");
  }

  async function handlePayer() {
    setLoading(true);
    try {
      const { count } = await supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", selected.id);
      if ((count || 0) >= selected.team_cap) {
        alert("Désolé, ce tournoi vient de se remplir. Merci de réessayer sur un autre tournoi.");
        loadPublicTournaments();
        return;
      }
      const { error } = await supabase.from("teams").insert([
        {
          tournament_id: selected.id,
          team_name: teamName,
          captain_phone: captainPhone,
          players,
          has_4eme: has4eme,
          prix: totalPrix,
          accept_reglement: true,
          accept_image: true,
          accept_age: true,
        },
      ]);
      if (error) throw error;
      setView("confirm");
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue, réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- ADMIN ----------
  function tryAdminLogin() {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      localStorage.setItem("le-www-admin", "yes");
      setIsAdmin(true);
      setAdminPasswordInput("");
      openAdmin();
    } else {
      alert("Mot de passe incorrect");
    }
  }

  function logoutAdmin() {
    localStorage.removeItem("le-www-admin");
    setIsAdmin(false);
    setView("select");
    loadPublicTournaments();
  }

  async function openAdmin() {
    setView("admin");
    const { data, error } = await supabase.from("tournaments").select("*").order("cash_prize");
    if (!error) setAllTournaments(data || []);
  }

  function updateAdminField(id, field, value) {
    setAllTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  function activeCount(list) {
    return list.filter((t) => t.is_active).length;
  }

  function toggleActive(id) {
    setAllTournaments((prev) => {
      const current = prev.find((t) => t.id === id);
      const willActivate = !current.is_active;
      if (willActivate && activeCount(prev) >= MAX_ACTIVE_TOURNAMENTS) {
        alert(`Maximum ${MAX_ACTIVE_TOURNAMENTS} tournois actifs en même temps. Désactive-en un d'abord.`);
        return prev;
      }
      return prev.map((t) => (t.id === id ? { ...t, is_active: willActivate } : t));
    });
  }

  function toggleOpen(id) {
    setAllTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, is_open: !t.is_open } : t)));
  }

  async function saveTournament(t) {
    setSavingId(t.id);
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({
          name: t.name,
          cash_prize: Number(t.cash_prize),
          entry_price: Number(t.entry_price),
          option_price: Number(t.option_price),
          venue: t.venue,
          event_date: t.event_date,
          team_cap: Number(t.team_cap),
          is_open: t.is_open,
          is_active: t.is_active,
        })
        .eq("id", t.id);
      if (error) throw error;
      alert(`${t.name} enregistré ✓`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleTeamsView(id) {
    if (expandedTeams[id]) {
      setExpandedTeams((prev) => ({ ...prev, [id]: null }));
      return;
    }
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", id)
      .order("created_at", { ascending: false });
    if (!error) setExpandedTeams((prev) => ({ ...prev, [id]: data || [] }));
  }

  // ---------- RENDER ----------
  if (view === "admin-login") {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <div style={styles.eyebrow}>ADMINISTRATION</div>
            <h1 style={styles.title}>
              LE <span style={styles.titleAccent}>WWW</span>
            </h1>
          </header>
          <div style={styles.card}>
            <SectionLabel n="•" text="Connexion admin" />
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
            <button style={{ ...styles.cta, marginTop: 16 }} onClick={tryAdminLogin} type="button">
              Se connecter
            </button>
            <button
              style={styles.secondaryBtn}
              onClick={() => {
                setView(activeTournaments.length === 1 ? "form" : "select");
              }}
              type="button"
            >
              ← Retour au site
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "admin") {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <div style={styles.eyebrow}>ADMINISTRATION</div>
            <h1 style={styles.title}>
              LE <span style={styles.titleAccent}>WWW</span>
            </h1>
            <p style={styles.subtitle}>
              {activeCount(allTournaments)} / {MAX_ACTIVE_TOURNAMENTS} tournois actifs
            </p>
          </header>

          {allTournaments.map((t) => (
            <div key={t.id} style={styles.card}>
              <div style={styles.adminCardHeader}>
                <span style={styles.adminBadge}>{t.cash_prize.toLocaleString("fr-FR")} €</span>
                <div style={styles.adminToggles}>
                  <ToggleChip active={t.is_active} onClick={() => toggleActive(t.id)} label="Actif" />
                  <ToggleChip active={t.is_open} onClick={() => toggleOpen(t.id)} label="Ouvert" />
                </div>
              </div>

              <label style={styles.label}>Nom du tournoi</label>
              <input
                style={styles.input}
                value={t.name}
                onChange={(e) => updateAdminField(t.id, "name", e.target.value)}
              />

              <div style={styles.row2}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Cash prize (€)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={t.cash_prize}
                    onChange={(e) => updateAdminField(t.id, "cash_prize", e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Plafond équipes</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={t.team_cap}
                    onChange={(e) => updateAdminField(t.id, "team_cap", e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Prix équipe (€)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={t.entry_price}
                    onChange={(e) => updateAdminField(t.id, "entry_price", e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Option 4e joueur (€)</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={t.option_price}
                    onChange={(e) => updateAdminField(t.id, "option_price", e.target.value)}
                  />
                </div>
              </div>

              <label style={styles.label}>Lieu</label>
              <input
                style={styles.input}
                value={t.venue || ""}
                onChange={(e) => updateAdminField(t.id, "venue", e.target.value)}
              />

              <label style={styles.label}>Date</label>
              <input
                style={styles.input}
                value={t.event_date || ""}
                onChange={(e) => updateAdminField(t.id, "event_date", e.target.value)}
              />

              <button
                style={{ ...styles.cta, marginTop: 14 }}
                onClick={() => saveTournament(t)}
                disabled={savingId === t.id}
                type="button"
              >
                {savingId === t.id ? "Enregistrement…" : "Enregistrer"}
              </button>

              <button style={styles.linkBtn2} onClick={() => toggleTeamsView(t.id)} type="button">
                {expandedTeams[t.id] ? "▲ Masquer les équipes" : "▼ Voir les équipes inscrites"}
              </button>

              {expandedTeams[t.id] && (
                <div style={styles.teamsList}>
                  {expandedTeams[t.id].length === 0 && (
                    <p style={styles.modalText}>Aucune équipe inscrite pour l'instant.</p>
                  )}
                  {expandedTeams[t.id].map((team) => (
                    <div key={team.id} style={styles.teamRow}>
                      <div style={styles.teamRowHead}>
                        <strong>{team.team_name}</strong>
                        <span>{team.prix} €</span>
                      </div>
                      <div style={styles.teamRowSub}>📞 {team.captain_phone}</div>
                      <div style={styles.teamRowSub}>
                        {team.players.map((p) => `${p.prenom} (#${p.numero})`).join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button style={styles.secondaryBtn} onClick={logoutAdmin} type="button">
            Se déconnecter
          </button>
          <FooterAdmin onAdmin={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>WWW EVENTS</div>
          <h1 style={styles.title}>
            LE <span style={styles.titleAccent}>WWW</span>
          </h1>
          <p style={styles.subtitle}>Who Want Win — 3v3. Poules + élimination directe.</p>
        </header>

        {view === "loading" && <p style={styles.modalText}>Chargement…</p>}

        {view === "closed" && (
          <div style={styles.card}>
            <p style={styles.priceNote}>
              Aucun tournoi n'est ouvert aux inscriptions pour le moment. Reviens bientôt !
            </p>
          </div>
        )}

        {view === "select" && (
          <>
            <SectionLabel n="•" text="Choisis ton tournoi" />
            {activeTournaments.map((t) => (
              <button
                key={t.id}
                style={styles.tournamentCard}
                onClick={() => chooseTournament(t)}
                type="button"
              >
                <div style={styles.potTop}>
                  <span style={styles.potLabel}>{t.name}</span>
                  <span style={styles.potValue}>{t.cash_prize.toLocaleString("fr-FR")} €</span>
                </div>
                <p style={styles.priceNote}>
                  {t.venue} · {t.event_date} · {t.entry_price} € / équipe
                </p>
                <StatusBadge status={statuses[t.id]} />
              </button>
            ))}
          </>
        )}

        {view === "form" && selected && (
          <>
            <div style={styles.potCard}>
              <div style={styles.potTop}>
                <span style={styles.potLabel}>CASH PRIZE GARANTI</span>
                <span style={styles.potValue}>{selected.cash_prize.toLocaleString("fr-FR")} €</span>
              </div>
              <div style={styles.potBadge}>✓ Déjà réuni — financé par l'organisation</div>
              <p style={styles.priceNote}>
                {selected.venue} · {selected.event_date}
              </p>
              <StatusBadge status={statuses[selected.id]} />
            </div>

            {statuses[selected.id] !== "ouvert" ? (
              <div style={styles.fullBanner}>
                {statuses[selected.id] === "complet"
                  ? "Inscriptions closes — ce tournoi est complet."
                  : "Les inscriptions ne sont pas encore ouvertes pour ce tournoi."}
              </div>
            ) : (
              <div style={styles.card}>
                <SectionLabel n="01" text="Équipe" />
                <label style={styles.label}>Nom de l'équipe</label>
                <input
                  style={styles.input}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex : Les Ballers du 9-4"
                />
                {errors.teamName && <div style={styles.error}>{errors.teamName}</div>}

                <label style={styles.label}>Téléphone du capitaine</label>
                <input
                  style={styles.input}
                  value={captainPhone}
                  onChange={(e) => setCaptainPhone(e.target.value)}
                  placeholder="06 XX XX XX XX"
                />
                {errors.captainPhone && <div style={styles.error}>{errors.captainPhone}</div>}

                <SectionLabel n="02" text="Joueurs (3 titulaires, 4e en option)" />
                {players.map((p, i) => (
                  <div key={i} style={styles.playerRow}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Prénom</label>
                      <input
                        style={styles.input}
                        value={p.prenom}
                        onChange={(e) => updatePlayer(i, "prenom", e.target.value)}
                        placeholder="Prénom"
                      />
                      {errors[`prenom${i}`] && <div style={styles.error}>{errors[`prenom${i}`]}</div>}
                    </div>
                    <div style={{ width: 80 }}>
                      <label style={styles.label}>N° maillot</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={p.numero}
                        onChange={(e) => updatePlayer(i, "numero", e.target.value)}
                        placeholder="00"
                      />
                      {errors[`numero${i}`] && <div style={styles.error}>{errors[`numero${i}`]}</div>}
                    </div>
                    {i === 3 && (
                      <button style={styles.removeBtn} onClick={() => removePlayer(i)} type="button">
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {players.length < MAX_PLAYERS && (
                  <button onClick={addPlayer} style={styles.addBtn} type="button">
                    + Ajouter un 4e joueur (remplaçant) — +{selected.option_price} €
                  </button>
                )}

                <div style={styles.priceRow}>
                  <span style={styles.priceLabel}>Inscription équipe{has4eme ? " + 4e joueur" : ""}</span>
                  <span style={styles.priceValue}>{totalPrix} €</span>
                </div>
                {has4eme && (
                  <p style={styles.priceNote}>
                    {selected.entry_price} € équipe (3 joueurs) + {selected.option_price} € option 4e joueur.
                  </p>
                )}

                <label style={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={acceptReglement}
                    onChange={(e) => setAcceptReglement(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkText}>
                    J'ai lu et j'accepte le{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowReglement(true);
                      }}
                      style={styles.linkBtn}
                    >
                      règlement du tournoi
                    </button>{" "}
                    (format, discipline, arbitrage).
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
                    J'autorise l'organisation à photographier/filmer mon équipe et à réaliser des
                    interviews, pour une utilisation promotionnelle sur les réseaux sociaux.
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

            {activeTournaments.length > 1 && (
              <button style={styles.secondaryBtn} onClick={() => setView("select")} type="button">
                ← Choisir un autre tournoi
              </button>
            )}
          </>
        )}

        {view === "recap" && selected && (
          <div style={styles.card}>
            <SectionLabel n="03" text="Récapitulatif" />
            <RecapRow label="Tournoi" value={selected.name} />
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
              Paiement sécurisé (démo — à connecter à HelloAsso pour la version finale).
            </p>
            <div style={styles.btnRow}>
              <button style={styles.secondaryBtn} onClick={() => setView("form")} type="button">
                ← Modifier
              </button>
              <button style={styles.cta} onClick={handlePayer} disabled={loading} type="button">
                {loading ? "…" : `Payer ${totalPrix} € et confirmer`}
              </button>
            </div>
          </div>
        )}

        {view === "confirm" && selected && (
          <div style={styles.card}>
            <SectionLabel n="✓" text="Inscription confirmée" />
            <p style={styles.priceNote}>
              L'équipe <strong>{teamName}</strong> est inscrite au tournoi <strong>{selected.name}</strong>.
              Rendez-vous le jour J avec vos pièces d'identité !
            </p>
            <button style={styles.cta} onClick={() => resetForm(true)} type="button">
              Inscrire une autre équipe
            </button>
          </div>
        )}

        <footer style={styles.footer}>
          Le WWW · WWW Events
          <button
            style={styles.adminLink}
            onClick={() => (isAdmin ? openAdmin() : setView("admin-login"))}
            type="button"
          >
            Admin
          </button>
        </footer>
      </div>

      {showReglement && (
        <div style={styles.modalOverlay} onClick={() => setShowReglement(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Règlement du tournoi</h2>
              <button style={styles.modalClose} onClick={() => setShowReglement(false)} type="button">
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <h3 style={styles.modalSection}>Format</h3>
              <p style={styles.modalText}>
                Poules puis élimination directe. 3v3, matchs simultanés sur plusieurs terrains.
                Le nombre d'équipes et le plafond varient selon le tournoi choisi.
              </p>

              <h3 style={styles.modalSection}>Règles de jeu</h3>
              <p style={styles.modalText}>
                Ligne à 2 points classique du 3v3. Matchs de poules en 12 points, phase finale en
                16 points. En cas d'égalité : panier en or. Changements illimités, à la volée. Pas
                de temps mort.
              </p>

              <h3 style={styles.modalSection}>Fautes</h3>
              <p style={styles.modalText}>
                Faute simple : possession de balle pour l'équipe adverse. Faute antisportive : 2
                lancers francs pour l'équipe adverse.
              </p>

              <h3 style={styles.modalSection}>Ponctualité</h3>
              <p style={styles.modalText}>
                Une équipe qui n'est pas prête sur le terrain 10 minutes après l'heure programmée
                de son match est déclarée forfait sur ce match. En cas de récidive au cours du
                même tournoi, l'équipe est exclue du tournoi, sans remboursement.
              </p>

              <h3 style={styles.modalSection}>Âge et identité</h3>
              <p style={styles.modalText}>
                Tournoi réservé aux 16 ans et plus. Une pièce d'identité pourra être demandée à
                l'accueil le jour du tournoi pour chaque joueur.
              </p>

              <h3 style={styles.modalSection}>Inscription et paiement</h3>
              <p style={styles.modalText}>
                Le prix d'inscription et l'option 4e joueur dépendent du tournoi choisi. Aucun
                remboursement en cas de désistement d'une équipe, quel qu'en soit le motif.
              </p>

              <h3 style={styles.modalSection}>Arbitrage</h3>
              <p style={styles.modalText}>
                Chaque terrain est arbitré par un arbitre officiel de l'organisation. Les
                décisions d'arbitrage sont sans appel.
              </p>

              <h3 style={styles.modalSection}>Discipline</h3>
              <p style={styles.modalText}>
                Tout comportement antisportif, violent ou irrespectueux envers les arbitres,
                l'organisation ou les autres joueurs pourra entraîner l'exclusion immédiate du
                joueur ou de l'équipe, sans remboursement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ n, text }) {
  return (
    <div style={styles.sectionLabel}>
      <span style={styles.sectionN}>{n}</span>
      <span>{text}</span>
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

function ToggleChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.toggleChip,
        background: active ? "rgba(124,214,140,0.15)" : "rgba(255,122,110,0.1)",
        borderColor: active ? "rgba(124,214,140,0.4)" : "rgba(255,122,110,0.3)",
        color: active ? "#7CD68C" : "#FF7A6E",
      }}
    >
      {active ? "✓" : "✕"} {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    ouvert: { text: "OUVERT", color: "#7CD68C", bg: "rgba(124,214,140,0.1)" },
    complet: { text: "COMPLET", color: "#FF7A6E", bg: "rgba(255,122,110,0.1)" },
    ferme: { text: "FERMÉ", color: "rgba(242,239,230,0.5)", bg: "rgba(242,239,230,0.06)" },
  };
  const s = map[status] || map.ferme;
  return (
    <span style={{ ...styles.statusBadge, color: s.color, background: s.bg }}>{s.text}</span>
  );
}

function FooterAdmin() {
  return null;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: INK,
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(242,239,230,0.025) 0px, rgba(242,239,230,0.025) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(242,239,230,0.025) 0px, rgba(242,239,230,0.025) 1px, transparent 1px, transparent 40px)",
    color: CREAM,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    padding: "24px 16px 60px",
  },
  container: { maxWidth: 480, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: 24 },
  eyebrow: { fontSize: 11, letterSpacing: "0.15em", color: ORANGE, fontWeight: 700, marginBottom: 8 },
  title: { fontSize: 40, fontWeight: 900, fontStyle: "italic", margin: 0, letterSpacing: "-0.02em" },
  titleAccent: { color: ORANGE },
  subtitle: { fontSize: 13, color: "rgba(242,239,230,0.6)", marginTop: 8 },
  potCard: {
    background: "linear-gradient(135deg, rgba(255,107,26,0.12), rgba(255,107,26,0.02))",
    border: "1px solid rgba(255,107,26,0.25)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  potTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  potLabel: { fontSize: 11, letterSpacing: "0.1em", color: "rgba(242,239,230,0.6)", fontWeight: 700 },
  potValue: { fontSize: 26, fontWeight: 900, fontStyle: "italic", color: ORANGE },
  potBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    color: "#7CD68C",
    background: "rgba(124,214,140,0.1)",
    border: "1px solid rgba(124,214,140,0.3)",
    borderRadius: 6,
    padding: "3px 8px",
    marginTop: 10,
    marginBottom: 6,
  },
  statusBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    borderRadius: 6,
    padding: "4px 10px",
    marginTop: 6,
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
  tournamentCard: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "rgba(242,239,230,0.04)",
    border: "1px solid rgba(242,239,230,0.1)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    cursor: "pointer",
    color: CREAM,
    font: "inherit",
  },
  card: {
    background: "rgba(242,239,230,0.03)",
    border: "1px solid rgba(242,239,230,0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    letterSpacing: "0.1em",
    color: ORANGE,
    fontWeight: 700,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  sectionN: {
    background: "rgba(255,107,26,0.15)",
    borderRadius: 4,
    padding: "2px 6px",
  },
  label: { display: "block", fontSize: 12, color: "rgba(242,239,230,0.6)", marginBottom: 6, marginTop: 14 },
  input: {
    width: "100%",
    background: "rgba(242,239,230,0.05)",
    border: "1px solid rgba(242,239,230,0.15)",
    borderRadius: 10,
    padding: "12px 14px",
    color: CREAM,
    fontSize: 15,
    boxSizing: "border-box",
  },
  row2: { display: "flex", gap: 12 },
  playerRow: { display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 4 },
  removeBtn: {
    background: "rgba(255,122,110,0.1)",
    border: "1px solid rgba(255,122,110,0.3)",
    color: "#FF7A6E",
    borderRadius: 8,
    width: 36,
    height: 46,
    cursor: "pointer",
  },
  addBtn: {
    width: "100%",
    background: "rgba(255,107,26,0.08)",
    border: "1px dashed rgba(255,107,26,0.4)",
    color: ORANGE,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 10,
    cursor: "pointer",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid rgba(242,239,230,0.1)",
  },
  priceLabel: { fontSize: 13, color: "rgba(242,239,230,0.7)" },
  priceValue: { fontSize: 22, fontWeight: 900, fontStyle: "italic", color: ORANGE },
  priceNote: { fontSize: 12, color: "rgba(242,239,230,0.5)", marginTop: 6 },
  checkRow: { display: "flex", gap: 10, marginTop: 16, alignItems: "flex-start" },
  checkbox: { marginTop: 3, width: 16, height: 16, flexShrink: 0 },
  checkText: { fontSize: 12.5, lineHeight: 1.5, color: "rgba(242,239,230,0.75)" },
  error: { fontSize: 11.5, color: "#FF7A6E", marginTop: 4 },
  cta: {
    width: "100%",
    background: ORANGE,
    color: "#12130F",
    border: "none",
    borderRadius: 12,
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 900,
    fontStyle: "italic",
    marginTop: 20,
    cursor: "pointer",
  },
  secondaryBtn: {
    width: "100%",
    background: "transparent",
    color: CREAM,
    border: "1px solid rgba(242,239,230,0.2)",
    borderRadius: 12,
    padding: "14px 20px",
    fontSize: 14,
    fontWeight: 700,
    marginTop: 10,
    cursor: "pointer",
  },
  btnRow: { display: "flex", gap: 10, marginTop: 4 },
  recapRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid rgba(242,239,230,0.06)",
    fontSize: 13.5,
  },
  recapLabel: { color: "rgba(242,239,230,0.5)" },
  recapValue: { fontWeight: 700 },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "rgba(242,239,230,0.35)",
    marginTop: 30,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
  },
  adminLink: {
    background: "none",
    border: "none",
    color: "rgba(242,239,230,0.35)",
    fontSize: 11,
    textDecoration: "underline",
    cursor: "pointer",
    padding: 0,
  },
  link: { color: ORANGE, textDecoration: "underline" },
  linkBtn: {
    color: ORANGE,
    textDecoration: "underline",
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    fontSize: "inherit",
    cursor: "pointer",
    display: "inline",
  },
  linkBtn2: {
    display: "block",
    width: "100%",
    textAlign: "center",
    background: "none",
    border: "none",
    color: ORANGE,
    fontSize: 12.5,
    fontWeight: 700,
    marginTop: 14,
    cursor: "pointer",
  },
  teamsList: { marginTop: 14, borderTop: "1px solid rgba(242,239,230,0.08)", paddingTop: 10 },
  teamRow: {
    background: "rgba(242,239,230,0.03)",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 8,
  },
  teamRowHead: { display: "flex", justifyContent: "space-between", fontSize: 13.5 },
  teamRowSub: { fontSize: 12, color: "rgba(242,239,230,0.55)", marginTop: 3 },
  adminCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  adminBadge: {
    fontSize: 16,
    fontWeight: 900,
    fontStyle: "italic",
    color: ORANGE,
  },
  adminToggles: { display: "flex", gap: 6 },
  toggleChip: {
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid",
    borderRadius: 20,
    padding: "5px 10px",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    background: "#181914",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    maxWidth: 520,
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 20px",
    borderBottom: "1px solid rgba(242,239,230,0.08)",
    flexShrink: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: 900, fontStyle: "italic", margin: 0, color: CREAM },
  modalClose: {
    background: "rgba(242,239,230,0.08)",
    border: "none",
    color: CREAM,
    width: 30,
    height: 30,
    borderRadius: "50%",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
  },
  modalBody: { padding: "18px 20px 32px", overflowY: "auto" },
  modalSection: {
    fontSize: 12,
    letterSpacing: "0.08em",
    color: ORANGE,
    fontWeight: 700,
    marginTop: 18,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  modalText: {
    fontSize: 13.5,
    lineHeight: 1.6,
    color: "rgba(242,239,230,0.75)",
    margin: 0,
  },
};
