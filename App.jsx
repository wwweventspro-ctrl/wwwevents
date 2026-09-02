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

const EMPTY_PLAYERS = [
  { prenom: "", numero: "" },
  { prenom: "", numero: "" },
  { prenom: "", numero: "" },
];

// Formats de tournoi disponibles : nb de joueurs titulaires par équipe
const FORMAT_MIN_PLAYERS = { "3v3": 3, "2v2": 2, "1v1": 1 };
const FORMAT_LABELS = { "3v3": "3 vs 3", "2v2": "2 vs 2", "1v1": "1 vs 1" };

function minPlayersFor(format) {
  return FORMAT_MIN_PLAYERS[format] || 3;
}
function maxPlayersFor(format) {
  return minPlayersFor(format) + 1; // +1 joueur remplaçant en option, pour tous les formats
}
function emptyPlayersFor(format) {
  const n = minPlayersFor(format);
  return Array.from({ length: n }, () => ({ prenom: "", numero: "" }));
}
function isValidFrenchPhone(phone) {
  const digits = phone.replace(/[\s.\-]/g, "");
  return /^(0|\+33)[67]\d{8}$/.test(digits);
}

export default function App() {
  const [view, setView] = useState("loading"); // loading, closed, select, form, recap, confirm, admin-login, admin
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [statuses, setStatuses] = useState({}); // { [id]: "ouvert" | "complet" | "ferme" }
  const [remainingSlots, setRemainingSlots] = useState({}); // { [id]: number }
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [sendingContact, setSendingContact] = useState(false);
  const [showTerrainsFor, setShowTerrainsFor] = useState(null); // tournamentId
  const [terrainsData, setTerrainsData] = useState([]);
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
  const [showArchives, setShowArchives] = useState(false);
  const [archives, setArchives] = useState([]);
  const [expandedArchive, setExpandedArchive] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [siteContent, setSiteContent] = useState({});
  const [editingContent, setEditingContent] = useState({});
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showGalleryAdmin, setShowGalleryAdmin] = useState(false);
  const [teamInstallments, setTeamInstallments] = useState({}); // { [teamId]: installments[] }
  const [paymentFilter, setPaymentFilter] = useState({}); // { [tournamentId]: "all"|"en_attente"|"payee"|"remboursee" }
  const [teamNotes, setTeamNotes] = useState({}); // { [teamId]: string } — notes internes admin
  const [showTrash, setShowTrash] = useState(false);
  const [trashTeams, setTrashTeams] = useState([]);
  const [showTreasury, setShowTreasury] = useState(false);
  const [treasuryData, setTreasuryData] = useState(null);
  const [registeredTeamToken, setRegisteredTeamToken] = useState(null);
  const [pendingCheckin, setPendingCheckin] = useState(null);
  const [checkinResult, setCheckinResult] = useState(null);

  useEffect(() => {
    const savedName = localStorage.getItem("le-www-admin-name");
    let loggedIn = false;
    if (savedName && ADMIN_ACCOUNTS[savedName]) {
      setIsAdmin(true);
      setAdminName(savedName);
      loggedIn = true;
    }
    loadPublicTournaments();
    loadGalleryPhotos();
    loadSiteContent();

    // Check-in via QR code : lien du type ?checkin=TOKEN scanné par un admin le jour J
    const params = new URLSearchParams(window.location.search);
    const token = params.get("checkin");
    if (token) {
      if (loggedIn) {
        processCheckinToken(token);
      } else {
        setPendingCheckin(token);
        setView("admin-login");
      }
    }
  }, []);

  async function processCheckinToken(token) {
    const { data, error } = await supabase.from("teams").select("*").eq("checkin_token", token).single();
    if (error || !data) {
      setCheckinResult({ ok: false, message: "QR code invalide ou équipe introuvable." });
      setView("checkin-result");
      return;
    }
    if (data.checked_in) {
      setCheckinResult({ ok: true, already: true, teamName: data.team_name, terrain: data.terrain });
      setView("checkin-result");
      return;
    }
    await supabase.from("teams").update({ checked_in: true }).eq("id", data.id);
    setCheckinResult({ ok: true, already: false, teamName: data.team_name, terrain: data.terrain });
    setView("checkin-result");
    window.history.replaceState({}, "", window.location.pathname);
  }

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
      const slotsMap = {};
      for (const t of list) {
        if (!t.is_open) {
          statusMap[t.id] = "ferme";
          continue;
        }
        const { count } = await supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", t.id);
        const remaining = t.team_cap - (count || 0);
        slotsMap[t.id] = remaining;
        statusMap[t.id] = remaining <= 0 ? "complet" : "ouvert";
      }
      setStatuses(statusMap);
      setRemainingSlots(slotsMap);
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
    setTeamName("");
    setCaptainPhone(localStorage.getItem("le-www-last-phone") || "");
    setCaptainEmail(localStorage.getItem("le-www-last-email") || "");
    setPlayers(emptyPlayersFor(t.format));
    setAcceptReglement(false);
    setAcceptImage(false);
    setAcceptAge(false);
    setErrors({});
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

  const formatMin = selected ? minPlayersFor(selected.format) : 3;
  const formatMax = selected ? maxPlayersFor(selected.format) : 4;

  function addPlayer() {
    if (players.length < formatMax) setPlayers([...players, { prenom: "", numero: "" }]);
  }
  function removePlayer(idx) {
    if (players.length > formatMin) setPlayers(players.filter((_, i) => i !== idx));
  }
  function updatePlayer(idx, field, value) {
    const next = [...players];
    next[idx] = { ...next[idx], [field]: value };
    setPlayers(next);
  }

  const has4eme = players.length > formatMin;
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

  async function loadPublicTerrains(tournament) {
    if (showTerrainsFor === tournament.id) {
      setShowTerrainsFor(null);
      return;
    }
    const { data } = await supabase
      .from("teams")
      .select("team_name, terrain")
      .eq("tournament_id", tournament.id)
      .order("terrain", { ascending: true });
    setTerrainsData(data || []);
    setShowTerrainsFor(tournament.id);
  }

  async function sendContactMessage() {
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      alert("Merci de remplir tous les champs.");
      return;
    }
    setSendingContact(true);
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact_message",
          contactName: contactForm.name,
          contactEmail: contactForm.email,
          contactMessage: contactForm.message,
        }),
      });
      alert("Message envoyé ✓ On te répond au plus vite.");
      setContactForm({ name: "", email: "", message: "" });
      setShowContact(false);
    } catch (e) {
      alert("Erreur lors de l'envoi, réessaie dans un instant.");
    } finally {
      setSendingContact(false);
    }
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

      const { count: dupCount } = await supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", selected.id)
        .eq("captain_phone", captainPhone.trim());
      if ((dupCount || 0) > 0) {
        alert("Une équipe est déjà inscrite à ce tournoi avec ce numéro de téléphone. Contacte l'organisation si c'est une erreur.");
        setLoading(false);
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

      // Si le tournoi a un plan de paiement en plusieurs fois, on crée les échéances de l'équipe
      if (inserted && inserted[0] && selected.installment_plan && selected.installment_plan.length > 0) {
        const newTeam = inserted[0];
        const rows = selected.installment_plan.map((step) => ({
          team_id: newTeam.id,
          tournament_id: selected.id,
          label: step.label,
          amount: Math.round((totalPrix * Number(step.percent || 0)) / 100),
          due_date: step.due_date,
          paid: false,
        }));
        await supabase.from("installments").insert(rows);
      }

      setView("confirm");
      setRegisteredTeamToken(inserted && inserted[0] ? inserted[0].checkin_token : null);
      localStorage.setItem("le-www-last-phone", captainPhone);
      localStorage.setItem("le-www-last-email", captainEmail);
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
      if (pendingCheckin) {
        const token = pendingCheckin;
        setPendingCheckin(null);
        processCheckinToken(token);
      } else {
        openAdmin();
      }
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

  function addInstallmentStep(tournamentId) {
    setAllTournaments((prev) =>
      prev.map((t) =>
        t.id === tournamentId
          ? {
              ...t,
              installment_plan: [
                ...(t.installment_plan || []),
                { id: `step_${Date.now()}`, label: "", percent: 0, due_date: "" },
              ],
            }
          : t
      )
    );
  }

  function updateInstallmentStep(tournamentId, idx, field, value) {
    setAllTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournamentId) return t;
        const plan = [...(t.installment_plan || [])];
        plan[idx] = { ...plan[idx], [field]: value };
        return { ...t, installment_plan: plan };
      })
    );
  }

  function removeInstallmentStep(tournamentId, idx) {
    setAllTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournamentId) return t;
        const plan = [...(t.installment_plan || [])];
        plan.splice(idx, 1);
        return { ...t, installment_plan: plan };
      })
    );
  }

  function activeCount(list) {
    return list.filter((t) => t.is_active).length;
  }

  function toggleActive(id) {
    // Aucune limite : on peut activer 1, plusieurs, ou tous les tournois en même temps.
    setAllTournaments((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t))
    );
  }

  function toggleOpen(id) {
    setAllTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, is_open: !t.is_open } : t)));
  }

  async function duplicateTournament(t) {
    if (!window.confirm(`Dupliquer "${t.name}" ? Une copie sera créée (fermée, inactive, 0 équipe).`)) return;
    const { id, created_at, ...rest } = t;
    const { error } = await supabase.from("tournaments").insert([
      {
        ...rest,
        name: `${t.name} (copie)`,
        is_active: false,
        is_open: false,
      },
    ]);
    if (error) {
      alert("Erreur lors de la duplication.");
      return;
    }
    logAction("duplicate_tournament", `Tournoi "${t.name}" dupliqué`);
    openAdmin();
    alert("Tournoi dupliqué ✓ (à retrouver plus bas dans la liste, fermé par défaut)");
  }

  async function saveTournament(t) {
    const plan = t.installment_plan || [];
    if (plan.length > 0) {
      const totalPercent = plan.reduce((s, x) => s + Number(x.percent || 0), 0);
      if (totalPercent !== 100) {
        alert(`Le total des pourcentages du plan de paiement doit faire 100% (actuellement ${totalPercent}%).`);
        return;
      }
      if (plan.some((x) => !x.label.trim() || !x.due_date.trim())) {
        alert("Chaque versement doit avoir un libellé et une date.");
        return;
      }
    }
    setSavingId(t.id);
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({
          name: t.name,
          format: t.format || "3v3",
          cash_prize: Number(t.cash_prize),
          entry_price: Number(t.entry_price),
          option_price: Number(t.option_price),
          venue: t.venue,
          event_date: t.event_date,
          team_cap: Number(t.team_cap),
          is_open: t.is_open,
          is_active: t.is_active,
          installment_plan: plan,
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
    if (!window.confirm(`Supprimer l'équipe "${teamName}" ? Elle sera déplacée dans la corbeille (récupérable).`))
      return;
    const { data: fullTeam } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (fullTeam) {
      await supabase.from("trash_teams").insert([
        {
          tournament_id: tournamentId,
          team_data: fullTeam,
          deleted_by: adminName,
        },
      ]);
    }
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
    logAction("delete_team", `Équipe "${teamName}" supprimée (déplacée en corbeille)`);
    if (showTreasury) loadTreasury();
  }

  async function loadTreasury() {
    const { data: teamsData } = await supabase.from("teams").select("tournament_id, prix, payment_status");
    const { data: instData } = await supabase.from("installments").select("tournament_id, amount, paid");
    const installmentTournamentIds = new Set(
      allTournaments.filter((t) => t.installment_plan && t.installment_plan.length > 0).map((t) => t.id)
    );
    const byTournament = {};
    let totalPaid = 0;
    let totalPending = 0;
    for (const team of teamsData || []) {
      // Si ce tournoi a un plan de versements, on ne compte que via la table installments (sinon double comptage)
      if (installmentTournamentIds.has(team.tournament_id)) continue;
      if (!byTournament[team.tournament_id]) byTournament[team.tournament_id] = { paid: 0, pending: 0 };
      if (team.payment_status === "payee") {
        byTournament[team.tournament_id].paid += team.prix || 0;
        totalPaid += team.prix || 0;
      } else if (team.payment_status === "en_attente") {
        byTournament[team.tournament_id].pending += team.prix || 0;
        totalPending += team.prix || 0;
      }
    }
    for (const inst of instData || []) {
      if (!byTournament[inst.tournament_id]) byTournament[inst.tournament_id] = { paid: 0, pending: 0 };
      if (inst.paid) {
        byTournament[inst.tournament_id].paid += inst.amount || 0;
        totalPaid += inst.amount || 0;
      } else {
        byTournament[inst.tournament_id].pending += inst.amount || 0;
        totalPending += inst.amount || 0;
      }
    }
    setTreasuryData({ byTournament, totalPaid, totalPending });
    setShowTreasury(true);
  }

  async function loadTrash() {
    const { data } = await supabase
      .from("trash_teams")
      .select("*")
      .order("deleted_at", { ascending: false })
      .limit(50);
    setTrashTeams(data || []);
  }

  async function restoreTeam(trashRow) {
    const team = trashRow.team_data;
    const { id, ...teamWithoutId } = team;
    const { error } = await supabase.from("teams").insert([teamWithoutId]);
    if (error) {
      alert("Erreur lors de la restauration (l'équipe existe peut-être déjà).");
      return;
    }
    await supabase.from("trash_teams").delete().eq("id", trashRow.id);
    setTrashTeams((prev) => prev.filter((r) => r.id !== trashRow.id));
    logAction("restore_team", `Équipe "${team.team_name}" restaurée depuis la corbeille`);
    alert("Équipe restaurée ! Rouvre la liste des équipes du tournoi pour la voir.");
    if (showTreasury) loadTreasury();
  }

  async function purgeTrash(trashRow) {
    if (!window.confirm("Supprimer définitivement cette équipe de la corbeille ? Action irréversible.")) return;
    await supabase.from("trash_teams").delete().eq("id", trashRow.id);
    setTrashTeams((prev) => prev.filter((r) => r.id !== trashRow.id));
  }

  function exportTeamsCSV(tournamentName, teams) {
    if (!teams || teams.length === 0) {
      alert("Aucune équipe à exporter.");
      return;
    }
    const header = ["Équipe", "Téléphone capitaine", "Email capitaine", "Statut paiement", "Joueurs"];
    const rows = teams.map((t) => [
      t.team_name,
      t.captain_phone,
      t.captain_email || "",
      t.payment_status || "",
      (t.players || []).map((p) => `${p.prenom} (#${p.numero})`).join(" / "),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournamentName.replace(/[^a-z0-9]/gi, "_")}_equipes.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logAction("export_csv", `Export CSV des équipes de "${tournamentName}"`);
  }

  async function saveTeamNote(teamId, note) {
    await supabase.from("teams").update({ admin_note: note }).eq("id", teamId);
    setTeamNotes((prev) => ({ ...prev, [teamId]: note }));
    logAction("edit_note", `Note interne modifiée pour une équipe`);
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
    if (showTreasury) loadTreasury();
  }

  async function loadTeamInstallments(teamId) {
    const { data, error } = await supabase
      .from("installments")
      .select("*")
      .eq("team_id", teamId)
      .order("due_date", { ascending: true });
    if (!error) setTeamInstallments((prev) => ({ ...prev, [teamId]: data || [] }));
  }

  async function toggleInstallmentPaid(teamId, installmentId, current) {
    const { error } = await supabase
      .from("installments")
      .update({ paid: !current, paid_at: !current ? new Date().toISOString() : null })
      .eq("id", installmentId);
    if (error) {
      alert("Erreur lors de la mise à jour du versement.");
      return;
    }
    setTeamInstallments((prev) => ({
      ...prev,
      [teamId]: (prev[teamId] || []).map((i) => (i.id === installmentId ? { ...i, paid: !current } : i)),
    }));
    logAction("installment_paid", `Versement "${installmentId}" ${!current ? "marqué reçu" : "annulé"}`);
    if (showTreasury) loadTreasury();
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
    if (showTreasury) loadTreasury();
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

  async function generatePools(tournamentId, tournamentName) {
    const teams = expandedTeams[tournamentId];
    if (!teams || teams.length < 2) {
      alert("Il faut au moins 2 équipes chargées (clique sur 'Voir les équipes inscrites' d'abord).");
      return;
    }
    if (
      !window.confirm(
        `Répartir les ${teams.length} équipes sur les 6 terrains ? Chaque équipe saura directement sur quel terrain aller.`
      )
    )
      return;
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const withTerrain = shuffled.map((team, i) => ({ ...team, terrain: (i % 6) + 1 }));
    try {
      await Promise.all(
        withTerrain.map((team) => supabase.from("teams").update({ terrain: team.terrain }).eq("id", team.id))
      );
    } catch (e) {
      alert("Erreur lors de l'attribution des terrains.");
      return;
    }
    setExpandedTeams((prev) => ({ ...prev, [tournamentId]: withTerrain }));
    logAction("assign_terrains", `Terrains 1-6 attribués pour "${tournamentName}" (${teams.length} équipes)`);
    alert("Terrains attribués ✓ Chaque équipe peut voir son terrain via '🏟️ Voir mon terrain' sur la page publique.");
  }

  async function loadArchives() {
    const { data, error } = await supabase
      .from("archived_registrations")
      .select("*")
      .order("archived_at", { ascending: false });
    if (!error) setArchives(data || []);
    setShowArchives(true);
  }

  async function loadSiteContent() {
    const { data, error } = await supabase.from("site_content").select("*");
    if (!error) {
      const map = {};
      (data || []).forEach((row) => {
        map[row.key] = row.value;
      });
      setSiteContent(map);
    }
  }

  function getContent(key, fallback) {
    return siteContent[key] || fallback;
  }

  async function saveSiteContentKey(key) {
    const value = editingContent[key];
    const { error } = await supabase.from("site_content").upsert([{ key, value }]);
    if (error) {
      alert("Erreur lors de l'enregistrement du texte.");
      return;
    }
    setSiteContent((prev) => ({ ...prev, [key]: value }));
    logAction("edit_content", `Texte "${key}" modifié`);
    alert("Texte enregistré ✓");
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
  if (view === "checkin-result") {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <BasketballMark size={52} />
            <div style={styles.eyebrow}>CHECK-IN</div>
            <h1 style={styles.title}>
              LE <span style={styles.titleAccent}>WWW</span>
            </h1>
          </header>
          <div style={styles.card}>
            {checkinResult?.ok ? (
              <>
                <p style={{ fontSize: 40, textAlign: "center", margin: "8px 0" }}>
                  {checkinResult.already ? "ℹ️" : "✅"}
                </p>
                <p style={{ ...styles.modalText, textAlign: "center", fontWeight: 700, color: CREAM }}>
                  {checkinResult.already
                    ? `${checkinResult.teamName} était déjà pointée présente.`
                    : `${checkinResult.teamName} pointée présente ✓`}
                </p>
                {checkinResult.terrain && (
                  <p style={{ textAlign: "center" }}>
                    <span style={styles.formatBadge}>➡️ TERRAIN {checkinResult.terrain}</span>
                  </p>
                )}
              </>
            ) : (
              <>
                <p style={{ fontSize: 40, textAlign: "center", margin: "8px 0" }}>⚠️</p>
                <p style={{ ...styles.modalText, textAlign: "center" }}>{checkinResult?.message}</p>
              </>
            )}
            <button
              style={{ ...styles.cta, marginTop: 16 }}
              onClick={() => (isAdmin ? openAdmin() : setView("select"))}
              type="button"
            >
              {isAdmin ? "Retour à l'admin" : "Retour à l'accueil"}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              {activeCount(allTournaments)} tournoi{activeCount(allTournaments) > 1 ? "s" : ""} actif
              {activeCount(allTournaments) > 1 ? "s" : ""} en ce moment
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
            <button style={styles.linkBtn2} onClick={() => setShowContentEditor((v) => !v)} type="button">
              ✏️ Modifier les textes du site
            </button>
            <button
              style={styles.linkBtn2}
              onClick={() => {
                loadTrash();
                setShowTrash((v) => !v);
              }}
              type="button"
            >
              🗑️ Corbeille (équipes supprimées)
            </button>
            <button style={styles.linkBtn2} onClick={loadTreasury} type="button">
              💰 Trésorerie globale
            </button>
          </header>

          {showTreasury && treasuryData && (
            <div style={styles.card}>
              <div style={styles.adminCardHeader}>
                <SectionLabel n="•" text="Trésorerie & statistiques" />
                <button style={styles.linkBtn2} onClick={() => setShowTreasury(false)} type="button">
                  Fermer
                </button>
              </div>
              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>✅ Total encaissé</span>
                <span style={styles.priceValue}>{treasuryData.totalPaid.toLocaleString("fr-FR")} €</span>
              </div>
              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>⏳ Total en attente</span>
                <span style={styles.priceValue}>{treasuryData.totalPending.toLocaleString("fr-FR")} €</span>
              </div>
              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>🏀 Équipes inscrites (tous tournois)</span>
                <span style={styles.priceValue}>
                  {Object.values(teamCounts).reduce((s, n) => s + n, 0)}
                </span>
              </div>
              <div style={styles.priceRow}>
                <span style={styles.priceLabel}>📊 Taux de remplissage moyen</span>
                <span style={styles.priceValue}>
                  {allTournaments.length > 0
                    ? Math.round(
                        (allTournaments.reduce(
                          (s, t) => s + (teamCounts[t.id] || 0) / (t.team_cap || 1),
                          0
                        ) /
                          allTournaments.length) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(242,239,230,0.1)", paddingTop: 12 }}>
                {allTournaments.map((t) => {
                  const d = treasuryData.byTournament[t.id];
                  if (!d) return null;
                  return (
                    <div key={t.id} style={styles.teamRowSub}>
                      <strong style={{ color: CREAM }}>{t.name}</strong> — {d.paid.toLocaleString("fr-FR")} € encaissé
                      {d.pending > 0 ? ` · ${d.pending.toLocaleString("fr-FR")} € en attente` : ""}
                      {" · "}
                      {teamCounts[t.id] ?? 0}/{t.team_cap} équipes
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showTrash && (
            <div style={styles.card}>
              <div style={styles.adminCardHeader}>
                <SectionLabel n="•" text="Corbeille" />
                <button style={styles.linkBtn2} onClick={() => setShowTrash(false)} type="button">
                  Fermer
                </button>
              </div>
              {trashTeams.length === 0 && <p style={styles.modalText}>Corbeille vide.</p>}
              {trashTeams.map((r) => (
                <div key={r.id} style={styles.teamRow}>
                  <div style={styles.teamRowHead}>
                    <strong>{r.team_data.team_name}</strong>
                  </div>
                  <div style={styles.teamRowSub}>
                    Supprimée le {new Date(r.deleted_at).toLocaleString("fr-FR")}
                    {r.deleted_by ? ` par ${r.deleted_by}` : ""}
                  </div>
                  <div style={styles.btnRow}>
                    <button style={styles.secondaryBtn} onClick={() => restoreTeam(r)} type="button">
                      ♻️ Restaurer
                    </button>
                    <button style={styles.deleteTeamBtn} onClick={() => purgeTrash(r)} type="button">
                      🗑️ Supprimer définitivement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

          {showContentEditor && (
            <div style={styles.card}>
              <div style={styles.adminCardHeader}>
                <SectionLabel n="•" text="Textes du site" />
                <button style={styles.linkBtn2} onClick={() => setShowContentEditor(false)} type="button">
                  Fermer
                </button>
              </div>
              {[
                { key: "subtitle", label: "Sous-titre (haut de page)", fallback: "Who Want Win — 3v3. Poules + élimination directe." },
                { key: "closed_message", label: "Message quand aucun tournoi n'est ouvert", fallback: "Aucun tournoi n'est ouvert aux inscriptions pour le moment. Reviens bientôt !" },
                { key: "footer_text", label: "Texte du pied de page", fallback: "Le WWW · WWW Events" },
                { key: "whatsapp_number", label: "Numéro WhatsApp contact (format: 33612345678, sans le +)", fallback: "" },
              ].map((field) => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={styles.label}>{field.label}</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 60 }}
                    value={
                      editingContent[field.key] !== undefined
                        ? editingContent[field.key]
                        : getContent(field.key, field.fallback)
                    }
                    onChange={(e) =>
                      setEditingContent((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                  <button
                    style={styles.linkBtn2}
                    onClick={() => saveSiteContentKey(field.key)}
                    type="button"
                  >
                    Enregistrer
                  </button>
                </div>
              ))}
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
                <button style={styles.linkBtn2} onClick={() => duplicateTournament(t)} type="button">
                  ⧉ Dupliquer
                </button>
              </div>

              <label style={styles.label}>Nom du tournoi</label>
              <input
                style={styles.input}
                value={t.name}
                onChange={(e) => updateAdminField(t.id, "name", e.target.value)}
              />

              <label style={styles.label}>Format</label>
              <select
                style={styles.input}
                value={t.format || "3v3"}
                onChange={(e) => updateAdminField(t.id, "format", e.target.value)}
              >
                <option value="3v3">3 vs 3</option>
                <option value="2v2">2 vs 2</option>
                <option value="1v1">1 vs 1</option>
              </select>

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

              <label style={styles.label}>💳 Paiement en plusieurs fois (optionnel)</label>
              {(t.installment_plan || []).map((step, idx) => (
                <div key={step.id} style={styles.installmentStepRow}>
                  <input
                    style={{ ...styles.input, flex: 2, marginTop: 0 }}
                    placeholder="Libellé (ex: Acompte)"
                    value={step.label}
                    onChange={(e) => updateInstallmentStep(t.id, idx, "label", e.target.value)}
                  />
                  <input
                    style={{ ...styles.input, flex: 1, marginTop: 0 }}
                    placeholder="%"
                    type="number"
                    value={step.percent}
                    onChange={(e) => updateInstallmentStep(t.id, idx, "percent", e.target.value)}
                  />
                  <input
                    style={{ ...styles.input, flex: 1.4, marginTop: 0 }}
                    placeholder="AAAA-MM-JJ"
                    value={step.due_date}
                    onChange={(e) => updateInstallmentStep(t.id, idx, "due_date", e.target.value)}
                  />
                  <button
                    style={styles.deleteStepBtn}
                    onClick={() => removeInstallmentStep(t.id, idx)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button style={styles.linkBtn2} onClick={() => addInstallmentStep(t.id)} type="button">
                + Ajouter un versement
              </button>
              {(t.installment_plan || []).length > 0 && (
                <p style={styles.priceNote}>
                  Total : {(t.installment_plan || []).reduce((s, x) => s + Number(x.percent || 0), 0)}%
                  {" "}(doit faire 100% — laisse vide pour désactiver le paiement en plusieurs fois)
                </p>
              )}

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

              {expandedTeams[t.id] && expandedTeams[t.id].length >= 2 && (
                <button style={styles.linkBtn2} onClick={() => generatePools(t.id, t.name)} type="button">
                  🏟️ Attribuer les terrains (poules 1-6)
                </button>
              )}

              {expandedTeams[t.id] && expandedTeams[t.id].some((tm) => tm.terrain) && (
                <div style={styles.teamsList}>
                  {[1, 2, 3, 4, 5, 6].map((num) => {
                    const teamsHere = expandedTeams[t.id].filter((tm) => tm.terrain === num);
                    if (teamsHere.length === 0) return null;
                    return (
                      <div key={num} style={styles.teamRowSub}>
                        <strong style={{ color: CREAM }}>Terrain {num}</strong> —{" "}
                        {teamsHere.map((tm) => tm.team_name).join(" · ")}
                      </div>
                    );
                  })}
                </div>
              )}

              {expandedTeams[t.id] && (
                <div style={styles.teamsList}>
                  {expandedTeams[t.id].length > 0 && (
                    <>
                      <input
                        style={styles.input}
                        placeholder="🔍 Rechercher par nom d'équipe ou téléphone…"
                        value={teamSearch[t.id] || ""}
                        onChange={(e) => setTeamSearch((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <select
                          style={{ ...styles.input, flex: 1 }}
                          value={paymentFilter[t.id] || "all"}
                          onChange={(e) => setPaymentFilter((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        >
                          <option value="all">Tous les paiements</option>
                          <option value="en_attente">⏳ En attente</option>
                          <option value="payee">✅ Payée</option>
                          <option value="remboursee">↩️ Remboursée</option>
                        </select>
                        <button
                          style={{ ...styles.linkBtn2, marginTop: 0, whiteSpace: "nowrap" }}
                          onClick={() => exportTeamsCSV(t.name, expandedTeams[t.id])}
                          type="button"
                        >
                          ⬇️ CSV
                        </button>
                      </div>
                    </>
                  )}

                  {expandedTeams[t.id].length === 0 && (
                    <p style={styles.modalText}>Aucune équipe inscrite pour l'instant.</p>
                  )}

                  {expandedTeams[t.id]
                    .filter((team) => {
                      const q = (teamSearch[t.id] || "").trim().toLowerCase();
                      const matchesSearch =
                        !q ||
                        team.team_name.toLowerCase().includes(q) ||
                        team.captain_phone.toLowerCase().includes(q);
                      const pf = paymentFilter[t.id] || "all";
                      const matchesPayment = pf === "all" || team.payment_status === pf;
                      return matchesSearch && matchesPayment;
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
                            {!(t.installment_plan && t.installment_plan.length > 0) && (
                              <PaymentBadge status={team.payment_status} />
                            )}
                            {team.checked_in && <span style={styles.checkedInBadge}>✓ Présente</span>}
                            {team.terrain && <span style={styles.formatBadge}>Terrain {team.terrain}</span>}
                          </div>

                          {t.installment_plan && t.installment_plan.length > 0 ? (
                            <div style={styles.teamsList}>
                              {(teamInstallments[team.id] || []).length === 0 && (
                                <button
                                  style={styles.linkBtn2}
                                  onClick={() => loadTeamInstallments(team.id)}
                                  type="button"
                                >
                                  💳 Voir les versements
                                </button>
                              )}
                              {(teamInstallments[team.id] || []).map((inst) => (
                                <label key={inst.id} style={styles.installmentCheckRow}>
                                  <input
                                    type="checkbox"
                                    checked={inst.paid}
                                    onChange={() => toggleInstallmentPaid(team.id, inst.id, inst.paid)}
                                  />
                                  <span>
                                    {inst.label} — {inst.amount} € — échéance {inst.due_date}{" "}
                                    {inst.paid ? "✅" : "⏳"}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ) : (
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
                          )}

                          <div style={styles.row2}>
                            <button
                              style={{ ...styles.deleteTeamBtn, flex: 1 }}
                              onClick={() => toggleCheckedIn(t.id, team.id, team.team_name, team.checked_in)}
                              type="button"
                            >
                              {team.checked_in ? "↺ Annuler présence" : "✓ Pointer présente"}
                            </button>
                            {team.checkin_token && (
                              <button
                                style={{ ...styles.deleteTeamBtn, flex: 1 }}
                                onClick={() =>
                                  window.open(
                                    `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                                      `${window.location.origin}${window.location.pathname}?checkin=${team.checkin_token}`
                                    )}`,
                                    "_blank"
                                  )
                                }
                                type="button"
                              >
                                📱 Voir QR
                              </button>
                            )}
                          </div>

                          <textarea
                            style={{ ...styles.input, marginTop: 10, minHeight: 44, resize: "vertical" }}
                            placeholder="📝 Note interne (visible admin uniquement)…"
                            defaultValue={team.admin_note || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (team.admin_note || "")) saveTeamNote(team.id, e.target.value);
                            }}
                          />

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
          <BasketballMark size={52} />
          <div style={styles.eyebrow}>WWW EVENTS</div>
          <h1 style={styles.title}>
            LE <span style={styles.titleAccent}>WWW</span>
          </h1>
          <p style={styles.subtitle}>
            {getContent("subtitle", "Who Want Win — 3v3. Poules + élimination directe.")}
          </p>
          <CourtDivider />
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
              {getContent(
                "closed_message",
                "Aucun tournoi n'est ouvert aux inscriptions pour le moment. Reviens bientôt !"
              )}
            </p>
          </div>
        )}

        {view === "select" && (
          <>
            <SectionLabel n="•" text="Choisis ton tournoi" />
            {activeTournaments.map((t) => (
              <div key={t.id}>
                <button style={styles.tournamentCard} onClick={() => chooseTournament(t)} type="button">
                  <div style={styles.potTop}>
                    <span style={styles.potLabel}>{t.name}</span>
                    <span style={styles.potValue}>{t.cash_prize.toLocaleString("fr-FR")} €</span>
                  </div>
                  <p style={styles.priceNote}>
                    {t.venue} · {t.event_date} · {t.entry_price} € / équipe
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                    <span style={styles.formatBadge}>{FORMAT_LABELS[t.format] || "3 vs 3"}</span>
                    <StatusBadge status={statuses[t.id]} />
                    {statuses[t.id] === "ouvert" && remainingSlots[t.id] > 0 && remainingSlots[t.id] <= 5 && (
                      <span style={styles.urgentBadge}>
                        🔥 Plus que {remainingSlots[t.id]} place{remainingSlots[t.id] > 1 ? "s" : ""} !
                      </span>
                    )}
                  </div>
                </button>
                <button
                  style={{ ...styles.linkBtn2, marginTop: -6 }}
                  onClick={() => loadPublicTerrains(t)}
                  type="button"
                >
                  🏟️ {showTerrainsFor === t.id ? "Masquer les terrains" : "Voir mon terrain (jour J)"}
                </button>
                {showTerrainsFor === t.id && (
                  <div style={styles.card}>
                    {terrainsData.length === 0 && (
                      <p style={styles.modalText}>
                        Les terrains n'ont pas encore été attribués par l'organisation. Reviens plus tard.
                      </p>
                    )}
                    {[1, 2, 3, 4, 5, 6].map((num) => {
                      const teamsHere = terrainsData.filter((tm) => tm.terrain === num);
                      if (teamsHere.length === 0) return null;
                      return (
                        <div key={num} style={{ marginBottom: 10 }}>
                          <span style={styles.formatBadge}>TERRAIN {num}</span>
                          <p style={styles.priceNote}>{teamsHere.map((tm) => tm.team_name).join(" · ")}</p>
                        </div>
                      );
                    })}
                    {terrainsData.some((tm) => !tm.terrain) && (
                      <p style={styles.modalText}>
                        En attente d'attribution : {terrainsData.filter((tm) => !tm.terrain).map((tm) => tm.team_name).join(" · ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
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
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                <span style={styles.formatBadge}>{FORMAT_LABELS[selected.format] || "3 vs 3"}</span>
                <StatusBadge status={statuses[selected.id]} />
              </div>
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
                  type="tel"
                />
                {captainPhone.trim().length > 0 &&
                  (isValidFrenchPhone(captainPhone) ? (
                    <div style={styles.hintOk}>✓ Numéro valide</div>
                  ) : (
                    <div style={styles.hintWarn}>Format attendu : 06/07 XX XX XX XX</div>
                  ))}
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

                <SectionLabel
                  n="02"
                  text={`Joueurs (${formatMin} titulaire${formatMin > 1 ? "s" : ""}, ${formatMin + 1}e en option)`}
                />
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
                    {i >= formatMin && (
                      <button style={styles.removeBtn} onClick={() => removePlayer(i)} type="button">
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {players.length < formatMax && (
                  <button onClick={addPlayer} style={styles.addBtn} type="button">
                    + Ajouter un {formatMin + 1}e joueur (remplaçant) — +{selected.option_price} €
                  </button>
                )}

                <div style={styles.priceRow}>
                  <span style={styles.priceLabel}>
                    Inscription équipe{has4eme ? ` + ${formatMin + 1}e joueur` : ""}
                  </span>
                  <span style={styles.priceValue}>{totalPrix} €</span>
                </div>
                {has4eme && (
                  <p style={styles.priceNote}>
                    {selected.entry_price} € équipe ({formatMin} joueur{formatMin > 1 ? "s" : ""}) +{" "}
                    {selected.option_price} € option {formatMin + 1}e joueur.
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
            {registeredTeamToken && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <p style={styles.priceLabel}>TON QR CODE CHECK-IN</p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `${window.location.origin}${window.location.pathname}?checkin=${registeredTeamToken}`
                  )}`}
                  alt="QR code check-in"
                  style={{ width: 180, height: 180, borderRadius: 12, marginTop: 8, background: "#fff", padding: 8 }}
                />
                <p style={styles.priceNote}>Présente ce QR code à l'accueil le jour J pour un check-in rapide.</p>
              </div>
            )}
            <button style={styles.secondaryBtn} onClick={() => sharePage(selected)} type="button">
              📤 Partager ce tournoi
            </button>
            <button style={styles.cta} onClick={() => resetForm(true)} type="button">
              Inscrire une autre équipe
            </button>
          </div>
        )}

        {getContent("whatsapp_number", "") && (
          <a
            href={`https://wa.me/${getContent("whatsapp_number", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.whatsappBtn}
          >
            💬 Contacter sur WhatsApp
          </a>
        )}

        {showAbout && (
          <div style={styles.card}>
            <SectionLabel n="•" text="À propos" />
            <p style={styles.modalText}>
              WWW Events organise les tournois "Le WWW — Who Want Win", des compétitions de basket 3v3/2v2/1v1
              en Île-de-France, ouvertes à tous les niveaux. Cash prize garanti, ambiance streetball, esprit de
              compétition.
            </p>
            <button style={styles.linkBtn2} onClick={() => setShowAbout(false)} type="button">
              Fermer
            </button>
          </div>
        )}

        {showPrivacy && (
          <div style={styles.card}>
            <SectionLabel n="•" text="Confidentialité" />
            <p style={styles.modalText}>
              Les données collectées (nom, téléphone, email, informations joueurs) servent uniquement à
              l'organisation des tournois WWW Events (gestion des inscriptions, paiements, communication liée à
              l'événement). Elles ne sont ni revendues ni partagées avec des tiers.
            </p>
            <p style={styles.modalText}>
              Conformément au RGPD, tu peux demander l'accès, la correction ou la suppression de tes données à
              tout moment en nous contactant via le formulaire de contact ou WhatsApp.
            </p>
            <button style={styles.linkBtn2} onClick={() => setShowPrivacy(false)} type="button">
              Fermer
            </button>
          </div>
        )}

        {showContact && (
          <div style={styles.card}>
            <SectionLabel n="•" text="Contact" />
            <label style={styles.label}>Ton nom</label>
            <input
              style={styles.input}
              value={contactForm.name}
              onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
            />
            <label style={styles.label}>Ton email</label>
            <input
              style={styles.input}
              value={contactForm.email}
              onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
            />
            <label style={styles.label}>Message</label>
            <textarea
              style={{ ...styles.input, minHeight: 80 }}
              value={contactForm.message}
              onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
            />
            <button style={styles.cta} onClick={sendContactMessage} disabled={sendingContact} type="button">
              {sendingContact ? "Envoi…" : "Envoyer"}
            </button>
            <button style={styles.linkBtn2} onClick={() => setShowContact(false)} type="button">
              Annuler
            </button>
          </div>
        )}

        <footer style={styles.footer}>
          {getContent("footer_text", "Le WWW · WWW Events")}
          <div style={styles.footerLinks}>
            <button style={styles.footerLink} onClick={() => setShowAbout((v) => !v)} type="button">
              À propos
            </button>
            <button style={styles.footerLink} onClick={() => setShowContact((v) => !v)} type="button">
              Contact
            </button>
            <button style={styles.footerLink} onClick={() => setShowPrivacy((v) => !v)} type="button">
              Confidentialité
            </button>
          </div>
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

// Petit logo ballon (repris du style du profil TikTok WWW Events : lignes blanches sur fond sombre)
function BasketballMark({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#1A1B15" stroke={ORANGE} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="38" stroke={CREAM} strokeWidth="4" fill="none" />
      <line x1="50" y1="12" x2="50" y2="88" stroke={CREAM} strokeWidth="4" />
      <line x1="12" y1="50" x2="88" y2="50" stroke={CREAM} strokeWidth="4" />
      <path d="M20 20 Q50 45 20 80" stroke={CREAM} strokeWidth="4" fill="none" />
      <path d="M80 20 Q50 45 80 80" stroke={CREAM} strokeWidth="4" fill="none" />
    </svg>
  );
}

// Filigrane décoratif (grand ballon en fond, très discret) pour donner du relief aux écrans
function CourtDivider() {
  return (
    <div style={styles.courtDivider}>
      <span style={styles.courtDot} />
      <span style={styles.courtLine} />
      <span style={styles.courtDot} />
    </div>
  );
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
  header: { textAlign: "center", marginBottom: 24, display: "flex", flexDirection: "column", alignItems: "center" },
  courtDivider: { display: "flex", alignItems: "center", gap: 8, marginTop: 16, width: "100%" },
  courtLine: { flex: 1, height: 2, background: "linear-gradient(90deg, transparent, rgba(255,107,26,0.5), transparent)" },
  courtDot: { width: 6, height: 6, borderRadius: "50%", background: ORANGE, flexShrink: 0 },
  eyebrow: { fontSize: 11, letterSpacing: "0.2em", color: ORANGE, fontWeight: 900, marginTop: 12, marginBottom: 4, textTransform: "uppercase" },
  title: {
    fontSize: 44,
    fontWeight: 900,
    fontStyle: "italic",
    margin: 0,
    letterSpacing: "-0.03em",
    textShadow: "0 0 24px rgba(255,107,26,0.35)",
  },
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
  formatBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 6,
    background: "rgba(255,107,26,0.15)",
    border: "1px solid rgba(255,107,26,0.35)",
    color: ORANGE,
  },
  urgentBadge: {
    fontSize: 11,
    fontWeight: 900,
    padding: "3px 8px",
    borderRadius: 6,
    background: "rgba(255,122,110,0.15)",
    border: "1px solid rgba(255,122,110,0.4)",
    color: "#FF7A6E",
    animation: "none",
  },
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
    background: "linear-gradient(135deg, rgba(242,239,230,0.05), rgba(242,239,230,0.02))",
    border: "1px solid rgba(242,239,230,0.1)",
    borderLeft: `3px solid ${ORANGE}`,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    cursor: "pointer",
    color: CREAM,
    font: "inherit",
  },
  card: {
    background: "rgba(242,239,230,0.03)",
    border: "1px solid rgba(242,239,230,0.08)",
    borderRadius: 18,
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
  hintOk: { fontSize: 11.5, color: "#7CD68C", marginTop: 4 },
  hintWarn: { fontSize: 11.5, color: "rgba(242,239,230,0.45)", marginTop: 4 },
  whatsappBtn: {
    display: "block",
    textAlign: "center",
    background: "#25D366",
    color: "#0B1A0F",
    fontWeight: 900,
    fontStyle: "italic",
    textDecoration: "none",
    borderRadius: 12,
    padding: "13px 20px",
    marginTop: 16,
    marginBottom: 8,
  },
  cta: {
    width: "100%",
    background: `linear-gradient(135deg, ${ORANGE}, #E85A0F)`,
    color: "#12130F",
    border: "none",
    borderRadius: 12,
    padding: "15px 20px",
    fontSize: 15,
    fontWeight: 900,
    fontStyle: "italic",
    marginTop: 20,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(255,107,26,0.3)",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
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
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
  },
  footerLinks: { display: "flex", gap: 14 },
  footerLink: {
    background: "none",
    border: "none",
    color: "rgba(242,239,230,0.45)",
    fontSize: 11,
    textDecoration: "underline",
    cursor: "pointer",
    padding: 0,
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
  installmentStepRow: { display: "flex", gap: 6, marginTop: 8, alignItems: "center" },
  deleteStepBtn: {
    background: "rgba(220,60,60,0.15)",
    color: "#e07a7a",
    border: "1px solid rgba(220,60,60,0.3)",
    borderRadius: 8,
    width: 34,
    height: 34,
    fontSize: 14,
    cursor: "pointer",
  },
  installmentCheckRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12.5,
    color: "rgba(242,239,230,0.75)",
    marginBottom: 6,
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
