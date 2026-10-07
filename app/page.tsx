"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Game = {
  id: string;
  title: string;
  cover_url: string | null;
  status: "playing" | "backlog" | "completed";
  progress: number | null;
  completed_at: string | null;
  created_at?: string;
};

function GameCard({
  title,
  cover,
  progress,
  onEditProgress,
  onDelete,
}: {
  title: string;
  cover: string | null;
  progress?: number | null;
  onEditProgress?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="group">
      <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-[#171a21]">
        {cover ? (
          <img
            src={cover}
            alt={title}
            className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#20242b] px-4 text-center text-sm text-[#626a73]">
            暂无封面
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {progress !== undefined && progress !== null && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-3 backdrop-blur-[2px]">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-[#c7d5e0]">NOW PLAYING</span>
              <span className="font-medium text-white">
                {progress}%
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2e35]">
              <div
                className="h-full bg-[#66c0f4]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[15px] font-medium text-[#d6d7d8] transition-colors group-hover:text-white">
          {title}
        </h3>

        <div className="flex shrink-0 items-center gap-2">
          {onEditProgress && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditProgress();
              }}
              className="text-xs text-[#66c0f4] transition hover:text-white"
            >
              编辑
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs text-[#8f98a0] transition hover:text-red-400"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SectionTitle({
  title,
  label,
  count,
}: {
  title: string;
  label: string;
  count: number;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">
          {title}
        </h2>

        <p className="mt-1 text-xs font-medium uppercase tracking-[0.15em] text-[#66c0f4]">
          {label}
        </p >
      </div>

      <span className="text-xs text-[#66c0f4]">
        {count} 个游戏
      </span>
    </div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [progressInput, setProgressInput] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCover, setNewCover] = useState("");
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [newStatus, setNewStatus] = useState<
    "playing" | "backlog" | "completed"
  >("backlog");
  const [newProgress, setNewProgress] = useState("0");
  const [newCompletedAt, setNewCompletedAt] = useState("");
  const [savingGame, setSavingGame] = useState(false); 
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadGames() {
      const { data, error } = await supabase
        .from("game_chronicle")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        setError(error.message);
      } else {
        setGames((data ?? []) as Game[]);
      }

      setLoading(false);
    }

    loadGames();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#171a21] text-white">
        <div className="text-center">
          <h1 className="text-xl font-semibold">正在加载游戏库……</h1>
          <p className="mt-2 text-sm text-[#8f98a0]">
            正在连接游戏编年史。
          </p >
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#171a21] text-white">
        <div className="max-w-md px-6 text-center">
          <h1 className="text-xl font-semibold">无法加载游戏</h1>

          <p className="mt-2 text-sm text-[#8f98a0]">
            数据库返回错误。
          </p >

          <p className="mt-4 break-words rounded bg-[#20242b] p-4 text-left text-xs text-[#c7d5e0]">
            {error}
          </p >
        </div>
      </main>
    );
  }

  const playingGames = games.filter(
    (game) => game.status === "playing"
  );

  const backlogGames = games.filter(
    (game) => game.status === "backlog"
  );

  const completedGames = games.filter(
    (game) => game.status === "completed"
  );

  async function updateProgress() {
    if (!editingGame) return;

    const value = Number(progressInput);

    if (!Number.isInteger(value) || value < 0 || value > 100) {
      alert("请输入 0 到 100 之间的整数。");
      return;
    }

    setSavingProgress(true);

    const updateData =
      value === 100
        ? {
            progress: 100,
            status: "completed" as const,
            completed_at: new Date().toISOString().slice(0, 10),
          }
        : {
            progress: value,
            status: "playing" as const,
          };

    const { data, error } = await supabase
      .from("game_chronicle")
      .update(updateData)
      .eq("id", editingGame.id)
      .select()
      .single();

    if (error) {
      console.error("Update progress error:", error);
      alert(`保存失败：${error.message}`);
    } else {
      setGames((currentGames) =>
        currentGames.map((game) =>
          game.id === editingGame.id ? (data as Game) : game
        )
      );

      setEditingGame(null);
      setProgressInput("");
    }

    setSavingProgress(false);
  }

  async function addGame() {
    if (!newTitle.trim()) {
      alert("请输入游戏名称。");
      return;
    }

    setSavingGame(true);

    let coverUrl = newCover.trim() || null;

    // 如果选择了本地图片，先上传到 Supabase Storage
    if (newCoverFile) {
      setUploadingCover(true);

      const fileExt = newCoverFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("game-covers")
        .upload(fileName, newCoverFile, {
          contentType: newCoverFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Cover upload error:", uploadError);
        alert(`封面上传失败：${uploadError.message}`);
        setUploadingCover(false);
        setSavingGame(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("game-covers")
        .getPublicUrl(fileName);

      coverUrl = publicUrlData.publicUrl;

      setUploadingCover(false);
    }

    const progress =
      newStatus === "playing"
        ? Math.min(100, Math.max(0, Number(newProgress) || 0))
        : newStatus === "completed"
          ? 100
          : null;

    const completedAt =
      newStatus === "completed"
        ? newCompletedAt || new Date().toISOString().slice(0, 10)
        : null;

    const { data, error } = await supabase
      .from("game_chronicle")
      .insert({
        title: newTitle.trim(),
        cover_url: coverUrl,
        status: newStatus,
        progress,
        completed_at: completedAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Add game error:", error);
      alert(`新建失败：${error.message}`);
    } else {
      setGames((currentGames) => [...currentGames, data as Game]);

      setShowAddGame(false);
      setNewTitle("");
      setNewCover("");
      setNewCoverFile(null);
      setNewStatus("backlog");
      setNewProgress("0");
      setNewCompletedAt("");
    }

    setSavingGame(false);
  }

  async function deleteGame() {
    if (!deletingGame) return;

    setDeleting(true);

    // 如果是上传到 Storage 的封面，尝试同时删除
    if (deletingGame.cover_url) {
      try {
        const url = new URL(deletingGame.cover_url);
        const marker = "/storage/v1/object/public/game-covers/";

        if (url.pathname.includes(marker)) {
          const fileName = decodeURIComponent(
            url.pathname.split(marker)[1]
          );

          if (fileName) {
            const { error: storageError } = await supabase.storage
              .from("game-covers")
              .remove([fileName]);

            if (storageError) {
              console.error(
                "Cover delete error:",
                storageError
              );
            }
          }
        }
      } catch (error) {
        console.error("Cover URL parse error:", error);
      }
    }

    const { error } = await supabase
      .from("game_chronicle")
      .delete()
      .eq("id", deletingGame.id);

    if (error) {
      console.error("Delete game error:", error);
      alert(`删除失败：${error.message}`);
    } else {
      setGames((currentGames) =>
        currentGames.filter(
          (game) => game.id !== deletingGame.id
        )
      );

      setDeletingGame(null);
    }

    setDeleting(false);
  }

  const completedByMonth = completedGames.reduce(
    (groups, game) => {
      if (!game.completed_at) {
        const key = "未知日期";

        if (!groups[key]) {
          groups[key] = [];
        }

        groups[key].push(game);

        return groups;
      }

      const date = new Date(game.completed_at);

      const key = date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
      });

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(game);

      return groups;
    },
    {} as Record<string, Game[]>
  );

  return (
    <main className="min-h-screen bg-[#171a21] text-white">
      {/* Navigation */}
      <header className="border-b border-[#2a2e35] bg-[#171a21]">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <div className="mr-12 text-xl font-bold tracking-wide">
            GAME <span className="text-[#66c0f4]">CHRONICLE</span>
          </div>

          <nav className="flex h-full items-center gap-8 text-sm text-[#c7d5e0]">
            <a
              href="#library"
              className="flex h-full items-center border-b-2 border-[#66c0f4] text-white"
            >
              游戏库
            </a >

            <a href="#playing" className="transition hover:text-white">
              当前
            </a >

            <a href="#backlog" className="transition hover:text-white">
              待玩
            </a >

            <a href="#completed" className="transition hover:text-white">
              已通关
            </a >
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button className="rounded-sm bg-[#1b2838] px-4 py-2 text-sm text-[#c7d5e0] transition hover:bg-[#2a475e] hover:text-white">
              搜索
            </button>

            <button
              onClick={() => setShowAddGame(true)}
              className="rounded-sm bg-[#66c0f4] px-4 py-2 text-sm font-medium text-[#171a21] transition hover:bg-white"
            >
              ＋ 新建游戏
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <div id="library" className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#66c0f4]">
            我的游戏库
          </p >

          <h1 className="mt-2 text-3xl font-light text-white">
            游戏编年史
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-[#8f98a0]">
            记录我玩过、正在玩以及准备游玩的游戏。
          </p >
        </section>

        {/* Now Playing */}
        <section id="playing" className="mb-14">
          <SectionTitle
            title="当前"
            label="NOW PLAYING"
            count={playingGames.length}
          />

          <div className="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {playingGames.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                cover={game.cover_url}
                progress={game.progress}
                onEditProgress={() => {
                  setEditingGame(game);
                  setProgressInput(String(game.progress ?? 0));
                }}
                onDelete={() => setDeletingGame(game)}
              />
            ))}
          </div>
        </section>

        {/* On the List */}
        <section id="backlog" className="mb-14">
          <SectionTitle
            title="待玩"
            label="ON THE LIST"
            count={backlogGames.length}
          />

          <div className="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {backlogGames.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                cover={game.cover_url}
                progress={null}
                onDelete={() => setDeletingGame(game)}
              />
            ))}
          </div>
        </section>

        {/* Done */}
        <section id="completed" className="pb-16">
          <SectionTitle
            title="已通关"
            label="DONE"
            count={completedGames.length}
          />

          {Object.entries(completedByMonth).map(([month, monthGames]) => (
            <div key={month} className="mb-10">
              <div className="mb-5 flex items-center gap-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#c7d5e0]">
                  {month}
                </h3>

                <div className="h-px flex-1 bg-[#2a2e35]" />
              </div>

              <div className="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {monthGames.map((game) => (
                  <GameCard
                    key={game.id}
                    title={game.title}
                    cover={game.cover_url}
                    progress={null}
                    onDelete={() => setDeletingGame(game)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {editingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-lg border border-[#2a2e35] bg-[#20242b] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                修改进度
              </h2>

              <button
                onClick={() => {
                  setEditingGame(null);
                  setProgressInput("");
                }}
                className="text-[#8f98a0] transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-4 truncate text-sm text-[#c7d5e0]">
              {editingGame.title}
            </p >

            <div className="mt-6">
              <label className="text-xs text-[#8f98a0]">
                当前进度
              </label>

              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                  className="w-full rounded border border-[#3a4048] bg-[#171a21] px-3 py-2 text-white outline-none focus:border-[#66c0f4]"
                />

                <span className="text-[#8f98a0]">%</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingGame(null);
                  setProgressInput("");
                }}
                className="rounded bg-[#2a2e35] px-4 py-2 text-sm text-[#c7d5e0] transition hover:bg-[#363c45]"
              >
                取消
              </button>

              <button
                onClick={updateProgress}
                disabled={savingProgress}
                className="rounded bg-[#1a9fff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#66c0f4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProgress ? "保存中……" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-lg border border-[#2a2e35] bg-[#20242b] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                新建游戏
              </h2>

              <button
               onClick={() => setShowAddGame(false)}
                className="text-[#8f98a0] transition hover:text-white"
              >
                ✕
               </button>
            </div>

            <div className="mt-6 space-y-5">
              {/* 游戏名称 */}
              <div>
                <label className="text-xs text-[#8f98a0]">
                  游戏名称
                </label>

                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：Cyberpunk 2077"
                  className="mt-2 w-full rounded border border-[#3a4048] bg-[#171a21] px-3 py-2 text-sm text-white outline-none placeholder:text-[#626a73] focus:border-[#66c0f4]"
                />
              </div>

              {/* 封面 */}
              <div>
                <div>
                  <label className="text-xs text-[#8f98a0]">
                    游戏封面
                  </label>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;

                      if (file && file.size > 5 * 1024 * 1024) {
                        alert("图片不能超过 5 MB。");
                        e.target.value = "";
                        return;
                      }

                      setNewCoverFile(file);
                    }}
                    className="mt-2 block w-full cursor-pointer rounded border border-[#3a4048] bg-[#171a21] px-3 py-2 text-sm text-[#c7d5e0] file:mr-3 file:rounded file:border-0 file:bg-[#2a475e] file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-[#3a607d]"
                  />

                  {newCoverFile && (
                    <p className="mt-2 truncate text-xs text-[#66c0f4]">
                      已选择：{newCoverFile.name}
                    </p >
                  )}

                  <p className="mt-2 text-xs text-[#626a73]">
                    支持 JPG、PNG、WEBP，最大 5 MB
                  </p >

                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#2a2e35]" />
                    <span className="text-xs text-[#626a73]">或者</span>
                    <div className="h-px flex-1 bg-[#2a2e35]" />
                  </div>

                  <input
                    type="text"
                    value={newCover}
                    onChange={(e) => setNewCover(e.target.value)}
                    placeholder="粘贴图片 URL"
                    className="w-full rounded border border-[#3a4048] bg-[#171a21] px-3 py-2 text-sm text-white outline-none placeholder:text-[#626a73] focus:border-[#66c0f4]"
                  />
                </div>
              </div>

              {/* 状态 */}
              <div>
                <label className="text-xs text-[#8f98a0]">
                  状态
                </label>

                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(
                      e.target.value as
                        | "playing"
                        | "backlog"
                        | "completed"
                    )
                  }
                  className="mt-2 w-full rounded border border-[#3a4048] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
                >
                  <option value="playing">当前</option>
                  <option value="backlog">待玩</option>
                  <option value="completed">已通关</option>
                </select>
              </div>

              {/* 当前进度 */}
              {newStatus === "playing" && (
                <div>
                  <label className="text-xs text-[#8f98a0]">
                    当前进度
                  </label>

                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newProgress}
                      onChange={(e) => setNewProgress(e.target.value)}
                      className="w-full rounded border border-[#3a4048] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
                    />

                    <span className="text-sm text-[#8f98a0]">%</span>
                  </div>
                </div>
              )}

              {/* 通关日期 */}
              {newStatus === "completed" && (
                <div>
                  <label className="text-xs text-[#8f98a0]">
                    通关日期
                  </label>

                  <input
                    type="date"
                    value={newCompletedAt}
                    onChange={(e) => setNewCompletedAt(e.target.value)}
                    className="mt-2 w-full rounded border border-[#3a4048] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
                  />
                </div>
              )}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setShowAddGame(false)}
                className="rounded bg-[#2a2e35] px-4 py-2 text-sm text-[#c7d5e0] transition hover:bg-[#363c45]"
              >
                取消
              </button>
 
              <button
                onClick={addGame}
                disabled={savingGame}
                className="rounded bg-[#1a9fff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#66c0f4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploadingCover
                  ? "上传封面……"
                  : savingGame
                    ? "保存中……"
                    : "创建游戏"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-lg border border-[#2a2e35] bg-[#20242b] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">
              删除游戏
            </h2>

            <p className="mt-4 text-sm leading-6 text-[#c7d5e0]">
              确定要删除
              <span className="mx-1 font-semibold text-white">
                {deletingGame.title}
              </span>
              吗？
            </p >

            <p className="mt-2 text-xs text-[#8f98a0]">
              删除后游戏记录将无法恢复。
            </p >

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setDeletingGame(null)}
                className="rounded bg-[#2a2e35] px-4 py-2 text-sm text-[#c7d5e0] transition hover:bg-[#363c45]"
              >
                取消
              </button>

              <button
                onClick={deleteGame}
                disabled={deleting}
                className="rounded bg-[#b91c1c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "删除中……" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#2a2e35] py-6 text-center text-xs text-[#626a73]">
        GAME CHRONICLE · 我的游戏记录
      </footer>
    </main>
  );
}