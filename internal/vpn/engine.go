package vpn

// Engine represents a VPN connection backend.
type Engine interface {
	// Name returns the engine identifier.
	Name() string
	// Available reports whether the engine is usable on this system.
	Available() bool
	// Connect establishes a VPN connection using the provided OpenVPN config bytes.
	// statusCh receives state updates; it is closed when the engine exits.
	Connect(ovpnConfig []byte, statusCh chan<- Status) error
	// Disconnect tears down the active connection.
	Disconnect() error
}

// EngineType identifies which VPN engine to use.
type EngineType string

const (
	EngineOpenVPN    EngineType = "openvpn"
	EngineSoftEther  EngineType = "softether"
)

// State represents the current connection state.
type State string

const (
	StateDisconnected  State = "disconnected"
	StateConnecting    State = "connecting"
	StateConnected     State = "connected"
	StateDisconnecting State = "disconnecting"
	StateError         State = "error"
)

// Status carries a state update and optional detail message.
type Status struct {
	State   State  `json:"state"`
	Message string `json:"message"`
}
