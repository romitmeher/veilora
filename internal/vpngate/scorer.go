package vpngate

import "sort"

// scoreServer computes a composite score for a server.
// Higher is better. Weights: speed (40%), ping (30%), uptime (20%), sessions (10%).
func scoreServer(s *Server) float64 {
	const maxSpeed = 1_000_000_000.0 // 1 Gbps reference
	const maxPing = 500.0
	const maxUptime = 30.0 * 24 * 60 * 60 * 1000 // 30 days in ms

	speedScore := float64(s.Speed) / maxSpeed
	if speedScore > 1 {
		speedScore = 1
	}

	pingScore := 1.0
	if s.Ping > 0 {
		pingScore = 1.0 - (float64(s.Ping) / maxPing)
		if pingScore < 0 {
			pingScore = 0
		}
	}

	uptimeScore := float64(s.Uptime) / maxUptime
	if uptimeScore > 1 {
		uptimeScore = 1
	}

	sessionScore := 0.0
	if s.NumVpnSessions > 0 {
		// Prefer servers with moderate load — not too busy, not empty
		if s.NumVpnSessions < 100 {
			sessionScore = 1.0
		} else if s.NumVpnSessions < 500 {
			sessionScore = 0.5
		}
	}

	return speedScore*0.40 + pingScore*0.30 + uptimeScore*0.20 + sessionScore*0.10
}

// RankServers scores and sorts servers from best to worst.
// Servers with no OpenVPN config are excluded.
func RankServers(servers []Server) []Server {
	ranked := make([]Server, 0, len(servers))
	for i := range servers {
		if servers[i].OpenVPNConfigBase64 == "" {
			continue
		}
		servers[i].ComputedScore = scoreServer(&servers[i])
		ranked = append(ranked, servers[i])
	}
	sort.Slice(ranked, func(i, j int) bool {
		return ranked[i].ComputedScore > ranked[j].ComputedScore
	})
	return ranked
}

// FilterByCountry returns only servers matching the given ISO country code (case-insensitive).
// If country is empty, all servers are returned.
func FilterByCountry(servers []Server, country string) []Server {
	if country == "" {
		return servers
	}
	out := make([]Server, 0, len(servers))
	for _, s := range servers {
		if equalFold(s.CountryShort, country) {
			out = append(out, s)
		}
	}
	return out
}

func equalFold(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		ca, cb := a[i], b[i]
		if ca >= 'a' && ca <= 'z' {
			ca -= 32
		}
		if cb >= 'a' && cb <= 'z' {
			cb -= 32
		}
		if ca != cb {
			return false
		}
	}
	return true
}
