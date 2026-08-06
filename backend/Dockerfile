FROM golang:1.26.5-alpine

WORKDIR /app

# Install git and other dependencies for downloading go modules
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod ./
COPY go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN go build -o main ./cmd/api

# Expose port 8080
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
