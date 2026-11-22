package vpngate

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultPrimaryAPIURL = "https://www.vpngate.net/api/iphone/"
	defaultMirrorAPIURL  = "http://v-dot-pn-ams2.opengw.net:34637/api/iphone/"
	cacheExpiry          = 10 * time.Minute
	requestTimeout       = 20 * time.Second
)

// Client fetches and caches the VPNGate server list.
type Client struct {
	mu         sync.RWMutex
	cached     []Server
	cachedAt   time.Time
	httpClient *http.Client
	endpoints  []string
}

// NewClient creates a new VPNGate API client with default primary and mirror endpoints.
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: requestTimeout},
		endpoints:  []string{defaultPrimaryAPIURL, defaultMirrorAPIURL},
	}
}

// SetEndpoints overrides the API/mirror endpoints in order of priority.
func (c *Client) SetEndpoints(endpoints []string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.endpoints = append([]string(nil), endpoints...)
}

// Endpoints returns a copy of the currently configured endpoints.
func (c *Client) Endpoints() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return append([]string(nil), c.endpoints...)
}

// GetServers returns the server list, using a cache when fresh.
// If country is non-empty, results are filtered to that ISO code.
// If autoRank is true, servers are sorted by computed score.
func (c *Client) GetServers(country string, autoRank bool) ([]Server, error) {
	servers, err := c.fetchOrCached()
	if err != nil {
		return nil, err
	}

	if country != "" {
		servers = FilterByCountry(servers, country)
	}

	if autoRank {
		servers = RankServers(servers)
	}

	return servers, nil
}

// BestServer returns the highest-scored server, optionally filtered by country.
func (c *Client) BestServer(country string) (*Server, error) {
	servers, err := c.GetServers(country, true)
	if err != nil {
		return nil, err
	}
	if len(servers) == 0 {
		return nil, fmt.Errorf("no servers available for country %q", country)
	}
	return &servers[0], nil
}

// Countries returns the sorted list of unique country codes available.
func (c *Client) Countries() ([]string, error) {
	servers, err := c.fetchOrCached()
	if err != nil {
		return nil, err
	}
	seen := make(map[string]struct{}, 50)
	for _, s := range servers {
		seen[s.CountryShort] = struct{}{}
	}
	out := make([]string, 0, len(seen))
	for k := range seen {
		out = append(out, k)
	}
	return out, nil
}

// InvalidateCache forces the next call to re-fetch from the API.
func (c *Client) InvalidateCache() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cachedAt = time.Time{}
}

func (c *Client) fetchOrCached() ([]Server, error) {
	c.mu.RLock()
	if !c.cachedAt.IsZero() && time.Since(c.cachedAt) < cacheExpiry {
		result := make([]Server, len(c.cached))
		copy(result, c.cached)
		c.mu.RUnlock()
		return result, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	// Double-check after acquiring write lock.
	if !c.cachedAt.IsZero() && time.Since(c.cachedAt) < cacheExpiry {
		return c.cached, nil
	}

	servers, err := c.fetchLocked()
	if err != nil {
		if len(c.cached) > 0 {
			log.Printf("vpngate: fetch failed, using stale cache: %v", err)
			return c.cached, nil
		}
		return nil, err
	}

	c.cached = servers
	c.cachedAt = time.Now()
	log.Printf("vpngate: refreshed server list (%d servers)", len(servers))
	return servers, nil
}

func (c *Client) fetchLocked() ([]Server, error) {
	endpoints := make([]string, len(c.endpoints))
	copy(endpoints, c.endpoints)

	if len(endpoints) == 0 {
		endpoints = []string{defaultPrimaryAPIURL, defaultMirrorAPIURL}
	}

	var lastErr error
	for _, ep := range endpoints {
		servers, err := c.fetchFromURL(ep)
		if err == nil && len(servers) > 0 {
			log.Printf("vpngate: fetched %d servers from %s", len(servers), ep)
			return servers, nil
		}
		if err != nil {
			log.Printf("vpngate: endpoint %s failed: %v", ep, err)
			lastErr = err
		} else {
			lastErr = fmt.Errorf("endpoint %s returned 0 servers", ep)
		}
	}

	if lastErr != nil {
		return nil, fmt.Errorf("vpngate fetch failed (all %d endpoints failed): %w", len(endpoints), lastErr)
	}
	return nil, fmt.Errorf("vpngate: no endpoints configured")
}

func (c *Client) fetchFromURL(url string) ([]Server, error) {
	resp, err := c.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	return parseCSV(string(body))
}

func parseCSV(raw string) ([]Server, error) {
	lines := strings.Split(raw, "\n")

	// Strip comment/marker lines that start with * or #
	var dataLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "*") {
			continue
		}
		dataLines = append(dataLines, line)
	}

	if len(dataLines) == 0 {
		return nil, fmt.Errorf("vpngate: empty response")
	}

	r := csv.NewReader(strings.NewReader(strings.Join(dataLines, "\n")))
	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("parse CSV: %w", err)
	}

	if len(records) < 2 {
		return nil, fmt.Errorf("vpngate: no data rows")
	}

	// First row is the header (starts with #HostName,...); strip leading #
	header := records[0]
	if len(header) > 0 {
		header[0] = strings.TrimPrefix(header[0], "#")
	}

	idx := make(map[string]int, len(header))
	for i, h := range header {
		idx[strings.TrimSpace(h)] = i
	}

	servers := make([]Server, 0, len(records)-1)
	for _, row := range records[1:] {
		if len(row) < len(header) {
			continue
		}
		s := Server{
			HostName:            field(row, idx, "HostName"),
			IP:                  field(row, idx, "IP"),
			Score:               parseInt64(field(row, idx, "Score")),
			Ping:                parseInt(field(row, idx, "Ping")),
			Speed:               parseInt64(field(row, idx, "Speed")),
			CountryLong:         field(row, idx, "CountryLong"),
			CountryShort:        field(row, idx, "CountryShort"),
			NumVpnSessions:      parseInt(field(row, idx, "NumVpnSessions")),
			Uptime:              parseInt64(field(row, idx, "Uptime")),
			TotalUsers:          parseInt64(field(row, idx, "TotalUsers")),
			TotalTraffic:        parseInt64(field(row, idx, "TotalTraffic")),
			LogType:             field(row, idx, "LogType"),
			Operator:            field(row, idx, "Operator"),
			Message:             field(row, idx, "Message"),
			OpenVPNConfigBase64: field(row, idx, "OpenVPN_ConfigData_Base64"),
		}
		servers = append(servers, s)
	}

	return servers, nil
}

func field(row []string, idx map[string]int, name string) string {
	i, ok := idx[name]
	if !ok || i >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[i])
}

func parseInt64(s string) int64 {
	v, _ := strconv.ParseInt(s, 10, 64)
	return v
}

func parseInt(s string) int {
	v, _ := strconv.Atoi(s)
	return v
}
