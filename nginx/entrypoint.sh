#!/bin/sh
set -e

SSL_DIR="/etc/nginx/ssl"
CERT_FILE="${SSL_DIR}/cert.pem"
KEY_FILE="${SSL_DIR}/key.pem"
DAYS_VALID=1825 # 5 Years (365 * 5)
RENEW_THRESHOLD_SECONDS=2592000 # 30 Days before expiration

mkdir -p "${SSL_DIR}"

generate_certificate() {
    echo "==> Generating a new SSL certificate (Valid for 5 years / ${DAYS_VALID} days)..."
    openssl req -x509 -nodes -days ${DAYS_VALID} -newkey rsa:2048 \
        -keyout "${KEY_FILE}" \
        -out "${CERT_FILE}" \
        -subj "/C=EG/ST=Cairo/O=Military Archive/CN=archive.local"
    chmod 600 "${KEY_FILE}"
    chmod 644 "${CERT_FILE}"
    echo "==> SSL Certificate created successfully at ${CERT_FILE}"
}

# 1. Generate certificate if missing
if [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    generate_certificate
else
    # 2. Check if existing certificate will expire within 30 days
    if ! openssl x509 -checkend ${RENEW_THRESHOLD_SECONDS} -noout -in "${CERT_FILE}" > /dev/null 2>&1; then
        echo "==> SSL Certificate is near expiration or invalid."
        generate_certificate
    else
        echo "==> Existing SSL Certificate is valid and active."
    fi
fi

# 3. Start background periodic renewal checker (checks daily at 03:00)
(
    while true; do
        sleep 86400 # 24 hours
        if ! openssl x509 -checkend ${RENEW_THRESHOLD_SECONDS} -noout -in "${CERT_FILE}" > /dev/null 2>&1; then
            echo "==> Daily check: SSL certificate needs renewal. Renewing now..."
            generate_certificate
            nginx -s reload || true
            echo "==> Nginx reloaded with renewed certificate."
        fi
    done
) &

# 4. Hand over control to Nginx
exec "$@"
