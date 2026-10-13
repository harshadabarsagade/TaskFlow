import { useEffect, useState } from 'react'
import './App.css'

const API = 'http://localhost:5000/api'

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || ''
  )

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [tasks, setTasks] = useState([])
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [statusFilter, setStatusFilter] = useState('All')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function request(url, options = {}) {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.')
    }

    return data
  }

  // LOGIN AND REGISTER

  async function handleAuth(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const endpoint =
        mode === 'login' ? '/auth/login' : '/auth/register'

      const data = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(
          mode === 'login'
            ? { email, password }
            : { name, email, password }
        ),
      })

      if (mode === 'register') {
        setMessage('Registration successful! Please log in.')
        setMode('login')
        setPassword('')
      } else {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        setToken(data.token)
        setUser(data.user)
        setPassword('')
        setMessage('Login successful!')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // FETCH TASKS

  async function fetchTasks() {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const data = await request('/tasks')
      setTasks(Array.isArray(data) ? data : data.tasks || [])
    } catch (err) {
      setError(err.message)

      const errorText = err.message.toLowerCase()

      if (
        errorText.includes('token') ||
        errorText.includes('unauthorized')
      ) {
        handleLogout()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchTasks()
    }
  }, [token])

  // ADD TASK

  async function handleSaveTask(e) {
    e.preventDefault()

    if (!title.trim()) {
      setError('Please enter a task title.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await request('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
        }),
      })

      setTitle('')
      setDescription('')
      setPriority('Medium')
      setShowForm(false)
      setMessage('Task added successfully!')

      await fetchTasks()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // CHANGE TASK STATUS

  async function handleStatusChange(task) {
    const statuses = ['Pending', 'In Progress', 'Completed']
    const current = statuses.indexOf(task.status || 'Pending')
    const nextStatus = statuses[(current + 1) % statuses.length]

    setError('')
    setMessage('')

    try {
      await request(`/tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      })

      setMessage(`Task status changed to ${nextStatus}.`)
      await fetchTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  // DELETE TASK

  async function handleDeleteTask(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task?'
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await request(`/tasks/${id}`, {
        method: 'DELETE',
      })

      setMessage('Task deleted successfully.')
      await fetchTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  // LOGOUT

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    setToken('')
    setUser(null)
    setTasks([])
    setShowForm(false)
    setStatusFilter('All')
    setError('')
    setMessage('')
  }

  // TASK COUNTS AND FILTERS

  const inProgressCount = tasks.filter(
    task => task.status === 'In Progress'
  ).length

  const completedCount = tasks.filter(
    task => task.status === 'Completed'
  ).length

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'All') return true

    return (task.status || 'Pending') === statusFilter
  })

  // LOGIN AND REGISTER PAGE

  if (!token) {
    return (
      <div className="app auth-app">
        {/* Important: auth-main class controls login page width */}
        <main className="main auth-main">
          <section className="welcome">
            <div>
              <p className="welcome-label">
                YOUR PRODUCTIVITY SPACE
              </p>

              <h2>Welcome to TaskFlow.</h2>

              <p>
                Organize your work, one task at a time.
              </p>
            </div>
          </section>

          <section className="tasks-section">
            <div className="tasks-heading">
              <div>
                <h2>
                  {mode === 'login' ? 'Login' : 'Create account'}
                </h2>

                <p>
                  {mode === 'login'
                    ? 'Log in to manage your tasks.'
                    : 'Register to get started.'}
                </p>
              </div>
            </div>

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}

            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}

            <form className="task-form" onSubmit={handleAuth}>
              {mode === 'register' && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              )}

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              <button type="submit" disabled={saving}>
                {saving
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Login'
                    : 'Register'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setError('')
                  setMessage('')
                }}
              >
                {mode === 'login' ? 'Register' : 'Login'}
              </button>
            </p>
          </section>
        </main>
      </div>
    )
  }

  // DASHBOARD

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">
          TaskFlow<span>.</span>
        </h2>

        <p className="menu-title">MENU</p>

        <button
          type="button"
          className={`menu ${statusFilter === 'All' ? 'active' : ''}`}
          onClick={() => setStatusFilter('All')}
        >
          <span>▦</span> Dashboard
        </button>

        <button
          type="button"
          className={`menu ${statusFilter === 'Pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('Pending')}
        >
          <span>○</span> Pending
        </button>

        <button
          type="button"
          className={`menu ${
            statusFilter === 'In Progress' ? 'active' : ''
          }`}
          onClick={() => setStatusFilter('In Progress')}
        >
          <span>◷</span> In Progress
        </button>

        <button
          type="button"
          className={`menu ${
            statusFilter === 'Completed' ? 'active' : ''
          }`}
          onClick={() => setStatusFilter('Completed')}
        >
          <span>✓</span> Completed
        </button>

        <div className="sidebar-bottom">
          <p>Stay organized.</p>
          <small>One task at a time.</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="greeting">YOUR WORKSPACE</p>
            <h1>Dashboard</h1>
            <p>Welcome, {user?.name || 'User'}!</p>
          </div>

          <button
            className="logout-btn"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <section className="welcome">
          <div>
            <p className="welcome-label">
              YOUR PRODUCTIVITY SPACE
            </p>

            <h2>Make today count.</h2>

            <p>
              Organize your work and keep moving forward.
            </p>
          </div>

          <div className="welcome-icon">✦</div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <p>Total Tasks</p>
            <h2>{tasks.length}</h2>
            <span>All your tasks</span>
          </div>

          <div className="stat-card">
            <p>In Progress</p>
            <h2>{inProgressCount}</h2>
            <span>Work in progress</span>
          </div>

          <div className="stat-card">
            <p>Completed</p>
            <h2>{completedCount}</h2>
            <span>Tasks finished</span>
          </div>
        </section>

        <section className="tasks-section">
          <div className="tasks-heading">
            <div>
              <h2>
                {statusFilter === 'All'
                  ? 'My Tasks'
                  : `${statusFilter} Tasks`}
              </h2>

              <p>Manage your daily work.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(value => !value)
                setError('')
                setMessage('')
              }}
            >
              {showForm ? 'Cancel' : '+ Add Task'}
            </button>
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="success-message" role="status">
              {message}
            </p>
          )}

          {showForm && (
            <form className="task-form" onSubmit={handleSaveTask}>
              <h3>Create New Task</h3>

              <input
                type="text"
                placeholder="Enter task title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />

              <textarea
                placeholder="Enter task description"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />

              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>

              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Task'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setError('')
                }}
              >
                Cancel
              </button>
            </form>
          )}

          {loading ? (
            <div className="empty-state">
              <h3>Loading tasks...</h3>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h3>No tasks found</h3>
              <p>Add a task or select another status.</p>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map(task => (
                <article className="stat-card" key={task._id}>
                  <h3>{task.title}</h3>

                  <p>
                    {task.description || 'No description'}
                  </p>

                  <p>
                    Priority: {task.priority || 'Medium'}
                  </p>

                  <p>
                    Status: {task.status || 'Pending'}
                  </p>

                  <div className="task-actions">
                    <button
                      className="status-btn"
                      type="button"
                      onClick={() => handleStatusChange(task)}
                    >
                      Change Status
                    </button>

                    <button
                      className="delete-btn"
                      type="button"
                      onClick={() => handleDeleteTask(task._id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App