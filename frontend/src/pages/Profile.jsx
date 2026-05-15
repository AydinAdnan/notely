import React, { useState } from 'react';
import Layout from '../components/Layout';
import useAuthStore from '../store/authStore';
import { Save, Check } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    const ok = await updateProfile({ name, bio });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-16 max-w-3xl w-full mx-auto">
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-6 sm:mb-8">My Profile</h1>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-neu-black bg-neu-cyan shadow-neu-sm shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${name || 'Felix'}&backgroundColor=transparent`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{name || 'Your Name'}</h2>
              <p className="text-gray-500 font-medium">{user?.email}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded border border-red-100 text-sm font-medium mb-4">{error}</div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block font-semibold mb-2 text-sm text-gray-700">Display Name</label>
              <input
                type="text"
                className="input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold mb-2 text-sm text-gray-700">About Me</label>
              <textarea
                className="input min-h-[120px] resize-y"
                placeholder="Write a short bio about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-blue flex items-center justify-center gap-2 px-6 w-full sm:w-auto disabled:opacity-50"
              >
                {saved ? <Check size={18} /> : <Save size={18} />}
                <span>{saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
