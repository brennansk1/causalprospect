"""Graph Attention Network for mineral prospectivity over the H3 grid."""

from __future__ import annotations


def build_gat(in_channels: int, hidden_channels: int = 128, heads: int = 4, dropout: float = 0.3):
    """Return a CausalGAT model. Imports torch lazily so the package is
    usable without the deep-learning extras installed."""
    import torch
    from torch_geometric.nn import GATv2Conv

    class CausalGAT(torch.nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.input_proj = torch.nn.Linear(in_channels, hidden_channels)
            self.gat1 = GATv2Conv(hidden_channels, hidden_channels // heads,
                                  heads=heads, dropout=dropout, edge_dim=3)
            self.gat2 = GATv2Conv(hidden_channels, hidden_channels // heads,
                                  heads=heads, dropout=dropout, edge_dim=3)
            self.gat3 = GATv2Conv(hidden_channels, hidden_channels // heads,
                                  heads=heads, dropout=dropout, edge_dim=3)
            self.head = torch.nn.Sequential(
                torch.nn.Linear(hidden_channels, 64),
                torch.nn.ReLU(),
                torch.nn.Dropout(dropout),
                torch.nn.Linear(64, 1),
            )

        def forward(self, data):
            x, ei, ea = data.x, data.edge_index, data.edge_attr
            x = torch.relu(self.input_proj(x))
            x = torch.relu(self.gat1(x, ei, edge_attr=ea))
            x = torch.relu(self.gat2(x, ei, edge_attr=ea))
            x = torch.relu(self.gat3(x, ei, edge_attr=ea))
            return torch.sigmoid(self.head(x)).squeeze(-1)

    return CausalGAT()
