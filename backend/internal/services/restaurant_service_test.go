package services

import "testing"

func TestBuildRestaurantTextQueryUsesCuisineOnlyWhenSubCuisineIsEmptyOrAny(t *testing.T) {
	tests := []struct {
		name       string
		subCuisine string
	}{
		{name: "empty", subCuisine: ""},
		{name: "any", subCuisine: "Any"},
		{name: "trimmed any", subCuisine: "  Any  "},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := buildRestaurantTextQuery("Korean", test.subCuisine, "Duluth", "GA")
			want := "Korean restaurant in Duluth GA"

			if got != want {
				t.Fatalf("buildRestaurantTextQuery() = %q, want %q", got, want)
			}
		})
	}
}

func TestBuildRestaurantTextQueryIncludesSubCuisine(t *testing.T) {
	got := buildRestaurantTextQuery("Korean", "KBBQ", "Duluth", "GA")
	want := "Korean KBBQ restaurant in Duluth GA"

	if got != want {
		t.Fatalf("buildRestaurantTextQuery() = %q, want %q", got, want)
	}
}

func TestRestaurantCacheKeyIncludesNormalizedSubCuisineSegment(t *testing.T) {
	got := restaurantCacheKey(" Korean ", " KBBQ ", " Duluth ", " GA ")
	want := "restaurants:korean:kbbq:duluth:ga"

	if got != want {
		t.Fatalf("restaurantCacheKey() = %q, want %q", got, want)
	}
}

func TestRestaurantCacheKeyUsesEmptySegmentForAnySubCuisine(t *testing.T) {
	got := restaurantCacheKey("Korean", "Any", "Duluth", "GA")
	want := "restaurants:korean::duluth:ga"

	if got != want {
		t.Fatalf("restaurantCacheKey() = %q, want %q", got, want)
	}
}
