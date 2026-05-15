import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import useNotesStore from '../store/notesStore';
import {
  Bold, Italic, List, ListOrdered, Quote, Code,
  Heading1, Heading2, Wand2, X, Loader2, Check,
} from 'lucide-react';

// ── AI Rewrite Modal ──────────────────────────────────────────────────────────

const AI_MODES = [
  { id: 'improve', label: 'Improve Writing' },
  { id: 'simplify', label: 'Simplify' },
  { id: 'expand', label: 'Expand Content' },
  { id: 'bullets', label: 'Convert to Bullets' },
  { id: 'beginner', label: 'Explain for Beginners' },
  { id: 'professional', label: 'Professional Tone' },
  { id: 'grammar', label: 'Fix Grammar' },
];

const AIModal = ({ editor, onClose }) => {
  const { rewriteText } = useNotesStore();
  const [selectedMode, setSelectedMode] = useState('improve');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const getInputText = () => {
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    return hasSelection
      ? editor.state.doc.textBetween(from, to, ' ')
      : editor.getText();
  };

  const handleRewrite = async () => {
    const text = getInputText();
    if (!text.trim()) { setError('No text to rewrite.'); return; }
    setIsLoading(true); setError(''); setResult('');
    try {
      const out = await rewriteText(text, selectedMode);
      setResult(out);
    } catch (e) {
      setError(e.response?.data?.detail || 'AI service unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyResult = () => {
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    if (hasSelection) {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
    } else {
      editor.commands.setContent(result);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neu-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-neu-white border-neu border-neu-black shadow-neu-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b-neu border-neu-black">
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Wand2 size={20} /> AI Rewrite
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-medium text-gray-600">
            {editor.state.selection.from !== editor.state.selection.to
              ? 'Rewriting selected text.'
              : 'Rewriting entire note content.'}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {AI_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`p-2 text-sm font-bold border border-neu-black text-left transition-colors ${
                  selectedMode === m.id ? 'bg-neu-purple' : 'bg-white hover:bg-gray-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

          {result && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm font-medium max-h-40 overflow-y-auto">
              {result}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          {result ? (
            <>
              <button onClick={handleRewrite} className="btn btn-white !py-2 !text-sm flex items-center gap-2">
                <Wand2 size={14} /> Try Again
              </button>
              <button onClick={applyResult} className="btn btn-green !py-2 !text-sm flex items-center gap-2">
                <Check size={14} /> Apply
              </button>
            </>
          ) : (
            <button onClick={handleRewrite} disabled={isLoading} className="btn btn-purple !py-2 !text-sm flex items-center gap-2 disabled:opacity-50">
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {isLoading ? 'Rewriting...' : 'Rewrite'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── MenuBar ───────────────────────────────────────────────────────────────────

const MenuBar = ({ editor, onAIClick }) => {
  if (!editor) return null;

  const btn = (active) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`;
  const stop = (fn) => (e) => { e.preventDefault(); fn(); };

  return (
    <div className="flex flex-wrap items-center gap-1 mb-8 pb-4 border-b border-gray-100">
      <button onClick={stop(() => editor.chain().focus().toggleHeading({ level: 1 }).run())} className={btn(editor.isActive('heading', { level: 1 }))} title="Heading 1"><Heading1 size={18} /></button>
      <button onClick={stop(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} className={btn(editor.isActive('heading', { level: 2 }))} title="Heading 2"><Heading2 size={18} /></button>
      <div className="w-px h-5 bg-gray-200 mx-2" />
      <button onClick={stop(() => editor.chain().focus().toggleBold().run())} className={btn(editor.isActive('bold'))} title="Bold"><Bold size={18} /></button>
      <button onClick={stop(() => editor.chain().focus().toggleItalic().run())} className={btn(editor.isActive('italic'))} title="Italic"><Italic size={18} /></button>
      <div className="w-px h-5 bg-gray-200 mx-2" />
      <button onClick={stop(() => editor.chain().focus().toggleBulletList().run())} className={btn(editor.isActive('bulletList'))} title="Bullet List"><List size={18} /></button>
      <button onClick={stop(() => editor.chain().focus().toggleOrderedList().run())} className={btn(editor.isActive('orderedList'))} title="Ordered List"><ListOrdered size={18} /></button>
      <div className="w-px bg-neu-black mx-1" />
      <button onClick={stop(() => editor.chain().focus().toggleBlockquote().run())} className={btn(editor.isActive('blockquote'))} title="Quote"><Quote size={18} /></button>
      <button onClick={stop(() => editor.chain().focus().toggleCodeBlock().run())} className={btn(editor.isActive('codeBlock'))} title="Code Block"><Code size={18} /></button>
      <div className="flex-1" />
      <button
        onClick={onAIClick}
        className="flex items-center gap-2 p-2 px-4 border border-neu-black bg-neu-purple hover:bg-neu-purple/80 shadow-neu-sm font-bold text-sm transition-transform active:translate-y-1 active:shadow-none"
        title="AI Rewrite"
      >
        <Wand2 size={16} />
        <span>Rewrite</span>
      </button>
    </div>
  );
};

// ── Editor ────────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 2000;

const Editor = () => {
  const { notes, activeNoteId, updateNote, isSaving } = useNotesStore();
  const activeNote = notes.find((n) => n.id === activeNoteId);
  const [title, setTitle] = useState('');
  const [showAI, setShowAI] = useState(false);
  const saveTimer = useRef(null);

  const debouncedSave = useCallback(
    (id, updates) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateNote(id, updates), AUTOSAVE_DELAY);
    },
    [updateNote]
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      if (activeNoteId) {
        debouncedSave(activeNoteId, { content: editor.getHTML() });
      }
    },
  });

  useEffect(() => {
    if (activeNote && editor) {
      setTitle(activeNote.title);
      if (editor.getHTML() !== activeNote.content) {
        editor.commands.setContent(activeNote.content);
      }
    } else if (!activeNote && editor) {
      setTitle('');
      editor.commands.setContent('');
    }
  }, [activeNoteId, editor]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (activeNoteId) debouncedSave(activeNoteId, { title: e.target.value });
  };

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neu-white">
        <div className="text-center max-w-sm">
          <div className="bg-neu-yellow border-neu border-neu-black p-6 shadow-neu rotate-[-2deg]">
            <h2 className="text-2xl font-display font-bold mb-2">No Note Selected</h2>
            <p className="font-medium">Select a note from the sidebar or create a new one to start writing.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {showAI && editor && <AIModal editor={editor} onClose={() => setShowAI(false)} />}

      {/* Autosave indicator */}
      {isSaving && (
        <div className="absolute top-3 right-4 text-xs text-gray-400 font-medium flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Saving…
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-16 max-w-4xl w-full mx-auto">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note Title..."
          className="text-5xl font-display font-bold w-full outline-none bg-transparent mb-8 placeholder-neu-black/30"
        />
        <MenuBar editor={editor} onAIClick={() => setShowAI(true)} />
        <div className="prose max-w-none">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default Editor;
