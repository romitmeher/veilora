//go:build prod

package constants

// InstanceID is the unique identifier for the application instance.
// This should be overridden at build time using ldflags:
// -ldflags "-X 'github.com/irbis-sh/zen-desktop/internal/constants.InstanceID=<uuid>'"
// If not overridden, falls back to a default UUID.
var InstanceID = "6d8a3628-0e55-4568-a20e-e1c4a1e76f44"
