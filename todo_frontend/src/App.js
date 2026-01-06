import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'kavia_todos_v1';

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} title
 * @property {boolean} completed
 * @property {number} createdAt
 */

/**
 * Generates a reasonably unique id without adding dependencies.
 * Prefers crypto.randomUUID when available.
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `todo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Safely loads todos from localStorage.
 * @returns {Todo[]}
 */
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({
        id: typeof t.id === 'string' ? t.id : generateId(),
        title: typeof t.title === 'string' ? t.title : '',
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
      }))
      .filter((t) => t.title.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Persists todos to localStorage.
 * @param {Todo[]} todos
 */
function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// PUBLIC_INTERFACE
function App() {
  /** Light/dark mode kept from template, with improved UI shell. */
  const [theme, setTheme] = useState('light');

  /** Core todos state. */
  const [todos, setTodos] = useState(() => loadTodos());

  /** Form state (supports add and edit). */
  const [draftTitle, setDraftTitle] = useState('');
  const [editingId, setEditingId] = useState(null);

  /** Simple filter for list. */
  const [filter, setFilter] = useState('all'); // all | active | completed

  /** Animations: track ids that are leaving so we can play an exit animation. */
  const [leavingIds, setLeavingIds] = useState(() => new Set());

  const inputRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const filteredTodos = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  const remainingCount = useMemo(() => todos.filter((t) => !t.completed).length, [todos]);
  const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  function resetForm() {
    setDraftTitle('');
    setEditingId(null);
  }

  function beginEdit(todo) {
    setEditingId(todo.id);
    setDraftTitle(todo.title);
    // Focus next tick so the input is ready.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSubmit(e) {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;

    if (editingId) {
      setTodos((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, title } : t))
      );
      resetForm();
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    /** Add flow */
    const newTodo = {
      id: generateId(),
      title,
      completed: false,
      createdAt: Date.now(),
    };

    setTodos((prev) => [newTodo, ...prev]);
    setDraftTitle('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function toggleCompleted(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function clearCompleted() {
    const completed = todos.filter((t) => t.completed);
    if (completed.length === 0) return;

    // Play exit animation for completed items, then remove.
    const ids = completed.map((t) => t.id);
    setLeavingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    window.setTimeout(() => {
      setTodos((prev) => prev.filter((t) => !t.completed));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 180);
  }

  function removeTodo(id) {
    setLeavingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    window.setTimeout(() => {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 180);
  }

  function markAllCompleted() {
    if (todos.length === 0) return;
    setTodos((prev) => prev.map((t) => ({ ...t, completed: true })));
  }

  function markAllActive() {
    if (todos.length === 0) return;
    setTodos((prev) => prev.map((t) => ({ ...t, completed: false })));
  }

  return (
    <div className="App">
      <header className="Header">
        <div className="Shell">
          <div className="HeaderRow">
            <div className="HeaderText">
              <h1 className="Title">Todo</h1>
              <p className="Subtitle">Fast, local, and clean — with an orange glow.</p>
            </div>

            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              type="button"
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>

          <div className="StatsRow" role="status" aria-live="polite">
            <span className="Stat">
              <span className="StatLabel">Remaining</span>
              <span className="StatValue">{remainingCount}</span>
            </span>
            <span className="StatDivider" aria-hidden="true" />
            <span className="Stat">
              <span className="StatLabel">Completed</span>
              <span className="StatValue">{completedCount}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="Main">
        <div className="Shell">
          <section className="Card" aria-label="Todo list">
            <div className="CardHeader">
              <div className="FilterPills" role="tablist" aria-label="Filter todos">
                <button
                  type="button"
                  className={`Pill ${filter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilter('all')}
                  aria-pressed={filter === 'all'}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`Pill ${filter === 'active' ? 'is-active' : ''}`}
                  onClick={() => setFilter('active')}
                  aria-pressed={filter === 'active'}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`Pill ${filter === 'completed' ? 'is-active' : ''}`}
                  onClick={() => setFilter('completed')}
                  aria-pressed={filter === 'completed'}
                >
                  Completed
                </button>
              </div>

              <div className="QuickActions">
                <button type="button" className="btn btn-ghost" onClick={markAllCompleted}>
                  Mark all done
                </button>
                <button type="button" className="btn btn-ghost" onClick={markAllActive}>
                  Mark all active
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={clearCompleted}
                  disabled={completedCount === 0}
                >
                  Clear done
                </button>
              </div>
            </div>

            <form className="FormRow" onSubmit={handleSubmit} aria-label="Add or edit a todo">
              <div className="InputGroup">
                <label className="sr-only" htmlFor="todoTitle">
                  Todo title
                </label>
                <input
                  ref={inputRef}
                  id="todoTitle"
                  className="Input"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder={editingId ? 'Edit todo title…' : 'Add a new todo…'}
                  autoComplete="off"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                {editingId ? 'Save' : 'Add'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    resetForm();
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </form>

            <ul className="TodoList" aria-label="Todos">
              {filteredTodos.length === 0 ? (
                <li className="EmptyState">
                  <p className="EmptyTitle">No todos here.</p>
                  <p className="EmptyHint">Add one above to get started.</p>
                </li>
              ) : (
                filteredTodos.map((todo) => {
                  const isLeaving = leavingIds.has(todo.id);
                  return (
                    <li
                      key={todo.id}
                      className={`TodoItem ${todo.completed ? 'is-completed' : ''} ${
                        isLeaving ? 'is-leaving' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={`Check ${todo.completed ? 'is-checked' : ''}`}
                        onClick={() => toggleCompleted(todo.id)}
                        aria-label={todo.completed ? 'Mark as not completed' : 'Mark as completed'}
                        aria-pressed={todo.completed}
                      >
                        <span className="CheckMark" aria-hidden="true">
                          ✓
                        </span>
                      </button>

                      <div className="TodoBody">
                        <div className="TodoTitleRow">
                          <span className="TodoTitle">{todo.title}</span>
                        </div>
                        <span className="TodoMeta">
                          {new Date(todo.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="TodoActions">
                        <button
                          type="button"
                          className="IconBtn"
                          onClick={() => beginEdit(todo)}
                          aria-label={`Edit ${todo.title}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="IconBtn IconBtnDanger"
                          onClick={() => removeTodo(todo.id)}
                          aria-label={`Delete ${todo.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <footer className="Footer">
            <span className="FooterText">
              Tip: Use the theme toggle to see the orange accents adapt to dark mode.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
