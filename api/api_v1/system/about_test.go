package system

import "testing"

func TestIsNewerVersion(t *testing.T) {
	tests := []struct {
		latest  string
		current string
		want    bool
	}{
		{"v1.0.1", "1.00", true},
		{"v1.0.0", "1.00", false},
		{"2.0", "1.99", true},
		{"1.9", "2.0", false},
	}
	for _, test := range tests {
		if got := isNewerVersion(test.latest, test.current); got != test.want {
			t.Fatalf("isNewerVersion(%q, %q) = %v, want %v", test.latest, test.current, got, test.want)
		}
	}
}
