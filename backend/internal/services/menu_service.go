package services

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/ryangpham/duluth-eats/internal/cache"
	"github.com/ryangpham/duluth-eats/internal/models"
)

var placeIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,255}$`)
var scriptPattern = regexp.MustCompile(`(?is)<script\b([^>]*)>(.*?)</script\s*>`)
var anchorPattern = regexp.MustCompile(`(?is)<a\b([^>]*)>(.*?)</a\s*>`)
var attributePattern = regexp.MustCompile(`(?is)([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')`)
var tagPattern = regexp.MustCompile(`<[^>]*>`)
var amountPattern = regexp.MustCompile(`^\d+(?:\.\d{1,4})?$`)

func ValidMenuPlaceID(placeID string) bool { return placeIDPattern.MatchString(placeID) }

func menuURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, err
	}
	if (u.Scheme != "https" && u.Scheme != "http") || u.Hostname() == "" || u.User != nil || (u.Port() != "" && u.Port() != "80" && u.Port() != "443") {
		return nil, fmt.Errorf("unsupported menu URL")
	}
	return u, nil
}

func isPublicMenuIP(ip netip.Addr) bool {
	ip = ip.Unmap()
	if ip.Is6() && !netip.MustParsePrefix("2000::/3").Contains(ip) {
		return false
	}
	if !ip.IsGlobalUnicast() || ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
		return false
	}
	for _, cidr := range []string{"100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "2001:db8::/32", "2001::/23", "2002::/16", "64:ff9b::/96"} {
		if netip.MustParsePrefix(cidr).Contains(ip) {
			return false
		}
	}
	return true
}

// Resolve and dial the same public IP; re-check every redirect to prevent SSRF.
func newMenuClient() *http.Client {
	transport := &http.Transport{
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 7 * time.Second,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(address)
			if err != nil {
				return nil, err
			}
			ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
			if err != nil {
				return nil, err
			}
			if len(ips) == 0 {
				return nil, fmt.Errorf("no website address")
			}
			for _, ip := range ips {
				if !isPublicMenuIP(ip) {
					return nil, fmt.Errorf("private website address blocked")
				}
			}
			dialer := net.Dialer{Timeout: 5 * time.Second}
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
		},
	}
	return &http.Client{Transport: transport, Timeout: 10 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return fmt.Errorf("too many website redirects")
		}
		_, err := menuURL(req.URL.String())
		return err
	}}
}

func fetchMenuPage(ctx context.Context, client *http.Client, rawURL string) (string, string, error) {
	if _, err := menuURL(rawURL); err != nil {
		return "", "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", "DuluthEats/1.0 (restaurant menu reader)")
	req.Header.Set("Accept", "text/html")
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK || !strings.Contains(strings.ToLower(resp.Header.Get("Content-Type")), "text/html") {
		return "", "", fmt.Errorf("menu page unavailable")
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024+1))
	if err != nil {
		return "", "", err
	}
	if len(body) > 2*1024*1024 {
		return "", "", fmt.Errorf("menu page too large")
	}
	return string(body), resp.Request.URL.String(), nil
}

func attribute(attributes, name string) string {
	for _, match := range attributePattern.FindAllStringSubmatch(attributes, -1) {
		if strings.EqualFold(match[1], name) {
			return html.UnescapeString(match[2] + match[3])
		}
	}
	return ""
}

func plainMenuText(value interface{}) string {
	text, _ := value.(string)
	return strings.TrimSpace(html.UnescapeString(tagPattern.ReplaceAllString(text, "")))
}

func schemaType(node map[string]interface{}, kind string) bool {
	values, ok := node["@type"].([]interface{})
	if !ok {
		values = []interface{}{node["@type"]}
	}
	for _, value := range values {
		t := plainMenuText(value)
		if t == kind || t == "https://schema.org/"+kind || t == "http://schema.org/"+kind {
			return true
		}
	}
	return false
}

func menuPrices(value interface{}) []models.MenuPrice {
	prices := make([]models.MenuPrice, 0)
	values, ok := value.([]interface{})
	if !ok {
		values = []interface{}{value}
	}
	for _, value := range values {
		offer, ok := value.(map[string]interface{})
		if !ok {
			continue
		}
		amount := ""
		switch p := offer["price"].(type) {
		case string:
			amount = strings.TrimSpace(p)
		case json.Number:
			amount = p.String()
		}
		if amountPattern.MatchString(amount) {
			prices = append(prices, models.MenuPrice{Label: plainMenuText(offer["name"]), Amount: amount, Currency: plainMenuText(offer["priceCurrency"])})
		}
		prices = append(prices, menuPricesNested(offer["priceSpecification"])...)
	}
	return prices
}

func menuPricesNested(value interface{}) []models.MenuPrice {
	if value == nil {
		return nil
	}
	return menuPrices(value)
}

// Only explicit MenuItem records are treated as dishes. Product prices, price
// ranges and arbitrary numbers on a page are never guessed to be menu prices.
func parseMenuPage(body, source string) ([]models.MenuItem, []string) {
	items := make([]models.MenuItem, 0)
	links := make([]string, 0)
	base, _ := url.Parse(source)
	addLink := func(raw string) {
		relative, err := url.Parse(raw)
		if err != nil || raw == "" || strings.HasPrefix(raw, "#") {
			return
		}
		resolved := base.ResolveReference(relative)
		resolved.Fragment = ""
		if _, err := menuURL(resolved.String()); err == nil && resolved.String() != source {
			links = append(links, resolved.String())
		}
	}
	var walk func(interface{}, string, int)
	walk = func(value interface{}, section string, depth int) {
		if depth > 30 || len(items) >= 300 {
			return
		}
		switch node := value.(type) {
		case []interface{}:
			for _, child := range node {
				walk(child, section, depth+1)
			}
		case map[string]interface{}:
			if schemaType(node, "MenuSection") {
				section = plainMenuText(node["name"])
			}
			if schemaType(node, "MenuItem") {
				name := plainMenuText(node["name"])
				if name != "" {
					items = append(items, models.MenuItem{Name: name, Description: plainMenuText(node["description"]), Section: section, Prices: menuPrices(node["offers"]), SourceURL: source})
				}
				return
			}
			for _, key := range []string{"hasMenu", "menu"} {
				if link, ok := node[key].(string); ok {
					addLink(link)
				}
			}
			if schemaType(node, "Menu") {
				if link, ok := node["url"].(string); ok {
					addLink(link)
				}
			}
			for _, key := range []string{"@graph", "hasMenu", "menu", "hasMenuSection", "hasMenuItem", "mainEntity", "itemListElement", "item"} {
				walk(node[key], section, depth+1)
			}
		}
	}
	for _, script := range scriptPattern.FindAllStringSubmatch(body, -1) {
		if !strings.EqualFold(attribute(script[1], "type"), "application/ld+json") {
			continue
		}
		var value interface{}
		decoder := json.NewDecoder(strings.NewReader(script[2]))
		decoder.UseNumber()
		if decoder.Decode(&value) == nil {
			walk(value, "", 0)
		}
	}
	for _, anchor := range anchorPattern.FindAllStringSubmatch(body, -1) {
		if strings.Contains(strings.ToLower(plainMenuText(anchor[2])), "menu") {
			addLink(attribute(anchor[1], "href"))
		}
	}
	return items, links
}

func GetRestaurantMenu(ctx context.Context, placeID string) (models.RestaurantMenu, error) {
	menu := models.RestaurantMenu{Items: make([]models.MenuItem, 0), CheckedAt: time.Now().UTC()}
	if !ValidMenuPlaceID(placeID) {
		return menu, fmt.Errorf("invalid place ID")
	}
	key := "menu:v1:" + placeID
	if cache.RedisClient != nil {
		if data, err := cache.RedisClient.Get(ctx, key).Bytes(); err == nil && json.Unmarshal(data, &menu) == nil {
			return menu, nil
		}
	}
	apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
	if apiKey == "" {
		return menu, fmt.Errorf("Google Places API key not configured")
	}
	ctx, cancel := context.WithTimeout(ctx, 25*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://places.googleapis.com/v1/places/"+placeID, nil)
	if err != nil {
		return menu, err
	}
	req.Header.Set("X-Goog-Api-Key", apiKey)
	req.Header.Set("X-Goog-FieldMask", "websiteUri")
	resp, err := (&http.Client{Timeout: 8 * time.Second}).Do(req)
	if err != nil {
		return menu, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return menu, fmt.Errorf("restaurant website lookup failed")
	}
	var details struct {
		WebsiteURI string `json:"websiteUri"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 65536)).Decode(&details); err != nil {
		return menu, err
	}
	if _, err := menuURL(details.WebsiteURI); err == nil {
		menu.WebsiteURL = details.WebsiteURI
	}
	if menu.WebsiteURL != "" {
		client := newMenuClient()
		defer client.CloseIdleConnections()
		queue := []string{menu.WebsiteURL}
		visited := make(map[string]bool)
		seenItems := make(map[string]bool)
		for len(queue) > 0 && len(visited) < 3 && ctx.Err() == nil {
			page := queue[0]
			queue = queue[1:]
			if visited[page] {
				continue
			}
			visited[page] = true
			body, source, err := fetchMenuPage(ctx, client, page)
			if err != nil {
				continue
			}
			items, links := parseMenuPage(body, source)
			for _, item := range items {
				identity := item.Section + "\x00" + item.Name
				if !seenItems[identity] {
					menu.Items = append(menu.Items, item)
					seenItems[identity] = true
				}
			}
			for _, link := range links {
				if menu.MenuURL == "" {
					menu.MenuURL = link
				}
				// Follow only pages on this official site's host. External menu
				// providers remain links rather than being crawled.
				u, _ := url.Parse(link)
				base, _ := url.Parse(source)
				if u.Hostname() == base.Hostname() && len(queue) < 10 {
					queue = append(queue, link)
				}
			}
		}
	}
	if cache.RedisClient != nil && ctx.Err() == nil {
		if data, err := json.Marshal(menu); err == nil {
			cache.RedisClient.Set(ctx, key, data, time.Hour)
		}
	}
	return menu, nil
}
