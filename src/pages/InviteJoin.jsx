import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as boardsApi from "../api/boards";
import useAuthStore from "../store/authStore";

export default function InviteJoin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }

    const joinBoard = async () => {
      try {
        const { data } = await boardsApi.joinByInvite(token);
        navigate(`/board/${data.boardId}`);
      } catch (err) {
        setError(
          err.response?.data?.message || "Invalid or expired invite link"
        );
        setJoining(false);
      }
    };

    joinBoard();
  }, [token, user, authLoading, navigate]);

  if (authLoading || joining) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-b-teal-700"></div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center p-4">
      <div className="panel mx-4 max-w-md rounded-2xl p-8 text-center">
        <h1 className="mb-4 text-2xl font-black text-slate-950">
          Invite Error
        </h1>
        <p className="mb-6 text-slate-600">{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="btn-primary rounded-xl px-6 py-3 font-bold"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
