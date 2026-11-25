# MT5 read-only preparation — not enabled

The current free-tools release serves only disconnected status through the authenticated `/api/tools/mt5-snapshot` endpoint. No inbound bridge, terminal worker or broker execution method is installed or running here.

See [the kit review and required pairing architecture](../../docs/TRADING_TOOLS_BRIDGE_REVIEW.md). Do not copy the supplied single-member proxy into production, turn on the previous global PC worker, or expose its local port as a shortcut to multi-member connectivity. Future user-owned devices must push read-only snapshots over secured outbound HTTPS after owner pairing and account confirmation.
