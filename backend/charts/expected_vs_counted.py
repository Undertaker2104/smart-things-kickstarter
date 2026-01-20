import plotly.graph_objects as go
from database import get_db_connection


def create_expected_vs_counted_chart():
    """
    Bar chart: Expected vs. Counted per ball type.
    Shows delta as annotation (expected - counted).
    Returns: Plotly figure as JSON
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get expected counts and latest session counts
            cur.execute("""
                SELECT 
                    bt.id,
                    bt.name,
                    COALESCE(ie.expected_count, 0) as expected_count,
                    COALESCE(SUM(si.count), 0) as total_counted
                FROM ball_type bt
                LEFT JOIN inventory_expected ie ON bt.id = ie.ball_type_id
                LEFT JOIN session_item si ON bt.id = si.ball_type_id
                LEFT JOIN cleaning_session cs ON si.session_id = cs.id
                WHERE cs.id = (SELECT MAX(id) FROM cleaning_session)
                GROUP BY bt.id, bt.name, ie.expected_count
                ORDER BY bt.id
            """)
            results = cur.fetchall()
    
    # Prepare data
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
    
    # Create grouped bar chart
    fig = go.Figure(data=[
        go.Bar(name='Verwacht', x=ball_types, y=expected, marker_color='lightblue'),
        go.Bar(name='Geteld', x=ball_types, y=counted, marker_color='darkblue')
    ])
    
    # Add delta annotations
    for i, (ball_type, delta) in enumerate(zip(ball_types, deltas)):
        fig.add_annotation(
            x=ball_type,
            y=max(expected[i], counted[i]) + 2,
            text=f"Δ {delta:+d}",
            showarrow=False,
            font=dict(size=12, color='red' if delta != 0 else 'green')
        )
    
    fig.update_layout(
        title='Verwacht vs. Geteld per Baltype',
        xaxis_title='Baltype',
        yaxis_title='Aantal',
        barmode='group',
        hovermode='x unified'
    )
    
    return fig.to_json()
