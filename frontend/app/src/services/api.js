export const API_BASE_URL = "http://localhost:8000";
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
