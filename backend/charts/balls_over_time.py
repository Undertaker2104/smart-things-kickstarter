import plotly.graph_objects as go
from collections import defaultdict
from database import get_db_connection


def create_balls_over_time_chart(days=7):
    """
    Line chart: Counted balls over time (last N days).
    Shows total balls counted per session, stacked by ball type.
    Returns: Plotly figure as JSON
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get sessions from last N days with ball counts per type, aggregated by day
            cur.execute(f"""
                SELECT 
                    DATE(cs.started_at) as session_date,
                    bt.name as ball_type,
                    SUM(si.count) as total_count
                FROM cleaning_session cs
                JOIN session_item si ON cs.id = si.session_id
                JOIN ball_type bt ON si.ball_type_id = bt.id
                WHERE cs.started_at >= NOW() - INTERVAL '{days + 1} days'
                GROUP BY DATE(cs.started_at), bt.name, bt.id
                ORDER BY session_date, bt.id
            """)
            results = cur.fetchall()
    
    # Organize data by ball type
    data_by_type = defaultdict(lambda: {'dates': [], 'counts': []})
    
    for row in results:
        ball_type = row['ball_type']
        date = row['session_date']  # Date object from PostgreSQL
        count = row['total_count']
        
        # Format date as DD/MM
        formatted_date = date.strftime('%d/%m')
        
        data_by_type[ball_type]['dates'].append(formatted_date)
        data_by_type[ball_type]['counts'].append(count)
    
    # Create stacked area chart
    fig = go.Figure()
    
    colors = {'Basketbal': '#FF6B6B', 'Voetbal': '#4ECDC4', 'Volleybal': '#FFE66D'}
    
    for ball_type, data in data_by_type.items():
        fig.add_trace(go.Scatter(
            x=data['dates'],
            y=data['counts'],
            name=ball_type,
            mode='lines+markers',
            stackgroup='one',
            line=dict(color=colors.get(ball_type, '#999'))
        ))
    
    fig.update_layout(
        title=f'Getelde Ballen Over Tijd (Laatste {days} Dagen)',
        xaxis_title='Datum',
        yaxis_title='Aantal Ballen',
        hovermode='x unified',
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig.to_json()
