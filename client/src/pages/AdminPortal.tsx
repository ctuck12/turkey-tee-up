import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, Flag, Settings, Plus, Trash2, Edit2, Check, X,
  Copy, RefreshCw, ChevronDown, ChevronUp, ChevronsUpDown, Eye, EyeOff, Clock, Bell, Send, XCircle, ClipboardList, Target, Zap, Search, Scale, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScorecardTable } from "@/components/ScorecardTable";
import type { Team, Hole, Sponsor, TournamentSettings, Score, ClosestToPin } from "@shared/schema";

// ─── ADMIN AUTH ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);

  async function handleLogin() {
    try {
      const res = await apiRequest("POST", "/api/auth/admin", { password: pw });
      const data = await res.json();
      if (data.success) {
        
        onLogin();
      } else {
        setErr("Invalid password");
      }
    } catch {
      setErr("Invalid password");
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-12 space-y-6">
      <div className="text-center">
        <Shield size={40} className="text-[#b06b10] mx-auto mb-3" />
        <h1 className="text-xl font-bold text-[#b06b10]">Admin Portal</h1>
        <p className="text-[#1a2744]/55 text-sm font-sans-app">Tournament administration</p>
      </div>
      <div className="atd-card rounded-xl p-6 space-y-4 font-sans-app">
        <div>
          <Label className="text-[#1a2744]/60 text-sm mb-2 block">Admin Password</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter admin password"
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] pr-10"
              data-testid="input-admin-password"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2744]/50 hover:text-[#1a2744]/70">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <Button
          onClick={handleLogin}
          className="w-full bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold"
          data-testid="button-admin-login"
        >
          <Shield size={15} className="mr-2" /> Enter Admin
        </Button>
      </div>
    </div>
  );
}

// ─── TEAMS HELPERS (defined outside TeamsTab to keep stable identity across renders) ──
function genCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function TeamForm({ data, onChange, onSubmit, onCancel, submitLabel }: any) {
  return (
    <div className="space-y-3 font-sans-app">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-[#1a2744]/60 text-xs mb-1 block">Team Name *</Label>
          <Input value={data.teamName} onChange={e => onChange({ ...data, teamName: e.target.value })}
            placeholder="Team name" className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
        </div>
        {[1,2,3,4].map(n => (
          <div key={n}>
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Player {n}</Label>
            <Input value={data[`player${n}`] ?? ""} onChange={e => onChange({ ...data, [`player${n}`]: e.target.value })}
              placeholder={`Player ${n}`} className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] text-sm" />
          </div>
        ))}
        <div>
          <Label className="text-[#1a2744]/60 text-xs mb-1 block">Flight</Label>
          <Select value={data.flight} onValueChange={v => onChange({ ...data, flight: v })}>
            <SelectTrigger className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2744] border-amber-500/20 text-amber-100">
              <SelectItem value="morning">AM</SelectItem>
              <SelectItem value="afternoon">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#1a2744]/60 text-xs mb-1 block">Start Hole</Label>
          <Select value={String(data.startingHole ?? 1)} onValueChange={v => onChange({ ...data, startingHole: parseInt(v) })}>
            <SelectTrigger className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]">
              <SelectValue placeholder="Hole" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                <SelectItem key={h} value={String(h)}>Hole {h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-[#1a2744]/60 text-xs mb-1 block">Team Code (for scorekeeper login)</Label>
          <div className="flex gap-2">
            <Input value={data.teamCode} onChange={e => onChange({ ...data, teamCode: e.target.value.toUpperCase() })}
              placeholder="e.g. A1B2" maxLength={6} className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] font-mono tracking-widest" />
            <Button type="button" variant="ghost" onClick={() => onChange({ ...data, teamCode: genCode() })} className="text-[#b06b10]/80 hover:text-[#b06b10] border border-amber-500/20 px-3">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={onSubmit} className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold">
          <Check size={14} className="mr-1.5" /> {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-[#1a2744]/55 hover:text-[#1a2744]/70">Cancel</Button>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a2744] border-red-500/25 text-amber-100 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-400">{title}</DialogTitle>
          <DialogDescription className="text-amber-100/60 font-sans-app">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => { onConfirm(); onOpenChange(false); }} className="bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 font-sans-app">
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-amber-100/55 font-sans-app">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamScoreEditor({ teamId }: { teamId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: scores = [] } = useQuery<Score[]>({
    queryKey: ["/api/scores/team", teamId],
    queryFn: () => apiRequest("GET", `/api/scores/team/${teamId}`).then(r => r.json()),
    enabled: !!teamId,
  });

  const scoreMap = new Map(scores.map((s: Score) => [s.holeNumber, s]));
  const [editScore, setEditScore] = useState<Record<number, string>>({});

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/scores", { ...data, asAdmin: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scores/team", teamId] });
      qc.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    },
    onError: () => toast({ title: "Failed to save score", variant: "destructive" }),
  });

  const sortedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);

  function handleBlur(holeNumber: number) {
    const raw = editScore[holeNumber];
    if (raw === undefined) return;
    const v = parseInt(raw);
    if (!isNaN(v) && v > 0) {
      saveMutation.mutate({ teamId, holeNumber, strokes: v });
    }
  }

  if (sortedHoles.length === 0) return null;

  return (
    <div className="mt-3 border-t border-[#1a2744]/12 pt-3">
      <div className="text-xs font-bold text-[#b06b10] mb-2 font-sans-app">Scores</div>
      <div className="grid grid-cols-9 gap-1">
        {sortedHoles.map(hole => {
          const s = scoreMap.get(hole.holeNumber);
          const val = editScore[hole.holeNumber] !== undefined ? editScore[hole.holeNumber] : (s?.strokes?.toString() ?? "");
          const diff = s ? s.strokes - hole.par : null;
          return (
            <div key={hole.holeNumber} className="flex flex-col items-center gap-0.5">
              <div className="text-[10px] font-bold text-[#b06b10]/70">{hole.holeNumber}</div>
              <div className="text-[9px] text-[#1a2744]/40">p{hole.par}</div>
              <input
                type="number"
                min={1}
                max={12}
                value={val}
                onChange={e => setEditScore(p => ({ ...p, [hole.holeNumber]: e.target.value }))}
                onBlur={() => handleBlur(hole.holeNumber)}
                onFocus={e => e.target.select()}
                placeholder="-"
                className="w-full text-center text-xs font-bold rounded border bg-white border-[#1a2744]/20 text-[#1a2744] h-7 focus:border-[#b06b10] focus:outline-none focus:ring-0 px-0"
                style={{ fontSize: '11px' }}
              />
              {diff !== null && (
                <div className={`text-[9px] font-bold ${
                  diff < 0 ? 'text-[#c0323e]' : diff === 0 ? 'text-[#1a2744]/50' : 'text-[#1a2744]/50'
                }`}>
                  {diff < 0 ? diff : diff === 0 ? 'E' : `+${diff}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[#1a2744]/35 text-[10px] mt-2 font-sans-app">Scores auto-save on blur. Par shown below hole number.</div>
    </div>
  );
}

function TeamRow({ team, editTeam, setEditTeam, updateMutation, clearScoresMutation, setConfirmDelete, codeConflict }: {
  team: Team;
  editTeam: Team | null;
  setEditTeam: (t: Team | null) => void;
  updateMutation: any;
  clearScoresMutation: any;
  setConfirmDelete: (id: number | null) => void;
  codeConflict: (code: string, excludeId?: number) => string | null;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [confirmClearScores, setConfirmClearScores] = useState(false);
  return (
    <div className="bg-[#1a2744]/5 border border-[#1a2744]/12 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-bold text-[#1a2744] text-sm truncate max-w-[160px]">{team.teamName}</div>
            <div className="text-[#1a2744]/50 text-xs">{[team.player1, team.player2, team.player3, team.player4].filter(Boolean).map(n => n.split(' ').pop()).join(" · ")}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-center leading-none w-14 shrink-0">
            <span className="text-[9px] uppercase tracking-wide text-[#1a2744]/35 font-sans-app">Hole</span>
            <span className="text-sm font-bold text-[#1a2744]/70 font-sans-app">{team.startingHole ?? 1}</span>
          </div>
          <div className={`flex items-center justify-center bg-[#1a2744]/8 rounded px-2 py-0.5 w-16 text-xs font-sans-app font-bold tracking-wide ${team.flight === "morning" ? "text-blue-600" : "text-[#b06b10]"}`}>
            {team.teamCode}
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-[#1a2744]/50 hover:text-[#1a2744]/70 p-1">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#1a2744]/12 px-3 py-3">
          {editTeam?.id === team.id ? (
            <div>
              <TeamForm
                data={editTeam}
                onChange={setEditTeam}
                onSubmit={() => {
                  const err = codeConflict(editTeam?.teamCode ?? "", team.id);
                  if (err) { toast({ title: "Duplicate team code", description: err, variant: "destructive" }); return; }
                  updateMutation.mutate({ id: team.id, data: editTeam });
                }}
                onCancel={() => setEditTeam(null)}
                submitLabel="Save Changes"
              />
              <TeamScoreEditor teamId={team.id} />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditTeam(team)} className="text-[#b06b10]/80 hover:text-[#b06b10] border border-amber-500/20 font-sans-app">
                <Edit2 size={13} className="mr-1" /> Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClearScores(true)} className="text-blue-400/60 hover:text-blue-400 border border-blue-500/20 font-sans-app">
                <RefreshCw size={13} className="mr-1" /> Clear Scores
              </Button>
              <ConfirmDialog
                open={confirmClearScores}
                onOpenChange={setConfirmClearScores}
                title="Clear Scores?"
                description={`This will erase all hole scores for ${team.teamName}. This cannot be undone.`}
                confirmLabel="Clear Scores"
                onConfirm={() => clearScoresMutation.mutate(team.id)}
              />
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(team.id)} className="text-red-400/60 hover:text-red-400 border border-red-500/20 font-sans-app">
                <Trash2 size={13} className="mr-1" /> Remove
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TEAMS TAB ────────────────────────────────────────────────────────────────
function TeamsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({ teamName: "", player1: "", player2: "", player3: "", player4: "", flight: "morning", startingHole: 1, teamCode: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [flightFilter, setFlightFilter] = useState<"all" | "morning" | "afternoon">("all");
  const [search, setSearch] = useState("");
  // Starting-hole sort cycles: "asc" (low→high, default) → "desc" (high→low) →
  // "none" (team name, A→Z) → back to "asc".
  const [holeSort, setHoleSort] = useState<"none" | "desc" | "asc">("asc");

  // Pull the server's message out of an apiRequest error ("409: {json}")
  const serverErrMessage = (err: unknown, fallback: string) => {
    try {
      const text = String((err as Error).message ?? "");
      const json = JSON.parse(text.slice(text.indexOf("{")));
      return json.message || fallback;
    } catch { return fallback; }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/teams", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setShowAdd(false);
      setNewTeam({ teamName: "", player1: "", player2: "", player3: "", player4: "", flight: "morning", startingHole: 1, teamCode: "" });
      toast({ title: "Team created!" });
    },
    onError: (err) => toast({ title: "Could not create team", description: serverErrMessage(err, "Something went wrong. Try again."), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/teams/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditTeam(null);
      toast({ title: "Team updated!" });
    },
    onError: (err) => toast({ title: "Could not save team", description: serverErrMessage(err, "Something went wrong. Try again."), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/teams/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setConfirmDelete(null);
      toast({ title: "Team removed" });
    },
  });

  const clearScoresMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scores/team/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      qc.invalidateQueries({ queryKey: ["/api/ctp"] });
      qc.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({ title: "Scores cleared — team reset to start of round" });
    },
  });

  // Match by team name or any player name (contains, case-insensitive) —
  // matching against full player names means last-name searches work too.
  const q = search.trim().toLowerCase();
  const matchesSearch = (t: Team) =>
    !q ||
    t.teamName.toLowerCase().includes(q) ||
    [t.player1, t.player2, t.player3, t.player4].filter(Boolean).some(p => p.toLowerCase().includes(q));

  const sortTeams = (list: Team[]) =>
    [...list].sort((a, b) => {
      if (holeSort !== "none") {
        const ha = a.startingHole ?? 1;
        const hb = b.startingHole ?? 1;
        const diff = holeSort === "desc" ? hb - ha : ha - hb;
        if (diff !== 0) return diff;
      }
      return a.teamName.localeCompare(b.teamName, undefined, { numeric: true });
    });

  // Returns an error message if the code is empty or already used by another team
  // (excludeId lets a team keep its own code while editing), otherwise null.
  const codeConflict = (code: string, excludeId?: number): string | null => {
    const c = code.trim().toUpperCase();
    if (!c) return "Enter a team code or hit the regenerate button.";
    const dup = teams.find(t => t.id !== excludeId && (t.teamCode ?? "").toUpperCase() === c);
    return dup ? `Code "${c}" is already used by ${dup.teamName}. Regenerate or choose a different code.` : null;
  };

  const handleCreate = () => {
    const err = codeConflict(newTeam.teamCode);
    if (err) { toast({ title: "Duplicate team code", description: err, variant: "destructive" }); return; }
    createMutation.mutate(newTeam);
  };

  const morning = sortTeams(teams.filter(t => t.flight === "morning" && matchesSearch(t)));
  const afternoon = sortTeams(teams.filter(t => t.flight === "afternoon" && matchesSearch(t)));

  // "Start" sort control — rendered on each flight header line, aligned over the Hole column.
  // Cycles none → desc → asc → none. Defined as a function so each call site gets a
  // distinct element (avoids React reconciliation issues from reusing one element twice).
  const renderStartSortHeader = () => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setHoleSort(s => (s === "none" ? "asc" : s === "asc" ? "desc" : "none"))}
        className={`flex items-center justify-center gap-0.5 w-14 text-[11px] font-bold font-sans-app uppercase tracking-wide rounded py-1 transition-colors ${
          holeSort !== "none" ? "bg-[#1a2744]/8 text-[#1a2744]" : "text-[#1a2744]/45 hover:text-[#1a2744]/70"
        }`}
        title={
          holeSort === "asc"
            ? "Starting hole: low → high. Click for high → low."
            : holeSort === "desc"
            ? "Starting hole: high → low. Click to sort by team name."
            : "Click to sort by starting hole (low → high)."
        }
      >
        Start
        {holeSort === "desc" ? <ChevronDown size={12} /> : holeSort === "asc" ? <ChevronUp size={12} /> : <ChevronsUpDown size={12} className="opacity-50" />}
      </button>
      {/* "Code" label sits over the code column; spacer keeps the chevron clear */}
      <span className="w-16 text-center text-[11px] font-bold uppercase tracking-wide text-[#1a2744]/45 font-sans-app">Code</span>
      <div className="w-[22px]" aria-hidden="true" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#b06b10] font-sans-app">Teams</h2>
          <p className="text-[#1a2744]/50 text-xs font-sans-app">{teams.length} teams · {morning.length} AM · {afternoon.length} PM</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a2744]/5 rounded-lg p-0.5 border border-[#1a2744]/10">
            <button
              onClick={() => setFlightFilter(f => f === "morning" ? "all" : "morning")}
              className={`px-3 py-1 rounded text-xs font-sans-app font-bold transition-colors ${flightFilter === "morning" ? "bg-blue-500/20 text-blue-600 border border-blue-500/30" : "text-[#1a2744]/50 hover:text-[#1a2744]/70"}`}
            >AM</button>
            <button
              onClick={() => setFlightFilter(f => f === "afternoon" ? "all" : "afternoon")}
              className={`px-3 py-1 rounded text-xs font-sans-app font-bold transition-colors ${flightFilter === "afternoon" ? "bg-amber-500/25 text-[#b06b10] border border-amber-500/40" : "text-[#1a2744]/50 hover:text-[#1a2744]/70"}`}
            >PM</button>
          </div>
          <Button onClick={() => { setShowAdd(!showAdd); setNewTeam({ ...newTeam, teamCode: genCode() }); }}
            className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-sans-app" size="sm">
            <Plus size={14} className="mr-1.5" /> Add Team
          </Button>
        </div>
      </div>

      {/* Search by team name or player name */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a2744]/40 pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search team or player name..."
          className="bg-white border-[#1a2744]/12 text-[#1a2744] pl-9 pr-8 font-sans-app text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1a2744]/40 hover:text-[#1a2744]/70 p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showAdd && (
        <div className="atd-card rounded-xl p-4">
          <h3 className="text-[#b06b10]/80 font-bold mb-3 font-sans-app text-sm">New Team</h3>
          <TeamForm
            data={newTeam}
            onChange={setNewTeam}
            onSubmit={handleCreate}
            onCancel={() => setShowAdd(false)}
            submitLabel="Create Team"
          />
        </div>
      )}

      <div className="space-y-2">
        {(flightFilter === "all" || flightFilter === "morning") && morning.length > 0 && (
          <>
            <div className="flex items-center justify-between pl-1 pr-3">
              <p className="text-blue-600 text-xs uppercase tracking-wider font-sans-app">AM Flight ({morning.length})</p>
              {renderStartSortHeader()}
            </div>
            {morning.map(t => <TeamRow key={t.id} team={t} editTeam={editTeam} setEditTeam={setEditTeam} updateMutation={updateMutation} clearScoresMutation={clearScoresMutation} setConfirmDelete={setConfirmDelete} codeConflict={codeConflict} />)}
          </>
        )}
        {(flightFilter === "all" || flightFilter === "afternoon") && afternoon.length > 0 && (
          <>
            <div className="flex items-center justify-between pl-1 pr-3 mt-3">
              <p className="text-[#b06b10] text-xs uppercase tracking-wider font-sans-app">PM Flight ({afternoon.length})</p>
              {renderStartSortHeader()}
            </div>
            {afternoon.map(t => <TeamRow key={t.id} team={t} editTeam={editTeam} setEditTeam={setEditTeam} updateMutation={updateMutation} clearScoresMutation={clearScoresMutation} setConfirmDelete={setConfirmDelete} codeConflict={codeConflict} />)}
          </>
        )}
        {teams.length === 0 && (
          <div className="atd-card rounded-xl p-8 text-center">
            <Users size={36} className="text-[#1a2744]/25 mx-auto mb-3" />
            <p className="text-[#1a2744]/50 font-sans-app">No teams yet — add the first one above</p>
          </div>
        )}
        {teams.length > 0 && q && morning.length === 0 && afternoon.length === 0 && (
          <div className="atd-card rounded-xl p-8 text-center">
            <Search size={36} className="text-[#1a2744]/25 mx-auto mb-3" />
            <p className="text-[#1a2744]/50 font-sans-app">No teams or players match "{search.trim()}"</p>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="bg-[#1a2744] border-red-500/25 text-amber-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Remove Team?</DialogTitle>
            <DialogDescription className="text-amber-100/60 font-sans-app">This will deactivate the team and hide them from the leaderboard.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)} className="bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 font-sans-app">
              Remove
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="text-[#1a2744]/55 font-sans-app">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── HOLES TAB ────────────────────────────────────────────────────────────────
function HolesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: settings } = useQuery<TournamentSettings>({ queryKey: ["/api/settings"] });
  const [editHole, setEditHole] = useState<number | null>(null);
  const [holeData, setHoleData] = useState<Record<number, Partial<Hole>>>({});
  const [courseName, setCourseName] = useState("");
  const [editingCourseName, setEditingCourseName] = useState(false);

  useEffect(() => {
    if (settings?.courseName && !editingCourseName) setCourseName(settings.courseName);
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      setEditingCourseName(false);
      toast({ title: "Course name saved!" });
    },
  });

  function startEdit(hole: Hole) {
    setEditHole(hole.holeNumber);
    // Start with the hole's actual saved values — no auto-defaulting toggle state
    setHoleData(prev => ({ ...prev, [hole.holeNumber]: { ...hole } }));
  }

  const updateMutation = useMutation({
    mutationFn: ({ holeNumber, data }: { holeNumber: number; data: any }) => apiRequest("PUT", `/api/holes/${holeNumber}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/holes"] });
      setEditHole(null);
      toast({ title: "Hole updated!" });
    },
  });

  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const ctpCount = holes.filter(h => h.isCtpHole).length;

  return (
    <div className="space-y-4">
      {/* Course info card */}
      <div className="atd-card rounded-xl p-4 space-y-3 font-sans-app">
        <h2 className="font-bold text-[#b06b10]">Course Info</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Course Name</Label>
            <Input
              value={courseName}
              onChange={e => { setCourseName(e.target.value); setEditingCourseName(true); }}
              placeholder="e.g. ACC: North Course"
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] truncate"
            />
          </div>
          <Button
            onClick={() => saveSettingsMutation.mutate({ ...settings, courseName: courseName })}
            disabled={!editingCourseName}
            className="mt-5 shrink-0 bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold px-3"
          >
            <Check size={14} className="mr-1" /> Save
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="bg-[#1a2744]/5 rounded-lg p-3 text-center">
            <div className="text-[#b06b10] font-bold text-xl">{holes.length}</div>
            <div className="text-[#1a2744]/50 text-xs">Holes</div>
          </div>
          <div className="bg-[#1a2744]/5 rounded-lg p-3 text-center">
            <div className="text-[#b06b10] font-bold text-xl">{totalPar}</div>
            <div className="text-[#1a2744]/50 text-xs">Total Par</div>
          </div>
          <div className="bg-[#1a2744]/5 rounded-lg p-3 text-center">
            <div className="text-[#b06b10] font-bold text-xl">{ctpCount}</div>
            <div className="text-[#1a2744]/50 text-xs">CTP Holes</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full font-sans-app text-xs">
          <thead>
            <tr className="border-b border-amber-500/15">
              {["#", "Par", "Hcp", "Yds", "CTP/LD", "Prize", ""].map(h => (
                <th key={h} className="text-[#1a2744]/50 text-[10px] uppercase tracking-wide px-1 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holes.map(hole => {
              const isEditing = editHole === hole.holeNumber;
              const ed = holeData[hole.holeNumber] ?? hole;
              if (isEditing) {
                return (
                  <tr key={hole.id} className="border-b border-[#1a2744]/8 bg-amber-500/5">
                    <td className="px-1 py-1 text-[#b06b10] font-bold text-xs">{hole.holeNumber}</td>
                    <td className="px-1 py-1"><Input type="number" min={3} max={5} value={ed.par ?? hole.par} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, par: parseInt(e.target.value) } }))} className="bg-white border-amber-500/60 text-[#1a2744] w-10 h-6 text-xs px-1" /></td>
                    <td className="px-1 py-1"><Input type="number" min={1} max={18} value={ed.handicap ?? hole.handicap} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, handicap: parseInt(e.target.value) } }))} className="bg-white border-amber-500/60 text-[#1a2744] w-10 h-6 text-xs px-1" /></td>
                    <td className="px-1 py-1"><Input type="number" value={ed.yardageBlue ?? hole.yardageBlue} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, yardageBlue: parseInt(e.target.value) } }))} className="bg-white border-amber-500/60 text-[#1a2744] w-14 h-6 text-xs px-1" /></td>
                    <td className="px-1 py-1">
                      <Switch
                        checked={!!(ed.isCtpHole ?? hole.isCtpHole)}
                        onCheckedChange={v => setHoleData(p => ({
                          ...p,
                          [hole.holeNumber]: {
                            ...p[hole.holeNumber] || hole,
                            isCtpHole: v,
                            // When toggling on, auto-fill label based on par if not already set
                            ctpLabel: v && !(p[hole.holeNumber]?.ctpLabel || hole.ctpLabel)
                              ? (hole.par === 3 ? "CTP" : "LD")
                              : (p[hole.holeNumber]?.ctpLabel ?? hole.ctpLabel ?? ""),
                          }
                        }))}
                        className="scale-75 origin-left"
                      />
                    </td>
                    <td className="px-1 py-1"><Input value={ed.ctpLabel ?? ""} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, ctpLabel: e.target.value } }))} placeholder={hole.par === 3 ? "CTP" : "LD"} className="bg-white border-amber-500/60 text-[#1a2744] w-20 h-6 text-xs px-1" /></td>
                    <td className="px-1 py-1">
                      <div className="flex gap-0.5">
                        <button onClick={() => updateMutation.mutate({ holeNumber: hole.holeNumber, data: holeData[hole.holeNumber] ?? hole })} className="text-green-400 hover:text-green-300 p-0.5"><Check size={13} /></button>
                        <button onClick={() => setEditHole(null)} className="text-red-400 hover:text-red-300 p-0.5"><X size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={hole.id} className="border-b border-[#1a2744]/8 hover:bg-[#1a2744]/5 group">
                  <td className="px-1 py-2 font-bold text-[#b06b10]">{hole.holeNumber}</td>
                  <td className="px-1 py-2 text-[#1a2744]">{hole.par}</td>
                  <td className="px-1 py-2 text-[#1a2744]/60">{hole.handicap}</td>
                  <td className="px-1 py-2 text-[#1a2744]/60">{hole.yardageBlue}</td>
                  <td className="px-1 py-2">
                    {hole.isCtpHole
                      ? hole.par === 3
                        ? <Badge className="bg-amber-500/25 text-[#b06b10] border-amber-500/30 text-[10px] px-1 py-0">CTP</Badge>
                        : <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-[10px] px-1 py-0">LD</Badge>
                      : <span className="text-[#1a2744]/35">—</span>
                    }
                  </td>
                  <td className="px-1 py-2 text-[#1a2744]/55 text-[11px] max-w-[80px] truncate">{hole.ctpLabel || "—"}</td>
                  <td className="px-1 py-2">
                    <button onClick={() => startEdit(hole)} className="opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity text-[#b06b10]/80 hover:text-[#b06b10]">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SPONSORS TAB ─────────────────────────────────────────────────────────────
// ─── BROADCAST TAB ───────────────────────────────────────────────────────────
function BroadcastTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"], refetchInterval: 4000 });
  const [message, setMessage] = useState(settings?.broadcastMessage ?? "");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setMessage(settings?.broadcastMessage ?? "");
  }, [settings?.broadcastMessage]);

  const broadcastMutation = useMutation({
    mutationFn: (msg: string) => apiRequest("PUT", "/api/settings", { broadcastMessage: msg || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: message ? "Message broadcast!" : "Broadcast cleared" }); },
    onError: () => toast({ title: "Error updating broadcast", variant: "destructive" }),
  });

  const active = !!(settings?.broadcastMessage);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-[#b06b10]" />
        <h2 className="font-bold text-[#b06b10] font-sans-app">Broadcast Message</h2>
        {active && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 border border-red-500/30 font-sans-app animate-pulse">
            LIVE
          </span>
        )}
      </div>
      <p className="text-[#1a2744]/55 text-sm font-sans-app">
        Type a message below and hit Send — it will instantly appear as a pop-up to everyone currently viewing the app. Clear it when you're done.
      </p>
      <div className="atd-card rounded-xl p-4 space-y-3">
        <Label className="text-[#1a2744]/60 text-xs font-sans-app">Message</Label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. Scoring is now closed. Please report to the clubhouse."
          rows={4}
          className="w-full rounded-lg border border-[#1a2744]/15 bg-[#1a2744]/5 text-[#1a2744] placeholder:text-[#1a2744]/35 text-sm font-sans-app p-3 focus:outline-none focus:border-[#b06b10]/50 focus:ring-1 focus:ring-[#b06b10]/30 resize-none"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => broadcastMutation.mutate(message)}
            disabled={!message.trim() || broadcastMutation.isPending}
            className="flex-1 bg-[#1a2744] hover:bg-[#243461] text-white font-sans-app flex items-center gap-2"
          >
            <Send size={14} /> Send to All
          </Button>
          <Button
            onClick={() => setConfirmClear(true)}
            disabled={!active || broadcastMutation.isPending}
            variant="outline"
            className="border-red-500/30 text-red-500 hover:bg-red-500/10 font-sans-app flex items-center gap-2"
          >
            <XCircle size={14} /> Clear
          </Button>
        </div>
        <ConfirmDialog
          open={confirmClear}
          onOpenChange={setConfirmClear}
          title="Clear Broadcast?"
          description="This will remove the active broadcast message for all users."
          confirmLabel="Clear Message"
          onConfirm={() => { setMessage(""); broadcastMutation.mutate(""); }}
        />
      </div>
      {active && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <p className="text-xs font-bold text-red-600 font-sans-app uppercase tracking-widest mb-1">Currently broadcasting:</p>
          <p className="text-sm text-[#1a2744] font-sans-app">{settings?.broadcastMessage}</p>
        </div>
      )}
    </div>
  );
}

// ─── SUBMISSIONS TAB ──────────────────────────────────────────────────────────
type SubmissionStatus = {
  id: number;
  teamName: string;
  flight: string;
  startingHole: number;
  isSubmitted: boolean;
  holesScored: number;
  holesRemaining: number;
  player1: string | null;
  player2: string | null;
  player3: string | null;
  player4: string | null;
};

function lastNames(t: SubmissionStatus): string {
  return [t.player1, t.player2, t.player3, t.player4]
    .filter(Boolean)
    .map(p => p!.trim().split(/\s+/).pop() ?? p!)
    .join(" · ");
}

function SubmissionsTab() {
  const { data: submissions = [], isLoading } = useQuery<SubmissionStatus[]>({
    queryKey: ["/api/submissions"],
    refetchInterval: 10000,
  });
  const [activeFlight, setActiveFlight] = useState<"morning" | "afternoon">("morning");

  const morning = submissions.filter(s => s.flight === "morning");
  const afternoon = submissions.filter(s => s.flight === "afternoon");
  const flightTeams = activeFlight === "morning" ? morning : afternoon;

  const submittedCount = submissions.filter(s => s.isSubmitted).length;
  const total = submissions.length;

  const submitted  = flightTeams.filter(t => t.isSubmitted).sort((a, b) => a.teamName.localeCompare(b.teamName));
  const inProgress = flightTeams.filter(t => !t.isSubmitted).sort((a, b) => a.holesRemaining - b.holesRemaining);

  const morningSubmitted  = morning.filter(t => t.isSubmitted).length;
  const afternoonSubmitted = afternoon.filter(t => t.isSubmitted).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#1a2744]/10 px-4 py-3">
        <div className="font-sans-app">
          <p className="text-[#1a2744] font-bold text-sm">{submittedCount} / {total} submitted</p>
          <p className="text-[#1a2744]/45 text-xs">{total - submittedCount} teams still on the course</p>
        </div>
      </div>

      {/* Morning / Afternoon toggle */}
      <div className="flex rounded-xl overflow-hidden border border-[#1a2744]/12 bg-[#1a2744]/5">
        <button
          onClick={() => setActiveFlight("morning")}
          className={`flex-1 py-2 text-xs font-bold font-sans-app flex items-center justify-center gap-1.5 transition-colors ${
            activeFlight === "morning"
              ? "bg-blue-500/20 text-blue-600 border-r border-[#1a2744]/12"
              : "text-[#1a2744]/50 hover:bg-[#1a2744]/5 border-r border-[#1a2744]/12"
          }`}
        >
          AM
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            activeFlight === "morning" ? "bg-blue-500/20 text-blue-600" : "bg-[#1a2744]/10 text-[#1a2744]/50"
          }`}>{morningSubmitted}/{morning.length}</span>
        </button>
        <button
          onClick={() => setActiveFlight("afternoon")}
          className={`flex-1 py-2 text-xs font-bold font-sans-app flex items-center justify-center gap-1.5 transition-colors ${
            activeFlight === "afternoon"
              ? "bg-amber-500/20 text-[#b06b10]"
              : "text-[#1a2744]/50 hover:bg-[#1a2744]/5"
          }`}
        >
          PM
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            activeFlight === "afternoon" ? "bg-amber-500/20 text-[#b06b10]" : "bg-[#1a2744]/10 text-[#1a2744]/50"
          }`}>{afternoonSubmitted}/{afternoon.length}</span>
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-[#1a2744]/40 text-sm py-6 font-sans-app">Loading...</p>
      ) : (
        <div className="space-y-4">
          {/* In Progress section */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider font-sans-app text-[#b06b10] px-1">In Progress <span className="text-[#1a2744]/40 font-normal normal-case tracking-normal">({inProgress.length})</span></p>
            <div className="bg-white rounded-xl border border-[#1a2744]/10 overflow-hidden">
              <table className="w-full text-xs font-sans-app">
                <thead>
                  <tr className="border-b border-[#1a2744]/8 bg-[#1a2744]/3">
                    <th className="text-left px-3 py-2 text-[#1a2744]/50 font-bold">Team</th>
                    <th className="text-center px-2 py-2 text-[#1a2744]/50 font-bold">Start Hole</th>
                    <th className="text-center px-2 py-2 text-[#1a2744]/50 font-bold">Holes Rem</th>
                  </tr>
                </thead>
                <tbody>
                  {inProgress.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-4 text-center text-[#1a2744]/35 italic">All teams submitted!</td></tr>
                  ) : inProgress.map((t, i) => (
                    <tr key={t.id} className={`border-b border-[#1a2744]/5 ${i % 2 !== 0 ? 'bg-[#1a2744]/2' : ''}`}>
                      <td className="px-3 py-2">
                        <div className="text-[#1a2744] font-medium">{t.teamName}</div>
                        <div className="text-[#1a2744]/45 text-xs">{lastNames(t)}</div>
                      </td>
                      <td className="px-2 py-2 text-center text-[#1a2744]/60">{t.startingHole}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`font-bold text-sm ${
                          t.holesRemaining <= 3 ? 'text-[#b06b10]' : 'text-[#1a2744]'
                        }`}>{t.holesRemaining}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submitted section */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider font-sans-app text-emerald-700 px-1">Submitted <span className="text-[#1a2744]/40 font-normal normal-case tracking-normal">({submitted.length})</span></p>
            <div className="bg-white rounded-xl border border-[#1a2744]/10 overflow-hidden">
              <table className="w-full text-xs font-sans-app">
                <thead>
                  <tr className="border-b border-[#1a2744]/8 bg-[#1a2744]/3">
                    <th className="text-left px-3 py-2 text-[#1a2744]/50 font-bold">Team</th>
                    <th className="text-center px-2 py-2 text-[#1a2744]/50 font-bold">Start Hole</th>
                    <th className="text-center px-2 py-2 text-[#1a2744]/50 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submitted.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-4 text-center text-[#1a2744]/35 italic">No submissions yet</td></tr>
                  ) : submitted.map((t, i) => (
                    <tr key={t.id} className={`border-b border-[#1a2744]/5 ${i % 2 !== 0 ? 'bg-[#1a2744]/2' : ''}`}>
                      <td className="px-3 py-2">
                        <div className="text-[#1a2744]/60 font-medium">{t.teamName}</div>
                        <div className="text-[#1a2744]/40 text-xs">{lastNames(t)}</div>
                      </td>
                      <td className="px-2 py-2 text-center text-[#1a2744]/40">{t.startingHole}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 font-bold text-[10px] border border-green-500/25">
                          <Check size={9} /> Submitted
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SponsorsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: sponsors = [] } = useQuery<Sponsor[]>({ queryKey: ["/api/sponsors"] });
  const [newSponsor, setNewSponsor] = useState({ name: "", logoUrl: "", website: "", placement: "leaderboard" as const, displayOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeleteSponsor, setConfirmDeleteSponsor] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sponsors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sponsors"] });
      setShowAdd(false);
      setNewSponsor({ name: "", logoUrl: "", website: "", placement: "leaderboard", displayOrder: 0 });
      toast({ title: "Sponsor added!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sponsors/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sponsors"] });
      toast({ title: "Sponsor removed" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#b06b10] font-sans-app">Sponsors</h2>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-sans-app" size="sm">
          <Plus size={14} className="mr-1.5" /> Add Sponsor
        </Button>
      </div>

      {showAdd && (
        <div className="atd-card rounded-xl p-4 space-y-3 font-sans-app">
          <h3 className="text-[#b06b10]/80 font-bold text-sm">New Sponsor</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-[#1a2744]/60 text-xs mb-1 block">Sponsor Name *</Label>
              <Input value={newSponsor.name} onChange={e => setNewSponsor(p => ({ ...p, name: e.target.value }))}
                placeholder="Sponsor name" className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
            </div>
            <div className="col-span-2">
              <Label className="text-[#1a2744]/60 text-xs mb-1 block">Logo URL</Label>
              <Input value={newSponsor.logoUrl} onChange={e => setNewSponsor(p => ({ ...p, logoUrl: e.target.value }))}
                placeholder="https://..." className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
            </div>
            <div>
              <Label className="text-[#1a2744]/60 text-xs mb-1 block">Website</Label>
              <Input value={newSponsor.website} onChange={e => setNewSponsor(p => ({ ...p, website: e.target.value }))}
                placeholder="https://..." className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
            </div>
            <div>
              <Label className="text-[#1a2744]/60 text-xs mb-1 block">Placement</Label>
              <Select value={newSponsor.placement} onValueChange={(v: any) => setNewSponsor(p => ({ ...p, placement: v }))}>
                <SelectTrigger className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a2744] border-amber-500/20 text-amber-100">
                  <SelectItem value="leaderboard">Leaderboard</SelectItem>
                  <SelectItem value="scorecard">Scorecard</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#1a2744]/60 text-xs mb-1 block">Display Order</Label>
              <Input type="number" value={newSponsor.displayOrder} onChange={e => setNewSponsor(p => ({ ...p, displayOrder: parseInt(e.target.value) }))}
                className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate(newSponsor)} className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold font-sans-app">
              <Check size={14} className="mr-1.5" /> Add Sponsor
            </Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-[#1a2744]/55 font-sans-app">Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sponsors.map(s => (
          <div key={s.id} className="flex items-center justify-between bg-[#1a2744]/5 border border-[#1a2744]/12 rounded-lg px-3 py-2.5 font-sans-app">
            <div className="flex items-center gap-3">
              {s.logoUrl && <img src={s.logoUrl} alt={s.name} className="h-8 max-w-[80px] object-contain opacity-70" />}
              <div>
                <div className="font-bold text-[#1a2744] text-sm">{s.name}</div>
                <Badge className="text-xs mt-0.5 bg-amber-500/10 text-[#b06b10]/80 border-amber-500/20">{s.placement}</Badge>
              </div>
            </div>
            <button onClick={() => setConfirmDeleteSponsor(s.id)} className="text-red-400/50 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <ConfirmDialog
          open={confirmDeleteSponsor !== null}
          onOpenChange={open => { if (!open) setConfirmDeleteSponsor(null); }}
          title="Delete Sponsor?"
          description="This will permanently remove this sponsor from the tournament."
          confirmLabel="Delete"
          onConfirm={() => confirmDeleteSponsor !== null && deleteMutation.mutate(confirmDeleteSponsor)}
        />
        {sponsors.length === 0 && (
          <div className="atd-card rounded-xl p-8 text-center">
            <Star size={36} className="text-[#1a2744]/25 mx-auto mb-3" />
            <p className="text-[#1a2744]/50 font-sans-app">No sponsors yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCORECARD COMPARISON (tie / playoff tool) ────────────────────────────────
function CompareScorecard({ team, holes, scores, bestHoles }: { team: Team; holes: Hole[]; scores: Score[]; bestHoles: Set<number> }) {
  const holeMap = new Map(holes.map(h => [h.holeNumber, h]));
  const played = scores.filter(s => s.strokes != null);
  const strokes = played.reduce((sum, s) => sum + (s.strokes ?? 0), 0);
  const par = played.reduce((sum, s) => sum + (holeMap.get(s.holeNumber)?.par ?? 4), 0);
  const toPar = strokes - par;
  const toParLabel = played.length === 0 ? "—" : toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : `${toPar}`;
  return (
    <div className="bg-white rounded-xl border border-[#1a2744]/12 p-3">
      <div className="flex items-center justify-between mb-2 px-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${team.flight === "morning" ? "bg-blue-500/15 text-blue-600" : "bg-amber-500/20 text-[#b06b10]"}`}>{team.flight === "morning" ? "AM" : "PM"}</span>
          <span className="font-bold text-[#1a2744] truncate" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>{team.teamName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-sans-app">
          <span className="text-[#1a2744]/45 text-xs">Thru {played.length}</span>
          <span className="font-bold text-[#1a2744] text-base" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{toParLabel}</span>
        </div>
      </div>
      <ScorecardTable holes={holes} scores={scores} highlightHoles={bestHoles} />
    </div>
  );
}

// Searchable team dropdown — one per comparison slot
function TeamCombobox({ teams, value, onChange, excludeIds, label }: {
  teams: Team[];
  value: number | null;
  onChange: (id: number | null) => void;
  excludeIds: number[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sel = teams.find(t => t.id === value);
  const qn = q.trim().toLowerCase();
  const list = teams
    .filter(t => t.id === value || !excludeIds.includes(t.id))
    .filter(t => !qn || t.teamName.toLowerCase().includes(qn) ||
      [t.player1, t.player2, t.player3, t.player4].filter(Boolean).some(p => p.toLowerCase().includes(qn)));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQ(""); }}
        className="w-full flex items-center justify-between rounded-md border border-[#1a2744]/15 bg-white px-3 py-2 text-sm text-left font-sans-app"
      >
        <span className={sel ? "text-[#1a2744] font-bold truncate" : "text-[#1a2744]/40"}>
          {sel ? sel.teamName : label}
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {sel && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onChange(null); setOpen(false); }}
              className="text-[#1a2744]/35 hover:text-[#1a2744]/70 p-0.5"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`text-[#1a2744]/45 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#1a2744]/20 rounded-md shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-[#1a2744]/10">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1a2744]/40 pointer-events-none" />
              <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search team or player..."
                className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] h-8 pl-8 text-sm" />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {list.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm font-sans-app transition-colors ${
                  t.id === value ? "bg-[#1a2744] text-white font-bold" : "text-[#1a2744] hover:bg-[#1a2744]/8"
                }`}
              >
                <span className="font-bold">{t.teamName}</span>
                <span className={`ml-2 text-xs ${t.id === value ? "text-white/60" : "text-[#1a2744]/45"}`}>
                  {[t.player1, t.player2, t.player3, t.player4].filter(Boolean).map(p => p.trim().split(/\s+/).pop()).join(" · ")}
                </span>
              </button>
            ))}
            {list.length === 0 && <div className="px-3 py-2.5 text-sm text-[#1a2744]/40 font-sans-app italic">No matching teams</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function ScorecardComparison() {
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const [count, setCount] = useState(2);
  const [slots, setSlots] = useState<(number | null)[]>([null, null]);
  const [open, setOpen] = useState(false);
  const [flightFilter, setFlightFilter] = useState<"morning" | "afternoon">("morning");
  const { data: settings } = useQuery<TournamentSettings>({ queryKey: ["/api/settings"] });
  // One shared scores query so we can compare hole-by-hole across teams
  const { data: allScores = [] } = useQuery<Score[]>({ queryKey: ["/api/scores"], refetchInterval: open ? 5000 : false });

  // When Live, default the toggle to the in-progress flight (PM if active, else AM)
  // until the admin manually picks one.
  const userSetFlightRef = useRef(false);
  useEffect(() => {
    if (userSetFlightRef.current) return;
    if ((settings?.tournamentMode ?? "test") !== "live") return;
    if (settings?.pmStatus === "in_progress") setFlightFilter("afternoon");
    else if (settings?.amStatus === "in_progress") setFlightFilter("morning");
  }, [settings]);

  // Switching flights clears the current picks — you only compare within one flight
  const switchFlight = (f: "morning" | "afternoon") => { userSetFlightRef.current = true; setFlightFilter(f); setSlots(Array(count).fill(null)); };

  // Changing the team count resizes the slot list, keeping existing picks
  const changeCount = (n: number) => {
    setCount(n);
    setSlots(s => Array.from({ length: n }, (_, i) => s[i] ?? null));
  };

  const flightTeams = teams.filter(t => t.flight === flightFilter);
  const picked = slots.filter((id): id is number => id !== null);
  const chosen = picked.map(id => teams.find(t => t.id === id)).filter((t): t is Team => !!t);

  // Per-hole comparison: which chosen team has the OUTRIGHT lowest score on each
  // hole (ties highlight nothing — only a clear winner gets the green cell).
  const scoresByTeam = new Map(chosen.map(t => [t.id, allScores.filter(s => s.teamId === t.id)]));
  const bestTeamByHole = new Map<number, number>();
  for (const h of holes) {
    let bestTeam: number | null = null;
    let bestStrokes = Infinity;
    let tie = false;
    for (const t of chosen) {
      const s = scoresByTeam.get(t.id)?.find(x => x.holeNumber === h.holeNumber);
      if (s?.strokes == null) continue;
      if (s.strokes < bestStrokes) { bestStrokes = s.strokes; bestTeam = t.id; tie = false; }
      else if (s.strokes === bestStrokes) tie = true;
    }
    if (bestTeam !== null && !tie) bestTeamByHole.set(h.holeNumber, bestTeam);
  }
  const bestHolesFor = (teamId: number) =>
    new Set(Array.from(bestTeamByHole.entries()).filter(([, tid]) => tid === teamId).map(([holeNum]) => holeNum));

  return (
    <div className="atd-card rounded-xl p-5 space-y-3">
      <div>
        <h2 className="font-bold text-[#b06b10] flex items-center gap-2"><Scale size={16} /> Scorecard Comparison</h2>
        <p className="text-xs text-[#1a2744]/50 mt-0.5">Select 2–5 teams to view full scorecards together — for breaking ties in a scorecard playoff.</p>
      </div>

      {/* Flight toggle — only compare within one flight */}
      <div className="flex bg-[#1a2744]/5 rounded-lg p-0.5 border border-[#1a2744]/10">
        <button
          onClick={() => switchFlight("morning")}
          className={`flex-1 py-1.5 rounded text-xs font-sans-app font-bold transition-colors ${flightFilter === "morning" ? "bg-blue-500/20 text-blue-600 border border-blue-500/30" : "text-[#1a2744]/50 hover:text-[#1a2744]/70"}`}
        >AM Flight</button>
        <button
          onClick={() => switchFlight("afternoon")}
          className={`flex-1 py-1.5 rounded text-xs font-sans-app font-bold transition-colors ${flightFilter === "afternoon" ? "bg-amber-500/25 text-[#b06b10] border border-amber-500/40" : "text-[#1a2744]/50 hover:text-[#1a2744]/70"}`}
        >PM Flight</button>
      </div>

      {/* How many teams to compare */}
      <div>
        <Label className="text-[#1a2744]/60 text-xs mb-1.5 block">How many teams?</Label>
        <div className="grid grid-cols-4 gap-2">
          {[2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => changeCount(n)}
              className={`py-1.5 rounded-lg border text-sm font-bold transition-colors font-sans-app ${
                count === n ? "bg-amber-500/25 border-amber-500/60 text-[#b06b10]" : "bg-[#1a2744]/5 border-[#1a2744]/15 text-[#1a2744]/50 hover:border-[#1a2744]/30"
              }`}
            >{n}</button>
          ))}
        </div>
      </div>

      {/* One searchable dropdown per slot */}
      <div className="space-y-2">
        {slots.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1a2744]/45 font-sans-app w-12 shrink-0">Team {i + 1}</span>
            <div className="flex-1">
              <TeamCombobox
                teams={flightTeams}
                value={val}
                onChange={id => setSlots(s => s.map((v, j) => j === i ? id : v))}
                excludeIds={picked}
                label="Select team..."
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#1a2744]/50 font-sans-app">{picked.length} of {count} selected</span>
        <div className="flex gap-2">
          {picked.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSlots(Array(count).fill(null))} className="text-[#1a2744]/55 font-sans-app">Clear</Button>
          )}
          <Button size="sm" disabled={picked.length < 2} onClick={() => setOpen(true)}
            className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 disabled:opacity-40 font-bold font-sans-app">
            <Scale size={14} className="mr-1.5" /> Compare ({picked.length})
          </Button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: "rgba(17,27,51,0.75)" }}>
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a2744] shrink-0">
            <span className="text-amber-100 font-bold font-sans-app flex items-center gap-2"><Scale size={16} /> Scorecard Comparison ({chosen.length})</span>
            <button onClick={() => setOpen(false)} className="text-amber-100/70 hover:text-amber-100 flex items-center gap-1 text-sm font-sans-app border border-amber-500/30 rounded px-2 py-1">
              <X size={14} /> Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: "#f0ebe1" }}>
            <div className="flex items-center gap-2 px-1 text-xs font-sans-app text-[#1a2744]/60">
              <span className="inline-block w-4 h-4 rounded border border-green-600/40" style={{ background: "rgba(34,197,94,0.22)" }}></span>
              Green cell = outright best score on that hole among these teams (ties not highlighted)
            </div>
            {chosen.map(t => <CompareScorecard key={t.id} team={t} holes={holes} scores={scoresByTeam.get(t.id) ?? []} bestHoles={bestHolesFor(t.id)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useQuery<TournamentSettings>({ queryKey: ["/api/settings"] });
  const [form, setForm] = useState<any>(null);
  const [holesExpanded, setHolesExpanded] = useState(false);
  const [confirmClearCtp, setConfirmClearCtp] = useState<number | null>(null);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [showScorePw, setShowScorePw] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm({ ...settings });
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved!" });
    },
  });

  // Tournament status (mode + per-flight activation) — saves immediately on toggle
  const statusMutation = useMutation({
    mutationFn: (patch: any) => apiRequest("PUT", "/api/settings", patch),
    onSuccess: (_res, patch: any) => {
      qc.invalidateQueries({ queryKey: ["/api/settings"] });
      const statusLabel: Record<string, string> = { not_started: "Not Started", in_progress: "In Progress", complete: "Complete" };
      if (patch.tournamentMode) toast({ title: `Tournament set to ${patch.tournamentMode.toUpperCase()} mode` });
      else if (patch.amStatus !== undefined) toast({ title: `AM flight: ${statusLabel[patch.amStatus] ?? patch.amStatus}` });
      else if (patch.pmStatus !== undefined) toast({ title: `PM flight: ${statusLabel[patch.pmStatus] ?? patch.pmStatus}` });
    },
    onError: () => toast({ title: "Could not update status", description: "If you just added the feature, run the Supabase migration first.", variant: "destructive" }),
  });
  const mode = settings?.tournamentMode ?? "test";

  // CTP management
  const { data: ctpEntries = [] } = useQuery<ClosestToPin[]>({ queryKey: ["/api/ctp"] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const ctpOnlyHoles = holes.filter(h => h.isCtpHole && h.par === 3);
  const ldHole = holes.find(h => h.isCtpHole && h.par !== 3);

  const [editCtp, setEditCtp] = useState<{ holeNumber: number; playerName: string; teamId: string; distance: string } | null>(null);

  const upsertCtpMutation = useMutation({
    mutationFn: (data: { holeNumber: number; playerName: string; teamId: number | null; distance: string }) =>
      apiRequest("POST", "/api/ctp", { ...data, asAdmin: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ctp"] });
      setEditCtp(null);
      toast({ title: "Entry saved!" });
    },
  });

  const clearCtpMutation = useMutation({
    mutationFn: (holeNumber: number) => apiRequest("DELETE", `/api/ctp/${holeNumber}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ctp"] });
      toast({ title: "CTP entry cleared" });
    },
  });

  if (!form) return null;

  // Tiebreaker holes — ordered list used to decide 1st/2nd/3rd ties in each flight.
  // Stored on settings as a comma-separated string of hole numbers, in priority order.
  const tbHoles: number[] = (settings?.tiebreakerHoles ?? "")
    .split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  const tbSlots: (number | null)[] = Array.from({ length: 9 }, (_, i) => tbHoles[i] ?? null);
  const setTiebreaker = (index: number, holeStr: string) => {
    const hole = holeStr === "none" ? null : parseInt(holeStr);
    const arr = [...tbSlots];
    if (hole !== null) arr.forEach((h, i) => { if (h === hole) arr[i] = null; }); // no duplicate hole
    arr[index] = hole;
    const compact = arr.filter((h): h is number => h !== null); // ordered, no gaps
    statusMutation.mutate({ tiebreakerHoles: compact.join(",") });
  };
  const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

  const modeMeta: Record<string, { label: string; active: string; help: string }> = {
    test: { label: "Test", active: "bg-blue-500/20 border-blue-500/60 text-blue-700", help: "Everything is open — any flight can log in and enter scores. Use this to test every part of the site." },
    live: { label: "Live", active: "bg-green-600/20 border-green-600/60 text-green-700", help: "Tournament day. Teams can only enter scores once you activate their flight below. Still fully testable." },
    complete: { label: "Complete", active: "bg-[#1a2744]/15 border-[#1a2744]/50 text-[#1a2744]", help: "Tournament is over. Players are locked out — only you (admin) can edit teams, scores, CTP and Long Drive." },
  };

  return (
    <div className="space-y-4 font-sans-app">
      {/* Tournament Status — mode + flight activation */}
      <div className="atd-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-[#b06b10]">Tournament Status</h2>
          <span className={`ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border font-sans-app ${modeMeta[mode].active}`}>
            {modeMeta[mode].label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["test", "live", "complete"] as const).map(m => (
            <button
              key={m}
              onClick={() => statusMutation.mutate(
                // Entering Live resets both flights to Not Started
                m === "live" ? { tournamentMode: m, amStatus: "not_started", pmStatus: "not_started" } : { tournamentMode: m }
              )}
              className={`py-2 rounded-lg border text-sm font-bold transition-colors font-sans-app ${
                mode === m ? modeMeta[m].active : "bg-[#1a2744]/5 border-[#1a2744]/15 text-[#1a2744]/50 hover:border-[#1a2744]/30"
              }`}
            >
              {modeMeta[m].label}
            </button>
          ))}
        </div>
        <p className="text-[#1a2744]/55 text-xs">{modeMeta[mode].help}</p>

        {mode === "live" && (
          <div className="space-y-2 border-t border-[#1a2744]/10 pt-3">
            <p className="text-[#1a2744]/60 text-xs font-bold uppercase tracking-wider">Flight Status</p>
            {([
              { key: "amStatus" as const, label: "AM Flight", value: settings?.amStatus ?? "not_started" },
              { key: "pmStatus" as const, label: "PM Flight", value: settings?.pmStatus ?? "not_started" },
            ]).map(({ key, label, value }) => (
              <div key={key} className="bg-[#1a2744]/5 border border-[#1a2744]/12 rounded-lg px-3 py-2.5 space-y-1.5">
                <span className="font-bold text-[#1a2744] text-sm">{label}</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { v: "not_started", text: "Not Started", on: "bg-[#1a2744]/15 border-[#1a2744]/40 text-[#1a2744]" },
                    { v: "in_progress", text: "In Progress", on: "bg-green-600/20 border-green-600/60 text-green-700" },
                    { v: "complete", text: "Complete", on: "bg-amber-500/25 border-amber-500/60 text-[#b06b10]" },
                  ]).map(({ v, text, on }) => (
                    <button
                      key={v}
                      onClick={() => statusMutation.mutate({ [key]: v })}
                      className={`py-1.5 rounded-md border text-[11px] font-bold transition-colors font-sans-app whitespace-nowrap ${
                        value === v ? on : "bg-white border-[#1a2744]/12 text-[#1a2744]/45 hover:border-[#1a2744]/30"
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[#1a2744]/40 text-xs">Not Started: teams can't log in. In Progress: scoring open, viewers get the flight-started popup, leaderboard defaults to this flight. Complete: that flight's scorecards lock to view-only.</p>
          </div>
        )}
      </div>

      {/* Tiebreaker Holes — ordered holes used to auto-break 1st/2nd/3rd ties */}
      <div className="atd-card rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-bold text-[#b06b10]">Tiebreaker Hole(s)</h2>
          <p className="text-[#1a2744]/50 text-xs mt-0.5">
            Rank the holes used to break ties for 1st, 2nd and 3rd in each flight. The app compares tied teams'
            scores on the 1st hole listed; if still tied it moves to the 2nd, and so on. Medals (🥇🥈🥉) are assigned
            automatically once every team in a flight has finished (thru F) and submitted.
          </p>
        </div>
        <div className="space-y-1.5">
          {tbSlots.map((val, i) => {
            // Only show a slot if it's filled or it's the next empty one (keeps the list tidy)
            const filledCount = tbHoles.length;
            if (i > filledCount) return null;
            const usedElsewhere = new Set(tbSlots.filter((_, j) => j !== i).filter(h => h !== null) as number[]);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1a2744]/45 font-sans-app w-8 shrink-0">{ordinals[i]}</span>
                <Select value={val ? String(val) : "none"} onValueChange={v => setTiebreaker(i, v)}>
                  <SelectTrigger className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] h-9 text-sm">
                    <SelectValue placeholder="— Select hole —" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2744] border-amber-500/20 text-amber-100 max-h-56">
                    <SelectItem value="none">— None —</SelectItem>
                    {Array.from({ length: 18 }, (_, n) => n + 1)
                      .filter(h => !usedElsewhere.has(h))
                      .map(h => <SelectItem key={h} value={String(h)}>Hole {h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
        {tbHoles.length === 0 && (
          <p className="text-[#1a2744]/40 text-xs italic">No tiebreaker holes set — tied teams will be ordered alphabetically until you add at least one.</p>
        )}
      </div>

      {/* Scorecard Comparison — tie / playoff tool */}
      <ScorecardComparison />

      {/* Hole Settings — collapsible */}
      <div className="atd-card rounded-xl overflow-hidden">
        <button
          onClick={() => setHolesExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#1a2744]/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Flag size={14} className="text-[#b06b10]" />
            <span className="font-bold text-[#b06b10]">Hole Settings</span>
          </div>
          {holesExpanded ? <ChevronUp size={16} className="text-[#1a2744]/50" /> : <ChevronDown size={16} className="text-[#1a2744]/50" />}
        </button>
        {holesExpanded && (
          <div className="border-t border-[#1a2744]/10 px-4 py-4">
            <HolesTab />
          </div>
        )}
      </div>

      <div className="atd-card rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-[#b06b10]">Tournament Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Tournament Name</Label>
            <Input value={form.tournamentName ?? ""} onChange={e => setForm((p: any) => ({ ...p, tournamentName: e.target.value }))}
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
          </div>
          <div className="col-span-2">
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Course Name</Label>
            <Input value={form.courseName ?? ""} onChange={e => setForm((p: any) => ({ ...p, courseName: e.target.value }))}
              placeholder="e.g. ACC: North Course"
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
          </div>
          <div>
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Year</Label>
            <Input type="number" value={form.year ?? 2025} onChange={e => setForm((p: any) => ({ ...p, year: parseInt(e.target.value) }))}
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
          </div>
          <div>
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Admin Password</Label>
            <div className="relative">
              <Input type={showAdminPw ? "text" : "password"} value={form.adminPassword ?? ""} onChange={e => setForm((p: any) => ({ ...p, adminPassword: e.target.value }))}
                className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] pr-10" />
              <button type="button" onClick={() => setShowAdminPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2744]/45 hover:text-[#1a2744]/70">
                {showAdminPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Scorekeeper Password (fallback)</Label>
            <div className="relative">
              <Input type={showScorePw ? "text" : "password"} value={form.scorekeeperPassword ?? ""} onChange={e => setForm((p: any) => ({ ...p, scorekeeperPassword: e.target.value }))}
                className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] pr-10" />
              <button type="button" onClick={() => setShowScorePw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a2744]/45 hover:text-[#1a2744]/70">
                {showScorePw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <Button onClick={() => updateMutation.mutate(form)} className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold">
          <Check size={14} className="mr-1.5" /> Save Settings
        </Button>
      </div>

      {/* CTP & LD Management */}
      <div className="atd-card rounded-xl p-5 space-y-3">
        <h2 className="font-bold text-[#b06b10]">Manage CTP &amp; LD Entries</h2>
        {ctpOnlyHoles.length === 0 && !ldHole ? (
          <p className="text-[#1a2744]/50 text-sm italic">No CTP or LD holes configured. Set up CTP holes in Hole Settings above.</p>
        ) : (
          <div className="space-y-2">
            {ctpOnlyHoles.map(hole => {
              const entry = ctpEntries.find(c => c.holeNumber === hole.holeNumber);
              const teamName = entry?.teamId ? teams.find(t => t.id === entry.teamId)?.teamName : null;
              return (
                <div key={hole.id} className="bg-[#1a2744]/5 border border-[#1a2744]/12 rounded-lg px-3 py-2.5">
                  <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[#b06b10] text-[10px] font-bold uppercase tracking-wider font-sans-app flex items-center gap-1"><Target size={10} />Closest to Pin</p>
                    <div className="font-bold text-[#1a2744] text-sm">
                      Hole {hole.holeNumber} <span className="text-[#1a2744]/40 font-normal">— {hole.ctpLabel ?? "CTP"}</span>
                    </div>
                    {editCtp?.holeNumber === hole.holeNumber ? (
                      <div className="mt-2 space-y-2">
                        <Input
                          placeholder="Player name"
                          value={editCtp.playerName}
                          onChange={e => setEditCtp(c => c && ({ ...c, playerName: e.target.value }))}
                          className="bg-white border-[#1a2744]/20 text-[#1a2744] h-7 text-xs"
                        />
                        <Select value={editCtp.teamId} onValueChange={v => setEditCtp(c => c && ({ ...c, teamId: v }))}>
                          <SelectTrigger className="bg-white border-[#1a2744]/20 text-[#1a2744] h-7 text-xs">
                            <SelectValue placeholder="Select team..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a2744] border-amber-500/20 text-amber-100 max-h-48">
                            {teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.teamName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Distance (e.g. 4ft 6in)"
                          value={editCtp.distance}
                          onChange={e => setEditCtp(c => c && ({ ...c, distance: e.target.value }))}
                          className="bg-white border-[#1a2744]/20 text-[#1a2744] h-7 text-xs"
                        />
                        <div className="flex gap-1.5 pt-1">
                          <Button size="sm" onClick={() => upsertCtpMutation.mutate({ holeNumber: hole.holeNumber, playerName: editCtp.playerName, teamId: editCtp.teamId ? parseInt(editCtp.teamId) : null, distance: editCtp.distance })} className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-sans-app h-7 text-xs px-3">
                            <Check size={11} className="mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditCtp(null)} className="text-[#1a2744]/50 font-sans-app h-7 text-xs">Cancel</Button>
                        </div>
                      </div>
                    ) : entry?.playerName ? (
                      <div className="mt-0.5">
                        <div className="text-[#1a2744] text-xs font-bold" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>{entry.playerName}</div>
                        {teamName && <div className="text-[#1a2744]/45 text-xs" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>{teamName}</div>}
                      </div>
                    ) : (
                      <span className="text-[#1a2744]/35 text-xs italic">No entry</span>
                    )}
                  </div>
                  {editCtp?.holeNumber !== hole.holeNumber && (
                    <div className="flex gap-1.5 ml-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setEditCtp({ holeNumber: hole.holeNumber, playerName: entry?.playerName ?? "", teamId: entry?.teamId ? String(entry.teamId) : "", distance: entry?.distance ?? "" })}
                        className="text-[#b06b10]/60 hover:text-[#b06b10] border border-amber-500/20 font-sans-app">
                        <Edit2 size={13} className="mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm"
                        onClick={() => entry ? setConfirmClearCtp(hole.holeNumber) : toast({ title: "Nothing to clear", description: "No entry data exists for this hole yet." })}
                        className="text-red-400/60 hover:text-red-400 border border-red-500/20 font-sans-app">
                        <X size={13} className="mr-1" /> Clear
                      </Button>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
            {ldHole && (() => {
              const entry = ctpEntries.find(c => c.holeNumber === ldHole.holeNumber);
              const teamName = entry?.teamId ? teams.find(t => t.id === entry.teamId)?.teamName : null;
              return (
                <div key={ldHole.id} className="bg-[#1a2744]/5 border border-[#1a2744]/12 rounded-lg px-3 py-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-green-600 text-[10px] font-bold uppercase tracking-wider font-sans-app flex items-center gap-1"><Zap size={10} />Long Drive</p>
                      <div className="font-bold text-[#1a2744] text-sm">
                        Hole {ldHole.holeNumber} <span className="text-[#1a2744]/40 font-normal">— {ldHole.ctpLabel ?? "LD"}</span>
                      </div>
                      {editCtp?.holeNumber === ldHole.holeNumber ? (
                        <div className="mt-2 space-y-2">
                          <Input
                            placeholder="Player name"
                            value={editCtp.playerName}
                            onChange={e => setEditCtp(c => c && ({ ...c, playerName: e.target.value }))}
                            className="bg-white border-[#1a2744]/20 text-[#1a2744] h-7 text-xs"
                          />
                          <Select value={editCtp.teamId} onValueChange={v => setEditCtp(c => c && ({ ...c, teamId: v }))}>
                            <SelectTrigger className="bg-white border-[#1a2744]/20 text-[#1a2744] h-7 text-xs">
                              <SelectValue placeholder="Select team..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a2744] border-amber-500/20 text-amber-100 max-h-48">
                              {teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.teamName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1.5 pt-1">
                            <Button size="sm" onClick={() => upsertCtpMutation.mutate({ holeNumber: ldHole.holeNumber, playerName: editCtp.playerName, teamId: editCtp.teamId ? parseInt(editCtp.teamId) : null, distance: editCtp.distance })} className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-sans-app h-7 text-xs px-3">
                              <Check size={11} className="mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditCtp(null)} className="text-[#1a2744]/50 font-sans-app h-7 text-xs">Cancel</Button>
                          </div>
                        </div>
                      ) : entry?.playerName ? (
                        <div className="mt-0.5">
                          <div className="text-[#1a2744] text-xs font-bold" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>{entry.playerName}</div>
                          {teamName && <div className="text-[#1a2744]/45 text-xs" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>{teamName}</div>}
                        </div>
                      ) : (
                        <span className="text-[#1a2744]/35 text-xs italic">No entry</span>
                      )}
                    </div>
                    {editCtp?.holeNumber !== ldHole.holeNumber && (
                      <div className="flex gap-1.5 ml-2 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => setEditCtp({ holeNumber: ldHole.holeNumber, playerName: entry?.playerName ?? "", teamId: entry?.teamId ? String(entry.teamId) : "", distance: entry?.distance ?? "" })}
                          className="text-[#b06b10]/60 hover:text-[#b06b10] border border-amber-500/20 font-sans-app">
                          <Edit2 size={13} className="mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm"
                          onClick={() => entry ? setConfirmClearCtp(ldHole.holeNumber) : toast({ title: "Nothing to clear", description: "No entry data exists for this hole yet." })}
                          className="text-red-400/60 hover:text-red-400 border border-red-500/20 font-sans-app">
                          <X size={13} className="mr-1" /> Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        <ConfirmDialog
          open={confirmClearCtp !== null}
          onOpenChange={open => { if (!open) setConfirmClearCtp(null); }}
          title="Clear Entry?"
          description="This will remove the entry for this hole."
          confirmLabel="Clear"
          onConfirm={() => confirmClearCtp !== null && clearCtpMutation.mutate(confirmClearCtp)}
        />
      </div>
    </div>
  );
}

// ─── SCORES TAB ───────────────────────────────────────────────────────────────
// ─── MAIN ADMIN PORTAL ────────────────────────────────────────────────────────
function LastUpdatedBadge() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { data: scores } = useQuery<any[]>({ queryKey: ["/api/scores"], refetchInterval: 4000 });

  useEffect(() => {
    setLastUpdate(new Date());
  }, [scores]);

  if (!lastUpdate) return null;
  return (
    <span className="text-[#1a2744]/45 text-xs font-sans-app flex items-center gap-1">
      <Clock size={11} className="text-[#1a2744]/35" />
      Last updated: {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

export default function AdminPortal() {
  const [authed, setAuthed] = useState(() => {
    return false;
    
  });

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[#b06b10] shrink-0" />
          <h1 className="text-lg font-bold text-[#b06b10]">Admin Portal</h1>
          <button
            onClick={() => { setAuthed(false); }}
            className="ml-auto text-[#1a2744]/50 hover:text-red-400 text-xs font-sans-app flex items-center gap-1 border border-[#1a2744]/12 rounded px-2 py-1 hover:border-red-500/30 shrink-0"
          >
            <X size={12} /> Sign Out
          </button>
        </div>
        <LastUpdatedBadge />
      </div>

      <Tabs defaultValue="teams">
        <TabsList className="bg-[#1a2744]/5 border border-[#1a2744]/12 flex flex-nowrap h-auto w-full">
          {[
            { value: "teams", label: "Teams", icon: Users },
            { value: "submissions", label: "Submitted", icon: ClipboardList },
            { value: "broadcast", label: "Broadcast", icon: Bell },
            { value: "settings", label: "Settings", icon: Settings },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="font-sans-app data-[state=active]:bg-amber-500/25 data-[state=active]:text-[#b06b10] flex items-center gap-1 flex-1 justify-center px-1 text-xs whitespace-nowrap min-w-0">
              <Icon size={12} className="shrink-0" /><span className="truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="teams" className="mt-4"><TeamsTab /></TabsContent>
        <TabsContent value="submissions" className="mt-4"><SubmissionsTab /></TabsContent>
        <TabsContent value="broadcast" className="mt-4"><BroadcastTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
