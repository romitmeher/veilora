package vpngate

// Server represents a VPNGate public VPN server entry.
type Server struct {
	HostName              string `json:"hostName"`
	IP                    string `json:"ip"`
	Score                 int64  `json:"score"`
	Ping                  int    `json:"ping"`
	Speed                 int64  `json:"speed"`
	CountryLong           string `json:"countryLong"`
	CountryShort          string `json:"countryShort"`
	NumVpnSessions        int    `json:"numVpnSessions"`
	Uptime                int64  `json:"uptime"`
	TotalUsers            int64  `json:"totalUsers"`
	TotalTraffic          int64  `json:"totalTraffic"`
	LogType               string `json:"logType"`
	Operator              string `json:"operator"`
	Message               string `json:"message"`
	OpenVPNConfigBase64   string `json:"openVpnConfigBase64"`
	ComputedScore         float64 `json:"computedScore"`
}
