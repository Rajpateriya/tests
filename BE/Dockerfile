# ==========================================
# Stage 1: Builder (Compiles & Installs Deps)
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies required for compiling wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create isolated virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV HF_HOME="/opt/venv/huggingface"
ENV TRANSFORMERS_CACHE="/opt/venv/huggingface"

COPY requirements.txt .

# 1. Install CPU-only PyTorch (Cloud Run uses CPU; this saves ~2.2GB of NVIDIA CUDA blobs)
# 2. Install remaining requirements cleanly into /opt/venv
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence-transformers model at BUILD TIME so cold starts are instant.
# Model is cached to /opt/venv's HuggingFace cache (~90MB, baked into the image layer).
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('all-MiniLM-L6-v2'); \
print('Model downloaded and cached successfully.')"

# ==========================================
# Stage 2: Final Minimal Runtime Image
# ==========================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime utilities (curl for healthchecks, libgomp1 for torch/sentence-transformers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtualenv from builder stage (includes model cache, strips gcc/build tools)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set HuggingFace cache dir to match where builder downloaded the model
ENV HF_HOME="/opt/venv/huggingface"
ENV TRANSFORMERS_CACHE="/opt/venv/huggingface"

# Copy application source code
COPY . .

# Expose default port
EXPOSE 8000

# Run uvicorn dynamically respecting Cloud Run's $PORT (fallback to 8000)
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
