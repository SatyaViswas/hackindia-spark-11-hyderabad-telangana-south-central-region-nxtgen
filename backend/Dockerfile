# Use Microsoft's official Playwright image which has Python and all browser system dependencies pre-installed
FROM mcr.microsoft.com/playwright/python:v1.62.0-noble

# Set the working directory inside the container
WORKDIR /workspace

# Copy requirements file first to leverage Docker cache
COPY requirements.txt .

# Install dependencies (use --no-cache-dir to keep image size small)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port (Render handles mapping automatically, but it's good practice)
EXPOSE 8000

# Set environment variable to make sure output is printed to logs immediately
ENV PYTHONUNBUFFERED=1

# Command to run the application (Uvicorn)
# Using $PORT env variable which Render defines
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
