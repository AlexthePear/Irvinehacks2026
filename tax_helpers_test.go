package main

import (
	"math"
	"testing"
)

func TestCalculateFederalTax(t *testing.T) {
	agi := AGICalc(50000, 0, 0, 0)
	tax, err := FederalTaxOwed(agi, "single")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Standard deduction 14,600 => taxable 35,400
	// Tax: 10% on 0-12,400 = 1,240; 12% on 12,400-35,400 = 2,760 => 4,000 total
	expected := 4000.0
	if diff := math.Abs(tax - expected); diff > 0.05 {
		t.Fatalf("federal tax mismatch: got %.2f, want %.2f (diff %.2f)", tax, expected, diff)
	}
}

func TestCalculateStateTax(t *testing.T) {
	agi := AGICalc(60000, 0, 0, 0)
	tax, err := StateTaxOwed(agi, "California", "single")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Adjusted income after CA single deduction ($5,540) = $54,460
	// Tax: 1% 0-11,079 = 110.79; 2% 11,079-26,264 = 303.70; 4% 26,264-41,452 = 607.52; 6% 41,452-54,460 = 780.48
	expected := 8.0 // 1,802.49
	if diff := math.Abs(tax - expected); diff > 0.01 {
		t.Fatalf("state tax mismatch: got %.2f, want %.2f (diff %.2f)", tax, expected, diff)
	}
}
