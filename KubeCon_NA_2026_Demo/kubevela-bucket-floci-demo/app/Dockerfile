FROM python:3.15-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code: the API, the bucket browser (run with
# `python browser.py`) and the cloud-neutral storage abstraction they share
COPY app.py browser.py storage.py ./

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8080

# Run the application
CMD ["python", "app.py"]
