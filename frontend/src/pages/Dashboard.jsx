import React from 'react';
import Layout from '../components/Layout';
import StickyNotesGrid from '../components/StickyNotesGrid';
import Editor from '../components/Editor';
import useNotesStore from '../store/notesStore';

const Dashboard = () => {
  const { activeNoteId } = useNotesStore();

  return (
    <Layout>
      {activeNoteId ? <Editor /> : <StickyNotesGrid />}
    </Layout>
  );
};

export default Dashboard;
