/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState } from 'react'
import { Calendar, Folder, FolderHeart, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export const BoardsPage: React.FC = () => {
  const { boards, createBoard, deleteBoard, setActiveBoardId } = useAppStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardDesc, setNewBoardDesc] = useState('')

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newBoardName.trim()) return

    await createBoard(newBoardName.trim(), newBoardDesc.trim())
    setNewBoardName('')
    setNewBoardDesc('')
    setShowCreateModal(false)
  }

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (window.confirm('确定删除这个看板吗? 看板内的图片素材不会被删除。')) {
      await deleteBoard(id)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white px-20 py-7">
      <div className="mb-9 flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-black">全部看板</h1>
          <p className="mt-2 text-[13px] text-gray-500">{boards.length} 看板</p>
          <p className="mt-4 text-[12px] text-gray-400">按主题收集不同风格、配色和姿势参考。</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-brand-500 px-3 text-[12px] font-medium text-white hover:bg-brand-600"
        >
          <Plus size={14} />
          新建看板
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="flex h-[420px] flex-col items-center justify-center text-center text-gray-400">
          <FolderHeart size={34} className="mb-4 text-gray-300" />
          <h3 className="text-[14px] font-medium text-gray-700">暂无看板</h3>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 text-[12px] text-brand-600 hover:underline"
          >
            点击新建一个主题看板
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,160px)] gap-x-10 gap-y-8">
          {boards.map((board) => (
            <button
              type="button"
              key={board.id}
              onClick={() => setActiveBoardId(board.id)}
              className="group rounded-md p-2 text-left transition-colors hover:bg-app-hover"
            >
              <div className="flex h-28 items-center justify-center rounded bg-[#F4F5F7] text-brand-500">
                <Folder size={42} strokeWidth={1.7} />
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-[12px] font-medium text-gray-800">{board.name}</h4>
                  <p className="mt-1 line-clamp-2 h-8 text-[11px] leading-4 text-gray-400">
                    {board.description || '暂无看板描述'}
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  title="删除看板"
                  onClick={(event) => handleDelete(board.id, event)}
                  className="rounded p-1 text-gray-300 opacity-0 hover:bg-white hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                <span>{board.assets.length} 张素材</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(board.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg border border-app-border bg-white p-5 shadow-xl">
            <h4 className="flex items-center gap-2 border-b border-app-border pb-3 text-[13px] font-semibold text-gray-800">
              <FolderHeart size={16} className="text-brand-500" />
              创建主题看板
            </h4>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[12px] text-gray-500">看板名称</label>
                <input
                  type="text"
                  required
                  value={newBoardName}
                  onChange={(event) => setNewBoardName(event.target.value)}
                  placeholder="例如: 夏季泳装动作参考"
                  className="h-8 w-full rounded-md px-2.5 text-[12px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] text-gray-500">看板描述</label>
                <textarea
                  value={newBoardDesc}
                  onChange={(event) => setNewBoardDesc(event.target.value)}
                  placeholder="输入这个看板的灵感定位或参考方向"
                  className="h-20 w-full resize-none rounded-md p-2.5 text-[12px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 rounded-md px-3 text-[12px] text-gray-600 hover:bg-app-hover"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-8 rounded-md bg-brand-500 px-4 text-[12px] font-medium text-white hover:bg-brand-600"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
