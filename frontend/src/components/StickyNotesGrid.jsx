import React, { useMemo, useState } from 'react';
import useNotesStore from '../store/notesStore';
import useWorkspacesStore from '../store/workspacesStore';
import { Pin, Trash2, Plus, Users, Globe, Eye, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const NoteCard = ({ note, index, onOpen, onDelete, onPin, readOnly = false }) => {
  const tilt = useMemo(() => {
    const tilts = ['rotate-[-2deg]', 'rotate-[2deg]', 'rotate-[-1deg]', 'rotate-[1deg]', 'rotate-0'];
    return tilts[index % tilts.length];
  }, [index]);

  return (
    <div
      onClick={() => onOpen(note.id)}
      className={clsx(
        'p-6 border-neu border-neu-black shadow-neu cursor-pointer transition-transform hover:z-10 hover:scale-105 group flex flex-col min-h-[250px]',
        note.color || 'bg-neu-yellow',
        tilt
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-display font-bold text-2xl leading-tight pr-8">{note.title || 'Untitled Note'}</h3>
        {!readOnly && (
          <div className="flex gap-2 absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onPin(note.id); }}
              className="p-2 hover:bg-neu-white border border-transparent hover:border-neu-black rounded shadow-neu-sm active:translate-y-px active:shadow-none bg-neu-white/50"
              title="Pin Note"
            >
              <Pin size={18} className={note.isPinned ? 'fill-neu-black' : ''} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
              className="p-2 hover:bg-neu-red hover:text-neu-white border border-transparent hover:border-neu-black rounded shadow-neu-sm active:translate-y-px active:shadow-none bg-neu-white/50"
              title="Delete Note"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <p className="text-neu-black/80 font-medium mb-auto flex-1 overflow-hidden">
        {(note.content || '').replace(/<[^>]+>/g, '') || 'Empty note...'}
      </p>

      <div className="text-sm font-mono font-bold text-neu-black border-t-neu-thin border-neu-black/20 pt-3 mt-4 flex items-center justify-between">
        <span>{formatDate(note.updatedAt || note.updated_at)}</span>
        <div className="flex items-center gap-2">
          {note.publicToken && <Globe size={12} className="text-neu-black/60" title="Public link active" />}
          {note.isPinned && <Pin size={14} className="fill-neu-black" />}
        </div>
      </div>
    </div>
  );
};

// Shared-with-me card (read-only, different shape)
const SharedCard = ({ item, index }) => {
  const { setActiveNote, upsertNote } = useNotesStore();
  const note = item.note;
  const tilt = useMemo(() => {
    const tilts = ['rotate-[-2deg]', 'rotate-[2deg]', 'rotate-[-1deg]', 'rotate-[1deg]', 'rotate-0'];
    return tilts[index % tilts.length];
  }, [index]);

  const handleOpen = () => {
    upsertNote(note);
    setActiveNote(note.id);
  };

  return (
    <div
      onClick={handleOpen}
      className={clsx(
        'p-6 border-neu border-neu-black shadow-neu cursor-pointer transition-transform hover:z-10 hover:scale-105 flex flex-col min-h-[250px]',
        note.color || 'bg-neu-cyan',
        tilt
      )}
    >
      <h3 className="font-display font-bold text-2xl leading-tight mb-2">{note.title || 'Untitled'}</h3>
      <p className="text-xs font-bold text-neu-black/50 mb-3 flex items-center gap-1">
        <Users size={12} /> Shared by {item.owner?.name || item.owner?.email}
      </p>
      <p className="text-neu-black/80 font-medium mb-auto flex-1 overflow-hidden">
        {(note.content || '').replace(/<[^>]+>/g, '') || 'Empty note...'}
      </p>
      <div className="text-sm font-mono font-bold text-neu-black border-t-neu-thin border-neu-black/20 pt-3 mt-4">
        {formatDate(note.updated_at)}
      </div>
    </div>
  );
};

const StickyNotesGrid = () => {
  const { notes, sharedWithMe, currentView, setActiveNote, deleteNote, togglePin, addNote, isLoading, error } = useNotesStore();
  const { workspaces, activeWorkspaceId } = useWorkspacesStore();
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddNote = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await addNote(currentView === 'workspace' ? activeWorkspaceId : null);
    } finally {
      setIsCreating(false);
    }
  };

  const publicNotes = notes.filter((n) => n.publicToken);
  const recentNotes = [...notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 10);

  const renderEmpty = (label) => (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="bg-neu-yellow border-neu border-neu-black p-6 shadow-neu rotate-[-2deg] max-w-sm">
        <h2 className="text-xl font-display font-bold mb-2">{label}</h2>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 bg-neu-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl font-display font-bold">
            {currentView === 'workspace' && (activeWorkspace?.name || 'Workspace')}
            {currentView === 'all' && 'All Notes'}
            {currentView === 'recent' && 'Recent Notes'}
            {currentView === 'shared' && 'Shared with Me'}
            {currentView === 'public' && 'Public Links'}
          </h2>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-400 p-4 flex items-center justify-between">
            <p className="font-bold text-red-700 text-sm">{error}</p>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="bg-neu-yellow border-neu border-neu-black p-6 shadow-neu rotate-[-1deg]">
              <p className="font-display font-bold text-lg">Loading notes…</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">

            {/* Workspace / All notes view */}
            {(currentView === 'all' || currentView === 'workspace') && (
              <>
                <div
                  onClick={handleAddNote}
                  className={clsx(
                    'p-6 border-neu-thick border-dashed border-neu-black/30 bg-neu-black/5 transition-all flex flex-col items-center justify-center min-h-[250px] shadow-none',
                    isCreating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-neu-yellow/20 hover:border-neu-black hover:border-solid cursor-pointer hover:shadow-neu'
                  )}
                >
                  <div className="w-16 h-16 rounded-full bg-neu-white border-neu border-neu-black flex items-center justify-center mb-4 shadow-neu-sm">
                    {isCreating ? <Loader2 size={28} className="animate-spin" /> : <Plus size={32} />}
                  </div>
                  <h3 className="font-display font-bold text-xl text-center">
                    {isCreating ? 'Creating…' : 'Create New Note'}
                  </h3>
                </div>
                {[...notes]
                  .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                  .map((note, i) => (
                    <NoteCard key={note.id} note={note} index={i} onOpen={setActiveNote} onDelete={deleteNote} onPin={togglePin} />
                  ))}
                {notes.length === 0 && renderEmpty('No notes yet. Create your first note!')}
              </>
            )}

            {/* Recent view */}
            {currentView === 'recent' && (
              <>
                {recentNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={i} onOpen={setActiveNote} onDelete={deleteNote} onPin={togglePin} />
                ))}
                {recentNotes.length === 0 && renderEmpty('No recent notes.')}
              </>
            )}

            {/* Shared with me view */}
            {currentView === 'shared' && (
              <>
                {sharedWithMe.map((item, i) => (
                  <SharedCard key={item.id} item={item} index={i} />
                ))}
                {sharedWithMe.length === 0 && renderEmpty('No notes shared with you yet.')}
              </>
            )}

            {/* Public links view */}
            {currentView === 'public' && (
              <>
                {publicNotes.map((note, i) => (
                  <div key={note.id} className="relative">
                    <NoteCard note={note} index={i} onOpen={setActiveNote} onDelete={deleteNote} onPin={togglePin} />
                    <div className="absolute bottom-2 left-2 right-2 bg-neu-white/90 border border-neu-black p-1 flex items-center gap-1 text-xs font-mono font-bold">
                      <Globe size={10} />
                      <span className="truncate">/share/{note.publicToken}</span>
                      <Eye size={10} className="ml-auto shrink-0" />
                    </div>
                  </div>
                ))}
                {publicNotes.length === 0 && renderEmpty('No public links yet. Open a note and click Share.')}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyNotesGrid;
