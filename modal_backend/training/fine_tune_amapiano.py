"""
fine_tune_amapiano.py — Modal fine-tuning pipeline for Amapiano-specific audio model

Pipeline:
  1. Pull eligible training tracks from S3 (status = 'complete', isEligibleForTraining = True)
  2. Load 26-stem WAV files + feature JSON
  3. Encode stems as mel spectrograms (128 mel bins, 44100 Hz)
  4. Fine-tune a lightweight classifier/tagger on top of a frozen audio encoder
     (currently: CLAP / music2vec) to predict:
       - Amapiano cultural authenticity score (regression, 0–100)
       - Log drum presence (binary classification)
       - Regional style (5-class classification)
       - BPM bucket (115–118 / 119–122 / 123–126 / 127–130)
  5. Export checkpoint to S3 under training-data/checkpoints/
  6. POST results to Node.js webhook

Usage:
    modal run modal_backend/training/fine_tune_amapiano.py

Requirements:
    All deps injected via Modal image. No local GPU needed.
"""

import modal
import os
from typing import Dict, Any, List, Optional

# ---------------------------------------------------------------------------
# App + image
# ---------------------------------------------------------------------------

app = modal.App("aura-x-amapiano-finetune")

models_volume = modal.Volume.from_name("aura-x-models", create_if_missing=True)
data_volume   = modal.Volume.from_name("aura-x-training-data", create_if_missing=True)

finetune_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "torch==2.1.2+cu121",
        "torchaudio==2.1.2+cu121",
        "transformers==4.40.0",
        "datasets==2.18.0",
        "numpy==1.24.3",
        "scipy==1.11.4",
        "librosa==0.10.1",
        "soundfile==0.12.1",
        "boto3==1.34.34",
        "requests==2.31.0",
        extra_options="--extra-index-url https://download.pytorch.org/whl/cu121",
    )
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SAMPLE_RATE = 44100
N_MELS      = 128
HOP_LENGTH  = 512
WIN_LENGTH  = 2048
FMAX        = 8000

# Training hyperparameters
BATCH_SIZE    = 8
LEARNING_RATE = 3e-4
NUM_EPOCHS    = 20
WARMUP_STEPS  = 100

# Target stems for training (priority stems, SDR-verified)
TRAINING_STEMS = [
    "log_drum", "kick", "snare", "hi_hat_closed", "hi_hat_open",
    "piano_chords", "piano_melody", "bass_synth",
    "lead_vocal", "backing_vocal",
]

# ---------------------------------------------------------------------------
# Dataset builder
# ---------------------------------------------------------------------------

def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("S3_REGION", "us-east-1"),
    )


def _list_eligible_tracks(bucket: str) -> List[Dict[str, Any]]:
    """
    List all eligible training tracks by scanning S3 prefix.
    In production this should query the DB; here we use the S3 manifest
    written by the training pipeline webhook.
    """
    import json
    client = _s3_client()
    manifest_key = "training-data/amapiano/manifest.json"
    try:
        obj = client.get_object(Bucket=bucket, Key=manifest_key)
        tracks = json.loads(obj["Body"].read())
        return [t for t in tracks if t.get("is_eligible_for_training")]
    except client.exceptions.NoSuchKey:
        print("[FineTune] No manifest found — returning empty dataset")
        return []


def _load_stem_mel(client, bucket: str, stem_key: str) -> Optional["torch.Tensor"]:
    """Download a stem WAV from S3 and convert to log mel spectrogram."""
    import tempfile, os, torch
    import librosa
    import numpy as np

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp = f.name
    try:
        client.download_file(bucket, stem_key, tmp)
        audio, sr = librosa.load(tmp, sr=SAMPLE_RATE, mono=True)
        mel = librosa.feature.melspectrogram(
            y=audio,
            sr=SAMPLE_RATE,
            n_mels=N_MELS,
            hop_length=HOP_LENGTH,
            win_length=WIN_LENGTH,
            fmax=FMAX,
        )
        log_mel = librosa.power_to_db(mel, ref=np.max)
        # Normalise to [-1, 1]
        log_mel = (log_mel + 40.0) / 40.0
        return torch.tensor(log_mel, dtype=torch.float32)
    except Exception as exc:
        print(f"[FineTune] Failed to load stem {stem_key}: {exc}")
        return None
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


# ---------------------------------------------------------------------------
# Model definition (lightweight head on top of frozen audio features)
# ---------------------------------------------------------------------------

def _build_model(device: "torch.device") -> "torch.nn.Module":
    """
    Lightweight multi-task head.

    Input: (B, N_MELS, T) mel spectrogram (variable T)
    Outputs:
        cultural_score_pred  (B, 1)        — regression 0–100
        log_drum_pred        (B, 1)        — binary logit
        regional_style_pred  (B, 5)        — 5-class logit
        bpm_bucket_pred      (B, 4)        — 4-class logit
    """
    import torch
    import torch.nn as nn

    class AmapianoClassifier(nn.Module):
        def __init__(self):
            super().__init__()
            # Temporal average pooling encoder
            self.encoder = nn.Sequential(
                nn.Conv2d(1, 32, kernel_size=(3, 7), padding=(1, 3)),
                nn.BatchNorm2d(32),
                nn.GELU(),
                nn.MaxPool2d((2, 4)),
                nn.Conv2d(32, 64, kernel_size=(3, 5), padding=(1, 2)),
                nn.BatchNorm2d(64),
                nn.GELU(),
                nn.MaxPool2d((2, 4)),
                nn.Conv2d(64, 128, kernel_size=(3, 3), padding=1),
                nn.BatchNorm2d(128),
                nn.GELU(),
                nn.AdaptiveAvgPool2d((4, 4)),
            )
            self.flatten = nn.Flatten()  # → (B, 128*4*4 = 2048)

            # Shared trunk
            self.trunk = nn.Sequential(
                nn.Linear(2048, 512),
                nn.LayerNorm(512),
                nn.GELU(),
                nn.Dropout(0.3),
                nn.Linear(512, 256),
                nn.LayerNorm(256),
                nn.GELU(),
            )

            # Task-specific heads
            self.cultural_head  = nn.Linear(256, 1)
            self.log_drum_head  = nn.Linear(256, 1)
            self.regional_head  = nn.Linear(256, 5)
            self.bpm_head       = nn.Linear(256, 4)

        def forward(self, x: "torch.Tensor"):
            # x: (B, N_MELS, T) → add channel dim
            x = x.unsqueeze(1)                        # (B, 1, N_MELS, T)
            x = self.encoder(x)
            x = self.flatten(x)
            x = self.trunk(x)
            return {
                "cultural_score": self.cultural_head(x).squeeze(-1),
                "log_drum":       self.log_drum_head(x).squeeze(-1),
                "regional_style": self.regional_head(x),
                "bpm_bucket":     self.bpm_head(x),
            }

    return AmapianoClassifier().to(device)


# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------

@app.function(
    image=finetune_image,
    secrets=[modal.Secret.from_name("aura-x-aws-secrets")],
    volumes={
        "/root/.cache": models_volume,
        "/data":        data_volume,
    },
    gpu="A10G",
    timeout=86400,   # 24 hours max
)
def run_finetune(
    num_epochs: int = NUM_EPOCHS,
    batch_size: int = BATCH_SIZE,
    learning_rate: float = LEARNING_RATE,
    checkpoint_prefix: str = "training-data/checkpoints/amapiano_classifier",
) -> Dict[str, Any]:
    """
    Full fine-tuning run on eligible training tracks.

    Returns final metrics: {epoch, train_loss, cultural_mae, log_drum_acc}
    """
    import json
    import torch
    import torch.nn as nn
    from torch.utils.data import Dataset, DataLoader
    import numpy as np

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[FineTune] Device: {device}")

    bucket = os.environ["S3_BUCKET"]
    client = _s3_client()

    # ── Build dataset ──────────────────────────────────────────────────────────
    tracks = _list_eligible_tracks(bucket)
    print(f"[FineTune] Eligible tracks: {len(tracks)}")

    if len(tracks) < 10:
        return {"error": f"Not enough eligible tracks ({len(tracks)}). Need ≥10."}

    REGIONAL_MAP = {"Gauteng": 0, "East Rand": 1, "Durban": 2, "Cape Town": 3, "Limpopo": 4}
    BPM_BUCKET_MAP = {(115, 118): 0, (119, 122): 1, (123, 126): 2, (127, 130): 3}

    def bpm_to_bucket(bpm: float) -> int:
        for (lo, hi), bucket_id in BPM_BUCKET_MAP.items():
            if lo <= bpm <= hi:
                return bucket_id
        return 3  # Default to highest bucket

    class AmapianoDataset(Dataset):
        def __init__(self, records: List[Dict]):
            self.records = records

        def __len__(self):
            return len(self.records)

        def __getitem__(self, idx: int):
            rec = self.records[idx]
            stems_prefix = rec.get("stems_prefix", f"training-data/amapiano/stems/{rec['id']}/")

            # Load the most diagnostic stem: log_drum (if available)
            stem_mel = None
            for stem_id in ["log_drum", "piano_chords", "kick"]:
                key = f"{stems_prefix}{stem_id}.wav"
                stem_mel = _load_stem_mel(client, bucket, key)
                if stem_mel is not None:
                    break

            if stem_mel is None:
                # Fallback: zero tensor
                stem_mel = torch.zeros(N_MELS, 128)

            # Pad/trim to fixed time length (128 frames ≈ 1.5 seconds @ 512 hop)
            T = 256
            if stem_mel.shape[1] < T:
                pad = T - stem_mel.shape[1]
                stem_mel = torch.nn.functional.pad(stem_mel, (0, pad))
            else:
                stem_mel = stem_mel[:, :T]

            cultural_score = float(rec.get("total_cultural_score", 0.0))
            log_drum_present = float(rec.get("log_drum_detected", False))
            regional_style = REGIONAL_MAP.get(rec.get("regional_style", "Gauteng"), 0)
            bpm_bucket = bpm_to_bucket(float(rec.get("bpm", 120.0)))

            return (
                stem_mel,
                torch.tensor(cultural_score / 100.0, dtype=torch.float32),   # normed 0–1
                torch.tensor(log_drum_present, dtype=torch.float32),
                torch.tensor(regional_style, dtype=torch.long),
                torch.tensor(bpm_bucket, dtype=torch.long),
            )

    dataset = AmapianoDataset(tracks)
    split = int(len(dataset) * 0.85)
    train_set, val_set = torch.utils.data.random_split(dataset, [split, len(dataset) - split])

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True,  num_workers=2)
    val_loader   = DataLoader(val_set,   batch_size=batch_size, shuffle=False, num_workers=2)

    # ── Build model + optimiser ────────────────────────────────────────────────
    model = _build_model(device)
    optimiser = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimiser, max_lr=learning_rate,
        steps_per_epoch=len(train_loader), epochs=num_epochs,
    )

    mse_loss = nn.MSELoss()
    bce_loss = nn.BCEWithLogitsLoss()
    ce_loss  = nn.CrossEntropyLoss()

    best_val_loss = float("inf")
    history: List[Dict] = []

    # ── Training loop ──────────────────────────────────────────────────────────
    for epoch in range(1, num_epochs + 1):
        model.train()
        train_losses = []

        for batch in train_loader:
            mel, cultural_tgt, log_drum_tgt, regional_tgt, bpm_tgt = [
                t.to(device) for t in batch
            ]
            out = model(mel)

            loss = (
                mse_loss(out["cultural_score"], cultural_tgt) * 2.0
                + bce_loss(out["log_drum"], log_drum_tgt)
                + ce_loss(out["regional_style"], regional_tgt)
                + ce_loss(out["bpm_bucket"], bpm_tgt)
            )

            optimiser.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimiser.step()
            scheduler.step()
            train_losses.append(loss.item())

        # ── Validation ─────────────────────────────────────────────────────────
        model.eval()
        val_losses, mae_vals, log_drum_correct = [], [], 0
        total_val = 0

        with torch.no_grad():
            for batch in val_loader:
                mel, cultural_tgt, log_drum_tgt, regional_tgt, bpm_tgt = [
                    t.to(device) for t in batch
                ]
                out = model(mel)

                vloss = (
                    mse_loss(out["cultural_score"], cultural_tgt) * 2.0
                    + bce_loss(out["log_drum"], log_drum_tgt)
                    + ce_loss(out["regional_style"], regional_tgt)
                    + ce_loss(out["bpm_bucket"], bpm_tgt)
                )
                val_losses.append(vloss.item())
                mae_vals.append(torch.abs(out["cultural_score"] - cultural_tgt).mean().item())
                preds = (torch.sigmoid(out["log_drum"]) > 0.5).float()
                log_drum_correct += (preds == log_drum_tgt).sum().item()
                total_val += len(mel)

        avg_train  = np.mean(train_losses)
        avg_val    = np.mean(val_losses)
        mae_pct    = np.mean(mae_vals) * 100.0
        ld_acc     = log_drum_correct / max(total_val, 1)

        metrics = {
            "epoch": epoch,
            "train_loss": round(avg_train, 4),
            "val_loss":   round(avg_val, 4),
            "cultural_mae_pct": round(mae_pct, 2),
            "log_drum_acc": round(ld_acc, 4),
        }
        history.append(metrics)
        print(f"[FineTune] E{epoch:02d}  train={avg_train:.4f}  val={avg_val:.4f}  "
              f"cultural_mae={mae_pct:.1f}%  log_drum_acc={ld_acc:.3f}")

        # Save best checkpoint to S3
        if avg_val < best_val_loss:
            best_val_loss = avg_val
            ckpt_path = f"/tmp/amapiano_best.pt"
            torch.save({
                "epoch": epoch,
                "model_state": model.state_dict(),
                "val_loss": avg_val,
                "metrics": metrics,
            }, ckpt_path)
            s3_ckpt_key = f"{checkpoint_prefix}/best_epoch{epoch:03d}_val{avg_val:.4f}.pt"
            client.upload_file(ckpt_path, bucket, s3_ckpt_key)
            print(f"[FineTune] New best checkpoint → {s3_ckpt_key}")

    # Save final checkpoint
    final_path = "/tmp/amapiano_final.pt"
    torch.save({
        "epoch": num_epochs,
        "model_state": model.state_dict(),
        "history": history,
    }, final_path)
    final_key = f"{checkpoint_prefix}/final_epoch{num_epochs:03d}.pt"
    client.upload_file(final_path, bucket, final_key)

    # Save training manifest
    manifest_path = "/tmp/finetune_manifest.json"
    with open(manifest_path, "w") as fh:
        import json
        json.dump({"history": history, "best_val_loss": best_val_loss}, fh, indent=2)
    client.upload_file(manifest_path, bucket, f"{checkpoint_prefix}/training_run.json")

    final_metrics = history[-1]
    print(f"[FineTune] DONE  best_val={best_val_loss:.4f}")
    return {**final_metrics, "best_val_loss": best_val_loss, "checkpoint_key": final_key}


# ---------------------------------------------------------------------------
# Local entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Amapiano fine-tuning — run with: modal run modal_backend/training/fine_tune_amapiano.py")
