import { useState, useEffect } from 'react';
import { Calendar, Download, Loader2, Trash2, Edit2, Save, X } from 'lucide-react';
import { getDiaryEntries, updateDiaryEntry, deleteDiaryEntry, exportDiaryToCSV, downloadCSV, DiaryEntry } from '../lib/farmDiary';

export function FarmDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTreatment, setEditTreatment] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await getDiaryEntries();
      setEntries(data);
    } catch (error) {
      console.error('Failed to load diary entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setEditNotes(entry.notes);
    setEditTreatment(entry.treatment_applied);
  };

  const handleSaveEdit = async (entryId: string) => {
    try {
      await updateDiaryEntry(entryId, {
        notes: editNotes,
        treatment_applied: editTreatment,
      });
      await loadEntries();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
      alert('Failed to update entry');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNotes('');
    setEditTreatment('');
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteDiaryEntry(entryId);
      await loadEntries();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  };

  const handleExport = () => {
    const csv = exportDiaryToCSV(entries);
    const filename = `farm-diary-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Farm Diary</h2>
          <p className="text-gray-600">Track your crop observations and treatments</p>
        </div>

        {entries.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No entries yet</h3>
          <p className="text-gray-600">
            Start detecting diseases and save them to your farm diary
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{entry.disease_name}</h3>
                    <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {entry.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {entry.crop_name} • {new Date(entry.observation_date).toLocaleDateString()}
                  </p>
                </div>

                {editingId !== entry.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {editingId === entry.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      placeholder="Add your observations..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Treatment Applied
                    </label>
                    <textarea
                      value={editTreatment}
                      onChange={(e) => setEditTreatment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={2}
                      placeholder="Describe treatments applied..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(entry.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {entry.notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
                      <p className="text-gray-600 text-sm">{entry.notes}</p>
                    </div>
                  )}

                  {entry.treatment_applied && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Treatment Applied</h4>
                      <p className="text-gray-600 text-sm">{entry.treatment_applied}</p>
                    </div>
                  )}

                  {!entry.notes && !entry.treatment_applied && (
                    <p className="text-gray-400 text-sm italic">No notes or treatments recorded</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
