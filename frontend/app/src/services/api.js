export const API_BASE_URL = "http://145.24.237.126:8000";
//export const API_BASE_URL = "http://localhost:8000"
fetch(`{API_BASE_URL}/api/charts/expected-vs-counted`)

// Chart API endpoints
export const chartAPI = {
    getExpectedVsCounted: async () => {
        const response = await fetch(`${API_BASE_URL}/api/charts/expected-vs-counted`)
        if (!response.ok) {
            throw new Error('Failed to fetch expected vs counted chart')
        }
        return response.json()
    },

    getBallsOverTime: async (days = 7) => {
        const response = await fetch(`${API_BASE_URL}/api/charts/balls-over-time?days=${days}`)
        if (!response.ok) {
            throw new Error('Failed to fetch balls over time chart')
        }
        return response.json()
    }
}

// Session API endpoints
export const sessionAPI = {
    getSessions: async () => {
        const response = await fetch(`${API_BASE_URL}/api/sessions`)
        if (!response.ok) {
            throw new Error('Failed to fetch sessions')
        }
        return response.json()
    },

    getSessionDetail: async (sessionId) => {
        const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`)
        if (!response.ok) {
            throw new Error('Failed to fetch session detail')
        }
        return response.json()
    }
}

// State API endpoints
export const stateAPI = {
    getState: async () => {
        const response = await fetch(`${API_BASE_URL}/api/state`)
        if (!response.ok) {
            throw new Error('Failed to fetch state')
        }
        return response.json()
    }
}

// Inventory API endpoints
export const inventoryAPI = {
    getInventory: async () => {
        const response = await fetch(`${API_BASE_URL}/api/inventory`)
        if (!response.ok) {
            throw new Error('Failed to fetch inventory')
        }
        return response.json()
    }
}

// Command API endpoints
export const commandAPI = {
    createCommand: async (type, sessionId = null) => {
        const body = { type }
        if (sessionId !== null) {
            body.session_id = sessionId
        }

        const response = await fetch(`${API_BASE_URL}/api/commands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        if (!response.ok) {
            throw new Error('Failed to create command')
        }
        return response.json()
    },

    getCommandStatus: async (commandId) => {
        const response = await fetch(`${API_BASE_URL}/api/commands/${commandId}`)
        if (!response.ok) {
            throw new Error('Failed to get command status')
        }
        return response.json()
    }
}
