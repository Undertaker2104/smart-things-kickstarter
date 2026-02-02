import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { chartAPI } from '../services/api'
import './DataPage.css'

function DataCards({ sessionsThisWeek, cleanedToday }) {
    return (
        <div className="data-cards-container">
            <div className="data-card">
                <span className="data-card-label">Active days this week:</span>
                <span className="data-card-value">{sessionsThisWeek}</span>
            </div>
            <div className="data-card">
                <span className="data-card-label">Cleaned today:</span>
                <span className="data-card-value">{cleanedToday}</span>
            </div>
        </div>
    )
}

const DataPage = () => {
    const [expectedVsCountedData, setExpectedVsCountedData] = useState([])
    const [ballsOverTimeData, setBallsOverTimeData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sessionsThisWeek, setSessionsThisWeek] = useState(0)
    const [cleanedToday, setCleanedToday] = useState(0)

    useEffect(() => {
        loadCharts()

        // Set up polling to refresh charts every 30 seconds
        const chartInterval = setInterval(() => {
            loadCharts()
        }, 30000) // 30 seconds

        // Set up polling to refresh stats every 5 seconds
        const statsInterval = setInterval(() => {
            loadStatsOnly()
        }, 5000) // 5 seconds

        return () => {
            clearInterval(chartInterval)
            clearInterval(statsInterval)
        }
    }, [])

    const loadStatsOnly = async () => {
        try {
            const ballsOverTime = await chartAPI.getBallsOverTime(7)
            const { sessionsThisWeek: sessions, cleanedToday: cleaned } = calculateStats(ballsOverTime)
            console.log('Stats update:', { sessions, cleaned })
            setSessionsThisWeek(sessions)
            setCleanedToday(cleaned)
        } catch (err) {
            console.error('Failed to update stats:', err)
        }
    }

    const loadCharts = async () => {
        try {
            setLoading(true)
            setError(null)

            const [expectedVsCounted, ballsOverTime] = await Promise.all([
                chartAPI.getExpectedVsCounted(),
                chartAPI.getBallsOverTime(7)
            ])

            // Transform Plotly data to Recharts format
            const barData = transformExpectedVsCounted(expectedVsCounted)
            const lineData = transformBallsOverTime(ballsOverTime)

            setExpectedVsCountedData(barData)
            setBallsOverTimeData(lineData)

            // Calculate sessionsThisWeek and cleanedToday from ballsOverTime
            const { sessionsThisWeek: sessions, cleanedToday: cleaned } = calculateStats(ballsOverTime)
            setSessionsThisWeek(sessions)
            setCleanedToday(cleaned)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (ballsOverTime) => {
        if (!ballsOverTime || !ballsOverTime.data || ballsOverTime.data.length === 0) {
            return { sessionsThisWeek: 0, cleanedToday: 0 }
        }

        // Get all unique dates from the chart data (already filtered to last 7 days by backend)
        const allDates = new Set()
        ballsOverTime.data.forEach(trace => {
            trace.x?.forEach(dateStr => {
                allDates.add(dateStr)
            })
        })
        const dates = Array.from(allDates).sort()

        // Sessions this week: count days with any activity
        let sessionCount = 0
        dates.forEach(dateStr => {
            let any = false
            ballsOverTime.data.forEach(trace => {
                const idx = trace.x?.indexOf(dateStr)
                if (idx !== -1 && idx !== undefined && trace.y?.[idx] > 0) {
                    any = true
                }
            })
            if (any) sessionCount++
        })

        // Cleaned today: sum of all balls on today's date
        const today = new Date()
        const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}`
        let cleaned = 0
        ballsOverTime.data.forEach(trace => {
            const idx = trace.x?.indexOf(todayStr)
            if (idx !== -1 && idx !== undefined) {
                cleaned += trace.y?.[idx] || 0
            }
        })

        return { sessionsThisWeek: sessionCount, cleanedToday: cleaned }
    }

    const transformExpectedVsCounted = (plotlyData) => {
        if (!plotlyData || !plotlyData.data) return []

        const categories = plotlyData.data[0]?.x || []
        const expected = plotlyData.data[0]?.y || []
        const counted = plotlyData.data[1]?.y || []

        return categories.map((name, idx) => ({
            name,
            Expected: expected[idx],
            Counted: counted[idx],
            Delta: expected[idx] - counted[idx]
        }))
    }

    // Custom label to show delta on bars
    const renderDeltaLabel = (props) => {
        const { x, y, width, value, index } = props
        const delta = expectedVsCountedData[index]?.Delta || 0
        return (
            <text
                x={x + width / 2}
                y={y - 10}
                fill={delta === 0 ? '#ccc' : delta > 0 ? '#ff6b6b' : '#51cf66'}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
            >
                Δ {delta > 0 ? `+${delta}` : delta < 0 ? delta : '0'}
            </text>
        )
    }

    const transformBallsOverTime = (plotlyData) => {
        if (!plotlyData || !plotlyData.data || plotlyData.data.length === 0) return []

        // Get all unique dates
        const allDates = new Set()
        plotlyData.data.forEach(trace => {
            trace.x?.forEach(date => allDates.add(date))
        })

        const dates = Array.from(allDates).sort()

        // Transform to recharts format
        return dates.map(date => {
            const dataPoint = { date }
            plotlyData.data.forEach(trace => {
                const idx = trace.x?.indexOf(date)
                if (idx !== -1 && idx !== undefined) {
                    dataPoint[trace.name] = trace.y?.[idx] || 0
                } else {
                    dataPoint[trace.name] = 0
                }
            })
            return dataPoint
        })
    }

    if (loading) {
        return (
            <div className="data-page">
                <div className="title">
                <h1>Sphaera</h1>
                <h1 className='notBold'>One</h1>
            </div>
                <div className="loading">Charts laden...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="data-page">
                <h1>Data & Charts</h1>
                <div className="error">
                    <p>Fout bij laden van charts: {error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="data-page">
            <div className="title">
                <h1>Sphaera</h1>
                <h1 className='notBold'>One</h1>
            </div>
            <div className="data-content">
                <DataCards sessionsThisWeek={sessionsThisWeek} cleanedToday={cleanedToday} />
                <div className="chart-container">
                    <h2>Expected vs Counted (last active session)</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={expectedVsCountedData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="name" stroke="#fff" />
                            <YAxis stroke="#fff" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#333', border: '1px solid #666' }}
                                labelStyle={{ color: '#fff' }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Legend />
                            <Bar dataKey="Expected" fill="#8884d8" label={renderDeltaLabel} stroke="none" />
                            <Bar dataKey="Counted" fill="#82ca9d" stroke="none" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Balls Over Time Chart */}
                <div className="chart-container">
                    <h2>Balls cleaned over time (7 days)</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={ballsOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                            <XAxis dataKey="date" stroke="#fff" />
                            <YAxis stroke="#fff" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#333', border: '1px solid #666' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="Basketbal" stroke="#e79426" strokeWidth={2} activeDot={false} />
                            <Line type="monotone" dataKey="Voetbal" stroke="#4619ee" strokeWidth={2} activeDot={false} />
                            <Line type="monotone" dataKey="Volleybal" stroke="#f1e320" strokeWidth={2} activeDot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="empty">

                </div>
            </div>
        </div>
    )
}

export default DataPage
