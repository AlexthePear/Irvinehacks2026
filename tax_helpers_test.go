package main

import (
    "math"
    "testing"
)

func TestCalculateFederalTax(t *testing.T) {
    tax, err := CalculateFederalTax(50000, "single")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Hand-computed: 10% on first $12,401 + 12% on remaining $37,599 = $5,751.98
    expected := 5751.98
    if diff := math.Abs(tax - expected); diff > 0.01 {
        t.Fatalf("federal tax mismatch: got %.2f, want %.2f (diff %.2f)", tax, expected, diff)
    }
}

func TestCalculateStateTax(t *testing.T) {
    tax, err := CalculateStateTax(60000, "California", "single")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Adjusted income after CA single deduction ($5,540) = $54,460
    // Tax: 1% 0-11,079 = 110.79; 2% 11,079-26,264 = 303.70; 4% 26,264-41,452 = 607.52; 6% 41,452-54,460 = 780.48
    expected := 110.79 + 303.70 + 607.52 + 780.48 // 1,802.49
    if diff := math.Abs(tax - expected); diff > 0.01 {
        t.Fatalf("state tax mismatch: got %.2f, want %.2f (diff %.2f)", tax, expected, diff)
    }
}
