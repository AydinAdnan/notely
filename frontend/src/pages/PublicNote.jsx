import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Eye, Loader2 } from 'lucide-react';

const PublicNote = () => {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/share/${token}`)
      .then((res) => setNote(res.data))
      .catch((err) => {
        const status = err.response?.status;
        if (status === 410) setError('This link has expired.');
        else if (status === 404) setError('Note not found. The link may be invalid or deleted.');
        else setError('Failed to load note.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-neu-bg p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-display font-bold">NoteZap</h1>
          <Link to="/login" className="btn btn-yellow !px-4 !py-2 !text-sm">
            Sign In to Edit
          </Link>
        </div>

        {loading && (
          <div className="card bg-neu-white flex items-center justify-center min-h-[300px]">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="card bg-neu-pink min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold mb-2">Oops!</h2>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {note && (
          <div className="card bg-neu-white min-h-[500px]">
            <div className="mb-8 border-b-neu border-neu-black pb-4">
              <h1 className="text-4xl font-display font-bold mb-4">{note.title || 'Untitled Note'}</h1>
              <div className="flex gap-4 text-sm font-bold text-neu-black/60 font-mono">
                <span className="flex items-center gap-1"><Eye size={14} /> {note.view_count} {note.view_count === 1 ? 'view' : 'views'}</span>
                <span>•</span>
                <span>Read Only</span>
              </div>
            </div>

            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: note.content || '<p>This note is empty.</p>' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicNote;
