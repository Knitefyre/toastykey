import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

// Action types
const SET_STATS = 'SET_STATS';
const SET_PROJECTS = 'SET_PROJECTS';
const SET_KEYS = 'SET_KEYS';
const SET_BUDGETS = 'SET_BUDGETS';
const SET_CURRENCY = 'SET_CURRENCY';
const SET_LOADING = 'SET_LOADING';
const UPDATE_FROM_WEBSOCKET = 'UPDATE_FROM_WEBSOCKET';

// Initial state
const initialState = {
  stats: null,
  projects: [],
  keys: [],
  budgets: [],
  currency: 'INR',
  loading: {
    stats: false,
    projects: false,
    keys: false,
    budgets: false,
  },
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case SET_STATS:
      return {
        ...state,
        stats: action.payload,
      };

    case SET_PROJECTS:
      return {
        ...state,
        projects: action.payload,
      };

    case SET_KEYS:
      return {
        ...state,
        keys: action.payload,
      };

    case SET_BUDGETS:
      return {
        ...state,
        budgets: action.payload,
      };

    case SET_CURRENCY:
      return {
        ...state,
        currency: action.payload,
      };

    case SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          ...action.payload,
        },
      };

    case UPDATE_FROM_WEBSOCKET:
      return handleWebSocketUpdate(state, action.payload);

    default:
      return state;
  }
}

// Handle WebSocket updates
function handleWebSocketUpdate(state, { event, data }) {
  switch (event) {
    case 'api_call':
      // Update stats with new API call data
      if (state.stats) {
        return {
          ...state,
          stats: {
            ...state.stats,
            totalCalls: (state.stats.totalCalls || 0) + 1,
            totalCost: (state.stats.totalCost || 0) + (data.cost || 0),
            // Update other relevant stats
          },
        };
      }
      return state;

    case 'budget_update':
      // Update budget in budgets array
      return {
        ...state,
        budgets: state.budgets.map((budget) =>
          budget.id === data.budgetId
            ? { ...budget, ...data.updates }
            : budget
        ),
      };

    case 'vault_update':
      // Update keys or projects based on vault update
      if (data.type === 'key') {
        return {
          ...state,
          keys: state.keys.map((key) =>
            key.id === data.id ? { ...key, ...data.updates } : key
          ),
        };
      } else if (data.type === 'project') {
        return {
          ...state,
          projects: state.projects.map((project) =>
            project.id === data.id ? { ...project, ...data.updates } : project
          ),
        };
      }
      return state;

    default:
      return state;
  }
}

// Create context
const AppContext = createContext(null);

// AppProvider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { socket, connected } = useWebSocket();

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    // API call event
    const handleApiCall = (data) => {
      console.log('[AppContext] API call event:', data);
      dispatch({
        type: UPDATE_FROM_WEBSOCKET,
        payload: { event: 'api_call', data },
      });
    };

    // Budget update event
    const handleBudgetUpdate = (data) => {
      console.log('[AppContext] Budget update event:', data);
      dispatch({
        type: UPDATE_FROM_WEBSOCKET,
        payload: { event: 'budget_update', data },
      });
    };

    // Vault update event
    const handleVaultUpdate = (data) => {
      console.log('[AppContext] Vault update event:', data);
      dispatch({
        type: UPDATE_FROM_WEBSOCKET,
        payload: { event: 'vault_update', data },
      });
    };

    // Register listeners
    socket.on('api_call', handleApiCall);
    socket.on('budget_update', handleBudgetUpdate);
    socket.on('vault_update', handleVaultUpdate);

    // Cleanup listeners
    return () => {
      socket.off('api_call', handleApiCall);
      socket.off('budget_update', handleBudgetUpdate);
      socket.off('vault_update', handleVaultUpdate);
    };
  }, [socket]);

  // Helper function to set currency
  const setCurrency = useCallback((currency) => {
    dispatch({ type: SET_CURRENCY, payload: currency });
  }, []);

  // Context value
  const value = {
    state,
    dispatch,
    socket,
    isConnected: connected,
    setCurrency,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use AppContext
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Export action types for use in components
export {
  SET_STATS,
  SET_PROJECTS,
  SET_KEYS,
  SET_BUDGETS,
  SET_CURRENCY,
  SET_LOADING,
  UPDATE_FROM_WEBSOCKET,
};
