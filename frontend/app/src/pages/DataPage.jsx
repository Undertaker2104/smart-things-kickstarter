import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { chartAPI } from '../services/api'
import './DataPage.css'

const DataPage = () => {
    const [expectedVsCountedData, setExpectedVsCountedData] = useState([])
    const [ballsOverTimeData, setBallsOverTimeData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadCharts()
    }, [])

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
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const transformExpectedVsCounted = (plotlyData) => {
        if (!plotlyData || !plotlyData.data) return []

        const categories = plotlyData.data[0]?.x || []
        const expected = plotlyData.data[0]?.y || []
        const counted = plotlyData.data[1]?.y || []

        return categories.map((name, idx) => ({
            name,
            Verwacht: expected[idx],
            Geteld: counted[idx],
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
                {delta > 0 ? `+${delta}` : delta < 0 ? delta : '0'}
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
                <h1>Data & Charts</h1>
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
                    <button onClick={loadCharts}>Opnieuw proberen</button>
                </div>
            </div>
        )
    }

    return (
        <div className="data-page">
            <h1>Data & Charts</h1>

            <div className="data-content">
                {/* Expected vs Counted Chart */}
                <div className="chart-container">
                    <h2>Verwacht vs Geteld</h2>
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
                            <Bar dataKey="Verwacht" fill="#8884d8" label={renderDeltaLabel} stroke="none" />
                            <Bar dataKey="Geteld" fill="#82ca9d" stroke="none" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Balls Over Time Chart */}
                <div className="chart-container">
                    <h2>Ballen Over Tijd (7 dagen)</h2>
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
                            <Line type="monotone" dataKey="Volleybal" stroke="#dbce18" strokeWidth={2} activeDot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}

export default DataPage
