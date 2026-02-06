from charts import (
    create_expected_vs_counted_chart,
    create_balls_over_time_chart
)


if __name__ == "__main__":
    import json
    import plotly.io as pio
    
    print("=== Chart 1: Expected vs Counted ===")
    fig_json = create_expected_vs_counted_chart()
    print("✓ Chart generated successfully!")
    
    print("\n=== Chart 2: Balls Over Time ===")
    fig_json2 = create_balls_over_time_chart(days=7)
    print("✓ Chart generated successfully!")
    
    print("\n✓ All charts generated successfully!")
    print("Charts are available via API endpoints:")
    print("  - http://localhost:8000/api/charts/expected-vs-counted")
    print("  - http://localhost:8000/api/charts/balls-over-time")
    
    print("\nOpening charts in browser...")
    fig1 = pio.from_json(fig_json)
    fig1.show()
    fig2 = pio.from_json(fig_json2)
    fig2.show()
