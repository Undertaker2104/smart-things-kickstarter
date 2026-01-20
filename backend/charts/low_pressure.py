import plotly.graph_objects as go
from database import get_db_connection


def create_low_pressure_chart(days=7):
    """
    Bar chart: Number of soft balls (LOW_PRESSURE events) per ball type.
    Shows which ball types have the most pressure issues.
    Returns: Plotly figure as JSON
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Count LOW_PRESSURE events per ball type by parsing details field
            cur.execute(f"""
                SELECT 
                    bt.name as ball_type,
                    COUNT(el.id) as low_pressure_count
                FROM ball_type bt
                LEFT JOIN event_log el ON el.details LIKE bt.name || '%' 
                    AND el.code = 'LOW_PRESSURE'
                    AND el.timestamp >= NOW() - INTERVAL '{days + 1} days'
                GROUP BY bt.id, bt.name
                ORDER BY bt.id
            """)
            results = cur.fetchall()
    
    # Prepare data
    ball_types = []
    counts = []
    
    for row in results:
        ball_types.append(row['ball_type'])
        counts.append(row['low_pressure_count'])
    
    # Create bar chart
    colors = {'Basketbal': '#FF6B6B', 'Voetbal': '#4ECDC4', 'Volleybal': '#FFE66D'}
    bar_colors = [colors.get(bt, '#999') for bt in ball_types]
    
    fig = go.Figure(data=[
        go.Bar(
            x=ball_types,
            y=counts,
            marker_color=bar_colors,
            text=counts,
            textposition='auto'
        )
    ])
    
    fig.update_layout(
        title=f'Aantal Te Zachte Ballen per Baltype (Laatste {days} Dagen)',
        xaxis_title='Baltype',
        yaxis_title='Aantal LOW_PRESSURE Events',
        showlegend=False
    )
    
    return fig.to_json()
