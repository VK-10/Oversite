package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type Feed struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type Country struct {
	Name string
	Code string
}

var countries = []Country{
	{"afghanistan", "AF"},
	{"albania", "AL"},
	{"algeria", "DZ"},
	{"andorra", "AD"},
	{"angola", "AO"},
	{"antigua and barbuda", "AG"},
	{"argentina", "AR"},
	{"armenia", "AM"},
	{"australia", "AU"},
	{"austria", "AT"},
	{"azerbaijan", "AZ"},

	{"bahamas", "BS"},
	{"bahrain", "BH"},
	{"bangladesh", "BD"},
	{"barbados", "BB"},
	{"belarus", "BY"},
	{"belgium", "BE"},
	{"belize", "BZ"},
	{"benin", "BJ"},
	{"bhutan", "BT"},
	{"bolivia", "BO"},
	{"bosnia and herzegovina", "BA"},
	{"botswana", "BW"},
	{"brazil", "BR"},
	{"brunei", "BN"},
	{"bulgaria", "BG"},
	{"burkina faso", "BF"},
	{"burundi", "BI"},

	{"cabo verde", "CV"},
	{"cambodia", "KH"},
	{"cameroon", "CM"},
	{"canada", "CA"},
	{"central african republic", "CF"},
	{"chad", "TD"},
	{"chile", "CL"},
	{"china", "CN"},
	{"colombia", "CO"},
	{"comoros", "KM"},
	{"republic of the congo", "CG"},
	{"costa rica", "CR"},
	{"croatia", "HR"},
	{"cuba", "CU"},
	{"cyprus", "CY"},
	{"czechia", "CZ"},

	{"denmark", "DK"},
	{"djibouti", "DJ"},
	{"dominica", "DM"},
	{"dominican republic", "DO"},

	{"ecuador", "EC"},
	{"egypt", "EG"},
	{"el salvador", "SV"},
	{"equatorial guinea", "GQ"},
	{"eritrea", "ER"},
	{"estonia", "EE"},
	{"eswatini", "SZ"},
	{"ethiopia", "ET"},

	{"fiji", "FJ"},
	{"finland", "FI"},
	{"france", "FR"},

	{"gabon", "GA"},
	{"gambia", "GM"},
	{"georgia", "GE"},
	{"germany", "DE"},
	{"ghana", "GH"},
	{"greece", "GR"},
	{"grenada", "GD"},
	{"guatemala", "GT"},
	{"guinea", "GN"},
	{"guinea-bissau", "GW"},
	{"guyana", "GY"},

	{"haiti", "HT"},
	{"honduras", "HN"},
	{"hungary", "HU"},

	{"iceland", "IS"},
	{"india", "IN"},
	{"indonesia", "ID"},
	{"iran", "IR"},
	{"iraq", "IQ"},
	{"ireland", "IE"},
	{"israel", "IL"},
	{"italy", "IT"},

	{"jamaica", "JM"},
	{"japan", "JP"},
	{"jordan", "JO"},

	{"kazakhstan", "KZ"},
	{"kenya", "KE"},
	{"kiribati", "KI"},
	{"kuwait", "KW"},
	{"kyrgyzstan", "KG"},

	{"laos", "LA"},
	{"latvia", "LV"},
	{"lebanon", "LB"},
	{"lesotho", "LS"},
	{"liberia", "LR"},
	{"libya", "LY"},
	{"liechtenstein", "LI"},
	{"lithuania", "LT"},
	{"luxembourg", "LU"},

	{"madagascar", "MG"},
	{"malawi", "MW"},
	{"malaysia", "MY"},
	{"maldives", "MV"},
	{"mali", "ML"},
	{"malta", "MT"},
	{"marshall islands", "MH"},
	{"mauritania", "MR"},
	{"mauritius", "MU"},
	{"mexico", "MX"},
	{"micronesia", "FM"},
	{"moldova", "MD"},
	{"monaco", "MC"},
	{"mongolia", "MN"},
	{"montenegro", "ME"},
	{"morocco", "MA"},
	{"mozambique", "MZ"},
	{"myanmar", "MM"},

	{"namibia", "NA"},
	{"nauru", "NR"},
	{"nepal", "NP"},
	{"netherlands", "NL"},
	{"new zealand", "NZ"},
	{"nicaragua", "NI"},
	{"niger", "NE"},
	{"nigeria", "NG"},
	{"north korea", "KP"},
	{"north macedonia", "MK"},
	{"norway", "NO"},

	{"oman", "OM"},

	{"pakistan", "PK"},
	{"palau", "PW"},
	{"palestine", "PS"},
	{"panama", "PA"},
	{"papua new guinea", "PG"},
	{"paraguay", "PY"},
	{"peru", "PE"},
	{"philippines", "PH"},
	{"poland", "PL"},
	{"portugal", "PT"},

	{"qatar", "QA"},

	{"romania", "RO"},
	{"russia", "RU"},
	{"rwanda", "RW"},

	{"saint kitts and nevis", "KN"},
	{"saint lucia", "LC"},
	{"saint vincent and the grenadines", "VC"},
	{"samoa", "WS"},
	{"san marino", "SM"},
	{"sao tome and principe", "ST"},
	{"saudi arabia", "SA"},
	{"senegal", "SN"},
	{"serbia", "RS"},
	{"seychelles", "SC"},
	{"sierra leone", "SL"},
	{"singapore", "SG"},
	{"slovakia", "SK"},
	{"slovenia", "SI"},
	{"solomon islands", "SB"},
	{"somalia", "SO"},
	{"south africa", "ZA"},
	{"south korea", "KR"},
	{"south sudan", "SS"},
	{"spain", "ES"},
	{"sri lanka", "LK"},
	{"sudan", "SD"},
	{"suriname", "SR"},
	{"sweden", "SE"},
	{"switzerland", "CH"},
	{"syria", "SY"},

	{"tajikistan", "TJ"},
	{"tanzania", "TZ"},
	{"thailand", "TH"},
	{"timor-leste", "TL"},
	{"togo", "TG"},
	{"tonga", "TO"},
	{"trinidad and tobago", "TT"},
	{"tunisia", "TN"},
	{"turkey", "TR"},
	{"turkmenistan", "TM"},
	{"tuvalu", "TV"},

	{"uganda", "UG"},
	{"ukraine", "UA"},
	{"united arab emirates", "AE"},
	{"united kingdom", "GB"},
	{"united states", "US"},
	{"uruguay", "UY"},
	{"uzbekistan", "UZ"},

	{"vanuatu", "VU"},
	{"vatican city", "VA"},
	{"venezuela", "VE"},
	{"vietnam", "VN"},

	{"yemen", "YE"},

	{"zambia", "ZM"},
	{"zimbabwe", "ZW"},
}

// var apiURL = "http://localhost:8000/api/feeds"
var apiURL = "http://localhost:9000/v1/feeds"

func BuildGoogleRSS(country Country) string {
	// Use search-based → works for ALL countries
	query := fmt.Sprintf("%s (news OR politics OR economy)", country.Name)
	return fmt.Sprintf(
		"https://news.google.com/rss/search?q=%s&hl=en&gl=US&ceid=US:en",
		url.QueryEscape(query),
	)
}

//Generate Google RSS (search-based fallback)
// func buildFeed(country string) Feed {
// 	return Feed{
// 		Name: country,
// 		URL:  fmt.Sprintf("https://news.google.com/rss/search?q=%s&hl=en&gl=US&ceid=US:en", country),
// 	}
// }

// 🔹 POST request
func createFeed(feed Feed) error {
	jsonData, err := json.Marshal(feed)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	key := ""

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "ApiKey "+key)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 || resp.StatusCode == 201 {
		fmt.Printf("Created: %s\n", feed.Name)
	} else {
		fmt.Printf(" Failed: %s → %d\n", feed.Name, resp.StatusCode)
	}

	return nil
}

func scripting() error {

	var failed []string

	for _, c := range countries {
		url := BuildGoogleRSS(c)

		feed := Feed{
			Name: c.Name,
			URL:  url,
		}

		if err := createFeed(feed); err != nil {
			fmt.Println("error:", err)
			failed = append(failed, c.Name)
		}
		time.Sleep(150 * time.Millisecond)

	}

	if len(failed) > 0 {
		return fmt.Errorf("scripting failed: %v", failed)
	}
	return nil
}
