package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestSPAHandler(t *testing.T) {
	root := fstest.MapFS{
		"index.html":    &fstest.MapFile{Data: []byte("INDEX")},
		"assets/app.js": &fstest.MapFile{Data: []byte("JS")},
	}
	handler := spaHandler{root: root, files: http.FileServer(http.FS(root))}

	tests := []struct {
		name       string
		path       string
		wantStatus int
		wantBody   string
		wantCache  string
	}{
		{name: "root", path: "/", wantStatus: http.StatusOK, wantBody: "INDEX", wantCache: "no-cache"},
		{name: "spa fallback", path: "/some-route", wantStatus: http.StatusOK, wantBody: "INDEX", wantCache: "no-cache"},
		{name: "asset", path: "/assets/app.js", wantStatus: http.StatusOK, wantBody: "JS", wantCache: "public, max-age=31536000, immutable"},
		{name: "missing asset", path: "/missing.js", wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, tt.path, nil)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, tt.wantStatus)
			}
			if tt.wantBody != "" && response.Body.String() != tt.wantBody {
				t.Fatalf("body = %q, want %q", response.Body.String(), tt.wantBody)
			}
			if tt.wantCache != "" && response.Header().Get("Cache-Control") != tt.wantCache {
				t.Fatalf("cache = %q, want %q", response.Header().Get("Cache-Control"), tt.wantCache)
			}
		})
	}
}
