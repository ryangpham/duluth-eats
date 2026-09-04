package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMenuRequestValidation(t *testing.T) {
	for _, test := range []struct {
		method, target string
		status         int
	}{
		{http.MethodPost, "/menu?placeId=valid", http.StatusMethodNotAllowed},
		{http.MethodGet, "/menu", http.StatusBadRequest},
		{http.MethodGet, "/menu?placeId=../secret", http.StatusBadRequest},
	} {
		w := httptest.NewRecorder()
		GetRestaurantMenu(w, httptest.NewRequest(test.method, test.target, nil))
		if w.Code != test.status {
			t.Errorf("%s %s: got %d, want %d", test.method, test.target, w.Code, test.status)
		}
	}
}
