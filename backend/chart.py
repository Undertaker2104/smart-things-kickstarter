"""Chart generation test script for the Ball Cleaner dashboard."""
from charts import (
    create_expected_vs_counted_chart,
    create_balls_over_time_chart,
    create_low_pressure_chart
)


# Test the charts
if __name__ == "__main__":
    import json
    import plotly.io as pio
    
    # Test chart 1: Expected vs Counted
    print("=== Chart 1: Expected vs Counted ===")
    fig_json = create_expected_vs_counted_chart()
    print("✓ Chart generated successfully!")
    
    # Test chart 2: Balls over time
    print("\n=== Chart 2: Balls Over Time ===")
    fig_json2 = create_balls_over_time_chart(days=7)
    print("✓ Chart generated successfully!")
    
    # Test chart 3: Low pressure events
    print("\n=== Chart 3: Low Pressure Events ===")
    fig_json3 = create_low_pressure_chart(days=7)
    print("✓ Chart generated successfully!")
    
    # Show all charts
    print("\nOpening charts in browser...")
    fig1 = pio.from_json(fig_json)
    fig1.show()
    
    fig2 = pio.from_json(fig_json2)
    fig2.show()
    
    fig3 = pio.from_json(fig_json3)
    fig3.show()
    
    print(f"\nChart 1 data: {json.loads(fig_json)['data'][0]['x']}")
    print(f"Chart 2 has {len(json.loads(fig_json2)['data'])} series")
    print(f"Chart 3 data: {json.loads(fig_json3)['data'][0]['y']}")
