package models

import "time"

type MenuPrice struct {
	Label    string `json:"label,omitempty"`
	Amount   string `json:"amount"`
	Currency string `json:"currency,omitempty"`
}

type MenuItem struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Section     string      `json:"section,omitempty"`
	Prices      []MenuPrice `json:"prices"`
	SourceURL   string      `json:"source_url"`
}

type RestaurantMenu struct {
	WebsiteURL string     `json:"website_url,omitempty"`
	MenuURL    string     `json:"menu_url,omitempty"`
	Items      []MenuItem `json:"items"`
	CheckedAt  time.Time  `json:"checked_at"`
}
