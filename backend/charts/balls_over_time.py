import plotly.graph_objects as go
from collections import defaultdict
from database import get_db_connection
from psycopg.sql import SQL, Literal


def create_balls_over_time_chart(days=7):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            query = SQL("""
                SELECT 
                    DATE(cs.ended_at) as session_date,
                    bt.name as ball_type,
                    SUM(si.count) as total_count
                FROM cleaning_session cs
                JOIN session_item si ON cs.id = si.session_id
                JOIN ball_type bt ON si.ball_type_id = bt.id
                WHERE cs.ended_at >= NOW() - INTERVAL '{} days'
                GROUP BY DATE(cs.ended_at), bt.name, bt.id
                ORDER BY session_date, bt.id
            """).format(Literal(days))
            cur.execute(query)
            results = cur.fetchall()
    
    data_by_type = defaultdict(lambda: {'dates': [], 'counts': []})
    
    for row in results:
        ball_type = row['ball_type']
        date = row['session_date']
        count = row['total_count']
        
        formatted_date = date.strftime('%d/%m')
        
        data_by_type[ball_type]['dates'].append(formatted_date)
        data_by_type[ball_type]['counts'].append(count)
    
    fig = go.Figure()
    
    colors = {'Basketbal': '#e79426', 'Voetbal': '#4619ee', 'Volleybal': '#dbce18'}
    
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
        title=f'Counted Balls Over Time (Last {days} Days)',
        xaxis_title='Date',
        yaxis_title='Number of Balls',
        hovermode='x unified',
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    return fig.to_json()
