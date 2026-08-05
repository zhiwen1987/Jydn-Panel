package system

import (
	"os"
	"path/filepath"
	"testing"
)

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

func TestGithubAccessTokenFromFile(t *testing.T) {
	t.Setenv("JYDN_GITHUB_TOKEN", "")
	path := filepath.Join(t.TempDir(), "github-token")
	if err := os.WriteFile(path, []byte("file-token\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JYDN_GITHUB_TOKEN_FILE", path)
	if got := githubAccessToken(); got != "file-token" {
		t.Fatalf("githubAccessToken() = %q, want file-token", got)
	}
}

func TestGithubAccessTokenPrefersEnvironment(t *testing.T) {
	path := filepath.Join(t.TempDir(), "github-token")
	if err := os.WriteFile(path, []byte("file-token"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JYDN_GITHUB_TOKEN_FILE", path)
	t.Setenv("JYDN_GITHUB_TOKEN", "environment-token")
	if got := githubAccessToken(); got != "environment-token" {
		t.Fatalf("githubAccessToken() = %q, want environment-token", got)
	}
}
