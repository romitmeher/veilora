package vpn

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseSoftEtherPluginURL(t *testing.T) {
	htmlSample := `
	<html><body>
	<p>Download SoftEther VPN Client + VPN Gate Client Plugin</p>
	<a href="/common/cd.aspx/vpngate-client-2026.11.22-build-9807.166233.zip">Download ZIP</a>
	</body></html>
	`
	base := "http://v-dot-pn-ams2.opengw.net:34637"
	got, err := parseSoftEtherPluginURL(htmlSample, base)
	if err != nil {
		t.Fatalf("unexpected error parsing plugin URL: %v", err)
	}
	want := "http://v-dot-pn-ams2.opengw.net:34637/common/cd.aspx/vpngate-client-2026.11.22-build-9807.166233.zip"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestParseSoftEtherPluginURLAbsolute(t *testing.T) {
	htmlSample := `
	<a href="https://mirror.opengw.net/download/vpngate-client-latest.zip">Direct Download</a>
	`
	base := "http://v-dot-pn-ams2.opengw.net:34637"
	got, err := parseSoftEtherPluginURL(htmlSample, base)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := "https://mirror.opengw.net/download/vpngate-client-latest.zip"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestParseSoftEtherPluginURLMissing(t *testing.T) {
	htmlSample := `<html><body><p>No links here</p></body></html>`
	base := "http://v-dot-pn-ams2.opengw.net:34637"
	_, err := parseSoftEtherPluginURL(htmlSample, base)
	if err == nil {
		t.Fatal("expected error for missing link")
	}
}

func TestMakeAbsoluteURL(t *testing.T) {
	tests := []struct {
		raw  string
		base string
		want string
	}{
		{"/path/to/file.zip", "http://example.com", "http://example.com/path/to/file.zip"},
		{"path/to/file.zip", "http://example.com", "http://example.com/path/to/file.zip"},
		{"http://other.com/file.zip", "http://example.com", "http://other.com/file.zip"},
		{"https://other.com/file.zip", "http://example.com", "https://other.com/file.zip"},
	}

	for _, tt := range tests {
		got := makeAbsoluteURL(tt.raw, tt.base)
		if got != tt.want {
			t.Errorf("makeAbsoluteURL(%q, %q) = %q, want %q", tt.raw, tt.base, got, tt.want)
		}
	}
}

func TestFindSetupExecutable(t *testing.T) {
	tmp := t.TempDir()
	exePath := filepath.Join(tmp, "vpngate-client-v4.44-build-9807.exe")
	if err := os.WriteFile(exePath, []byte("fake exe binary"), 0600); err != nil {
		t.Fatal(err)
	}

	got, err := findSetupExecutable(tmp)
	if err != nil {
		t.Fatalf("unexpected error finding executable: %v", err)
	}
	if got != exePath {
		t.Errorf("got %q, want %q", got, exePath)
	}
}
