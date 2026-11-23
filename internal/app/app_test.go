package app

import (
	"errors"
	"testing"
)

func TestIsCALoadError(t *testing.T) {
	if !isCALoadError(errors.New("CA load: read CA key: access denied")) {
		t.Fatal("CA load error was not detected")
	}
	if isCALoadError(errors.New("create proxy: failed")) {
		t.Fatal("unrelated proxy error was classified as CA load")
	}
}
