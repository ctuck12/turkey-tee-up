import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, Flag, Star, Settings, Plus, Trash2, Edit2, Check, X,
  Copy, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#1a2744]/60 text-xs mb-1 block">Starting Hole</Label>
          <Input type="number" min={1} max={18} value={data.startingHole} onChange={e => onChange({ ...data, startingHole: parseInt(e.target.value) })}
            className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
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

function TeamRow({ team, editTeam, setEditTeam, updateMutation, clearScoresMutation, setConfirmDelete }: {
  team: Team;
  editTeam: Team | null;
  setEditTeam: (t: Team | null) => void;
  updateMutation: any;
  clearScoresMutation: any;
  setConfirmDelete: (id: number | null) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[#1a2744]/5 border border-[#1a2744]/12 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-3">
          <Badge className={`text-xs ${team.flight === "morning" ? "bg-blue-500/15 text-blue-300 border-blue-500/20" : "bg-amber-500/15 text-[#b06b10] border-amber-500/20"}`}>
            {team.flight === "morning" ? "AM" : "PM"}
          </Badge>
          <div>
            <div className="font-bold text-[#1a2744] text-sm">{team.teamName}</div>
            <div className="text-[#1a2744]/50 text-xs">{[team.player1, team.player2, team.player3, team.player4].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[#1a2744]/5 rounded px-2 py-0.5 text-xs font-mono text-[#b06b10]/80">
            {team.teamCode}
            <button onClick={() => { navigator.clipboard.writeText(team.teamCode); toast({ title: "Code copied!" }); }} className="ml-1 text-[#b06b10]/70 hover:text-[#b06b10]">
              <Copy size={10} />
            </button>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-[#1a2744]/50 hover:text-[#1a2744]/70 p-1">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#1a2744]/12 px-3 py-3">
          {editTeam?.id === team.id ? (
            <TeamForm
              data={editTeam}
              onChange={setEditTeam}
              onSubmit={() => updateMutation.mutate({ id: team.id, data: editTeam })}
              onCancel={() => setEditTeam(null)}
              submitLabel="Save Changes"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditTeam(team)} className="text-[#b06b10]/80 hover:text-[#b06b10] border border-amber-500/20 font-sans-app">
                <Edit2 size={13} className="mr-1" /> Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clearScoresMutation.mutate(team.id)} className="text-blue-400/60 hover:text-blue-400 border border-blue-500/20 font-sans-app">
                <RefreshCw size={13} className="mr-1" /> Clear Scores
              </Button>
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

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/teams", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setShowAdd(false);
      setNewTeam({ teamName: "", player1: "", player2: "", player3: "", player4: "", flight: "morning", startingHole: 1, teamCode: "" });
      toast({ title: "Team created!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/teams/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditTeam(null);
      toast({ title: "Team updated!" });
    },
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
      toast({ title: "Scores cleared" });
    },
  });

  const morning = teams.filter(t => t.flight === "morning");
  const afternoon = teams.filter(t => t.flight === "afternoon");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#b06b10] font-sans-app">Teams</h2>
          <p className="text-[#1a2744]/50 text-xs font-sans-app">{teams.length} teams · {morning.length} morning · {afternoon.length} afternoon</p>
        </div>
        <Button onClick={() => { setShowAdd(!showAdd); setNewTeam({ ...newTeam, teamCode: genCode() }); }}
          className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-sans-app" size="sm">
          <Plus size={14} className="mr-1.5" /> Add Team
        </Button>
      </div>

      {showAdd && (
        <div className="atd-card rounded-xl p-4">
          <h3 className="text-[#b06b10]/80 font-bold mb-3 font-sans-app text-sm">New Team</h3>
          <TeamForm
            data={newTeam}
            onChange={setNewTeam}
            onSubmit={() => createMutation.mutate(newTeam)}
            onCancel={() => setShowAdd(false)}
            submitLabel="Create Team"
          />
        </div>
      )}

      <div className="space-y-2">
        {morning.length > 0 && (
          <>
            <p className="text-blue-400/50 text-xs uppercase tracking-wider font-sans-app px-1">Morning Flight</p>
            {morning.map(t => <TeamRow key={t.id} team={t} editTeam={editTeam} setEditTeam={setEditTeam} updateMutation={updateMutation} clearScoresMutation={clearScoresMutation} setConfirmDelete={setConfirmDelete} />)}
          </>
        )}
        {afternoon.length > 0 && (
          <>
            <p className="text-amber-500/50 text-xs uppercase tracking-wider font-sans-app px-1 mt-3">Afternoon Flight</p>
            {afternoon.map(t => <TeamRow key={t.id} team={t} editTeam={editTeam} setEditTeam={setEditTeam} updateMutation={updateMutation} clearScoresMutation={clearScoresMutation} setConfirmDelete={setConfirmDelete} />)}
          </>
        )}
        {teams.length === 0 && (
          <div className="atd-card rounded-xl p-8 text-center">
            <Users size={36} className="text-[#1a2744]/25 mx-auto mb-3" />
            <p className="text-[#1a2744]/50 font-sans-app">No teams yet — add the first one above</p>
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
          <div className="flex-1">
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Course Name</Label>
            <Input
              value={courseName}
              onChange={e => { setCourseName(e.target.value); setEditingCourseName(true); }}
              placeholder="e.g. ACC: North Course"
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]"
            />
          </div>
          <Button
            onClick={() => saveSettingsMutation.mutate({ ...settings, courseName: courseName })}
            disabled={!editingCourseName}
            className="mt-5 bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold"
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

      <div className="overflow-x-auto">
        <table className="w-full font-sans-app text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-amber-500/15">
              {["Hole", "Par", "Hdcp", "Yards", "CTP Hole", "CTP Label", ""].map(h => (
                <th key={h} className="text-amber-500/50 text-xs uppercase tracking-wide px-2 py-2 text-left">{h}</th>
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
                    <td className="px-2 py-2 text-[#b06b10] font-bold">{hole.holeNumber}</td>
                    <td className="px-2 py-1"><Input type="number" min={3} max={5} value={ed.par ?? hole.par} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, par: parseInt(e.target.value) } }))} className="bg-white border-amber-500/60 text-[#1a2744] w-16 h-7 text-xs" /></td>
                    <td className="px-2 py-1"><Input type="number" min={1} max={18} value={ed.handicap ?? hole.handicap} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, handicap: parseInt(e.target.value) } }))} className="bg-white border-amber-500/60 text-[#1a2744] w-16 h-7 text-xs" /></td>
                    <td className="px-2 py-1"><Input type="number" value={ed.yardageBlue ?? hole.yardageBlue} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, yardageBlue: parseInt(e.target.value) } }))} className="bg-white border-amber-500/60 text-[#1a2744] w-20 h-7 text-xs" /></td>
                    <td className="px-2 py-1">
                      <Switch checked={!!(ed.isCtpHole ?? hole.isCtpHole)} onCheckedChange={v => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, isCtpHole: v } }))} />
                    </td>
                    <td className="px-2 py-1"><Input value={ed.ctpLabel ?? ""} onChange={e => setHoleData(p => ({ ...p, [hole.holeNumber]: { ...p[hole.holeNumber] || hole, ctpLabel: e.target.value } }))} placeholder="CTP label" className="bg-white border-amber-500/60 text-[#1a2744] w-28 h-7 text-xs" /></td>
                    <td className="px-2 py-1">
                      <div className="flex gap-1">
                        <button onClick={() => updateMutation.mutate({ holeNumber: hole.holeNumber, data: holeData[hole.holeNumber] ?? hole })} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
                        <button onClick={() => setEditHole(null)} className="text-red-400 hover:text-red-300 p-1"><X size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={hole.id} className="border-b border-[#1a2744]/8 hover:bg-[#1a2744]/5 group">
                  <td className="px-2 py-2.5 font-bold text-[#b06b10]">{hole.holeNumber}</td>
                  <td className="px-2 py-2.5 text-[#1a2744]">{hole.par}</td>
                  <td className="px-2 py-2.5 text-[#1a2744]/60">{hole.handicap}</td>
                  <td className="px-2 py-2.5 text-[#1a2744]/60">{hole.yardageBlue}</td>
                  <td className="px-2 py-2.5">{hole.isCtpHole ? <Badge className="bg-amber-500/25 text-[#b06b10] border-amber-500/30 text-xs">CTP</Badge> : <span className="text-[#1a2744]/35">—</span>}</td>
                  <td className="px-2 py-2.5 text-[#1a2744]/55 text-xs">{hole.ctpLabel ?? "—"}</td>
                  <td className="px-2 py-2.5">
                    <button onClick={() => startEdit(hole)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#b06b10]/80 hover:text-[#b06b10]">
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
function SponsorsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: sponsors = [] } = useQuery<Sponsor[]>({ queryKey: ["/api/sponsors"] });
  const [newSponsor, setNewSponsor] = useState({ name: "", logoUrl: "", website: "", placement: "leaderboard" as const, displayOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);

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
            <button onClick={() => deleteMutation.mutate(s.id)} className="text-red-400/50 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
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

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useQuery<TournamentSettings>({ queryKey: ["/api/settings"] });
  const [form, setForm] = useState<any>(null);

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

  // CTP management
  const { data: ctpEntries = [] } = useQuery<ClosestToPin[]>({ queryKey: ["/api/ctp"] });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const ctpHoles = holes.filter(h => h.isCtpHole);

  const clearCtpMutation = useMutation({
    mutationFn: (holeNumber: number) => apiRequest("DELETE", `/api/ctp/${holeNumber}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ctp"] });
      toast({ title: "CTP entry cleared" });
    },
  });

  if (!form) return null;

  return (
    <div className="space-y-6 font-sans-app">
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
            <Input type="password" value={form.adminPassword ?? ""} onChange={e => setForm((p: any) => ({ ...p, adminPassword: e.target.value }))}
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
          </div>
          <div>
            <Label className="text-[#1a2744]/60 text-xs mb-1 block">Scorekeeper Password (fallback)</Label>
            <Input type="password" value={form.scorekeeperPassword ?? ""} onChange={e => setForm((p: any) => ({ ...p, scorekeeperPassword: e.target.value }))}
              className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744]" />
          </div>
        </div>
        <Button onClick={() => updateMutation.mutate(form)} className="bg-amber-500/25 border border-amber-500/60 text-[#b06b10] hover:bg-amber-500/30 font-bold">
          <Check size={14} className="mr-1.5" /> Save Settings
        </Button>
      </div>

      {/* CTP Management */}
      <div className="atd-card rounded-xl p-5 space-y-3">
        <h2 className="font-bold text-[#b06b10]">Manage CTP Entries</h2>
        {ctpHoles.length === 0 ? (
          <p className="text-[#1a2744]/50 text-sm italic">No CTP holes configured. Set up CTP holes in the Holes tab.</p>
        ) : (
          <div className="space-y-2">
            {ctpHoles.map(hole => {
              const entry = ctpEntries.find(c => c.holeNumber === hole.holeNumber);
              return (
                <div key={hole.id} className="flex items-center justify-between bg-[#1a2744]/5 border border-[#1a2744]/12 rounded-lg px-3 py-2.5">
                  <div>
                    <div className="font-bold text-[#1a2744] text-sm">Hole {hole.holeNumber} — {hole.ctpLabel ?? "CTP"}</div>
                    {entry?.playerName ? (
                      <div className="text-amber-300 text-xs">{entry.playerName} · <span className="text-green-400">{entry.distance}</span></div>
                    ) : (
                      <span className="text-[#1a2744]/35 text-xs italic">No entry</span>
                    )}
                  </div>
                  {entry && (
                    <Button variant="ghost" size="sm" onClick={() => clearCtpMutation.mutate(hole.holeNumber)}
                      className="text-red-400/60 hover:text-red-400 border border-red-500/20">
                      <X size={13} className="mr-1" /> Clear
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCORES TAB ───────────────────────────────────────────────────────────────
function ScoresTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const { data: scores = [] } = useQuery<Score[]>({
    queryKey: ["/api/scores/team", selectedTeam],
    enabled: !!selectedTeam,
  });
  const { data: holes = [] } = useQuery<Hole[]>({ queryKey: ["/api/holes"] });
  const holeMap = new Map(holes.map(h => [h.holeNumber, h]));
  const scoreMap = new Map(scores.map(s => [s.holeNumber, s]));
  const [editScore, setEditScore] = useState<Record<number, string>>({});

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/scores", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scores/team", selectedTeam] });
      qc.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({ title: "Score saved" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scores/team/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scores/team", selectedTeam] });
      qc.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      toast({ title: "Scores cleared" });
    },
  });

  return (
    <div className="space-y-4 font-sans-app">
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-[#b06b10]">Score Editor</h2>
        <Select value={selectedTeam?.toString() ?? ""} onValueChange={v => { setSelectedTeam(parseInt(v)); setEditScore({}); }}>
          <SelectTrigger className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] w-56">
            <SelectValue placeholder="Select team..." />
          </SelectTrigger>
          <SelectContent className="bg-[#1a2744] border-amber-500/20 text-amber-100 max-h-64">
            {teams.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.teamName}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedTeam && (
          <Button variant="ghost" size="sm" onClick={() => clearMutation.mutate(selectedTeam)} className="text-red-400/60 hover:text-red-400 border border-red-500/20">
            <RefreshCw size={13} className="mr-1" /> Clear All
          </Button>
        )}
      </div>

      {selectedTeam && (
        <div className="atd-card rounded-xl p-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(n => {
              const s = scoreMap.get(n);
              const h = holeMap.get(n);
              const val = editScore[n] !== undefined ? editScore[n] : (s?.strokes?.toString() ?? "");
              return (
                <div key={n} className="bg-[#1a2744]/5 rounded-lg p-2 border border-[#1a2744]/12">
                  <div className="text-[#b06b10]/60 text-xs mb-1">Hole {n} · Par {h?.par ?? 4}</div>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={val}
                    onChange={e => setEditScore(p => ({ ...p, [n]: e.target.value }))}
                    onBlur={() => {
                      const v = parseInt(editScore[n] ?? "");
                      if (!isNaN(v) && v > 0) updateMutation.mutate({ teamId: selectedTeam, holeNumber: n, strokes: v });
                    }}
                    placeholder="—"
                    className="bg-[#1a2744]/5 border-[#1a2744]/12 text-[#1a2744] text-center font-bold h-8 text-sm"
                  />
                </div>
              );
            })}
          </div>
          <p className="text-[#1a2744]/35 text-xs mt-3">Scores auto-save when you click away from each field.</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ADMIN PORTAL ────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [authed, setAuthed] = useState(() => {
    return false;
    
  });

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-[#b06b10]" />
        <h1 className="text-lg font-bold text-[#b06b10]">Admin Portal</h1>
        <button
          onClick={() => {  setAuthed(false); }}
          className="ml-auto text-[#1a2744]/50 hover:text-red-400 text-xs font-sans-app flex items-center gap-1 border border-[#1a2744]/12 rounded px-2 py-1 hover:border-red-500/30"
        >
          <X size={12} /> Sign Out
        </button>
      </div>

      <Tabs defaultValue="teams">
        <TabsList className="bg-[#1a2744]/5 border border-[#1a2744]/12 flex flex-wrap h-auto gap-1">
          {[
            { value: "teams", label: "Teams", icon: Users },
            { value: "holes", label: "Holes", icon: Flag },
            { value: "scores", label: "Scores", icon: RefreshCw },
            { value: "sponsors", label: "Sponsors", icon: Star },
            { value: "settings", label: "Settings", icon: Settings },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="font-sans-app data-[state=active]:bg-amber-500/25 data-[state=active]:text-[#b06b10] flex items-center gap-1.5 text-xs">
              <Icon size={13} /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="teams" className="mt-4"><TeamsTab /></TabsContent>
        <TabsContent value="holes" className="mt-4"><HolesTab /></TabsContent>
        <TabsContent value="scores" className="mt-4"><ScoresTab /></TabsContent>
        <TabsContent value="sponsors" className="mt-4"><SponsorsTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
