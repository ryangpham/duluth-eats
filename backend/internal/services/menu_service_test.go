package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"net/url"
	"strings"
	"testing"
)

func TestParseMenuPage(t *testing.T) {
	body := `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Restaurant","hasMenu":{"@type":"Menu","url":"/menu","hasMenuSection":[{"@type":"MenuSection","name":"Noodles","hasMenuItem":[{"@type":"MenuItem","name":"Beef &amp; noodles","description":"<b>Slow cooked</b>","offers":[{"name":"Small","price":"12.50","priceCurrency":"USD"},{"name":"Large","price":16,"priceCurrency":"USD"}]},{"@type":"MenuItem","name":"Seasonal bowl"},{"@type":"MenuItem","name":"Kids bowl","offers":{"price":0,"priceCurrency":"USD"}}]}]}}</script><a href='/menu.pdf'>View menu</a><a href='javascript:alert(1)'>Menu</a>`
	items, links := parseMenuPage(body, "https://restaurant.example/")
	if len(items) != 3 {
		t.Fatalf("expected 3 dishes, got %v", items)
	}
	if items[0].Name != "Beef & noodles" || items[0].Section != "Noodles" || items[0].Description != "Slow cooked" {
		t.Fatalf("incorrect menu details: %v", items[0])
	}
	if len(items[0].Prices) != 2 || items[0].Prices[0].Amount != "12.50" || items[0].Prices[1].Label != "Large" {
		t.Fatalf("lost variant prices: %v", items[0].Prices)
	}
	if len(items[1].Prices) != 0 || items[1].Prices == nil {
		t.Fatal("missing prices must remain an empty array")
	}
	if items[2].Prices[0].Amount != "0" {
		t.Fatal("explicit zero price should be retained")
	}
	if items[0].SourceURL != "https://restaurant.example/" {
		t.Fatal("source missing")
	}
	if len(links) != 2 || links[0] != "https://restaurant.example/menu" || links[1] != "https://restaurant.example/menu.pdf" {
		t.Fatalf("unexpected links %v", links)
	}
}

func TestParseMenuDoesNotInventPrices(t *testing.T) {
	body := `<script type='application/ld+json'>{"@graph":[{"@type":"Product","name":"T-shirt","offers":{"price":20}},{"@type":["Thing","MenuItem"],"name":"Soup","offers":{"lowPrice":10,"highPrice":15}},{"@type":"MenuItem","name":"Rice","offers":{"price":"market price"}},{"@type":"MenuItem","name":"Tea","offers":{"priceSpecification":{"price":"3.25","priceCurrency":"USD"}}}]}</script>`
	items, _ := parseMenuPage(body, "https://restaurant.example/menu")
	if len(items) != 3 || len(items[0].Prices) != 0 || len(items[1].Prices) != 0 {
		t.Fatalf("invented dishes or prices: %v", items)
	}
	if len(items[2].Prices) != 1 || items[2].Prices[0].Amount != "3.25" {
		t.Fatal("price specification not read")
	}
	items, _ = parseMenuPage(`<script type="application/ld+json">broken</script><p>Soup $12</p>`, "https://restaurant.example")
	if len(items) != 0 {
		t.Fatal("should not guess prices from plain HTML")
	}
}

func TestMenuURLAndNetworkGuards(t *testing.T) {
	for _, raw := range []string{"file:///etc/passwd", "javascript:alert(1)", "http://user:password@example.com", "https://example.com:8080/menu", "//example.com"} {
		if _, err := menuURL(raw); err == nil {
			t.Errorf("accepted unsafe URL %q", raw)
		}
	}
	for _, raw := range []string{"127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.0.1", "100.100.100.200", "::1", "fc00::1", "::ffff:127.0.0.1", "192.0.2.1", "64:ff9b::a00:1"} {
		if isPublicMenuIP(netip.MustParseAddr(raw)) {
			t.Errorf("accepted non-public IP %s", raw)
		}
	}
	if !isPublicMenuIP(netip.MustParseAddr("8.8.8.8")) {
		t.Fatal("public address blocked")
	}
	client := newMenuClient()
	defer client.CloseIdleConnections()
	if _, err := client.Get("http://127.0.0.1/"); err == nil {
		t.Fatal("private address fetch was not blocked")
	}
	for _, id := range []string{"", "../other", "abc?key=x", strings.Repeat("x", 256)} {
		if ValidMenuPlaceID(id) {
			t.Errorf("accepted malformed place id %q", id)
		}
	}
}

func TestFetchMenuPageFailures(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/pdf":
			w.Header().Set("Content-Type", "application/pdf")
			w.Write([]byte("pdf"))
		case "/large":
			w.Header().Set("Content-Type", "text/html")
			w.Write([]byte(strings.Repeat("x", 2*1024*1024+1)))
		case "/denied":
			w.WriteHeader(http.StatusForbidden)
		default:
			w.Header().Set("Content-Type", "text/html")
			w.Write([]byte("<h1>Menu</h1>"))
		}
	}))
	defer server.Close()
	proxyURL, _ := url.Parse(server.URL)
	client := &http.Client{Transport: &http.Transport{Proxy: http.ProxyURL(proxyURL)}}
	defer client.CloseIdleConnections()
	const sourceURL = "http://restaurant.example"
	for _, path := range []string{"/pdf", "/large", "/denied"} {
		if _, _, err := fetchMenuPage(context.Background(), client, sourceURL+path); err == nil {
			t.Errorf("expected error for %s", path)
		}
	}
	body, source, err := fetchMenuPage(context.Background(), client, sourceURL)
	if err != nil || body != "<h1>Menu</h1>" || source != sourceURL {
		t.Fatalf("unexpected result: %q %q %v", body, source, err)
	}
}
