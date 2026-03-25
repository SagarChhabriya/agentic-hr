import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { customQuestionsApi } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';

const TYPE_LABELS = {
  TEXT: 'Short text',
  TEXTAREA: 'Long text',
  NUMBER: 'Number',
  YES_NO: 'Yes / No',
  OBJECTIVE: 'MCQ',
};

const TYPE_BADGE = {
  TEXT:      'bg-sky-50     text-sky-700   dark:bg-sky-900/20   dark:text-sky-400',
  TEXTAREA:  'bg-violet-50  text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  NUMBER:    'bg-amber-50   text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  YES_NO:    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  OBJECTIVE: 'bg-rose-50    text-rose-700  dark:bg-rose-900/20  dark:text-rose-400',
};

const inputCls = (isDark) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500/30 ${
    isDark
      ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-500'
      : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
  }`;

export default function CustomQuestionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['customQuestions'],
    queryFn: customQuestionsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: customQuestionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customQuestions'] });
      resetForm();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => customQuestionsApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customQuestions'] });
      resetForm();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: customQuestionsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customQuestions'] }),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ question: '', type: 'TEXT', required: false });
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const resetForm = () => {
    setFormData({ question: '', type: 'TEXT', required: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (q) => {
    setEditingId(q.id);
    setFormData({ question: q.question, type: q.type, required: q.required });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.question.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: { question: formData.question, type: formData.type, required: formData.required } });
    } else {
      createMutation.mutate({ question: formData.question, type: formData.type, required: formData.required });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Custom Questions"
        subtitle="Questions shown to candidates when they apply"
        badge={questions.length}
        actions={
          <button
            onClick={() => { resetForm(); setShowForm((v) => !v); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </button>
        }
      />

      {/* Inline form */}
      {showForm && (
        <div className={`rounded-xl border mb-6 ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <h2 className="text-sm font-semibold">{editingId ? 'Edit Question' : 'New Question'}</h2>
            <button onClick={resetForm}
              className={`p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-400 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-slate-400">
                Question <span className="text-red-400">*</span>
              </label>
              <textarea value={formData.question} rows={3}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className={`${inputCls(isDark)} resize-none`}
                placeholder="Enter your question…" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-500 dark:text-slate-400">Answer Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={inputCls(isDark)}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600" />
                  <span className="text-sm">Required</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isPending || !formData.question.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                {isPending ? 'Saving…' : editingId ? 'Update Question' : 'Add Question'}
              </button>
              <button onClick={resetForm}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <table className="w-full text-sm">
          <thead className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-200'}`}>
            <tr>
              {['Question', 'Type', 'Required', ''].map((h) => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-700 bg-slate-800/50' : 'divide-gray-100 bg-white'}`}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {[60, 20, 10, 10].map((w, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse bg-gray-200 dark:bg-slate-700" style={{ width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan="4">
                  <div className="py-16 text-center">
                    <svg className="mx-auto w-10 h-10 mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">No questions yet</p>
                    <button onClick={() => setShowForm(true)}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                      Add your first question →
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className={`group transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                  <td className={`px-4 py-3 font-medium max-w-xs truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                    {q.question}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[q.type] || ''}`}>
                      {TYPE_LABELS[q.type] || q.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {q.required
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">Required</span>
                      : <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Optional</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(q)}
                        className={`text-xs font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                        Edit
                      </button>
                      <span className={`${isDark ? 'text-slate-600' : 'text-gray-300'}`}>·</span>
                      <button type="button" onClick={() => setDeleteTargetId(q.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-600">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete this question?"
        message="This removes the question from your library. Jobs that already reference it may be affected."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        pending={deleteMutation.isPending}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (!deleteTargetId) return;
          deleteMutation.mutate(deleteTargetId, {
            onSettled: () => setDeleteTargetId(null),
          });
        }}
      />
    </div>
  );
}
