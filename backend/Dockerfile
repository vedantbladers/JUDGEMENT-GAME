# Multi-stage build for a minimal and secure production binary
FROM golang:alpine AS builder

WORKDIR /app

# Install git and root CA certificates
RUN apk add --no-cache git ca-certificates

# Copy dependency definitions
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Compile a statically linked Go binary (stripped symbols for small size)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/api

# --- Final Production Image ---
FROM alpine:3.20

WORKDIR /app

# ca-certificates is required for SSL database connections (Azure PostgreSQL Flexible Server)
# tzdata ensures accurate timestamps
RUN apk add --no-cache ca-certificates tzdata

# Copy the compiled binary from builder
COPY --from=builder /app/server /app/server

# Expose backend API port
EXPOSE 8080

# Run the backend server
CMD ["./server"]
