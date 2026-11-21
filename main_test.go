package main

import (
	"io/fs"
	"strings"
	"testing"
)

func TestStandaloneFrontendIsEmbedded(t *testing.T) {
	index, err := assets.ReadFile("frontend/dist/index.html")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(index), "localhost:5173") || strings.Contains(string(index), "/@vite/client") {
		t.Fatal("embedded frontend references a development server")
	}
	files, err := fs.Glob(assets, "frontend/dist/assets/*.js")
	if err != nil || len(files) == 0 {
		t.Fatalf("production JavaScript missing from executable assets: files=%v, err=%v", files, err)
	}
}
