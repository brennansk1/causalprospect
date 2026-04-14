"""Causally-informed XGBoost classifier."""

from __future__ import annotations

import xgboost as xgb


def train_xgb(X_train, y_train, *, random_state: int = 42) -> xgb.XGBClassifier:
    n_pos = int((y_train == 1).sum())
    n_neg = len(y_train) - n_pos
    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        scale_pos_weight=max(1.0, n_neg / max(1, n_pos)),
        tree_method="hist",
        eval_metric="aucpr",
        random_state=random_state,
    )
    model.fit(X_train, y_train)
    return model
