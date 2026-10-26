"use client";


import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";


type Game = {
  id: string;
  title: string;
  cover_url: string | null;
  status: "playing" | "backlog" | "completed";
  progress: number | null;
  completed_at: string | null;
  created_at?: string;
  sort_order: number;
};


function GameCard({
  title,
  cover,
  progress,
  onEdit,
  onEditProgress,
  onDelete,
}: {
  title: string;
  cover: string | null;
  progress?: number | null;
  onEdit?: () => void;
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
    <div className="flex items-center gap-3">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#2a2e35]">
        <div
          className="h-full rounded-full bg-[#66c0f4]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="w-9 shrink-0 text-right text-xs font-medium text-white">
        {progress}%
      </span>
    </div>
  </div>
)}

      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-[13px] font-medium text-[#d6d7d8] transition-colors group-hover:text-white">
          {title}
        </h3>

        <div className="flex shrink-0 items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-xs text-[#a6b3c2] transition hover:text-white"
            >
              资料
            </button>
          )}

          {onEditProgress && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditProgress();
              }}
              className="text-xs text-[#66c0f4] transition hover:text-white"
            >
              进度
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


function SortableGameCard({
  game,
  children,
}: {
  game: Game;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: game.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
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
  const [showEditGame, setShowEditGame] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCover, setEditCover] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editStatus, setEditStatus] = useState<
    "playing" | "backlog" | "completed"
  >("backlog");
  const [editProgress, setEditProgress] = useState("0");
  const [editCompletedAt, setEditCompletedAt] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
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
  
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })
);

async function handlePlayingDragEnd(event: any) {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const oldIndex = playingGames.findIndex(
    (game) => game.id === active.id
  );
  const newIndex = playingGames.findIndex(
    (game) => game.id === over.id
  );

  if (oldIndex < 0 || newIndex < 0) return;

  const reorderedGames = arrayMove(playingGames, oldIndex, newIndex);

  // 先更新页面顺序，让拖拽立即生效
  setGames((currentGames) => {
    const otherGames = currentGames.filter(
      (game) => game.status !== "playing"
    );

    return [
      ...otherGames,
      ...reorderedGames.map((game, index) => ({
        ...game,
        sort_order: index + 1,
      })),
    ];
  });

  // 再把新顺序保存到数据库
  const results = await Promise.all(
    reorderedGames.map((game, index) =>
      supabase
        .from("game_chronicle")
        .update({ sort_order: index + 1 })
        .eq("id", game.id)
    )
  );

  const failed = results.find((result) => result.error);

  if (failed?.error) {
    console.error("保存拖拽排序失败：", failed.error);
    alert(`保存排序失败：${failed.error.message}`);
  }
}



async function handleBacklogDragEnd(event: any) {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const oldIndex = backlogGames.findIndex(
    (game) => game.id === active.id
  );
  const newIndex = backlogGames.findIndex(
    (game) => game.id === over.id
  );

  if (oldIndex === -1 || newIndex === -1) return;

  const reorderedGames = arrayMove(
    backlogGames,
    oldIndex,
    newIndex
  );

  // 只更新待玩分类的顺序，不影响其他分类
  const updatedGames = reorderedGames.map((game, index) => ({
    ...game,
    sort_order: index + 1,
  }));

  setGames((currentGames) => {
    const backlogIds = new Set(
      updatedGames.map((game) => game.id)
    );

    return [
      ...currentGames.filter((game) => !backlogIds.has(game.id)),
      ...updatedGames,
    ];
  });

  // 保存每款待玩游戏的新顺序
  for (let index = 0; index < updatedGames.length; index++) {
    const game = updatedGames[index];

    const { error } = await supabase
      .from("game_chronicle")
      .update({ sort_order: index + 1 })
      .eq("id", game.id);

    if (error) {
      console.error("保存待玩游戏排序失败：", error);
      alert(`保存排序失败：${error.message}`);
      return;
    }
  }
}

  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
  async function loadGames() {
    const { data, error } = await supabase
      .from("game_chronicle")
      .select("*")
      .order("sort_order", { ascending: true })
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
  console.error("封面上传错误详情：", uploadError);
  console.error("错误信息：", uploadError.message);
  console.error("错误名称：", uploadError.name);
  console.error(
    "错误状态码：",
    "statusCode" in uploadError ? uploadError.statusCode : "无"
  );

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

  function openEditGame(game: Game) {
    setEditingGame(game);
    setEditTitle(game.title);
    setEditCover(game.cover_url ?? "");
    setEditCoverFile(null);
    setEditStatus(game.status);
    setEditProgress(String(game.progress ?? 0));
    setEditCompletedAt(game.completed_at ?? "");
    setShowEditGame(true);
  }

  async function saveEditedGame() {
  if (!editingGame) return;

  if (!editTitle.trim()) {
    alert("请输入游戏名称。");
    return;
  }

  const progressValue = Number(editProgress);

  if (
    editStatus === "playing" &&
    (!Number.isInteger(progressValue) ||
      progressValue < 0 ||
      progressValue > 100)
  ) {
    alert("请输入 0 到 100 之间的整数。");
    return;
  }

  setSavingEdit(true);

  let coverUrl = editCover.trim() || null;

  if (editCoverFile) {
    const fileExt = editCoverFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("game-covers")
      .upload(fileName, editCoverFile, {
        contentType: editCoverFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Cover upload error:", uploadError);
      alert(`封面上传失败：${uploadError.message}`);
      setSavingEdit(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("game-covers")
      .getPublicUrl(fileName);

    coverUrl = publicUrlData.publicUrl;
  }

  const finalStatus =
    editStatus === "playing" && progressValue === 100
      ? "completed"
      : editStatus;

  const finalProgress =
    finalStatus === "completed"
      ? 100
      : finalStatus === "playing"
        ? progressValue
        : null;

  const finalCompletedAt =
    finalStatus === "completed"
      ? editCompletedAt || editingGame.completed_at || new Date().toLocaleDateString("en-CA")
      : null;

  const { data, error } = await supabase
    .from("game_chronicle")
    .update({
      title: editTitle.trim(),
      cover_url: coverUrl,
      status: finalStatus,
      progress: finalProgress,
      completed_at: finalCompletedAt,
    })
    .eq("id", editingGame.id)
    .select()

  if (error) {
    console.error("Edit game error:", error);
    alert(`保存失败：${error.message}`);
    setSavingEdit(false);
    return;
  }

  setGames((currentGames) =>
  currentGames.map((game) =>
    game.id === editingGame.id
      ? ((data?.[0] as Game) ?? game)
      : game
  )
);

  setShowEditGame(false);
  setEditingGame(null);
  setEditCoverFile(null);
  setSavingEdit(false);
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
    let key = "未知日期";

    if (game.completed_at) {
      const [year, month] = game.completed_at.split("-");

      if (year && month) {
        key = `${year}年${Number(month)}月`;
      }
    }

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

  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handlePlayingDragEnd}
  >
    <SortableContext
      items={playingGames.map((game) => game.id)}
      strategy={rectSortingStrategy}
    >
      <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
        {playingGames.map((game) => (
          <SortableGameCard key={game.id} game={game}>
            <GameCard
              title={game.title}
              cover={game.cover_url}
              progress={game.progress}
              onEdit={() => openEditGame(game)}
              onEditProgress={() => {
                setEditingGame(game);
                setProgressInput(String(game.progress ?? 0));
              }}
              onDelete={() => setDeletingGame(game)}
            />
          </SortableGameCard>
        ))}
      </div>
    </SortableContext>
  </DndContext>
</section>

        
{/* Backlog */}
<section id="backlog" className="mb-14">
  <SectionTitle
    title="待玩"
    label="BACKLOG"
    count={backlogGames.length}
  />

  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleBacklogDragEnd}
  >
    <SortableContext
      items={backlogGames.map((game) => game.id)}
      strategy={rectSortingStrategy}
    >
      <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
        {backlogGames.map((game) => (
          <SortableGameCard key={game.id} game={game}>
            <GameCard
              title={game.title}
              cover={game.cover_url}
              onEdit={() => openEditGame(game)}
              onDelete={() => setDeletingGame(game)}
            />
          </SortableGameCard>
        ))}
      </div>
    </SortableContext>
  </DndContext>
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

              <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
                {monthGames.map((game) => (
                  <GameCard
                    key={game.id}
                    title={game.title}
                    cover={game.cover_url}
                    progress={null}
                    onEdit={() => openEditGame(game)}
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

      
{showEditGame && editingGame && (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-6 py-8">
    <div className="my-auto w-full max-w-lg rounded-lg border border-[#2a2e35] bg-[#20242b] p-6 shadow-2xl">
      <h2 className="text-lg font-semibold text-white">
        编辑游戏资料
      </h2>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm text-[#c7d5e0]">
            游戏名称
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded border border-[#363c45] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-[#c7d5e0]">
            更换封面图片
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setEditCoverFile(e.target.files?.[0] ?? null)
            }
            className="w-full text-sm text-[#c7d5e0] file:mr-3 file:rounded file:border-0 file:bg-[#363c45] file:px-3 file:py-2 file:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-[#c7d5e0]">
            或输入封面图片 URL
          </label>
          <input
            type="url"
            value={editCover}
            onChange={(e) => {
              setEditCover(e.target.value);
              setEditCoverFile(null);
            }}
            placeholder="https://..."
            className="w-full rounded border border-[#363c45] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
          />
        </div>

        {editCover && (
          <div>
            <p className="mb-2 text-sm text-[#c7d5e0]">当前封面预览</p >
            <img
              src={editCover}
              alt="封面预览"
              className="h-40 rounded object-contain"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-[#c7d5e0]">
            游戏状态
          </label>
          <select
            value={editStatus}
            onChange={(e) =>
              setEditStatus(
                e.target.value as "playing" | "backlog" | "completed"
              )
            }
            className="w-full rounded border border-[#363c45] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
          >
            <option value="playing">当前游戏</option>
            <option value="backlog">待玩</option>
            <option value="completed">已通关</option>
          </select>
        </div>

        {editStatus === "playing" && (
          <div>
            <label className="mb-2 block text-sm text-[#c7d5e0]">
              游戏进度（0–100）
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={editProgress}
              onChange={(e) => setEditProgress(e.target.value)}
              className="w-full rounded border border-[#363c45] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
            />
          </div>
        )}

        {editStatus === "completed" && (
          <div>
            <label className="mb-2 block text-sm text-[#c7d5e0]">
              通关日期
            </label>
            <input
              type="date"
              value={editCompletedAt}
              onChange={(e) => setEditCompletedAt(e.target.value)}
              className="w-full rounded border border-[#363c45] bg-[#171a21] px-3 py-2 text-sm text-white outline-none focus:border-[#66c0f4]"
            />
          </div>
        )}
      </div>

      <div className="mt-7 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setShowEditGame(false);
            setEditingGame(null);
            setEditCoverFile(null);
          }}
          disabled={savingEdit}
          className="rounded bg-[#2a2e35] px-4 py-2 text-sm text-[#c7d5e0] transition hover:bg-[#363c45] disabled:opacity-50"
        >
          取消
        </button>

        <button
          type="button"
          onClick={saveEditedGame}
          disabled={savingEdit}
          className="rounded bg-[#1a9fff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1687d9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingEdit ? "保存中……" : "保存修改"}
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