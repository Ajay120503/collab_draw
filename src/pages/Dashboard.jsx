import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useBoardStore from "../store/boardStore";
import useAuthStore from "../store/authStore";
import * as boardsApi from "../api/boards";

export default function Dashboard() {
  const { boards, fetchBoards, loading, createBoard } = useBoardStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [fromTemplateId, setFromTemplateId] = useState("");
  const [showFriends, setShowFriends] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const board = await createBoard({
        title,
        fromTemplateId: fromTemplateId || undefined,
      });
      setShowCreate(false);
      setTitle("");
      setFromTemplateId("");
      navigate(`/board/${board._id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this board? This cannot be undone.")) return;
    await boardsApi.deleteBoard(id);
    fetchBoards();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSaveTemplate = async (id, e) => {
    e.stopPropagation();
    await boardsApi.saveAsTemplate(id);
    fetchBoards();
  };

  const handleCreateFromTemplate = (templateId) => {
    setFromTemplateId(templateId);
    setTitle("");
    setShowCreate(true);
  };

  if (loading && boards.owned.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/80">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-md">
              <span className="text-lg font-black">CD</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                CollabDraw
              </h1>
              <p className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:block">
                Visual boards for shared thinking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowFriends(!showFriends)}
              className="group relative rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-white/80 hover:shadow-sm"
            >
              <span className="flex items-center gap-1.5">
                {/* Simple SVG icon for Friends */}
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Friends
              </span>
            </button>
            <span className="hidden rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700 sm:inline-block">
              {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        {/* Welcome / Create Board */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-white/90 to-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl border border-white/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
                Workspace
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                Welcome back, {user?.username || "creator"} 👋
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Open a board, start from a template, or invite collaborators.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/80 px-4 py-2 shadow-sm">
                  <p className="text-xl font-black text-slate-900">
                    {boards.owned.length}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Owned
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-2 shadow-sm">
                  <p className="text-xl font-black text-slate-900">
                    {boards.shared.length}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Shared
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreate(true);
                  setFromTemplateId("");
                }}
                className="rounded-2xl bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-2.5 font-bold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg active:scale-95"
              >
                + New Board
              </button>
            </div>
          </div>
        </div>

        {/* Create Board Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="panel w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl">
              <h2 className="mb-4 text-xl font-black text-slate-900">
                {fromTemplateId ? "Create from Template" : "New Board"}
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Board Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="control w-full rounded-xl border-0 bg-slate-100/80 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-teal-200"
                    placeholder="e.g., Design Review"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-teal-700 py-3 font-bold text-white transition hover:bg-teal-800 hover:shadow-md"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setFromTemplateId("");
                    }}
                    className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Templates Section */}
        {boards.templates.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
              Templates
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {boards.templates.map((t) => (
                <div
                  key={t._id}
                  onClick={() => handleCreateFromTemplate(t._id)}
                  className="group cursor-pointer rounded-2xl border border-transparent bg-white/80 p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                        />
                      </svg>
                    </div>
                    <h3 className="truncate font-bold text-slate-900 group-hover:text-teal-700">
                      {t.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    Click to create from template →
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Boards */}
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            My Boards
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {boards.owned.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
                <svg
                  className="mb-2 h-10 w-10 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-500">
                  No boards yet
                </p>
                <p className="text-xs text-slate-400">
                  Click “New Board” to get started
                </p>
              </div>
            ) : (
              boards.owned.map((b) => (
                <div
                  key={b._id}
                  onClick={() => navigate(`/board/${b._id}`)}
                  className="group cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm transition hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/30"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="flex-1 truncate font-bold text-slate-900 group-hover:text-teal-700">
                      {b.title}
                    </h3>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => handleSaveTemplate(b._id, e)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-teal-600 transition hover:bg-teal-50"
                        title="Save as template"
                      >
                        ★
                      </button>
                      <button
                        onClick={(e) => handleDelete(b._id, e)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-rose-500 transition hover:bg-rose-50"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    Updated {new Date(b.updatedAt).toLocaleDateString()}
                  </p>
                  {b.collaborators?.length > 1 && (
                    <div className="mt-3 flex -space-x-2">
                      {b.collaborators
                        .filter((c) => c.role !== "owner")
                        .slice(0, 3)
                        .map((c) => (
                          <div
                            key={c.userId?._id || c._id}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-[10px] font-bold text-white shadow-sm"
                            title={c.userId?.username || "collaborator"}
                          >
                            {(c.userId?.username || "?")[0].toUpperCase()}
                          </div>
                        ))}
                      {b.collaborators.length > 4 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-[10px] font-bold text-slate-600">
                          +{b.collaborators.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Shared with Me */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            Shared with Me
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {boards.shared.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
                <svg
                  className="mb-2 h-10 w-10 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-500">
                  No shared boards
                </p>
                <p className="text-xs text-slate-400">
                  Wait for someone to share one
                </p>
              </div>
            ) : (
              boards.shared.map((b) => (
                <div
                  key={b._id}
                  onClick={() => navigate(`/board/${b._id}`)}
                  className="group cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-5 shadow-sm transition hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/30"
                >
                  <h3 className="truncate font-bold text-slate-900 group-hover:text-amber-700">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    by {b.ownerId?.username || "unknown"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Updated {new Date(b.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Friends Panel Modal */}
      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}
    </div>
  );
}

// ---------------------------
// Friends Panel (Inline Modal)
// ---------------------------
function FriendsPanel({ onClose }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ pending: [], sent: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("friends");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: fData } = await (
        await import("../api/friends")
      ).listFriends();
      setFriends(fData.friends);
      const { data: rData } = await (
        await import("../api/friends")
      ).listRequests();
      setRequests(rData);
    } catch {}
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await (await import("../api/users")).searchUsers(q);
      setSearchResults(data.users);
    } catch {}
  };

  const handleSendRequest = async (userId) => {
    try {
      await (await import("../api/friends")).sendRequest(userId);
      alert("Friend request sent!");
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  const handleRespond = async (requestId, action) => {
    try {
      await (await import("../api/friends")).respondRequest(requestId, action);
      loadData();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="panel max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white/95 p-6 shadow-2xl shadow-slate-900/20 backdrop-blur-sm">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Friends
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-slate-100/80 p-1">
          {["friends", "requests", "search"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-white text-teal-700 shadow-md shadow-slate-200/50"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Friends tab */}
        {activeTab === "friends" && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <svg
                  className="mb-2 h-8 w-8 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-500">
                  No friends yet
                </p>
                <p className="text-xs text-slate-400">
                  Start adding people to collaborate
                </p>
              </div>
            ) : (
              friends.map((f) => (
                <div
                  key={f._id}
                  className="group flex items-center gap-3 rounded-xl p-3 transition hover:bg-white hover:shadow-sm"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: f.avatarColor }}
                  >
                    {f.username[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 group-hover:text-slate-900">
                    {f.username}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests tab */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {requests.pending.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Requests
                </h3>
                {requests.pending.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                        style={{ backgroundColor: r.from?.avatarColor }}
                      >
                        {r.from?.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">
                        {r.from?.username}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(r._id, "accept")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 hover:shadow-md"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(r._id, "reject")}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 hover:shadow-md"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {requests.sent.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sent Requests
                </h3>
                {requests.sent.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-white/70"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: r.to?.avatarColor }}
                    >
                      {r.to?.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-800">
                      {r.to?.username}
                    </span>
                    <span className="ml-auto text-xs font-bold text-amber-600">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
            {requests.pending.length === 0 && requests.sent.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <svg
                  className="mb-2 h-8 w-8 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-500">
                  No requests
                </p>
                <p className="text-xs text-slate-400">You’re all caught up</p>
              </div>
            )}
          </div>
        )}

        {/* Search tab */}
        {activeTab === "search" && (
          <div>
            <div className="relative mb-4">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by username or email..."
                className="control w-full rounded-xl border-0 bg-slate-100/80 pl-10 pr-4 py-3 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div className="space-y-2">
              {searchResults.length === 0 && searchQuery.length > 2 && (
                <p className="rounded-xl p-4 text-center text-sm text-slate-500">
                  No users found
                </p>
              )}
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between rounded-xl p-3 transition hover:bg-white/70"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: u.avatarColor }}
                    >
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-800">
                        {u.username}
                      </span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendRequest(u._id)}
                    className="rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-teal-800 hover:shadow-md active:scale-95"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
