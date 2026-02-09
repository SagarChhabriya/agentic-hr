import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function CustomQuestionsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [questions, setQuestions] = useState([
    {
      id: 1,
      question: 'Why are you interested in this position?',
      type: 'TEXT',
      required: true,
    },
    {
      id: 2,
      question: 'What is your expected salary range?',
      type: 'TEXT',
      required: false,
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    type: 'TEXT',
    required: false,
  });

  const handleAdd = () => {
    if (formData.question.trim()) {
      const newQuestion = {
        id: Date.now(),
        question: formData.question,
        type: formData.type,
        required: formData.required,
      };
      setQuestions([...questions, newQuestion]);
      setFormData({ question: '', type: 'TEXT', required: false });
      setShowAddForm(false);
    }
  };

  const handleEdit = (question) => {
    setEditingId(question.id);
    setFormData({
      question: question.question,
      type: question.type,
      required: question.required,
    });
    setShowAddForm(true);
  };

  const handleUpdate = () => {
    if (formData.question.trim()) {
      setQuestions(
        questions.map((q) =>
          q.id === editingId
            ? { ...q, question: formData.question, type: formData.type, required: formData.required }
            : q
        )
      );
      setFormData({ question: '', type: 'TEXT', required: false });
      setEditingId(null);
      setShowAddForm(false);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const handleAIGenerate = async () => {
    // TODO: Call AI service to generate questions
    alert('AI question generation coming soon!');
  };

  return (
    <div className={`px-4 py-8 max-w-4xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Custom Questions</h1>
        <p className="text-sm opacity-75">
          Manage custom questions that candidates will answer during job applications
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({ question: '', type: 'TEXT', required: false });
          }}
          className={`px-4 py-2 rounded-lg font-medium ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          + Add Question
        </button>
        <button
          onClick={handleAIGenerate}
          className={`px-4 py-2 rounded-lg font-medium border ${
            isDark
              ? 'border-slate-600 bg-slate-800 hover:bg-slate-700'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
        >
          🤖 AI Generate Questions
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div
          className={`rounded-lg border p-6 mb-6 ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
          }`}
        >
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Question' : 'Add New Question'}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="question" className="block text-sm font-medium mb-1">
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                rows={3}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
                placeholder="Enter your question..."
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">
                Question Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`w-full rounded-md border px-3 py-2 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="TEXT">Text Answer</option>
                <option value="TEXTAREA">Long Text Answer</option>
                <option value="NUMBER">Number</option>
                <option value="YES_NO">Yes/No</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Required</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {editingId ? 'Update' : 'Add'} Question
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData({ question: '', type: 'TEXT', required: false });
                }}
                className={`px-4 py-2 rounded-lg font-medium border ${
                  isDark
                    ? 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div
            className={`rounded-lg border p-12 text-center ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}
          >
            <p className="text-lg opacity-75 mb-4">No questions yet</p>
            <p className="text-sm opacity-60">Click "Add Question" to create your first question</p>
          </div>
        ) : (
          questions.map((question) => (
            <div
              key={question.id}
              className={`rounded-lg border p-6 ${
                isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{question.question}</h3>
                    {question.required && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm opacity-75">
                    <span>Type: {question.type}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(question)}
                    className={`px-3 py-1 rounded text-sm font-medium border ${
                      isDark
                        ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="px-3 py-1 rounded text-sm font-medium border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
