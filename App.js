import { useState, useEffect } from 'react';
import './App.css';

const API_URL = '';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);

  //greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  //format date and time
  const formatDateTime = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayName = days[currentTime.getDay()];
    const month = months[currentTime.getMonth()];
    const date = currentTime.getDate();
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return {
      date: `${dayName}, ${month} ${date}`,
      time: `${displayHours}:${displayMinutes} ${ampm}`
    };
  };

  //update greeting and time
  useEffect(() => {
    setGreeting(getGreeting());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setGreeting(getGreeting());
    }, 1000); // Update every second for live clock

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await fetch(`${API_URL}/todos`);
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/todo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTodo }),
      });

      if (response.ok) {
        setNewTodo('');
        fetchTodos();
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
    setLoading(false);
  };

  const toggleTodo = async (id) => {
    try {
      await fetch(`${API_URL}/todo/${id}/toggle`, {
        method: 'POST',
      });
      fetchTodos();
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await fetch(`${API_URL}/todo/${id}`, {
        method: 'DELETE',
      });
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const { date, time } = formatDateTime();

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button
        className="theme-toggle"
        onClick={() => setDarkMode(!darkMode)}
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀' : '☾'}
      </button>

      <div className="container">
        <div className="header">
          <h1>{greeting}, Justin</h1>
          <div className="datetime">
            <div className="date">{date}</div>
            <div className="time">{time}</div>
          </div>
        </div>

        <div className="filter-container">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        <form onSubmit={addTodo} className="add-form">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="What needs to be done?"
            className="todo-input"
            disabled={loading}
          />
          <button type="submit" className="add-button" disabled={loading}>
            {loading ? '...' : 'Add'}
          </button>
        </form>

        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <p className="empty-state">
              {filter === 'all' ? 'No todos yet! Add one above' :
                filter === 'active' ? 'No active todos' :
                  'No completed todos'}
            </p>
          ) : (
            filteredTodos.map((todo) => (
              <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <div className="todo-content">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="checkbox"
                  />
                  <span className="todo-text">{todo.title}</span>
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="delete-button"
                  aria-label="Delete todo"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {todos.length > 0 && (
          <div className="stats">
            {todos.filter(t => !t.completed).length} active • {todos.filter(t => t.completed).length} completed
          </div>
        )}
      </div>

      <footer className="app-title">To-do List App</footer>
    </div>
  );
}

export default App;