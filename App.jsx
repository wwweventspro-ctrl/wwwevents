import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ⚠️ À REMPLIR après création du compte Supabase (Project Settings > API)
const SUPABASE_URL = "https://thvpqlfwczdubpwkoeuq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AbLHV6sZXYpMe5E8JjP4rA_cd5veEbB";

// ⚠️ Comptes admin : ajoute une ligne par personne "Nom": "motdepasse"
const ADMIN_ACCOUNTS = {
  "Malick": "Sadmalick&12",
  "Kenza Ndao": "lollyta770408",
  "Othmane Yattassaye": "barouba78",
};

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
  const [captainEmail, setCaptainEmail] = useState("");
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
  const [adminName, setAdminName] = useState("");
  const [allTournaments, setAllTournaments] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [teamCounts, setTeamCounts] = useState({}); // { [tournamentId]: number }
  const [teamSearch, setTeamSearch] = useState({}); // { [tournamentId]: string }
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editTeamDraft, setEditTeamDraft] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [adminLogs, setAdminLogs] = useState([]);
  const [generatedPools, setGeneratedPools] = useState({}); // { [tournamentId]: [[name,name,name],...] }
  const [showArchives, setShowArchives] = useState(false);
  const [archives, setArchives] = useState([]);
  const [expandedArchive, setExpandedArchive] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showGalleryAdmin, setShowGalleryAdmin] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("le-www-admin-name");
    if (savedName && ADMIN_ACCOUNTS[savedName]) {
      setIsAdmin(true);
      setAdminName(savedName);
    }
    loadPublicTournaments();
    loadGalleryPhotos();
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

  async function sharePage(tournament) {
    const url = window.location.href;
    const text = tournament
      ? `Inscris ton équipe au tournoi "${tournament.name}" — ${tournament.venue}, ${tournament.event_date} !`
      : "Inscris ton équipe au tournoi Le WWW !";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Le WWW", text, url });
      } catch (e) {
        /* utilisateur a annulé, rien à faire */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Lien copié ! Tu peux le coller où tu veux.");
      } catch (e) {
        alert(url);
      }
    }
  }

  function resetForm(goToSelectOrLoad = true) {
    setTeamName("");
    setCaptainPhone("");
    setCaptainEmail("");
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
    if (!captainEmail.trim() || !/^\S+@\S+\.\S+$/.test(captainEmail))
      errs.captainEmail = "Email valide requis (pour la confirmation)";
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
      const { data: inserted, error } = await supabase
        .from("teams")
        .insert([
          {
            tournament_id: selected.id,
            team_name: teamName,
            captain_phone: captainPhone,
            captain_email: captainEmail,
            players,
            has_4eme: has4eme,
            prix: totalPrix,
            accept_reglement: true,
            accept_image: true,
            accept_age: true,
            payment_status: "en_attente",
            checked_in: false,
          },
        ])
        .select();
      if (error) throw error;
      setView("confirm");
      // Envoi des emails de confirmation (best-effort, ne bloque pas l'inscription si ça échoue)
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_registration",
          teamName,
          captainEmail,
          captainPhone,
          tournamentName: selected.name,
          prix: totalPrix,
        }),
      }).catch((e) => console.error("email notif failed", e));
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue, réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- ADMIN ----------
  function tryAdminLogin() {
    const found = Object.entries(ADMIN_ACCOUNTS).find(([, pwd]) => pwd === adminPasswordInput);
    if (found) {
      const [name] = found;
      localStorage.setItem("le-www-admin-name", name);
      setIsAdmin(true);
      setAdminName(name);
      setAdminPasswordInput("");
      openAdmin();
    } else {
      alert("Mot de passe incorrect");
    }
  }

  function logoutAdmin() {
    localStorage.removeItem("le-www-admin-name");
    setIsAdmin(false);
    setAdminName("");
    setView("select");
    loadPublicTournaments();
  }

  async function logAction(action, details) {
    try {
      await supabase.from("admin_logs").insert([{ admin_name: adminName, action, details }]);
    } catch (e) {
      console.error("log failed", e);
    }
  }

  async function loadLogs() {
    const { data, error } = await supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setAdminLogs(data || []);
    setShowLogs(true);
  }

  async function openAdmin() {
    setView("admin");
    const { data, error } = await supabase.from("tournaments").select("*").order("cash_prize");
    if (!error) {
      setAllTournaments(data || []);
      const counts = {};
      for (const t of data || []) {
        const { count } = await supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", t.id);
        counts[t.id] = count || 0;
      }
      setTeamCounts(counts);
    }
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
      logAction("edit_tournament", `${t.name} modifié`);
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

  function startEditTeam(team) {
    setEditingTeamId(team.id);
    setEditTeamDraft({ ...team, players: team.players.map((p) => ({ ...p })) });
  }

  function cancelEditTeam() {
    setEditingTeamId(null);
    setEditTeamDraft(null);
  }

  function updateEditDraftPlayer(idx, field, value) {
    setEditTeamDraft((prev) => {
      const next = [...prev.players];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, players: next };
    });
  }

  async function saveEditedTeam(tournamentId) {
    if (!editTeamDraft.team_name.trim() || !editTeamDraft.captain_phone.trim()) {
      alert("Nom d'équipe et téléphone requis.");
      return;
    }
    const { error } = await supabase
      .from("teams")
      .update({
        team_name: editTeamDraft.team_name,
        captain_phone: editTeamDraft.captain_phone,
        players: editTeamDraft.players,
      })
      .eq("id", editTeamDraft.id);
    if (error) {
      alert("Erreur lors de la modification.");
      return;
    }
    setExpandedTeams((prev) => ({
      ...prev,
      [tournamentId]: (prev[tournamentId] || []).map((t) => (t.id === editTeamDraft.id ? editTeamDraft : t)),
    }));
    logAction("edit_team", `Équipe "${editTeamDraft.team_name}" modifiée`);
    setEditingTeamId(null);
    setEditTeamDraft(null);
  }

  async function deleteTeam(tournamentId, teamId, teamName) {
    if (!window.confirm(`Supprimer l'équipe "${teamName}" ? Cette action est définitive.`)) return;
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) {
      alert("Erreur lors de la suppression.");
      return;
    }
    setExpandedTeams((prev) => ({
      ...prev,
      [tournamentId]: (prev[tournamentId] || []).filter((t) => t.id !== teamId),
    }));
    setTeamCounts((prev) => ({ ...prev, [tournamentId]: Math.max(0, (prev[tournamentId] || 1) - 1) }));
    logAction("delete_team", `Équipe "${teamName}" supprimée`);
  }

  async function resetTournamentTeams(tournamentId, tournamentName) {
    if (
      !window.confirm(
        `Supprimer TOUTES les équipes inscrites au tournoi "${tournamentName}" ? Un archivage automatique sera fait avant, consultable dans l'historique.`
      )
    )
      return;
    const { data: currentTeams, error: fetchErr } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (fetchErr) {
      alert("Erreur lors de la lecture des équipes.");
      return;
    }
    if ((currentTeams || []).length > 0) {
      await supabase.from("archived_registrations").insert([
        {
          tournament_id: tournamentId,
          tournament_name: tournamentName,
          teams_snapshot: currentTeams,
        },
      ]);
    }
    const { error } = await supabase.from("teams").delete().eq("tournament_id", tournamentId);
    if (error) {
      alert("Erreur lors de la suppression.");
      return;
    }
    setExpandedTeams((prev) => ({ ...prev, [tournamentId]: [] }));
    setTeamCounts((prev) => ({ ...prev, [tournamentId]: 0 }));
    logAction("reset_tournament", `Tournoi "${tournamentName}" archivé et vidé (${(currentTeams || []).length} équipes)`);
  }

  async function setPaymentStatus(tournamentId, teamId, teamName, status) {
    const { error } = await supabase.from("teams").update({ payment_status: status }).eq("id", teamId);
    if (error) {
      alert("Erreur lors de la mise à jour du paiement.");
      return;
    }
    setExpandedTeams((prev) => ({
      ...prev,
      [tournamentId]: (prev[tournamentId] || []).map((t) =>
        t.id === teamId ? { ...t, payment_status: status } : t
      ),
    }));
    const labels = { en_attente: "en attente", payee: "payée", remboursee: "remboursée" };
    logAction("payment_status", `Équipe "${teamName}" marquée ${labels[status]}`);
  }

  async function toggleCheckedIn(tournamentId, teamId, teamName, current) {
    const { error } = await supabase.from("teams").update({ checked_in: !current }).eq("id", teamId);
    if (error) {
      alert("Erreur lors de la mise à jour.");
      return;
    }
    setExpandedTeams((prev) => ({
      ...prev,
      [tournamentId]: (prev[tournamentId] || []).map((t) =>
        t.id === teamId ? { ...t, checked_in: !current } : t
      ),
    }));
    logAction("checkin", `Équipe "${teamName}" ${!current ? "pointée présente ✓" : "dé-pointée"}`);
  }

  function generatePools(tournamentId, tournamentName) {
    const teams = expandedTeams[tournamentId];
    if (!teams || teams.length < 3) {
      alert("Il faut au moins 3 équipes chargées (clique sur 'Voir les équipes inscrites' d'abord).");
      return;
    }
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const pools = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      pools.push(shuffled.slice(i, i + 3).map((t) => t.team_name));
    }
    setGeneratedPools((prev) => ({ ...prev, [tournamentId]: pools }));
    logAction("generate_pools", `Poules générées pour "${tournamentName}" (${pools.length} poules)`);
  }

  async function loadArchives() {
    const { data, error } = await supabase
      .from("archived_registrations")
      .select("*")
      .order("archived_at", { ascending: false });
    if (!error) setArchives(data || []);
    setShowArchives(true);
  }

  async function loadGalleryPhotos() {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setGalleryPhotos(data || []);
  }

  async function uploadPhoto(file) {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
      const { error: insErr } = await supabase
        .from("gallery_photos")
        .insert([{ url: urlData.publicUrl, storage_path: path }]);
      if (insErr) throw insErr;
      logAction("add_photo", "Photo ajoutée à la galerie");
      loadGalleryPhotos();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deletePhoto(photo) {
    if (!window.confirm("Supprimer cette photo ?")) return;
    await supabase.storage.from("gallery").remove([photo.storage_path]);
    await supabase.from("gallery_photos").delete().eq("id", photo.id);
    setGalleryPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    logAction("delete_photo", "Photo supprimée de la galerie");
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
            <div style={styles.eyebrow}>ADMINISTRATION · {adminName}</div>
            <h1 style={styles.title}>
              LE <span style={styles.titleAccent}>WWW</span>
            </h1>
            <p style={styles.subtitle}>
              {activeCount(allTournaments)} / {MAX_ACTIVE_TOURNAMENTS} tournois actifs
            </p>
            <button style={styles.linkBtn2} onClick={loadLogs} type="button">
              🕒 Voir le journal des actions admin
            </button>
            <button style={styles.linkBtn2} onClick={loadArchives} type="button">
              📦 Historique des tournois archivés
            </button>
            <button
              style={styles.linkBtn2}
              onClick={() => {
                loadGalleryPhotos();
                setShowGalleryAdmin((v) => !v);
              }}
              type="button"
            >
              🖼️ Gérer la galerie photo
            </button>
          </header>

          {showLogs && (
            <div style={styles.card}>
              <div style={styles.adminCardHeader}>
                <SectionLabel n="•" text="Journal des actions" />
                <button style={styles.linkBtn2} onClick={() => setShowLogs(false)} type="button">
                  Fermer
                </button>
              </div>
              {adminLogs.length === 0 && <p style={styles.modalText}>Aucune action enregistrée.</p>}
              {adminLogs.map((log) => (
                <div key={log.id} style={styles.teamRowSub}>
                  {new Date(log.created_at).toLocaleString("fr-FR")} — <strong>{log.admin_name}</strong> —{" "}
                  {log.details}
                </div>
              ))}
            </div>
          )}

          {showArchives && (
            <div style={styles.card}>
              <div style={styles.adminCardHeader}>
                <SectionLabel n="•" text="Historique des tournois" />
                <button style={styles.linkBtn2} onClick={() => setShowArchives(false)} type="button">
                  Fermer
                </button>
              </div>
              {archives.length === 0 && <p style={styles.modalText}>Aucun tournoi archivé pour l'instant.</p>}
              {archives.map((a) => (
                <div key={a.id} style={styles.teamRow}>
                  <div style={styles.teamRowHead}>
                    <strong>{a.tournament_name}</strong>
                    <span>{a.teams_snapshot.length} équipes</span>
                  </div>
                  <div style={styles.teamRowSub}>
                    Archivé le {new Date(a.archived_at).toLocaleDateString("fr-FR")}
                  </div>
                  <button
                    style={styles.linkBtn2}
                    onClick={() => setExpandedArchive(expandedArchive === a.id ? null : a.id)}
                    type="button"
                  >
                    {expandedArchive === a.id ? "▲ Masquer" : "▼ Voir le détail"}
                  </button>
                  {expandedArchive === a.id &&
                    a.teams_snapshot.map((team, i) => (
                      <div key={i} style={styles.teamRowSub}>
                        • {team.team_name} — {team.captain_phone} —{" "}
                        {team.players.map((p) => p.prenom).join(", ")}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          {showGalleryAdmin && (
            <div style={styles.card}>
              <div style={styles.adminCardHeader}>
                <SectionLabel n="•" text="Galerie photo" />
                <button style={styles.linkBtn2} onClick={() => setShowGalleryAdmin(false)} type="button">
                  Fermer
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPhoto}
                onChange={(e) => uploadPhoto(e.target.files[0])}
                style={styles.input}
              />
              {uploadingPhoto && <p style={styles.modalText}>Envoi en cours…</p>}
              <div style={styles.galleryGrid}>
                {galleryPhotos.map((p) => (
                  <div key={p.id} style={styles.galleryItem}>
                    <img src={p.url} alt="" style={styles.galleryImg} />
                    <button style={styles.deleteTeamBtn} onClick={() => deletePhoto(p)} type="button">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allTournaments.map((t) => (
            <div key={t.id} style={styles.card}>
              <div style={styles.adminCardHeader}>
                <span style={styles.adminBadge}>{t.cash_prize.toLocaleString("fr-FR")} €</span>
                <span style={styles.teamCountBadge}>
                  {teamCounts[t.id] ?? "…"} / {t.team_cap} équipes
                </span>
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

              {expandedTeams[t.id] && expandedTeams[t.id].length >= 3 && (
                <button style={styles.linkBtn2} onClick={() => generatePools(t.id, t.name)} type="button">
                  🎲 Générer les poules (3 par groupe)
                </button>
              )}

              {generatedPools[t.id] && (
                <div style={styles.teamsList}>
                  {generatedPools[t.id].map((pool, i) => (
                    <div key={i} style={styles.teamRowSub}>
                      <strong>Poule {String.fromCharCode(65 + i)}</strong> — {pool.join(" · ")}
                    </div>
                  ))}
                </div>
              )}

              {expandedTeams[t.id] && (
                <div style={styles.teamsList}>
                  {expandedTeams[t.id].length > 0 && (
                    <input
                      style={styles.input}
                      placeholder="🔍 Rechercher par nom d'équipe ou téléphone…"
                      value={teamSearch[t.id] || ""}
                      onChange={(e) => setTeamSearch((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    />
                  )}

                  {expandedTeams[t.id].length === 0 && (
                    <p style={styles.modalText}>Aucune équipe inscrite pour l'instant.</p>
                  )}

                  {expandedTeams[t.id]
                    .filter((team) => {
                      const q = (teamSearch[t.id] || "").trim().toLowerCase();
                      if (!q) return true;
                      return (
                        team.team_name.toLowerCase().includes(q) || team.captain_phone.toLowerCase().includes(q)
                      );
                    })
                    .map((team) =>
                      editingTeamId === team.id ? (
                        <div key={team.id} style={styles.teamRow}>
                          <label style={styles.label}>Nom de l'équipe</label>
                          <input
                            style={styles.input}
                            value={editTeamDraft.team_name}
                            onChange={(e) =>
                              setEditTeamDraft((prev) => ({ ...prev, team_name: e.target.value }))
                            }
                          />
                          <label style={styles.label}>Téléphone du capitaine</label>
                          <input
                            style={styles.input}
                            value={editTeamDraft.captain_phone}
                            onChange={(e) =>
                              setEditTeamDraft((prev) => ({ ...prev, captain_phone: e.target.value }))
                            }
                          />
                          {editTeamDraft.players.map((p, idx) => (
                            <div key={idx} style={styles.row2}>
                              <div style={{ flex: 1 }}>
                                <label style={styles.label}>Prénom {idx + 1}</label>
                                <input
                                  style={styles.input}
                                  value={p.prenom}
                                  onChange={(e) => updateEditDraftPlayer(idx, "prenom", e.target.value)}
                                />
                              </div>
                              <div style={{ width: 70 }}>
                                <label style={styles.label}>N°</label>
                                <input
                                  style={styles.input}
                                  value={p.numero}
                                  onChange={(e) => updateEditDraftPlayer(idx, "numero", e.target.value)}
                                />
                              </div>
                            </div>
                          ))}
                          <div style={styles.row2}>
                            <button
                              style={{ ...styles.cta, flex: 1 }}
                              onClick={() => saveEditedTeam(t.id)}
                              type="button"
                            >
                              Enregistrer
                            </button>
                            <button
                              style={{ ...styles.secondaryBtn, flex: 1 }}
                              onClick={cancelEditTeam}
                              type="button"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={team.id} style={styles.teamRow}>
                          <div style={styles.teamRowHead}>
                            <strong>{team.team_name}</strong>
                            <span>{team.prix} €</span>
                          </div>
                          <div style={styles.teamRowSub}>📞 {team.captain_phone}</div>
                          {team.captain_email && <div style={styles.teamRowSub}>✉️ {team.captain_email}</div>}
                          <div style={styles.teamRowSub}>
                            {team.players.map((p) => `${p.prenom} (#${p.numero})`).join(" · ")}
                          </div>

                          <div style={styles.paymentRow}>
                            <PaymentBadge status={team.payment_status} />
                            {team.checked_in && <span style={styles.checkedInBadge}>✓ Présente</span>}
                          </div>

                          <div style={styles.row2}>
                            <select
                              style={{ ...styles.input, flex: 1, marginTop: 0 }}
                              value={team.payment_status || "en_attente"}
                              onChange={(e) => setPaymentStatus(t.id, team.id, team.team_name, e.target.value)}
                            >
                              <option value="en_attente">⏳ En attente</option>
                              <option value="payee">✅ Payée</option>
                              <option value="remboursee">↩️ Remboursée</option>
                            </select>
                          </div>

                          <div style={styles.row2}>
                            <button
                              style={{ ...styles.deleteTeamBtn, flex: 1 }}
                              onClick={() => toggleCheckedIn(t.id, team.id, team.team_name, team.checked_in)}
                              type="button"
                            >
                              {team.checked_in ? "↺ Annuler présence" : "✓ Pointer présente"}
                            </button>
                          </div>

                          <div style={styles.row2}>
                            <button
                              style={{ ...styles.deleteTeamBtn, flex: 1 }}
                              onClick={() => startEditTeam(team)}
                              type="button"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              style={{ ...styles.deleteTeamBtn, flex: 1 }}
                              onClick={() => deleteTeam(t.id, team.id, team.team_name)}
                              type="button"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      )
                    )}

                  {expandedTeams[t.id].length > 0 && (
                    <button
                      style={styles.resetTeamsBtn}
                      onClick={() => resetTournamentTeams(t.id, t.name)}
                      type="button"
                    >
                      🗑️ Vider toutes les équipes de ce tournoi
                    </button>
                  )}
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

        {galleryPhotos.length > 0 && view !== "loading" && (
          <div style={styles.galleryGrid}>
            {galleryPhotos.slice(0, 6).map((p) => (
              <img key={p.id} src={p.url} alt="" style={styles.galleryImg} />
            ))}
          </div>
        )}

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
            <button style={styles.secondaryBtn} onClick={() => sharePage(null)} type="button">
              📤 Partager Le WWW
            </button>
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

                <label style={styles.label}>Email du capitaine</label>
                <input
                  style={styles.input}
                  value={captainEmail}
                  onChange={(e) => setCaptainEmail(e.target.value)}
                  placeholder="capitaine@email.com"
                  type="email"
                />
                {errors.captainEmail && <div style={styles.error}>{errors.captainEmail}</div>}

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
            <RecapRow label="Email" value={captainEmail} />
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
            <div style={styles.pendingNotice}>
              ⏳ Ton inscription est enregistrée mais <strong>en attente de validation du paiement</strong>{" "}
              ({totalPrix} €). L'organisation te recontactera au {captainPhone} pour les modalités de
              paiement.
            </div>
            <button style={styles.secondaryBtn} onClick={() => sharePage(selected)} type="button">
              📤 Partager ce tournoi
            </button>
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

function PaymentBadge({ status }) {
  const map = {
    en_attente: { text: "⏳ En attente", color: "#e8c98a", bg: "rgba(255,180,60,0.1)" },
    payee: { text: "✅ Payée", color: "#7CD68C", bg: "rgba(124,214,140,0.1)" },
    remboursee: { text: "↩️ Remboursée", color: "#FF7A6E", bg: "rgba(255,122,110,0.1)" },
  };
  const s = map[status] || map.en_attente;
  return <span style={{ ...styles.statusBadge, color: s.color, background: s.bg }}>{s.text}</span>;
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
  pendingNotice: {
    background: "rgba(255,180,60,0.1)",
    border: "1px solid rgba(255,180,60,0.3)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12.5,
    color: "#e8c98a",
    margin: "12px 0",
    lineHeight: 1.5,
  },
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
  teamCountBadge: {
    fontSize: 12,
    color: "rgba(242,239,230,0.6)",
    background: "rgba(242,239,230,0.06)",
    borderRadius: 8,
    padding: "4px 8px",
  },
  paymentRow: { display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" },
  checkedInBadge: {
    fontSize: 11,
    color: "#7CD68C",
    background: "rgba(124,214,140,0.1)",
    borderRadius: 8,
    padding: "3px 8px",
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginTop: 10,
  },
  galleryItem: { position: "relative" },
  galleryImg: { width: "100%", height: 90, objectFit: "cover", borderRadius: 8 },
  deleteTeamBtn: {
    marginTop: 8,
    background: "rgba(220,60,60,0.12)",
    color: "#e07a7a",
    border: "1px solid rgba(220,60,60,0.3)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  resetTeamsBtn: {
    marginTop: 10,
    width: "100%",
    background: "rgba(220,60,60,0.15)",
    color: "#e07a7a",
    border: "1px solid rgba(220,60,60,0.4)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
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
