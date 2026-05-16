import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import useNotesStore from '../store/notesStore';
import useAuthStore from '../store/authStore';
import {
  Bold, Italic, List, ListOrdered, Quote, Code,
  Heading1, Heading2, Wand2, X, Loader2, Check, Strikethrough, Lock,
} from 'lucide-react';

// ── AI Right-Click Context Menu (streaming) ───────────────────────────────────

const AI_CONTEXT_MODES = [
  { id: 'improve',      label: 'Improve Writing' },
  { id: 'simplify',     label: 'Simplify' },
  { id: 'professional', label: 'Professional Tone' },
  { id: 'grammar',      label: 'Fix Grammar' },
  { id: 'expand',       label: 'Expand' },
  { id: 'bullets',      label: 'Convert to Bullets' },
];

const AIContextMenu = ({ x, y, editor, onClose }) => {
  const { rewriteTextStream } = useNotesStore();
  const [loading, setLoading] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
    }, 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const handleMode = async (modeId) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) { onClose(); return; }
    setLoading(modeId);
    try {
      const result = await rewriteTextStream(text, modeId, () => {});
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
    } catch {}
    onClose();
  };

  const menuW = 200;
  const menuH = AI_CONTEXT_MODES.length * 36 + 48;
  const left = x + menuW > window.innerWidth ? x - menuW : x;
  const top  = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left, top, zIndex: 9999 }}
      className="bg-white border-neu border-neu-black shadow-neu-lg py-1 min-w-[190px]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-gray-100 mb-1">
        <Wand2 size={12} className="text-neu-purple" />
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Rewrite</span>
      </div>
      {AI_CONTEXT_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => handleMode(m.id)}
          disabled={loading !== null}
          className="w-full text-left px-3 py-1.5 text-sm font-medium hover:bg-neu-purple/20 flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading === m.id
            ? <Loader2 size={13} className="animate-spin shrink-0 text-neu-purple" />
            : <span className="w-3.5 h-3.5 shrink-0" />}
          {m.label}
        </button>
      ))}
    </div>
  );
};

// ── AI Rewrite Modal (streaming) ──────────────────────────────────────────────

const AI_MODES = [
  { id: 'improve',      label: 'Improve Writing' },
  { id: 'simplify',     label: 'Simplify' },
  { id: 'expand',       label: 'Expand Content' },
  { id: 'bullets',      label: 'To Bullet Points' },
  { id: 'beginner',     label: 'Explain for Beginners' },
  { id: 'professional', label: 'Professional Tone' },
  { id: 'grammar',      label: 'Fix Grammar' },
];

const AIModal = ({ editor, onClose }) => {
  const { rewriteTextStream } = useNotesStore();
  const [selectedMode, setSelectedMode] = useState('improve');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const hasSelection = editor.state.selection.from !== editor.state.selection.to;

  const getInputText = () => {
    const { from, to } = editor.state.selection;
    return hasSelection
      ? editor.state.doc.textBetween(from, to, ' ')
      : editor.getText();
  };

  const handleRewrite = async () => {
    const text = getInputText();
    if (!text.trim()) { setError('No text to rewrite.'); return; }
    setIsLoading(true); setError(''); setResult('');
    try {
      await rewriteTextStream(text, selectedMode, (partial) => setResult(partial));
    } catch (e) {
      setError(e.message || 'AI service unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyResult = () => {
    const trimmed = result.trim();
    const { from, to } = editor.state.selection;
    if (hasSelection) {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, trimmed).run();
    } else {
      editor.commands.setContent(trimmed);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neu-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neu-white border-neu border-neu-black shadow-neu-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b-neu border-neu-black">
          <h2 className="font-display font-bold text-xl flex items-center gap-2"><Wand2 size={20} /> AI Rewrite</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-medium text-gray-500">
            {hasSelection ? 'Rewriting selected text.' : 'Rewriting entire note content.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {AI_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`p-2.5 text-sm font-bold border border-neu-black text-left transition-colors ${selectedMode === m.id ? 'bg-neu-purple' : 'bg-white hover:bg-gray-100'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
          {(result || isLoading) && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm font-medium max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed relative">
              {result || <span className="text-gray-400">Generating…</span>}
              {isLoading && (
                <span className="inline-block w-0.5 h-4 bg-gray-500 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          {result && !isLoading ? (
            <>
              <button onClick={handleRewrite} className="btn btn-white !py-2 !text-sm flex items-center gap-2"><Wand2 size={14} /> Try Again</button>
              <button onClick={applyResult} className="btn btn-green !py-2 !text-sm flex items-center gap-2"><Check size={14} /> Apply</button>
            </>
          ) : (
            <button onClick={handleRewrite} disabled={isLoading} className="btn btn-purple !py-2 !text-sm flex items-center gap-2 disabled:opacity-60">
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {isLoading ? 'Rewriting…' : 'Rewrite'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── MenuBar ───────────────────────────────────────────────────────────────────

const MenuBar = ({ editor, onAIClick, fontSize, onFontSizeChange }) => {
  if (!editor) return null;

  const btn = (active) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`;
  const run = (fn) => (e) => { e.preventDefault(); fn(); };
  const sep = <div className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />;

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <button onClick={run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())} className={btn(editor.isActive('heading', { level: 1 }))} title="Heading 1"><Heading1 size={16} /></button>
      <button onClick={run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} className={btn(editor.isActive('heading', { level: 2 }))} title="Heading 2"><Heading2 size={16} /></button>
      {sep}
      <button onClick={run(() => editor.chain().focus().toggleBold().run())} className={btn(editor.isActive('bold'))} title="Bold"><Bold size={16} /></button>
      <button onClick={run(() => editor.chain().focus().toggleItalic().run())} className={btn(editor.isActive('italic'))} title="Italic"><Italic size={16} /></button>
      <button onClick={run(() => editor.chain().focus().toggleStrike().run())} className={btn(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={16} /></button>
      {sep}
      <button onClick={run(() => editor.chain().focus().toggleBulletList().run())} className={btn(editor.isActive('bulletList'))} title="Bullet List"><List size={16} /></button>
      <button onClick={run(() => editor.chain().focus().toggleOrderedList().run())} className={btn(editor.isActive('orderedList'))} title="Ordered List"><ListOrdered size={16} /></button>
      {sep}
      <button onClick={run(() => editor.chain().focus().toggleBlockquote().run())} className={btn(editor.isActive('blockquote'))} title="Quote"><Quote size={16} /></button>
      <button onClick={run(() => editor.chain().focus().toggleCodeBlock().run())} className={btn(editor.isActive('codeBlock'))} title="Code Block"><Code size={16} /></button>
      {sep}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded px-1 py-0.5">
        <button onClick={() => onFontSizeChange(-2)} className="px-1 py-0.5 text-gray-500 hover:text-gray-900 font-bold text-xs leading-none" title="Decrease font size">A-</button>
        <span className="text-xs font-mono text-gray-500 w-6 text-center">{fontSize}</span>
        <button onClick={() => onFontSizeChange(2)} className="px-1 py-0.5 text-gray-500 hover:text-gray-900 font-bold text-sm leading-none" title="Increase font size">A+</button>
      </div>
      <div className="flex-1" />
      <button
        onClick={onAIClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-neu-purple border border-neu-black shadow-neu-sm text-sm font-bold hover:opacity-90 transition-all active:translate-y-px active:shadow-none shrink-0"
      >
        <Wand2 size={14} /> AI Rewrite
      </button>
    </div>
  );
};

// ── Editor ────────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 800;

const Editor = () => {
  const { notes, activeNoteId, updateNote, isSaving } = useNotesStore();
  const { user } = useAuthStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);
  const isReadOnly = !!(activeNote && user && activeNote.userId && activeNote.userId !== user.id);
  const [title, setTitle] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [saved, setSaved] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [fontSize, setFontSize] = useState(() => {
    const s = localStorage.getItem('editor-font-size');
    return s ? parseInt(s, 10) : 16;
  });

  const saveTimer = useRef(null);
  const pendingRef = useRef(null);

  const flushSave = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (pendingRef.current) {
      const { id, updates } = pendingRef.current;
      pendingRef.current = null;
      await updateNote(id, updates);
      setSaved(true);
    }
  }, [updateNote]);

  const debouncedSave = useCallback(
    (id, updates) => {
      setSaved(false);
      if (pendingRef.current?.id === id) {
        pendingRef.current.updates = { ...pendingRef.current.updates, ...updates };
      } else {
        pendingRef.current = { id, updates };
      }
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (pendingRef.current) {
          const { id: pId, updates: pUp } = pendingRef.current;
          pendingRef.current = null;
          await updateNote(pId, pUp);
          setSaved(true);
        }
      }, AUTOSAVE_DELAY);
    },
    [updateNote]
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      if (activeNoteId && !isReadOnly) debouncedSave(activeNoteId, { content: editor.getHTML() });
    },
  });

  // Sync editable state whenever the active note changes
  useEffect(() => {
    if (editor) editor.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  // Flush save when switching notes
  useEffect(() => {
    return () => { flushSave(); };
  }, [activeNoteId, flushSave]);

  // Ctrl+S
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); flushSave(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [flushSave]);

  // Warn before closing tab/window if there are unsaved changes
  useEffect(() => {
    const h = (e) => {
      if (!saved) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [saved]);

  // Load note
  useEffect(() => {
    if (activeNote && editor) {
      setTitle(activeNote.title);
      setSaved(true);
      if (editor.getHTML() !== activeNote.content) editor.commands.setContent(activeNote.content || '');
    } else if (!activeNote && editor) {
      setTitle('');
      editor.commands.setContent('');
    }
  }, [activeNoteId, editor]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleTitleChange = (e) => {
    if (isReadOnly) return;
    setTitle(e.target.value);
    if (activeNoteId) debouncedSave(activeNoteId, { title: e.target.value });
  };

  const handleFontSizeChange = (delta) => {
    setFontSize((prev) => {
      const next = Math.min(28, Math.max(12, prev + delta));
      localStorage.setItem('editor-font-size', String(next));
      return next;
    });
  };

  // Right-click context menu — only when text selected and note is editable
  const handleContextMenu = (e) => {
    if (!editor || isReadOnly) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const wordCount = editor ? editor.getText().split(/\s+/).filter(Boolean).length : 0;
  const charCount = editor ? editor.getText().length : 0;

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neu-bg">
        <div className="text-center max-w-sm px-4">
          <div className="bg-neu-yellow border-neu border-neu-black p-8 shadow-neu rotate-[-2deg]">
            <h2 className="text-2xl font-display font-bold mb-2">No Note Open</h2>
            <p className="font-medium text-neu-black/70">Select a note from the grid or create a new one.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {showAI && editor && <AIModal editor={editor} onClose={() => setShowAI(false)} />}
      {contextMenu && editor && (
        <AIContextMenu x={contextMenu.x} y={contextMenu.y} editor={editor} onClose={() => setContextMenu(null)} />
      )}

      {/* Sticky toolbar */}
      <div className="shrink-0 border-b border-gray-100 bg-white px-4 sm:px-8 py-2">
        {isReadOnly ? (
          <div className="flex items-center gap-2 py-1">
            <Lock size={13} className="text-gray-400 shrink-0" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Read only · Shared with you</span>
          </div>
        ) : (
          <MenuBar editor={editor} onAIClick={() => setShowAI(true)} fontSize={fontSize} onFontSizeChange={handleFontSizeChange} />
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" onContextMenu={handleContextMenu}>
        <div className="max-w-3xl mx-auto px-6 sm:px-12 lg:px-16 pt-10 pb-16">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            readOnly={isReadOnly}
            placeholder="Untitled"
            className={`text-4xl sm:text-5xl font-display font-bold w-full outline-none bg-transparent placeholder-gray-200 leading-tight mb-1 ${isReadOnly ? 'cursor-default select-text' : ''}`}
          />
          <div className="flex items-center gap-3 mb-8 mt-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-mono text-gray-300 shrink-0">
              {activeNote.updatedAt
                ? new Date(activeNote.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : ''}
            </span>
          </div>
          <div style={{ fontSize: `${fontSize}px` }} className={isReadOnly ? 'cursor-default' : ''}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 border-t border-gray-100 px-6 sm:px-12 lg:px-16 py-2 flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">
          {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} characters
        </span>
        <span className="text-xs flex items-center gap-1.5 font-medium">
          {isReadOnly ? (
            <><Lock size={11} className="text-gray-400" /><span className="text-gray-400">Read only</span></>
          ) : isSaving ? (
            <><Loader2 size={11} className="animate-spin text-gray-400" /><span className="text-gray-400">Saving…</span></>
          ) : saved ? (
            <><Check size={11} className="text-green-500" /><span className="text-gray-400">Saved</span></>
          ) : (
            <span className="text-gray-300">Unsaved</span>
          )}
        </span>
      </div>
    </div>
  );
};

export default Editor;
