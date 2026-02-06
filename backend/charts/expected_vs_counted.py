import plotly.graph_objects as go
from database import get_db_connection


def create_expected_vs_counted_chart():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    bt.id,
                    bt.name,
                    COALESCE(ie.expected_count, 0) as expected_count,
                    COALESCE(si.count, 0) as total_counted
                FROM ball_type bt
                LEFT JOIN inventory_expected ie ON bt.id = ie.ball_type_id
                LEFT JOIN (
                    SELECT si.ball_type_id, si.count
                    FROM session_item si
                    WHERE si.session_id = (
                        SELECT id FROM cleaning_session 
                        WHERE status IN ('PAUSED', 'FINISHED', 'ERROR')
                        ORDER BY ended_at DESC NULLS LAST
                        LIMIT 1
                    )
                ) si ON bt.id = si.ball_type_id
                ORDER BY bt.id
            """)
            results = cur.fetchall()
    
    ball_types = []
    expected = []
    counted = []
    deltas = []
    
    for row in results:
        name = row['name']
        expected_count = row['expected_count']
        total_counted = row['total_counted']
        delta = expected_count - total_counted
        
        ball_types.append(name)
        expected.append(expected_count)
        counted.append(total_counted)
        deltas.append(delta)
    
    fig = go.Figure(data=[
        go.Bar(name='Expected', x=ball_types, y=expected, marker_color='lightblue'),
        go.Bar(name='Counted', x=ball_types, y=counted, marker_color='darkblue')
    ])
    
    for i, (ball_type, delta) in enumerate(zip(ball_types, deltas)):
        fig.add_annotation(
            x=ball_type,
            y=max(expected[i], counted[i]) + 2,
            text=f"Δ {delta:+d}",
            showarrow=False,
            font=dict(size=12, color='red' if delta != 0 else 'green')
        )
    
    fig.update_layout(
        title='Expected vs. Counted per Ball Type (Last Session)',
        xaxis_title='Ball Type',
        yaxis_title='Count',
        barmode='group',
        hovermode='x unified'
    )
    
    return fig.to_json()
