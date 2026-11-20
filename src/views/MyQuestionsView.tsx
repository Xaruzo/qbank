import React, { useState, useEffect, useRef } from "react";
import { Plus, Globe, Lock, Trash2, Edit3, Share2, CheckCircle2, Sparkles, AlertCircle, BookOpen, User, RefreshCw } from "lucide-react";
import { personalQuestionsModel, type PersonalQuestion } from "../models/personalQuestionsModel";
import { TOPICS, PROBLEM_LABELS, LETTERS } from "../constants/appConstants";
import { fileToImagePayload } from "../utils/questionImageImport";

interface MyQuestionsViewProps {
  currentUser: { id?: string; email?: string; full_name?: string } | null;
  onNavigateHome: () => void;
}

export function MyQuestionsView({ currentUser, onNavigateHome }: MyQuestionsViewProps) {
  const [questions, setQuestions] = useState<PersonalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"private" | "published" | "create">("private");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for creating/editing personal questions
  const [form, setForm] = useState({
    topic: "numerical",
    question: "",
    choices: ["", "", "", ""],
    correct: 0,
    solution: "",
    label: "",
    is_public: false,
  });

  // AI Scan state
  const [importImage, setImportImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [extractingImage, setExtractingImage] = useState(false);
  const [extractElapsedSec, setExtractElapsedSec] = useState(0);
  const [extractError, setExtractError] = useState("");
  const [extractSuccess, setExtractSuccess] = useState("");
  const extractAbortRef = useRef<AbortController | null>(null);
  const [includeAiSolution, setIncludeAiSolution] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const userId = currentUser?.id || currentUser?.email || "local_user";
  const userEmail = currentUser?.email || "user@example.com";
  const fullName = currentUser?.full_name || "User";

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await personalQuestionsModel.getMyQuestions(userId, userEmail);
      setQuestions(data);
    } catch (e) {
      console.error("Failed to load personal questions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [userId, userEmail]);

  // Elapsed timer during AI extraction
  useEffect(() => {
    if (!extractingImage) {
      setExtractElapsedSec(0);
      return;
    }
    const timer = window.setInterval(() => {
      setExtractElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [extractingImage]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = await fileToImagePayload(file);
      setImportImage(payload);
      setExtractError("");
    } catch (err: any) {
      setExtractError(err?.message || "Failed to process image.");
    }
  };

  const handleExtractFromImage = async () => {
    if (!importImage || extractingImage) return;
    extractAbortRef.current?.abort("superseded");
    const controller = new AbortController();
    extractAbortRef.current = controller;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort("timeout");
    }, 60000);

    setExtractingImage(true);
    setExtractElapsedSec(0);
    setExtractError("");
    setExtractSuccess("");

    try {
      const response = await fetch("/api/questions/extract-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: importImage.base64,
          mimeType: importImage.mimeType,
          includeSolution: includeAiSolution,
        }),
      });
      const rawBody = await response.text();
      let data: any = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        data = {};
      }
      if (!response.ok || !data?.extracted) {
        throw new Error(data?.error || `Image scan failed (HTTP ${response.status})`);
      }

      const ext = data.extracted;
      setForm((prev) => {
        const nextChoices = Array.isArray(ext.choices) && ext.choices.length >= 4 ? ext.choices : prev.choices;
        return {
          ...prev,
          question: ext.question || prev.question,
          choices: nextChoices,
          topic: ext.topic || prev.topic,
          label: ext.label || prev.label,
          correct: typeof ext.correctIndex === "number" ? ext.correctIndex : prev.correct,
          solution: includeAiSolution && ext.solution ? ext.solution : prev.solution,
        };
      });
      setExtractSuccess("Successfully extracted question and choices from image!");
    } catch (err: any) {
      if (timedOut) {
        setExtractError("Image scan timed out after 60s. Please try again.");
      } else if (err?.name === "AbortError" || controller.signal.aborted) {
        setExtractError("Image scan cancelled.");
      } else {
        setExtractError(err?.message || "Failed to extract question from image.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setExtractingImage(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question.trim()) {
      alert("Please enter the question text.");
      return;
    }
    setSaving(true);
    try {
      await personalQuestionsModel.savePersonalQuestion({
        id: editingId || undefined,
        topic: form.topic,
        question: form.question,
        choices: form.choices,
        correct: form.correct,
        solution: form.solution,
        label: form.label,
        is_public: form.is_public,
      }, userId, userEmail, fullName);

      setSuccessMsg(editingId ? "Question updated successfully!" : "Personal question created successfully!");
      setEditingId(null);
      setForm({
        topic: "numerical",
        question: "",
        choices: ["", "", "", ""],
        correct: 0,
        solution: "",
        label: "",
        is_public: false,
      });
      setImportImage(null);
      await loadQuestions();
      setActiveTab("private");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      alert(e?.message || "Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (q: PersonalQuestion) => {
    setEditingId(q.id);
    setForm({
      topic: q.topic,
      question: q.question,
      choices: q.choices,
      correct: q.correct,
      solution: q.solution,
      label: q.label,
      is_public: q.is_public,
    });
    setActiveTab("create");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this personal question?")) return;
    try {
      await personalQuestionsModel.deletePersonalQuestion(id);
      await loadQuestions();
    } catch (e: any) {
      alert(e?.message || "Failed to delete question.");
    }
  };

  const handleToggleShare = async (q: PersonalQuestion) => {
    const nextPublic = !q.is_public;
    try {
      await personalQuestionsModel.togglePublicShare(q.id, nextPublic, userId, userEmail, fullName);
      await loadQuestions();
    } catch (e: any) {
      alert(e?.message || "Failed to update sharing state.");
    }
  };

  const privateQuestions = questions.filter((q) => !q.is_public);
  const publishedQuestions = questions.filter((q) => q.is_public);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">My Personal Question Bank</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Create and organize your private questions, practice them offline, and instantly publish them to the community with your attribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ topic: "numerical", question: "", choices: ["", "", "", ""], correct: 0, solution: "", label: "", is_public: false });
              setImportImage(null);
              setActiveTab("create");
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Question
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("private")}
          className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "private" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="w-4 h-4" />
          Private Bank ({privateQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab("published")}
          className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "published" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          Shared to Community ({publishedQuestions.length})
        </button>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ topic: "numerical", question: "", choices: ["", "", "", ""], correct: 0, solution: "", label: "", is_public: false });
            setActiveTab("create");
          }}
          className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "create" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Plus className="w-4 h-4" />
          {editingId ? "Edit Question" : "New Question Creator"}
        </button>
      </div>

      {/* Tab Content: Private & Published Lists */}
      {(activeTab === "private" || activeTab === "published") && (
        <div>
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading your personal questions...</div>
          ) : (activeTab === "private" ? privateQuestions : publishedQuestions).length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-1">
                {activeTab === "private" ? "No private questions yet" : "No community-shared questions yet"}
              </h3>
              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                {activeTab === "private"
                  ? "Create your own custom questions to practice review items not found in the standard bank."
                  : "Publish your private questions instantly to the community bank so other reviewers can benefit from your notes."}
              </p>
              <button
                onClick={() => setActiveTab("create")}
                className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-semibold text-sm transition-all cursor-pointer"
              >
                Create Your First Question
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {(activeTab === "private" ? privateQuestions : publishedQuestions).map((q) => (
                <div key={q.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {q.topic}
                      </span>
                      {q.label && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {q.label}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${q.is_public ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                        {q.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {q.is_public ? "Public Community" : "Private Only"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleShare(q)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          q.is_public
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        {q.is_public ? "Make Private" : "Publish to Community"}
                      </button>
                      <button
                        onClick={() => handleEdit(q)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                        title="Edit question"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-white font-medium text-base mb-3 leading-relaxed">{q.question}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {q.choices.map((choice, cIdx) => (
                      <div
                        key={cIdx}
                        className={`p-2.5 rounded-xl text-sm border flex items-center gap-2.5 ${
                          cIdx === q.correct
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-300"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${cIdx === q.correct ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                          {LETTERS[cIdx]}
                        </span>
                        <span className="truncate">{choice}</span>
                      </div>
                    ))}
                  </div>

                  {q.solution && (
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                      <span className="font-semibold text-amber-400 block mb-1">Step-by-Step Solution:</span>
                      {q.solution}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-500">
                    <span>Created: {new Date(q.created_at).toLocaleDateString()}</span>
                    {q.is_public && <span>Attribution: {q.full_name} ({q.user_email})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Create / Edit Question Form */}
      {activeTab === "create" && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">{editingId ? "Edit Personal Question" : "Create New Personal Question"}</h2>
              <p className="text-sm text-slate-400">Fill out details manually or use AI Scan to auto-fill from a reviewer screenshot.</p>
            </div>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({ topic: "numerical", question: "", choices: ["", "", "", ""], correct: 0, solution: "", label: "", is_public: false });
                }}
                className="text-xs text-amber-400 hover:underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {/* AI Scan box */}
          <div className="mb-8 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-300">Scan Question from Image (Optional AI Auto-Fill)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Upload a screenshot of your exam reviewer to automatically extract the question stem, choices, and solution.</p>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <label className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold cursor-pointer flex items-center gap-2 transition-all">
                <Plus className="w-4 h-4" />
                {importImage ? "Replace Image" : "Upload Reviewer Screenshot"}
                <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
              </label>

              {importImage && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Image attached
                  </span>
                  <button
                    type="button"
                    onClick={handleExtractFromImage}
                    disabled={extractingImage}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {extractingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {extractingImage ? `Scanning${extractElapsedSec > 0 ? ` (${extractElapsedSec}s)` : ""}` : "Auto-Fill Question & Choices"}
                  </button>
                </div>
              )}
            </div>

            {extractError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extractError}</span>
              </div>
            )}
            {extractSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{extractSuccess}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveQuestion} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Topic</label>
                <select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Problem Label / Tag</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Ratio Problem, Percentage, Analogy"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Question Stem</label>
              <textarea
                rows={4}
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Type your question here..."
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Answer Choices (A - E)</label>
              <div className="space-y-3">
                {form.choices.map((choice, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, correct: idx })}
                      className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        form.correct === idx
                          ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      }`}
                      title={form.correct === idx ? "Correct Answer" : "Mark as Correct Answer"}
                    >
                      {LETTERS[idx]}
                    </button>
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        const next = [...form.choices];
                        next[idx] = e.target.value;
                        setForm({ ...form, choices: next });
                      }}
                      placeholder={`Option ${LETTERS[idx]}`}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Click the letter badge on the left to set which option is the correct answer.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Step-by-Step Solution</label>
              <textarea
                rows={3}
                value={form.solution}
                onChange={(e) => setForm({ ...form, solution: e.target.value })}
                placeholder="Explain the step-by-step solution..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="checkbox"
                id="is_public_check"
                checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
              />
              <label htmlFor="is_public_check" className="text-sm text-slate-300 cursor-pointer">
                <span className="font-semibold text-white block">Instant Publish to Community Bank</span>
                Share this question publicly with other reviewers, including your creator attribution ({fullName}).
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("private")}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? "Saving..." : editingId ? "Update Question" : "Save Personal Question"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
